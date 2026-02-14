import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    UseGuards,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
    constructor(private readonly favoritesService: FavoritesService) { }

    @Get()
    async findAll(@CurrentUser('id') userId: string) {
        const favorites = await this.favoritesService.findAll(userId);
        return {
            success: true,
            message: 'Favorites retrieved successfully',
            data: favorites,
        };
    }

    @Post(':bookId')
    async addFavorite(
        @CurrentUser('id') userId: string,
        @Param('bookId') bookId: string,
    ) {
        const favorite = await this.favoritesService.addFavorite(userId, bookId);
        return {
            success: true,
            message: 'Book added to favorites',
            data: favorite,
        };
    }

    @Delete(':bookId')
    async removeFavorite(
        @CurrentUser('id') userId: string,
        @Param('bookId') bookId: string,
    ) {
        await this.favoritesService.removeFavorite(userId, bookId);
        return {
            success: true,
            message: 'Book removed from favorites',
            data: null,
        };
    }

    @Get(':bookId/check')
    async checkFavorite(
        @CurrentUser('id') userId: string,
        @Param('bookId') bookId: string,
    ) {
        const isFavorite = await this.favoritesService.isFavorite(userId, bookId);
        return {
            success: true,
            message: 'Favorite status checked',
            data: { isFavorite },
        };
    }
}
