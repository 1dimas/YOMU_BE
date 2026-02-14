import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';


@Injectable()
export class ReviewsService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, createReviewDto: CreateReviewDto) {
        const { bookId, rating, comment } = createReviewDto;

        // 1. Check eligibility: User must have returned the book
        const hasReturnedLoan = await this.prisma.loan.findFirst({
            where: {
                userId,
                bookId,
                status: 'RETURNED',
            },
        });

        if (!hasReturnedLoan) {
            throw new BadRequestException('Anda harus meminjam dan mengembalikan buku ini sebelum memberikan ulasan.');
        }

        // 2. Check for existing review
        const existingReview = await this.prisma.review.findUnique({
            where: {
                userId_bookId: {
                    userId,
                    bookId,
                },
            },
        });

        if (existingReview) {
            throw new ConflictException('Anda sudah memberikan ulasan untuk buku ini.');
        }

        // 3. Create Review
        return this.prisma.review.create({
            data: {
                bookId,
                userId,
                rating,
                comment,
            },
            include: {
                user: {
                    select: {
                        name: true,
                        avatarUrl: true,
                    },
                },
            },
        });
    }

    async findAllByBook(bookId: string) {
        const reviews = await this.prisma.review.findMany({
            where: { bookId },
            include: {
                user: {
                    select: {
                        name: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const aggregations = await this.prisma.review.aggregate({
            where: { bookId },
            _avg: {
                rating: true,
            },
            _count: {
                rating: true,
            },
        });

        return {
            reviews,
            stats: {
                averageRating: aggregations._avg.rating || 0,
                totalReviews: aggregations._count.rating || 0,
            },
        };
    }
}
