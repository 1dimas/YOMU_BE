import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { CreateBookDto, UpdateBookDto, QueryBooksDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('books')
export class BooksController {
    constructor(private readonly booksService: BooksService) { }

    @Get()
    async findAll(@Query() query: QueryBooksDto) {
        const result = await this.booksService.findAll(query);
        return {
            success: true,
            message: 'Books retrieved successfully',
            data: result.items,
            meta: result.meta,
        };
    }

    @Get('popular')
    async findPopular(@Query('limit') limit?: string) {
        const books = await this.booksService.findPopular(
            limit ? parseInt(limit, 10) : 10,
        );
        return {
            success: true,
            message: 'Popular books retrieved successfully',
            data: books,
        };
    }

    @Get('recommendations')
    @UseGuards(JwtAuthGuard)
    async findRecommendations(
        @CurrentUser('id') userId: string,
        @Query('limit') limit?: string,
    ) {
        const books = await this.booksService.findRecommendations(
            userId,
            limit ? parseInt(limit, 10) : 10,
        );
        return {
            success: true,
            message: 'Recommendations retrieved successfully',
            data: books,
        };
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const book = await this.booksService.findOne(id);
        return {
            success: true,
            message: 'Book retrieved successfully',
            data: book,
        };
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async create(@Body() dto: CreateBookDto) {
        const book = await this.booksService.create(dto);
        return {
            success: true,
            message: 'Book created successfully',
            data: book,
        };
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async update(@Param('id') id: string, @Body() dto: UpdateBookDto) {
        const book = await this.booksService.update(id, dto);
        return {
            success: true,
            message: 'Book updated successfully',
            data: book,
        };
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async remove(@Param('id') id: string) {
        await this.booksService.remove(id);
        return {
            success: true,
            message: 'Book deleted successfully',
            data: null,
        };
    }
}
