import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { BookCondition } from '@prisma/client';

export class AdminActionDto {
    @IsOptional()
    @IsString()
    adminNotes?: string;

    @IsOptional()
    @IsEnum(BookCondition)
    bookCondition?: BookCondition;

    @IsOptional()
    @IsNumber()
    fineAmount?: number;
}
