import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer'; // <-- Добавлены импорты
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePizzaDto {
  @ApiProperty({
    example: 'Margherita',
    description: 'The name of the pizza',
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Pizza name is required' })
  name!: string;

  @ApiProperty({
    example: 15.99,
    description: 'The price of the pizza',
    minimum: 0,
  })
  @Type(() => Number) // <-- Преобразует строку "15.99" в число 15.99
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price cannot be negative' })
  price!: number;

  @ApiProperty({
    example: 'Classic pizza with fresh tomatoes and mozzarella cheese',
    description: 'A short description of the pizza',
    required: false,
  })
  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: '/uploads/margherita.jpg',
    description: 'URL or local path to the pizza image',
    required: false,
  })
  @IsString({ message: 'Image URL must be a string' })
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    example: true,
    description: 'Indicates whether the pizza is currently available for order',
    required: false,
    default: true,
  })
  @Transform(({ value }) => value === 'true' || value === true) // <-- Преобразует строку "true" в boolean true
  @IsBoolean({ message: 'isActive flag must be a boolean value' })
  @IsOptional()
  isActive?: boolean;
}
