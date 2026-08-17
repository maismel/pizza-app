import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Некорректный формат email' })
  email!: string;

  @ApiProperty({
    example: 'strongPassword123',
    description: 'User password',
  })
  @IsString({ message: 'Пароль должен быть строкой' })
  password!: string;
}
