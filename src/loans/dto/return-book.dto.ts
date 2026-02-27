import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ReturnBookDto {
    @IsOptional()
    @IsBoolean()
    reportedDamaged?: boolean;

    @IsOptional()
    @IsString()
    studentNote?: string;
}
