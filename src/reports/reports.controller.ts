import {
    Controller,
    Get,
    Query,
    Res,
    UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('summary')
    async getSummary() {
        const summary = await this.reportsService.getSummary();
        return {
            success: true,
            message: 'Summary retrieved successfully',
            data: summary,
        };
    }

    @Get('loans')
    async getLoanReports(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const result = await this.reportsService.getLoanReports({
            startDate,
            endDate,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
        return {
            success: true,
            message: 'Loan reports retrieved successfully',
            data: result.items,
            meta: result.meta,
            stats: result.stats,
        };
    }

    @Get('popular-books')
    async getPopularBooks(@Query('limit') limit?: string) {
        const books = await this.reportsService.getPopularBooks(
            limit ? parseInt(limit, 10) : 10,
        );
        return {
            success: true,
            message: 'Popular books retrieved successfully',
            data: books,
        };
    }

    @Get('active-members')
    async getActiveMembers(@Query('limit') limit?: string) {
        const members = await this.reportsService.getActiveMembers(
            limit ? parseInt(limit, 10) : 10,
        );
        return {
            success: true,
            message: 'Active members retrieved successfully',
            data: members,
        };
    }

    @Get('export')
    async exportLoans(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Res() res: Response,
    ) {
        const result = await this.reportsService.exportLoans({ startDate, endDate });

        res.setHeader('Content-Type', result.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.content);
    }
}
