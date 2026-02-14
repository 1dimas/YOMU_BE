import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('classes')
export class ClassesController {
    constructor(private readonly classesService: ClassesService) { }

    @Get()
    async findAll() {
        const classes = await this.classesService.findAll();
        return {
            success: true,
            message: 'Classes retrieved successfully',
            data: classes,
        };
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async create(@Body() dto: CreateClassDto) {
        const classItem = await this.classesService.create(dto);
        return {
            success: true,
            message: 'Kelas berhasil ditambahkan',
            data: classItem,
        };
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async remove(@Param('id') id: string) {
        await this.classesService.remove(id);
        return {
            success: true,
            message: 'Kelas berhasil dihapus',
            data: null,
        };
    }
}
