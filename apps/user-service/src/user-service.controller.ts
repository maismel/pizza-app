import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user-service.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller()
export class UserServiceController {
  constructor(private readonly userService: UserService) {}

  // --- АВТОРИЗАЦИЯ И РЕГИСТРАЦИЯ ---

  @MessagePattern({ cmd: 'register' })
  register(@Payload() dto: CreateUserDto) {
    return this.userService.register(dto);
  }

  @MessagePattern({ cmd: 'login' })
  login(@Payload() dto: LoginUserDto) {
    return this.userService.login(dto);
  }

  @MessagePattern({ cmd: 'refresh' })
  refreshTokens(@Payload() dto: RefreshTokenDto) {
    return this.userService.refreshTokens(dto);
  }

  @MessagePattern({ cmd: 'logout' })
  logout(@Payload() userId: string) {
    return this.userService.logout(userId);
  }

  // --- ПОЛЬЗОВАТЕЛИ И ПРОФИЛЬ ---

  @MessagePattern({ cmd: 'get_users' })
  getUsers(
    @Payload() query: { search?: string; page?: number; limit?: number },
  ) {
    return this.userService.getUsers(query);
  }

  @MessagePattern({ cmd: 'update_profile' })
  updateProfile(@Payload() data: { userId: string; dto: UpdateProfileDto }) {
    return this.userService.updateProfile(data.userId, data.dto);
  }

  @MessagePattern({ cmd: 'change_password' })
  changePassword(@Payload() data: { userId: string; dto: ChangePasswordDto }) {
    return this.userService.changePassword(data.userId, data.dto);
  }

  @MessagePattern({ cmd: 'delete_account' })
  deleteAccount(@Payload() userId: string) {
    return this.userService.deleteAccount(userId);
  }
}
