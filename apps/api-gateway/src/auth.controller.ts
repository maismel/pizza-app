import { Controller, Post, Body, Inject, UseGuards, Get } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CreateUserDto } from '../../user-service/src/dto/create-user.dto';
import { LoginUserDto } from '../../user-service/src/dto/login-user.dto';
import { RefreshTokenDto } from '../../user-service/src/dto/refresh-token.dto';
import { JwtAuthGuard } from 'apps/api-gateway/src/auth/jwt-auth.guard';
import { CurrentUser } from 'apps/api-gateway/src/auth/current-user.decorator';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return await firstValueFrom(
      this.userClient.send({ cmd: 'register' }, createUserDto),
    );
  }

  @Post('login')
  async login(@Body() loginDto: LoginUserDto) {
    return await firstValueFrom(
      this.userClient.send({ cmd: 'login' }, loginDto),
    );
  }

  @Post('refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return await firstValueFrom(
      this.userClient.send({ cmd: 'refresh' }, refreshTokenDto),
    );
  }

  @Post('logout')
  async logout(@Body('userId') userId: string) {
    return await firstValueFrom(
      this.userClient.send({ cmd: 'logout' }, userId),
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}
