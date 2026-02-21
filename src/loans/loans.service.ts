import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { CreateLoanDto, AdminActionDto, ReturnBookDto, QueryLoansDto } from './dto';
import { LoanStatus, Prisma, BookCondition } from '@prisma/client';

@Injectable()
export class LoansService {
    constructor(
        private prisma: PrismaService,
        private messagesService: MessagesService,
    ) { }

    // ==================== NOTIFICATION HELPER ====================

    private async notifySiswa(adminId: string, userId: string, title: string, content: string) {
        try {
            await this.messagesService.sendMessage(adminId, {
                receiverId: userId,
                content: `📚 [YOMU] ${title}\n\n${content}`,
            });
        } catch (error) {
            console.error('Gagal mengirim notifikasi:', error);
            // Let the main transaction succeed even if notification fails
        }
    }

    private formatDate(date: Date): string {
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    // ==================== QUERY METHODS ====================

    async findAll(query: Partial<QueryLoansDto>) {
        // Auto-check and update overdue loans before fetching
        await this.checkAndUpdateOverdue();

        const { status, userId, bookId, sortBy, sortOrder, page = 1, limit = 10 } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.LoanWhereInput = {};

        if (status) where.status = status;
        if (userId) where.userId = userId;
        if (bookId) where.bookId = bookId;

        const orderBy: Prisma.LoanOrderByWithRelationInput = {};
        if (sortBy) {
            orderBy[sortBy] = sortOrder || 'desc';
        } else {
            orderBy.createdAt = 'desc';
        }

        const total = await this.prisma.loan.count({ where });

        const loans = await this.prisma.loan.findMany({
            where,
            include: {
                user: {
                    select: { id: true, name: true, email: true, class: true },
                },
                book: {
                    select: { id: true, title: true, author: true, coverUrl: true, isbn: true },
                },
                verifier: {
                    select: { id: true, name: true },
                },
            },
            orderBy,
            skip,
            take: limit,
        });

        return {
            items: loans,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findMyLoans(userId: string, query: Partial<QueryLoansDto>) {
        return this.findAll({ ...query, userId });
    }

    async findOne(id: string) {
        const loan = await this.prisma.loan.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, name: true, email: true, class: true, avatarUrl: true },
                },
                book: {
                    include: { category: true },
                },
                verifier: {
                    select: { id: true, name: true },
                },
            },
        });

        if (!loan) {
            throw new NotFoundException('Loan not found');
        }

        return loan;
    }

    async findPendingVerification(query: Partial<QueryLoansDto>) {
        return this.findAll({ ...query, status: LoanStatus.RETURNING });
    }

    async findOverdue(query: Partial<QueryLoansDto>) {
        return this.findAll({ ...query, status: LoanStatus.OVERDUE });
    }

    // ==================== STUDENT ACTIONS ====================

    async createLoan(userId: string, dto: CreateLoanDto) {
        // Check if book exists and has available stock
        const book = await this.prisma.book.findFirst({
            where: { id: dto.bookId, deletedAt: null },
        });

        if (!book) {
            throw new NotFoundException('Book not found');
        }

        if (book.availableStock <= 0) {
            throw new BadRequestException('Book is not available for loan');
        }

        // Check if user already has pending/active loan for this book
        const existingLoan = await this.prisma.loan.findFirst({
            where: {
                userId,
                bookId: dto.bookId,
                status: {
                    in: [LoanStatus.PENDING, LoanStatus.APPROVED, LoanStatus.BORROWED],
                },
            },
        });

        if (existingLoan) {
            throw new BadRequestException('You already have an active loan for this book');
        }

        // Calculate due date
        const loanDate = new Date();
        const dueDate = new Date(loanDate);
        dueDate.setDate(dueDate.getDate() + (dto.durationDays || 7));

        // Create loan
        const loan = await this.prisma.loan.create({
            data: {
                userId,
                bookId: dto.bookId,
                loanDate,
                dueDate,
                status: LoanStatus.PENDING,
            },
            include: {
                book: {
                    select: { id: true, title: true, author: true, coverUrl: true },
                },
            },
        });

        return loan;
    }

    async requestReturn(loanId: string, userId: string, dto: ReturnBookDto) {
        const loan = await this.findOne(loanId);

        // Verify ownership
        if (loan.userId !== userId) {
            throw new ForbiddenException('You can only return your own loans');
        }

        // Check valid status for return
        if (loan.status !== LoanStatus.BORROWED && loan.status !== LoanStatus.OVERDUE) {
            throw new BadRequestException(
                `Cannot return loan with status: ${loan.status}. Loan must be BORROWED or OVERDUE.`,
            );
        }

        // Students can only return on or after the due date
        // Use WIB timezone (UTC+7) for date comparison since users are in Indonesia
        const WIB_OFFSET = 7 * 60 * 60 * 1000; // 7 hours in ms
        const nowWIB = new Date(Date.now() + WIB_OFFSET);
        const todayWIB = new Date(nowWIB.getUTCFullYear(), nowWIB.getUTCMonth(), nowWIB.getUTCDate());
        const dueDateWIB = new Date(new Date(loan.dueDate).getTime() + WIB_OFFSET);
        const dueDayWIB = new Date(dueDateWIB.getUTCFullYear(), dueDateWIB.getUTCMonth(), dueDateWIB.getUTCDate());

        if (todayWIB < dueDayWIB && loan.status !== LoanStatus.OVERDUE) {
            const daysLeft = Math.ceil(
                (dueDayWIB.getTime() - todayWIB.getTime()) / (1000 * 60 * 60 * 24),
            );
            throw new BadRequestException(
                `Buku baru bisa dikembalikan pada tanggal jatuh tempo. Tunggu ${daysLeft} hari lagi.`,
            );
        }

        // If book is in GOOD condition → auto-complete return (no admin verification needed)
        if (dto.bookCondition === BookCondition.GOOD) {
            const [updatedLoan] = await this.prisma.$transaction([
                this.prisma.loan.update({
                    where: { id: loanId },
                    data: {
                        status: LoanStatus.RETURNED,
                        bookCondition: BookCondition.GOOD,
                        returnDate: new Date(),
                    },
                    include: {
                        book: {
                            select: { id: true, title: true, author: true },
                        },
                    },
                }),
                this.prisma.book.update({
                    where: { id: loan.bookId },
                    data: {
                        availableStock: { increment: 1 },
                    },
                }),
            ]);

            return updatedLoan;
        }

        // If DAMAGED or LOST → send to admin verification (RETURNING status)
        const updatedLoan = await this.prisma.loan.update({
            where: { id: loanId },
            data: {
                status: LoanStatus.RETURNING,
                bookCondition: dto.bookCondition,
                returnDate: new Date(),
            },
            include: {
                book: {
                    select: { id: true, title: true, author: true },
                },
            },
        });

        return updatedLoan;
    }

    // ==================== ADMIN ACTIONS ====================

    async approveLoan(loanId: string, adminId: string, dto: AdminActionDto) {
        const loan = await this.findOne(loanId);

        if (loan.status !== LoanStatus.PENDING) {
            throw new BadRequestException(
                `Cannot approve loan with status: ${loan.status}. Loan must be PENDING.`,
            );
        }

        // Check book availability again
        const book = await this.prisma.book.findUnique({
            where: { id: loan.bookId },
        });

        if (!book || book.availableStock <= 0) {
            throw new BadRequestException('Book is no longer available');
        }

        // Use an interactive transaction for absolute safety against race conditions
        const updatedLoan = await this.prisma.$transaction(async (tx) => {
            // Attempt to decrement stock safely on the database side
            const stockUpdate = await tx.book.updateMany({
                where: {
                    id: loan.bookId,
                    availableStock: { gt: 0 }
                },
                data: {
                    availableStock: { decrement: 1 },
                },
            });

            if (stockUpdate.count === 0) {
                // The book stock was exhausted exactly between our first read and this update
                throw new BadRequestException('Request failed: Book stock just became unavailable. Please try again or refresh.');
            }

            // Only if stock update succeeded, we approve the loan
            return tx.loan.update({
                where: { id: loanId },
                data: {
                    status: LoanStatus.APPROVED,
                    adminNotes: dto.adminNotes,
                    verifiedBy: adminId,
                },
                include: {
                    user: {
                        select: { id: true, name: true, email: true },
                    },
                    book: {
                        select: { id: true, title: true },
                    },
                },
            });
        });

        // Send notification to student
        await this.notifySiswa(
            adminId,
            loan.userId,
            'Konfirmasi Persetujuan Peminjaman',
            `Yth. Pengguna,\n\nKami menginformasikan bahwa permohonan peminjaman buku Anda telah disetujui oleh pihak perpustakaan.\n\nDetail Peminjaman:\n📖 Judul Buku: "${updatedLoan.book.title}"\n📅 Batas Pengembalian: ${this.formatDate(loan.dueDate)}${dto.adminNotes ? `\n\nCatatan Admin:\n"${dto.adminNotes}"` : ''}\n\nLangkah Selanjutnya:\nSilakan mengambil buku fisik di loket pelayanan dengan menunjukkan ID Peminjaman atau kartu anggota digital Anda. Selamat membaca.`
        );

        return updatedLoan;
    }

    async rejectLoan(loanId: string, adminId: string, dto: AdminActionDto) {
        const loan = await this.findOne(loanId);

        if (loan.status !== LoanStatus.PENDING) {
            throw new BadRequestException(
                `Cannot reject loan with status: ${loan.status}. Loan must be PENDING.`,
            );
        }

        const updatedLoan = await this.prisma.loan.update({
            where: { id: loanId },
            data: {
                status: LoanStatus.REJECTED,
                adminNotes: dto.adminNotes,
                verifiedBy: adminId,
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
                book: {
                    select: { id: true, title: true },
                },
            },
        });

        // Send notification to student
        await this.notifySiswa(
            adminId,
            loan.userId,
            'Pemberitahuan Status Peminjaman ❌',
            `Yth. Pengguna,\n\nMohon maaf, permohonan peminjaman buku Anda saat ini tidak dapat kami proses.\n\nInformasi Buku:\n📖 Judul Buku: "${updatedLoan.book.title}"${dto.adminNotes ? `\n❌ Alasan Penolakan: ${dto.adminNotes}` : ''}\n\nJika Anda membutuhkan bantuan lebih lanjut, silakan hubungi admin perpustakaan atau jelajahi koleksi buku lainnya yang tersedia di katalog YOMU.`
        );

        return updatedLoan;
    }

    async markAsBorrowed(loanId: string, adminId: string) {
        const loan = await this.findOne(loanId);

        if (loan.status !== LoanStatus.APPROVED) {
            throw new BadRequestException(
                `Cannot mark as borrowed. Loan status must be APPROVED, got: ${loan.status}`,
            );
        }

        const updatedLoan = await this.prisma.loan.update({
            where: { id: loanId },
            data: {
                status: LoanStatus.BORROWED,
                verifiedBy: adminId,
            },
            include: {
                user: {
                    select: { id: true, name: true },
                },
                book: {
                    select: { id: true, title: true },
                },
            },
        });

        return updatedLoan;
    }

    async verifyReturn(loanId: string, adminId: string, dto: AdminActionDto) {
        const loan = await this.findOne(loanId);

        if (loan.status !== LoanStatus.RETURNING) {
            throw new BadRequestException(
                `Cannot verify return. Loan status must be RETURNING, got: ${loan.status}`,
            );
        }

        // Determine final condition (admin's assessment overrides student's)
        const finalCondition = dto.bookCondition || loan.bookCondition || BookCondition.GOOD;
        const isGoodCondition = finalCondition === BookCondition.GOOD;

        // Build transaction: update loan + conditionally increment stock
        const transactionOps: any[] = [
            this.prisma.loan.update({
                where: { id: loanId },
                data: {
                    status: LoanStatus.RETURNED,
                    bookCondition: finalCondition,
                    fineAmount: dto.fineAmount || null,
                    adminNotes: dto.adminNotes,
                    verifiedBy: adminId,
                },
                include: {
                    user: {
                        select: { id: true, name: true },
                    },
                    book: {
                        select: { id: true, title: true },
                    },
                },
            }),
        ];

        // Only restore stock if book is in GOOD condition
        if (isGoodCondition) {
            transactionOps.push(
                this.prisma.book.update({
                    where: { id: loan.bookId },
                    data: {
                        availableStock: { increment: 1 },
                    },
                }),
            );
        }

        const [updatedLoan] = await this.prisma.$transaction(transactionOps);

        // Build notification
        const isLate = loan.dueDate < new Date();
        const hasFine = dto.fineAmount && dto.fineAmount > 0;
        const conditionLabels: Record<string, string> = {
            GOOD: 'Baik',
            DAMAGED: 'Rusak',
            LOST: 'Hilang',
        };

        let title: string;
        let content: string;

        if (isGoodCondition && !isLate) {
            // Happy path
            title = 'Konfirmasi Pengembalian Berhasil ✅';
            content = `Terima kasih, transaksi Anda telah selesai. Buku telah diterima kembali dalam kondisi baik.\n\nDetail Transaksi:\n📖 Judul Buku: "${updatedLoan.book.title}"\n✅ Status: Dikembalikan (Tepat Waktu)${dto.adminNotes ? `\n\nPesan Admin:\n"${dto.adminNotes}"` : ''}\n\nKami mengapresiasi kedisiplinan Anda. Selamat beraktivitas kembali.`;
        } else {
            // Issues detected
            title = 'Informasi Pengembalian dengan Catatan ⚠️';
            const warnings: string[] = [];
            if (isLate) warnings.push('⏰ Buku dikembalikan melewati batas waktu yang ditentukan');
            if (!isGoodCondition) warnings.push(`📕 Buku dikembalikan dalam kondisi: ${conditionLabels[finalCondition] || finalCondition}`);

            content = `Kami menginformasikan bahwa buku telah diterima kembali, namun ada kendala pada transaksi pengembalian Anda.\n\nDetail Transaksi:\n📖 Judul Buku: "${updatedLoan.book.title}"\n📋 Kondisi: ${conditionLabels[finalCondition] || finalCondition}\n\n⚠️ Catatan Khusus:\n${warnings.join('\n')}${hasFine ? `\n\n💰 Denda: Rp ${dto.fineAmount!.toLocaleString('id-ID')}` : ''}${dto.adminNotes ? `\n\nInstruksi Admin:\n"${dto.adminNotes}"` : ''}\n\nMohon segeralah melakukan penyelesaian administrasi pada layanan perpustakaan.`;
        }

        await this.notifySiswa(adminId, loan.userId, title, content);

        return updatedLoan;
    }

    // ==================== OVERDUE CHECK ====================

    async checkAndUpdateOverdue() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find all BORROWED or APPROVED loans past due date
        const overdueLoans = await this.prisma.loan.findMany({
            where: {
                status: { in: [LoanStatus.BORROWED, LoanStatus.APPROVED] },
                dueDate: { lt: today },
            },
        });

        if (overdueLoans.length > 0) {
            // Update all to OVERDUE status
            await this.prisma.loan.updateMany({
                where: {
                    id: { in: overdueLoans.map((l) => l.id) },
                },
                data: {
                    status: LoanStatus.OVERDUE,
                },
            });
        }

        return {
            updated: overdueLoans.length,
            message: `${overdueLoans.length} loans marked as overdue`,
        };
    }
}
