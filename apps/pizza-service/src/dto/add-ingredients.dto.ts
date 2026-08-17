import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class AddIngredientsDto {
  @ApiProperty({
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '987e6543-e21b-12d3-a456-426614174000',
    ],
    description: 'Array of unique ingredient identifiers to add to the pizza',
    isArray: true,
  })
  @IsArray({ message: 'Ingredient IDs must be an array' })
  @IsString({ each: true, message: 'Each ingredient ID must be a string' })
  ingredientIds!: string[];
}
