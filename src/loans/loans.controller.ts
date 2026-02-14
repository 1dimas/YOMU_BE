import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { LoansService } from './loans.service';
import { CreateLoanDto, AdminActionDto, ReturnBookDto, QueryLoansDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('loans')
@UseGuards(JwtAuthGuard)
export class LoansController {
    constructor(private readonly loansService: LoansService) { }

    // ==================== ADMIN ENDPOINTS ====================

    @Get()
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async findAll(@Query() query: QueryLoansDto) {
        const result = await this.loansService.findAll(query);
        return {
            success: true,
            message: 'Loans retrieved successfully',
            data: result.items,
            meta: result.meta,
        };
    }

    @Get('pending-verification')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async findPendingVerification(@Query() query: QueryLoansDto) {
        const result = await this.loansService.findPendingVerification(query);
        return {
            success: true,
            message: 'Pending verification loans retrieved successfully',
            data: result.items,
            meta: result.meta,
        };
    }

    @Get('overdue')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async findOverdue(@Query() query: QueryLoansDto) {
        const result = await this.loansService.findOverdue(query);
        return {
            success: true,
            message: 'Overdue loans retrieved successfully',
            data: result.items,
            meta: result.meta,
        };
    }

    @Post('check-overdue')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async checkOverdue() {
        const result = await this.loansService.checkAndUpdateOverdue();
        return {
            success: true,
            message: result.message,
            data: { updated: result.updated },
        };
    }

    // ==================== STUDENT ENDPOINTS ====================

    @Get('my')
    async findMyLoans(
        @CurrentUser('id') userId: string,
        @Query() query: QueryLoansDto,
    ) {
        const result = await this.loansService.findMyLoans(userId, query);
        return {
            success: true,
            message: 'Your loans retrieved successfully',
            data: result.items,
            meta: result.meta,
        };
    }

    @Post()
    async createLoan(
        @CurrentUser('id') userId: string,
        @Body() dto: CreateLoanDto,
    ) {
        const loan = await this.loansService.createLoan(userId, dto);
        return {
            success: true,
            message: 'Loan request submitted successfully',
            data: loan,
        };
    }

    @Put(':id/return')
    async requestReturn(
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
        @Body() dto: ReturnBookDto,
    ) {
        const loan = await this.loansService.requestReturn(id, userId, dto);
        return {
            success: true,
            message: 'Return request submitted successfully',
            data: loan,
        };
    }

    // ==================== SHARED ENDPOINTS ====================

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const loan = await this.loansService.findOne(id);
        return {
            success: true,
            message: 'Loan retrieved successfully',
            data: loan,
        };
    }

    // ==================== ADMIN ACTIONS ====================

    @Put(':id/approve')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async approveLoan(
        @Param('id') id: string,
        @CurrentUser('id') adminId: string,
        @Body() dto: AdminActionDto,
    ) {
        const loan = await this.loansService.approveLoan(id, adminId, dto);
        return {
            success: true,
            message: 'Loan approved successfully',
            data: loan,
        };
    }

    @Put(':id/reject')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async rejectLoan(
        @Param('id') id: string,
        @CurrentUser('id') adminId: string,
        @Body() dto: AdminActionDto,
    ) {
        const loan = await this.loansService.rejectLoan(id, adminId, dto);
        return {
            success: true,
            message: 'Loan rejected',
            data: loan,
        };
    }

    @Put(':id/borrowed')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async markAsBorrowed(
        @Param('id') id: string,
        @CurrentUser('id') adminId: string,
    ) {
        const loan = await this.loansService.markAsBorrowed(id, adminId);
        return {
            success: true,
            message: 'Loan marked as borrowed',
            data: loan,
        };
    }

    @Put(':id/verify-return')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async verifyReturn(
        @Param('id') id: string,
        @CurrentUser('id') adminId: string,
        @Body() dto: AdminActionDto,
    ) {
        const loan = await this.loansService.verifyReturn(id, adminId, dto);
        return {
            success: true,
            message: 'Return verified successfully',
            data: loan,
        };
    }
}
