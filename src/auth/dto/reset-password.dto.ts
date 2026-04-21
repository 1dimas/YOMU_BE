import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
    @IsString()
    @IsNotEmpty({ message: 'Token tidak boleh kosong' })
    token: string;

    @IsString()
    @IsNotEmpty({ message: 'Password baru tidak boleh kosong' })
    @MinLength(6, { message: 'Password minimal 6 karakter' })
    newPassword: string;
}
