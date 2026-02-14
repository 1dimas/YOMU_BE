import { IsOptional, IsString, IsEmail, IsEnum, IsBoolean, IsUUID } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto {
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
    @IsEnum(Role)
    role?: Role;

    @IsOptional()
    @IsString()
    avatarUrl?: string;
}

export class UpdateUserStatusDto {
    @IsBoolean()
    isActive: boolean;
}

