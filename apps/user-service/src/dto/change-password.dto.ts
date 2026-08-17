import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'oldPassword123',
    description: 'Current user password',
  })
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @ApiProperty({
    example: 'newStrongPassword456',
    description: 'New user password (minimum 6 characters)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'Новый пароль должен содержать от 6 символов' })
  newPassword!: string;
}
