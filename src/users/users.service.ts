import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto, UpdateUserStatusDto, QueryUsersDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findAll(query: QueryUsersDto) {
        const { search, role, isActive, page = 1, limit = 10 } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.UserWhereInput = {
            deletedAt: null,
        };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (role) {
            where.role = role;
        }

        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }

        const total = await this.prisma.user.count({ where });

        const users = await this.prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                majorId: true,
                classId: true,
                major: true,
                class: true,
                avatarUrl: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { loans: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        });

        return {
            items: users,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findFirst({
            where: { id, deletedAt: null },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                majorId: true,
                classId: true,
                major: true,
                class: true,
                avatarUrl: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { loans: true, favorites: true },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async update(id: string, dto: UpdateUserDto) {
        await this.findOne(id);

        // Check email uniqueness
        if (dto.email) {
            const existing = await this.prisma.user.findFirst({
                where: {
                    email: dto.email,
                    NOT: { id },
                    deletedAt: null,
                },
            });

            if (existing) {
                throw new ConflictException('Email already in use');
            }
        }

        return this.prisma.user.update({
            where: { id },
            data: {
                name: dto.name,
                email: dto.email,
                majorId: dto.majorId,
                classId: dto.classId,
                role: dto.role,
                avatarUrl: dto.avatarUrl,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                majorId: true,
                classId: true,
                major: true,
                class: true,
                avatarUrl: true,
                isActive: true,
                updatedAt: true,
            },
        });
    }

    async updateStatus(id: string, dto: UpdateUserStatusDto) {
        await this.findOne(id);

        return this.prisma.user.update({
            where: { id },
            data: { isActive: dto.isActive },
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
            },
        });
    }

    async remove(id: string) {
        const user = await this.findOne(id);

        // Check if user has active loans
        const activeLoans = await this.prisma.loan.count({
            where: {
                userId: id,
                status: { in: ['PENDING', 'APPROVED', 'BORROWED', 'RETURNING'] },
            },
        });

        if (activeLoans > 0) {
            throw new BadRequestException(
                'Cannot delete user with active loans. Resolve loans first.',
            );
        }

        // Soft delete
        await this.prisma.user.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

        return { message: 'User deleted successfully' };
    }
}
