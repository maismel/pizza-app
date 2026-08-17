import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreatePromocodeDto {
  @ApiProperty({
    example: 'SUPERDISCOUNT50',
    description: 'Unique text code for the promo code',
  })
  @IsString({ message: 'Promo code must be a string' })
  @IsNotEmpty({ message: 'Promo code is required' })
  code!: string;

  @ApiProperty({
    example: 15,
    description: 'Discount percentage',
    minimum: 1,
    maximum: 100,
  })
  @IsInt({ message: 'Discount must be an integer' })
  @Min(1, { message: 'Discount cannot be less than 1%' })
  @Max(100, { message: 'Discount cannot exceed 100%' })
  discountPercent!: number;

  @ApiProperty({
    example: '2026-12-31T23:59:59Z',
    description: 'Expiration date of the promo code in ISO 8601 format',
  })
  @IsDateString(
    {},
    { message: 'Provide a valid expiration date in ISO format' },
  )
  validUntil!: string;
}
