import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateMajorDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    name: string;
}
