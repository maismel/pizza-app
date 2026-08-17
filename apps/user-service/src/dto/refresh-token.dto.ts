import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique user identifier (UUID)',
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token string for acquiring a new access token',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
