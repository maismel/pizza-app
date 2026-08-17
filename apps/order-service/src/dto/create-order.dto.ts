import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({
    example: '123 Main St, Apt 4B',
    description: 'Delivery address',
  })
  @IsString({ message: 'Address must be a string' })
  @IsNotEmpty({ message: 'Address is required' })
  address!: string;

  @ApiProperty({
    example: 'courier',
    description: 'Delivery method (e.g., courier or pickup)',
  })
  @IsString({ message: 'Delivery method must be a string' })
  @IsNotEmpty({ message: 'Delivery method is required' })
  deliveryMethod!: string;

  @ApiProperty({
    example: 'card',
    description: 'Payment method (e.g., card or cash)',
  })
  @IsString({ message: 'Payment method must be a string' })
  @IsNotEmpty({ message: 'Payment method is required' })
  paymentMethod!: string;

  @ApiProperty({
    example: 'Please leave the order near the door, do not ring the bell',
    description: 'Additional comments for the courier or restaurant',
    required: false,
  })
  @IsString({ message: 'Comment must be a string' })
  @IsOptional()
  comment?: string;

  @ApiProperty({
    example: 'SUMMER20',
    description: 'Optional promo code to apply a discount',
    required: false,
  })
  @IsString({ message: 'Promo code must be a string' })
  @IsOptional()
  promocodeCode?: string;
}
