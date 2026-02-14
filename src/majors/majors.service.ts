import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMajorDto } from './dto';

@Injectable()
export class MajorsService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.major.findMany({
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
        const major = await this.prisma.major.findUnique({
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

        if (!major) {
            throw new NotFoundException('Major not found');
        }

        return major;
    }

    async create(dto: CreateMajorDto) {
        const existing = await this.prisma.major.findUnique({
            where: { name: dto.name },
        });

        if (existing) {
            throw new ConflictException('Nama jurusan sudah ada');
        }

        return this.prisma.major.create({
            data: { name: dto.name },
        });
    }

    async remove(id: string) {
        const major = await this.findOne(id);

        if (major._count.users > 0) {
            throw new ConflictException(
                'Tidak bisa hapus jurusan yang masih memiliki anggota',
            );
        }

        // Unlink soft-deleted users (since we already checked there are no active users)
        await this.prisma.user.updateMany({
            where: { majorId: id },
            data: { majorId: null },
        });

        await this.prisma.major.delete({
            where: { id },
        });

        return { message: 'Jurusan berhasil dihapus' };

    }
}
