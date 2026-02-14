import { IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { LoanStatus } from '@prisma/client';

export class QueryLoansDto extends PaginationDto {
    @IsOptional()
    @IsEnum(LoanStatus)
    status?: LoanStatus;

    @IsOptional()
    @IsUUID()
    userId?: string;

    @IsOptional()
    @IsUUID()
    bookId?: string;

    @IsOptional()
    @IsString()
    sortBy?: 'loanDate' | 'dueDate' | 'createdAt';

    @IsOptional()
    @IsString()
    sortOrder?: 'asc' | 'desc';
}
