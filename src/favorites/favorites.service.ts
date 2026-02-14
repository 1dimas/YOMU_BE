import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
    constructor(private prisma: PrismaService) { }

    async findAll(userId: string) {
        const favorites = await this.prisma.favorite.findMany({
            where: { userId },
            include: {
                book: {
                    include: {
                        category: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Get rating statistics for each book
        const favoritesWithRatings = await Promise.all(
            favorites.map(async (f) => {
                const reviewStats = await this.prisma.review.aggregate({
                    where: { bookId: f.bookId },
                    _avg: { rating: true },
                    _count: { id: true },
                });

                return {
                    id: f.id,
                    createdAt: f.createdAt,
                    bookId: f.bookId,
                    book: {
                        ...f.book,
                        averageRating: reviewStats._avg.rating || 0,
                        totalReviews: reviewStats._count.id || 0,
                    },
                };
            }),
        );

        return favoritesWithRatings;
    }

    async addFavorite(userId: string, bookId: string) {
        // Check if book exists
        const book = await this.prisma.book.findFirst({
            where: { id: bookId, deletedAt: null },
        });

        if (!book) {
            throw new NotFoundException('Book not found');
        }

        // Check if already favorited
        const existing = await this.prisma.favorite.findUnique({
            where: {
                userId_bookId: { userId, bookId },
            },
        });

        if (existing) {
            throw new ConflictException('Book is already in favorites');
        }

        const favorite = await this.prisma.favorite.create({
            data: { userId, bookId },
            include: {
                book: {
                    include: { category: true },
                },
            },
        });

        return favorite;
    }

    async removeFavorite(userId: string, bookId: string) {
        // Check if favorite exists
        const favorite = await this.prisma.favorite.findUnique({
            where: {
                userId_bookId: { userId, bookId },
            },
        });

        if (!favorite) {
            throw new NotFoundException('Book is not in favorites');
        }

        await this.prisma.favorite.delete({
            where: { id: favorite.id },
        });

        return { message: 'Book removed from favorites' };
    }

    async isFavorite(userId: string, bookId: string): Promise<boolean> {
        const favorite = await this.prisma.favorite.findUnique({
            where: {
                userId_bookId: { userId, bookId },
            },
        });

        return !!favorite;
    }
}
