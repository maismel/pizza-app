import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'Alex',
    description: 'Updated first name of the user',
    required: false,
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    example: 'Smith',
    description: 'Updated last name of the user',
    required: false,
  })
  @IsString()
  @IsOptional()
  lastName?: string;
}
