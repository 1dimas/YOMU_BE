import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto } from './dto';

@Injectable()
export class ClassesService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.class.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: {
                        users: {
                            where: { deletedAt: null },
                        },
                    },
                },

            },
        });
    }

    async findOne(id: string) {
        const classItem = await this.prisma.class.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        users: {
                            where: { deletedAt: null },
                        },
                    },
                },

            },
        });

        if (!classItem) {
            throw new NotFoundException('Class not found');
        }

        return classItem;
    }

    async create(dto: CreateClassDto) {
        const existing = await this.prisma.class.findUnique({
            where: { name: dto.name },
        });

        if (existing) {
            throw new ConflictException('Nama kelas sudah ada');
        }

        return this.prisma.class.create({
            data: { name: dto.name },
        });
    }

    async remove(id: string) {
        const classItem = await this.findOne(id);

        if (classItem._count.users > 0) {
            throw new ConflictException(
                'Tidak bisa hapus kelas yang masih memiliki anggota',
            );
        }

        // Unlink soft-deleted users (since we already checked there are no active users)
        await this.prisma.user.updateMany({
            where: { classId: id },
            data: { classId: null },
        });

        await this.prisma.class.delete({
            where: { id },
        });

        return { message: 'Kelas berhasil dihapus' };

    }
}
