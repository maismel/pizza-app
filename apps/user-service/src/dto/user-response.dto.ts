import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { UserEntity } from '../../../../libs/shared/src/entities/index';

export class UserResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique user identifier (UUID)',
  })
  id!: string;

  @ApiProperty({
    example: 'johndoe@example.com',
    description: 'User email address',
  })
  email!: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
    required: false,
    nullable: true,
  })
  firstName?: string | null;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
    required: false,
    nullable: true,
  })
  lastName?: string | null;

  @ApiProperty({
    example: 'user',
    description: 'User role (e.g., admin, user)',
  })
  role!: string;

  @ApiProperty({
    example: '2024-01-01T12:00:00.000Z',
    description: 'Account creation timestamp',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2024-01-01T12:00:00.000Z',
    description: 'Account last update timestamp',
  })
  updatedAt!: Date;

  @Exclude()
  passwordHash!: string;

  @Exclude()
  refreshTokenHash?: string | null;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
