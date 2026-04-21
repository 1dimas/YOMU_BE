import { IsString, IsOptional, IsUrl, IsUUID, IsEmail } from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

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
