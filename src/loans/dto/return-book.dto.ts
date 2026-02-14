import { IsEnum } from 'class-validator';
import { BookCondition } from '@prisma/client';

export class ReturnBookDto {
    @IsEnum(BookCondition)
    bookCondition: BookCondition;
}
