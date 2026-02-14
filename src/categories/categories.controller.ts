import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Get()
    async findAll() {
        const categories = await this.categoriesService.findAll();
        return {
            success: true,
            message: 'Categories retrieved successfully',
            data: categories,
        };
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const category = await this.categoriesService.findOne(id);
        return {
            success: true,
            message: 'Category retrieved successfully',
            data: category,
        };
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async create(@Body() dto: CreateCategoryDto) {
        const category = await this.categoriesService.create(dto);
        return {
            success: true,
            message: 'Category created successfully',
            data: category,
        };
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
        const category = await this.categoriesService.update(id, dto);
        return {
            success: true,
            message: 'Category updated successfully',
            data: category,
        };
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async remove(@Param('id') id: string) {
        await this.categoriesService.remove(id);
        return {
            success: true,
            message: 'Category deleted successfully',
            data: null,
        };
    }
}
