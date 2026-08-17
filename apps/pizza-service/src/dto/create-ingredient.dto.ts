import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateIngredientDto {
  @ApiProperty({
    example: 'Mozzarella',
    description: 'The name of the ingredient',
  })
  @IsString({ message: 'Ingredient name must be a string' })
  @IsNotEmpty({ message: 'Ingredient name is required' })
  name!: string;
}
