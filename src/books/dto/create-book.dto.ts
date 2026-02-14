import {
    IsString,
    IsNotEmpty,
    IsInt,
    IsUUID,
    IsOptional,
    Min,
} from 'class-validator';


import { Type } from 'class-transformer';

export class CreateBookDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    author: string;

    @IsString()
    @IsNotEmpty()
    publisher: string;

    @Type(() => Number)
    @IsInt()
    @Min(1900)
    year: number;

    @IsString()
    @IsNotEmpty()
    isbn: string;

    @IsUUID()
    categoryId: string;

    @IsString()
    @IsNotEmpty()
    synopsis: string;

    @IsOptional()
    @IsString()
    coverUrl?: string;


    @Type(() => Number)
    @IsInt()
    @Min(0)
    stock: number;
}
