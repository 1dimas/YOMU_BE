import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class AdminActionDto {
    @IsOptional()
    @IsString()
    adminNotes?: string;

    @IsOptional()
    @IsBoolean()
    isDamaged?: boolean;

    @IsOptional()
    @IsNumber()
    fineAmount?: number;
}
