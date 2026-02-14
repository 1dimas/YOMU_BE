import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { MajorsService } from './majors.service';
import { CreateMajorDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('majors')
export class MajorsController {
    constructor(private readonly majorsService: MajorsService) { }

    @Get()
    async findAll() {
        const majors = await this.majorsService.findAll();
        return {
            success: true,
            message: 'Majors retrieved successfully',
            data: majors,
        };
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async create(@Body() dto: CreateMajorDto) {
        const major = await this.majorsService.create(dto);
        return {
            success: true,
            message: 'Jurusan berhasil ditambahkan',
            data: major,
        };
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async remove(@Param('id') id: string) {
        await this.majorsService.remove(id);
        return {
            success: true,
            message: 'Jurusan berhasil dihapus',
            data: null,
        };
    }
}
