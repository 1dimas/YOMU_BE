import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateClassDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    name: string;
}
