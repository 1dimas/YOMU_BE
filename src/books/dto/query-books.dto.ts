import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryBooksDto extends PaginationDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @IsOptional()
    @IsString()
    sortBy?: 'title' | 'author' | 'year' | 'createdAt';

    @IsOptional()
    @IsString()
    sortOrder?: 'asc' | 'desc';
}
