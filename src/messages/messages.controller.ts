import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class MessagesController {
    constructor(private readonly messagesService: MessagesService) { }

    // ==================== CONVERSATIONS ====================

    @Get('conversations')
    async getConversations(@CurrentUser('id') userId: string) {
        const conversations = await this.messagesService.getConversations(userId);
        return {
            success: true,
            message: 'Conversations retrieved successfully',
            data: conversations,
        };
    }

    @Get('conversations/:id/messages')
    async getConversationMessages(
        @Param('id') conversationId: string,
        @CurrentUser('id') userId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const messages = await this.messagesService.getConversationMessages(
            conversationId,
            userId,
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 50,
        );
        return {
            success: true,
            message: 'Messages retrieved successfully',
            data: messages,
        };
    }

    // ==================== MESSAGES ====================

    @Post('messages')
    async sendMessage(
        @CurrentUser('id') senderId: string,
        @Body() dto: SendMessageDto,
    ) {
        const message = await this.messagesService.sendMessage(senderId, dto);
        return {
            success: true,
            message: 'Message sent successfully',
            data: message,
        };
    }

    @Put('messages/read-all')
    async markAllAsRead(@CurrentUser('id') userId: string) {
        const result = await this.messagesService.markAllAsRead(userId);
        return {
            success: true,
            message: 'All messages marked as read',
            data: result,
        };
    }

    @Put('messages/:id/read')
    async markAsRead(
        @Param('id') messageId: string,
        @CurrentUser('id') userId: string,
    ) {
        await this.messagesService.markAsRead(messageId, userId);
        return {
            success: true,
            message: 'Message marked as read',
            data: null,
        };
    }

    @Put('messages/:id')
    async editMessage(
        @Param('id') messageId: string,
        @CurrentUser('id') userId: string,
        @Body('content') content: string,
    ) {
        const message = await this.messagesService.editMessage(messageId, userId, content);
        return {
            success: true,
            message: 'Message edited successfully',
            data: message,
        };
    }

    @Delete('messages/:id')
    async deleteMessage(
        @Param('id') messageId: string,
        @CurrentUser('id') userId: string,
    ) {
        const result = await this.messagesService.deleteMessage(messageId, userId);
        return {
            success: true,
            message: 'Message deleted successfully',
            data: result,
        };
    }

    @Get('messages/unread-count')
    async getUnreadCount(@CurrentUser('id') userId: string) {
        const result = await this.messagesService.getUnreadCount(userId);
        return {
            success: true,
            message: 'Unread count retrieved',
            data: result,
        };
    }
}
