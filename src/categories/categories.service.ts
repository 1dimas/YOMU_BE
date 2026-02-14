import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoriesService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.category.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { books: true },
                },
            },
        });
    }

    async findOne(id: string) {
        const category = await this.prisma.category.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { books: true },
                },
            },
        });

        if (!category) {
            throw new NotFoundException('Category not found');
        }

        return category;
    }

    async create(dto: CreateCategoryDto) {
        // Check if name already exists
        const existing = await this.prisma.category.findUnique({
            where: { name: dto.name },
        });

        if (existing) {
            throw new ConflictException('Category name already exists');
        }

        return this.prisma.category.create({
            data: {
                name: dto.name,
                color: dto.color,
                description: dto.description,
            },
        });
    }

    async update(id: string, dto: UpdateCategoryDto) {
        // Check if category exists
        await this.findOne(id);

        // Check if new name conflicts with existing
        if (dto.name) {
            const existing = await this.prisma.category.findFirst({
                where: {
                    name: dto.name,
                    NOT: { id },
                },
            });

            if (existing) {
                throw new ConflictException('Category name already exists');
            }
        }

        return this.prisma.category.update({
            where: { id },
            data: {
                name: dto.name,
                color: dto.color,
                description: dto.description,
            },
        });
    }

    async remove(id: string) {
        // Check if category exists
        const category = await this.findOne(id);

        // Check if category has books
        if (category._count.books > 0) {
            throw new ConflictException(
                'Cannot delete category with associated books. Remove or reassign books first.',
            );
        }

        await this.prisma.category.delete({
            where: { id },
        });

        return { message: 'Category deleted successfully' };
    }
}
