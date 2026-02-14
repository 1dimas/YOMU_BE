import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoanStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    async getSummary() {
        const [
            totalBooks,
            totalUsers,
            totalLoans,
            activeLoans,
            overdueLoans,
            pendingLoans,
        ] = await Promise.all([
            this.prisma.book.count({ where: { deletedAt: null } }),
            this.prisma.user.count({ where: { deletedAt: null, role: 'SISWA' } }),
            this.prisma.loan.count(),
            this.prisma.loan.count({
                where: { status: { in: [LoanStatus.BORROWED, LoanStatus.APPROVED] } },
            }),
            this.prisma.loan.count({ where: { status: LoanStatus.OVERDUE } }),
            this.prisma.loan.count({ where: { status: LoanStatus.PENDING } }),
        ]);

        // Get loans by status
        const loansByStatus = await this.prisma.loan.groupBy({
            by: ['status'],
            _count: { status: true },
        });

        // Get recent activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentLoans = await this.prisma.loan.count({
            where: { createdAt: { gte: sevenDaysAgo } },
        });

        const recentReturns = await this.prisma.loan.count({
            where: {
                status: LoanStatus.RETURNED,
                returnDate: { gte: sevenDaysAgo },
            },
        });

        return {
            totalBooks,
            totalUsers,
            totalLoans,
            activeLoans,
            overdueLoans,
            pendingLoans,
            loansByStatus: loansByStatus.reduce((acc, item) => {
                acc[item.status] = item._count.status;
                return acc;
            }, {} as Record<string, number>),
            recentActivity: {
                newLoans: recentLoans,
                returns: recentReturns,
            },
        };
    }

    async getLoanReports(query: {
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }) {
        const { startDate, endDate, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        // Build where clause - ONLY verified/returned loans
        const where: any = {
            status: LoanStatus.RETURNED,
            verifiedBy: { not: null },
        };

        if (startDate || endDate) {
            where.returnDate = {};
            if (startDate) {
                where.returnDate.gte = new Date(startDate);
            }
            if (endDate) {
                where.returnDate.lte = new Date(endDate);
            }
        }

        const total = await this.prisma.loan.count({ where });

        const loans = await this.prisma.loan.findMany({
            where,
            include: {
                user: {
                    select: { id: true, name: true, class: true },
                },
                book: {
                    select: { id: true, title: true, author: true, isbn: true },
                },
                verifier: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { returnDate: 'desc' },
            skip,
            take: limit,
        });

        // Calculate stats for this period
        const periodStats = {
            totalReturned: total,
            onTime: await this.prisma.loan.count({
                where: {
                    ...where,
                    returnDate: { lte: this.prisma.loan.fields.dueDate },
                },
            }),
            damaged: await this.prisma.loan.count({
                where: { ...where, bookCondition: 'DAMAGED' },
            }),
        };

        return {
            items: loans,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            stats: periodStats,
        };
    }

    async getPopularBooks(limit = 10) {
        const books = await this.prisma.book.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                title: true,
                author: true,
                coverUrl: true,
                category: {
                    select: { name: true, color: true },
                },
                _count: {
                    select: { loans: true },
                },
            },
            orderBy: {
                loans: { _count: 'desc' },
            },
            take: limit,
        });

        return books.map((book) => ({
            ...book,
            loanCount: book._count.loans,
        }));
    }

    async getActiveMembers(limit = 10) {
        const users = await this.prisma.user.findMany({
            where: {
                deletedAt: null,
                role: 'SISWA',
            },
            select: {
                id: true,
                name: true,
                class: true,
                avatarUrl: true,
                _count: {
                    select: { loans: true },
                },
            },
            orderBy: {
                loans: { _count: 'desc' },
            },
            take: limit,
        });

        return users.map((user) => ({
            ...user,
            loanCount: user._count.loans,
        }));
    }

    async exportLoans(query: { startDate?: string; endDate?: string }) {
        const { startDate, endDate } = query;

        const where: any = {
            status: LoanStatus.RETURNED,
            verifiedBy: { not: null },
        };

        if (startDate || endDate) {
            where.returnDate = {};
            if (startDate) where.returnDate.gte = new Date(startDate);
            if (endDate) where.returnDate.lte = new Date(endDate);
        }

        const loans = await this.prisma.loan.findMany({
            where,
            include: {
                user: { select: { name: true, class: true } },
                book: { select: { title: true, author: true, isbn: true } },
                verifier: { select: { name: true } },
            },
            orderBy: { returnDate: 'desc' },
        });

        // Generate CSV
        const headers = [
            'No',
            'Tanggal Pinjam',
            'Tanggal Kembali',
            'Nama Siswa',
            'Kelas',
            'Judul Buku',
            'Penulis',
            'ISBN',
            'Kondisi Buku',
            'Diverifikasi Oleh',
        ];

        const rows = loans.map((loan, index) => [
            index + 1,
            loan.loanDate.toISOString().split('T')[0],
            loan.returnDate?.toISOString().split('T')[0] || '',
            loan.user.name,
            loan.user.class || '',
            loan.book.title,
            loan.book.author,
            loan.book.isbn,
            loan.bookCondition || 'GOOD',
            loan.verifier?.name || '',
        ]);

        const csv = [
            headers.join(','),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
        ].join('\n');

        return {
            filename: `laporan-peminjaman-${new Date().toISOString().split('T')[0]}.csv`,
            content: csv,
            mimeType: 'text/csv',
        };
    }
}
