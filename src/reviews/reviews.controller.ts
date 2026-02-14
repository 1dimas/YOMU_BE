import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';


@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Req() req, @Body() createReviewDto: CreateReviewDto) {
        return this.reviewsService.create(req.user.id, createReviewDto);
    }

    @Get('book/:bookId')
    findAllByBook(@Param('bookId') bookId: string) {
        return this.reviewsService.findAllByBook(bookId);
    }
}
