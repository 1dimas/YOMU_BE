import {
    Controller,
    Post,
    Get,
    Put,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, UpdateProfileDto, ChangePasswordDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    async register(@Body() dto: RegisterDto) {
        const result = await this.authService.register(dto);
        return {
            success: true,
            message: 'Registration successful',
            data: result,
        };
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto) {
        const result = await this.authService.login(dto);
        return {
            success: true,
            message: 'Login successful',
            data: result,
        };
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logout() {
        // JWT is stateless, client should remove token
        return {
            success: true,
            message: 'Logout successful',
            data: null,
        };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getProfile(@CurrentUser('id') userId: string) {
        const user = await this.authService.getProfile(userId);
        return {
            success: true,
            message: 'Profile retrieved successfully',
            data: user,
        };
    }

    @Put('profile')
    @UseGuards(JwtAuthGuard)
    async updateProfile(
        @CurrentUser('id') userId: string,
        @Body() dto: UpdateProfileDto,
    ) {
        const user = await this.authService.updateProfile(userId, dto);
        return {
            success: true,
            message: 'Profile updated successfully',
            data: user,
        };
    }

    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async changePassword(
        @CurrentUser('id') userId: string,
        @Body() dto: ChangePasswordDto,
    ) {
        const result = await this.authService.changePassword(userId, dto);
        return {
            success: true,
            message: result.message,
            data: null,
        };
    }
}
