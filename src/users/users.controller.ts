import {
    Controller,
    Get,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto, UpdateUserStatusDto, QueryUsersDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    async findAll(@Query() query: QueryUsersDto) {
        const result = await this.usersService.findAll(query);
        return {
            success: true,
            message: 'Users retrieved successfully',
            data: result.items,
            meta: result.meta,
        };
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const user = await this.usersService.findOne(id);
        return {
            success: true,
            message: 'User retrieved successfully',
            data: user,
        };
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
        const user = await this.usersService.update(id, dto);
        return {
            success: true,
            message: 'User updated successfully',
            data: user,
        };
    }

    @Put(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateUserStatusDto,
    ) {
        const user = await this.usersService.updateStatus(id, dto);
        return {
            success: true,
            message: `User ${dto.isActive ? 'activated' : 'deactivated'} successfully`,
            data: user,
        };
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        await this.usersService.remove(id);
        return {
            success: true,
            message: 'User deleted successfully',
            data: null,
        };
    }
}
