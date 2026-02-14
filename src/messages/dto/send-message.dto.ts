import { IsString, IsNotEmpty, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { MessageType } from '@prisma/client';

export class SendMessageDto {
    @IsUUID()
    receiverId: string;

    @IsString()
    @IsNotEmpty()
    content: string;

    @IsOptional()
    @IsEnum(MessageType)
    messageType?: MessageType = MessageType.TEXT;

    @IsOptional()
    @IsUUID()
    bookId?: string; // Required if messageType is BOOK_CARD
}
