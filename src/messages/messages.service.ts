import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto';
import { MessageType } from '@prisma/client';

@Injectable()
export class MessagesService {
    constructor(private prisma: PrismaService) { }

    // ==================== CONVERSATIONS ====================

    async getConversations(userId: string) {
        const conversations = await this.prisma.conversation.findMany({
            where: {
                OR: [
                    { participant1Id: userId },
                    { participant2Id: userId },
                ],
            },
            include: {
                participant1: {
                    select: { id: true, name: true, avatarUrl: true, role: true },
                },
                participant2: {
                    select: { id: true, name: true, avatarUrl: true, role: true },
                },
            },
            orderBy: { lastMessageAt: 'desc' },
        });

        // Get last message and unread count for each conversation
        const conversationsWithDetails = await Promise.all(
            conversations.map(async (conv) => {
                const otherUser = conv.participant1Id === userId
                    ? conv.participant2
                    : conv.participant1;

                const lastMessage = await this.prisma.message.findFirst({
                    where: {
                        OR: [
                            { senderId: conv.participant1Id, receiverId: conv.participant2Id },
                            { senderId: conv.participant2Id, receiverId: conv.participant1Id },
                        ],
                    },
                    orderBy: { createdAt: 'desc' },
                    select: { content: true, createdAt: true, messageType: true },
                });

                const unreadCount = await this.prisma.message.count({
                    where: {
                        senderId: otherUser.id,
                        receiverId: userId,
                        isRead: false,
                    },
                });

                return {
                    id: conv.id,
                    otherUser,
                    lastMessage,
                    unreadCount,
                    lastMessageAt: conv.lastMessageAt,
                };
            }),
        );

        return conversationsWithDetails;
    }

    async getConversationMessages(conversationId: string, userId: string, page = 1, limit = 50) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        // Verify user is part of conversation
        if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
            throw new NotFoundException('Conversation not found');
        }

        const skip = (page - 1) * limit;

        const messages = await this.prisma.message.findMany({
            where: {
                OR: [
                    { senderId: conversation.participant1Id, receiverId: conversation.participant2Id },
                    { senderId: conversation.participant2Id, receiverId: conversation.participant1Id },
                ],
            },
            include: {
                sender: {
                    select: { id: true, name: true, avatarUrl: true },
                },
                book: {
                    select: { id: true, title: true, author: true, coverUrl: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        });

        // Mark unread messages as read
        await this.prisma.message.updateMany({
            where: {
                receiverId: userId,
                senderId: conversation.participant1Id === userId
                    ? conversation.participant2Id
                    : conversation.participant1Id,
                isRead: false,
            },
            data: { isRead: true },
        });

        return messages.reverse(); // Return in chronological order
    }

    // ==================== MESSAGES ====================

    async sendMessage(senderId: string, dto: SendMessageDto) {
        // Validate receiver exists
        const receiver = await this.prisma.user.findUnique({
            where: { id: dto.receiverId },
        });

        if (!receiver || receiver.deletedAt) {
            throw new NotFoundException('Receiver not found');
        }

        // Validate book if BOOK_CARD type
        if (dto.messageType === MessageType.BOOK_CARD) {
            if (!dto.bookId) {
                throw new BadRequestException('Book ID is required for BOOK_CARD message type');
            }

            const book = await this.prisma.book.findFirst({
                where: { id: dto.bookId, deletedAt: null },
            });

            if (!book) {
                throw new NotFoundException('Book not found');
            }
        }

        // Find or create conversation
        let conversation = await this.prisma.conversation.findFirst({
            where: {
                OR: [
                    { participant1Id: senderId, participant2Id: dto.receiverId },
                    { participant1Id: dto.receiverId, participant2Id: senderId },
                ],
            },
        });

        if (!conversation) {
            conversation = await this.prisma.conversation.create({
                data: {
                    participant1Id: senderId,
                    participant2Id: dto.receiverId,
                },
            });
        }

        // Create message and update conversation
        const [message] = await this.prisma.$transaction([
            this.prisma.message.create({
                data: {
                    senderId,
                    receiverId: dto.receiverId,
                    content: dto.content,
                    messageType: dto.messageType || MessageType.TEXT,
                    bookId: dto.bookId,
                },
                include: {
                    sender: {
                        select: { id: true, name: true, avatarUrl: true },
                    },
                    book: {
                        select: { id: true, title: true, author: true, coverUrl: true },
                    },
                },
            }),
            this.prisma.conversation.update({
                where: { id: conversation.id },
                data: { lastMessageAt: new Date() },
            }),
        ]);

        return message;
    }

    async markAsRead(messageId: string, userId: string) {
        const message = await this.prisma.message.findUnique({
            where: { id: messageId },
        });

        if (!message) {
            throw new NotFoundException('Message not found');
        }

        if (message.receiverId !== userId) {
            throw new BadRequestException('You can only mark your received messages as read');
        }

        return this.prisma.message.update({
            where: { id: messageId },
            data: { isRead: true },
        });
    }

    async getUnreadCount(userId: string) {
        const count = await this.prisma.message.count({
            where: {
                receiverId: userId,
                isRead: false,
            },
        });

        return { unreadCount: count };
    }
}
