import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto, UpdateBookDto, QueryBooksDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BooksService {
    constructor(private prisma: PrismaService) { }

    // Batch-fetch ratings for a list of books (replaces N+1 per-book aggregate)
    private async attachRatings<T extends { id: string }>(books: T[]) {
        if (books.length === 0) return [];

        const bookIds = books.map(b => b.id);
        const ratingStats = await this.prisma.review.groupBy({
            by: ['bookId'],
            where: { bookId: { in: bookIds } },
            _avg: { rating: true },
            _count: { id: true },
        });

        const ratingMap = new Map(
            ratingStats.map(r => [r.bookId, { avg: r._avg.rating || 0, count: r._count.id || 0 }]),
        );

        return books.map(book => ({
            ...book,
            averageRating: ratingMap.get(book.id)?.avg || 0,
            totalReviews: ratingMap.get(book.id)?.count || 0,
        }));
    }

    async findAll(query: QueryBooksDto) {
        const { search, categoryId, sortBy, sortOrder, page = 1, limit = 10 } = query;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: Prisma.BookWhereInput = {
            deletedAt: null,
        };

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { author: { contains: search, mode: 'insensitive' } },
                { isbn: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (categoryId) {
            where.categoryId = categoryId;
        }

        // Build orderBy
        const orderBy: Prisma.BookOrderByWithRelationInput = {};
        if (sortBy) {
            orderBy[sortBy] = sortOrder || 'asc';
        } else {
            orderBy.createdAt = 'desc';
        }

        // Get total count
        const total = await this.prisma.book.count({ where });

        // Get books with relations
        const books = await this.prisma.book.findMany({
            where,
            include: {
                category: true,
                _count: {
                    select: { loans: true, favorites: true },
                },
            },
            orderBy,
            skip,
            take: limit,
        });

        // Batch-fetch ratings in a single query
        const booksWithRatings = await this.attachRatings(books);

        return {
            items: booksWithRatings,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const book = await this.prisma.book.findFirst({
            where: { id, deletedAt: null },
            include: {
                category: true,
                _count: {
                    select: { loans: true, favorites: true },
                },
            },
        });

        if (!book) {
            throw new NotFoundException('Book not found');
        }

        return book;
    }

    async findPopular(limit: number = 10) {
        // Get books with most loans
        const books = await this.prisma.book.findMany({
            where: { deletedAt: null },
            include: {
                category: true,
                _count: {
                    select: { loans: true },
                },
            },
            orderBy: {
                loans: {
                    _count: 'desc',
                },
            },
            take: limit,
        });

        // Batch-fetch ratings in a single query
        return this.attachRatings(books);
    }

    async findRecommendations(userId: string, limit: number = 10) {
        // Get user's favorite categories based on borrowing history
        const userLoans = await this.prisma.loan.findMany({
            where: { userId },
            include: {
                book: {
                    select: { categoryId: true },
                },
            },
        });

        // Get unique category IDs from user's history
        const categoryIds = [...new Set(userLoans.map((loan) => loan.book.categoryId))];

        // If user has history, recommend from those categories
        if (categoryIds.length > 0) {
            const books = await this.prisma.book.findMany({
                where: {
                    deletedAt: null,
                    categoryId: { in: categoryIds },
                    availableStock: { gt: 0 },
                },
                include: {
                    category: true,
                },
                orderBy: {
                    loans: {
                        _count: 'desc',
                    },
                },
                take: limit,
            });

            // Batch-fetch ratings in a single query
            return this.attachRatings(books);
        }

        // For new users: show all available books, newest first
        const books = await this.prisma.book.findMany({
            where: {
                deletedAt: null,
                availableStock: { gt: 0 },
            },
            include: {
                category: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
        });

        // Batch-fetch ratings in a single query
        return this.attachRatings(books);
    }

    async create(dto: CreateBookDto) {
        // Check if ISBN already exists
        const existingIsbn = await this.prisma.book.findFirst({
            where: {
                isbn: dto.isbn,
                deletedAt: null, // Ignore soft-deleted books
            },
        });


        if (existingIsbn) {
            throw new ConflictException('ISBN already exists');
        }

        // Verify category exists
        const category = await this.prisma.category.findUnique({
            where: { id: dto.categoryId },
        });

        if (!category) {
            throw new NotFoundException('Category not found');
        }

        return this.prisma.book.create({
            data: {
                title: dto.title,
                author: dto.author,
                publisher: dto.publisher,
                year: dto.year,
                isbn: dto.isbn,
                categoryId: dto.categoryId,
                synopsis: dto.synopsis,
                coverUrl: dto.coverUrl,
                stock: dto.stock,
                availableStock: dto.stock,
            },
            include: {
                category: true,
            },
        });
    }

    async update(id: string, dto: UpdateBookDto) {
        // Check if book exists
        await this.findOne(id);

        // Check if new ISBN conflicts
        if (dto.isbn) {
            const existingIsbn = await this.prisma.book.findFirst({
                where: {
                    isbn: dto.isbn,
                    deletedAt: null, // Ignore soft-deleted books
                    NOT: { id },
                },

            });

            if (existingIsbn) {
                throw new ConflictException('ISBN already exists');
            }
        }

        // Verify category if changing
        if (dto.categoryId) {
            const category = await this.prisma.category.findUnique({
                where: { id: dto.categoryId },
            });

            if (!category) {
                throw new NotFoundException('Category not found');
            }
        }

        // Calculate available stock if stock is changing
        let availableStock: number | undefined;
        if (dto.stock !== undefined) {
            const currentBook = await this.prisma.book.findUnique({ where: { id } });
            if (currentBook) {
                const borrowedCount = currentBook.stock - currentBook.availableStock;
                availableStock = Math.max(0, dto.stock - borrowedCount);
            }
        }

        return this.prisma.book.update({
            where: { id },
            data: {
                title: dto.title,
                author: dto.author,
                publisher: dto.publisher,
                year: dto.year,
                isbn: dto.isbn,
                categoryId: dto.categoryId,
                synopsis: dto.synopsis,
                coverUrl: dto.coverUrl,
                stock: dto.stock,
                availableStock,
            },
            include: {
                category: true,
            },
        });
    }

    async remove(id: string) {
        // Check if book exists
        const book = await this.findOne(id);

        // Check for active loans
        const activeLoans = await this.prisma.loan.count({
            where: {
                bookId: id,
                status: {
                    in: ['BORROWED', 'OVERDUE'],
                },
            },
        });

        if (activeLoans > 0) {
            throw new ConflictException(
                'Tidak dapat menghapus buku yang sedang dipinjam (Status: Borrowed/Overdue)',
            );
        }

        // Soft delete
        await this.prisma.book.update({
            where: { id },
            data: { deletedAt: new Date() },
        });


        return { message: 'Book deleted successfully' };
    }
}
