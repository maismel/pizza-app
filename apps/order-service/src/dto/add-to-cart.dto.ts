import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class AddToCartDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier of the pizza',
  })
  @IsString({ message: 'Pizza ID must be a string' })
  @IsNotEmpty({ message: 'Pizza ID is required' })
  pizzaId!: string;

  @ApiProperty({
    example: 2,
    description: 'Quantity of pizzas to add to the cart',
    minimum: 1,
  })
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity!: number;
}
