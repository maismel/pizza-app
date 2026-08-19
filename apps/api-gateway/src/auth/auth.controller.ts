import { Controller, Post, Body, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateUserDto } from '../../../user-service/src/dto/create-user.dto';
import { LoginUserDto } from '../../../user-service/src/dto/login-user.dto';
import { RefreshTokenDto } from '../../../user-service/src/dto/refresh-token.dto';

import { ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
  ) {}

  @Post('register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.userClient.send({ cmd: 'register' }, createUserDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginUserDto) {
    return this.userClient.send({ cmd: 'login' }, loginDto);
  }

  @Post('refresh')
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.userClient.send({ cmd: 'refresh' }, refreshTokenDto);
  }

  @Post('logout')
  logout(@Body('userId') userId: string) {
    return this.userClient.send({ cmd: 'logout' }, userId);
  }
}
