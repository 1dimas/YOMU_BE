import { IsString, IsOptional, IsUrl, IsUUID } from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsUUID()
    majorId?: string;

    @IsOptional()
    @IsUUID()
    classId?: string;

    @IsOptional()
    @IsUrl()
    avatarUrl?: string;
}
