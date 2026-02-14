import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoanStatus } from '@prisma/client';

@Injectable()
export class StatsService {
    constructor(private prisma: PrismaService) { }

    async getSiswaStats(userId: string) {
        const [
            activeLoans,
            borrowedCount,
            totalLoans,
            favorites,
            unreadMessages,
        ] = await Promise.all([
            this.prisma.loan.count({
                where: {
                    userId,
                    status: { in: [LoanStatus.PENDING, LoanStatus.APPROVED, LoanStatus.BORROWED] },
                },
            }),
            this.prisma.loan.count({
                where: {
                    userId,
                    status: { in: [LoanStatus.APPROVED, LoanStatus.BORROWED, LoanStatus.OVERDUE] },
                },
            }),
            this.prisma.loan.count({ where: { userId } }),
            this.prisma.favorite.count({ where: { userId } }),
            this.prisma.message.count({ where: { receiverId: userId, isRead: false } }),
        ]);

        // Get current borrowed books with nearest due date
        const currentLoans = await this.prisma.loan.findMany({
            where: {
                userId,
                status: { in: [LoanStatus.APPROVED, LoanStatus.BORROWED, LoanStatus.OVERDUE] },
            },
            include: {
                book: {
                    select: { id: true, title: true, coverUrl: true },
                },
            },
            orderBy: { dueDate: 'asc' },
            take: 5,
        });

        // Check for overdue
        const overdueCount = await this.prisma.loan.count({
            where: {
                userId,
                status: LoanStatus.OVERDUE,
            },
        });

        // Get nearest due date from current loans
        const nearestDueDate = currentLoans.length > 0 ? currentLoans[0].dueDate : null;

        return {
            activeLoans,
            borrowedBooks: borrowedCount,
            totalLoans,
            favorites,
            favoriteCount: favorites,
            unreadMessages,
            overdueCount,
            nearestDueDate: nearestDueDate?.toISOString() || null,
            currentLoans: currentLoans.map((loan) => ({
                id: loan.id,
                book: loan.book,
                status: loan.status,
                dueDate: loan.dueDate,
                isOverdue: loan.status === LoanStatus.OVERDUE || new Date() > loan.dueDate,
            })),
        };
    }

    async getAdminStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

        const [
            totalBooks,
            availableBooks,
            totalUsers,
            activeUsers,
            pendingLoans,
            activeLoans,
            overdueLoans,
            returningLoans,
            loansThisMonth,
            loansLastMonth,
            newUsersThisMonth,
        ] = await Promise.all([
            this.prisma.book.count({ where: { deletedAt: null } }),
            this.prisma.book.count({ where: { deletedAt: null, availableStock: { gt: 0 } } }),
            this.prisma.user.count({ where: { deletedAt: null, role: 'SISWA' } }),
            this.prisma.user.count({ where: { deletedAt: null, role: 'SISWA', isActive: true } }),
            this.prisma.loan.count({ where: { status: LoanStatus.PENDING } }),
            this.prisma.loan.count({ where: { status: LoanStatus.BORROWED } }),
            this.prisma.loan.count({ where: { status: LoanStatus.OVERDUE } }),
            this.prisma.loan.count({ where: { status: LoanStatus.RETURNING } }),
            this.prisma.loan.count({ where: { createdAt: { gte: thisMonth } } }),
            this.prisma.loan.count({
                where: { createdAt: { gte: lastMonth, lt: thisMonth } },
            }),
            this.prisma.user.count({
                where: { createdAt: { gte: thisMonth }, role: 'SISWA' },
            }),
        ]);

        // Calculate trends
        const loansTrend = loansLastMonth > 0
            ? ((loansThisMonth - loansLastMonth) / loansLastMonth) * 100
            : loansThisMonth > 0 ? 100 : 0;

        // Get recent activity
        const recentLoans = await this.prisma.loan.findMany({
            where: { createdAt: { gte: today } },
            include: {
                user: { select: { name: true } },
                book: { select: { title: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });

        return {
            books: {
                total: totalBooks,
                available: availableBooks,
                borrowed: totalBooks - availableBooks,
            },
            users: {
                total: totalUsers,
                active: activeUsers,
                newThisMonth: newUsersThisMonth,
            },
            loans: {
                pending: pendingLoans,
                active: activeLoans,
                overdue: overdueLoans,
                returning: returningLoans,
                thisMonth: loansThisMonth,
                trend: Math.round(loansTrend),
            },
            recentActivity: recentLoans.map((loan) => ({
                id: loan.id,
                userName: loan.user.name,
                bookTitle: loan.book.title,
                status: loan.status,
                createdAt: loan.createdAt,
            })),
        };
    }
}
