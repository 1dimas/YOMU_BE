import { Controller, Get, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
    constructor(private readonly statsService: StatsService) { }

    @Get('siswa')
    async getSiswaStats(@CurrentUser('id') userId: string) {
        const stats = await this.statsService.getSiswaStats(userId);
        return {
            success: true,
            message: 'Student stats retrieved successfully',
            data: stats,
        };
    }

    @Get('admin')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async getAdminStats() {
        const stats = await this.statsService.getAdminStats();
        return {
            success: true,
            message: 'Admin stats retrieved successfully',
            data: stats,
        };
    }
}
