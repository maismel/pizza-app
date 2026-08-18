import { Injectable, Inject } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from 'apps/user-service/src/repositories/user.repository.interface';
import { MailService } from './mail/mail.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  private async getTokens(userId: string, email: string, role: string) {
    const jwtPayload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: process.env.JWT_ACCESS_SECRET || 'access_secret',
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshTokenHash(
    userId: string,
    refreshToken: string | null,
  ) {
    let hash: string | null = null;
    if (refreshToken) {
      hash = await bcrypt.hash(refreshToken, 10);
    }
    await this.userRepository.update(userId, { refreshTokenHash: hash });
  }

  // --- AUTHENTICATION AND REGISTRATION ---

  async register(createUserDto: CreateUserDto) {
    const { email, password, firstName, lastName } = createUserDto;

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new RpcException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await this.userRepository.create({
      email,
      passwordHash,
      firstName,
      lastName,
      role: 'user',
    });

    const tokens = await this.getTokens(
      newUser.id,
      newUser.email,
      newUser.role,
    );
    await this.updateRefreshTokenHash(newUser.id, tokens.refreshToken);

    // Send welcome email
    await this.mailService.sendWelcomeEmail(
      newUser.email,
      newUser.firstName ?? undefined,
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, refreshTokenHash: __, ...safeUser } = newUser;

    return { user: safeUser, ...tokens };
  }

  async login(loginDto: LoginUserDto) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new RpcException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new RpcException('Invalid email or password');
    }

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, refreshTokenHash: __, ...safeUser } = user;

    return { user: safeUser, ...tokens };
  }

  async refreshTokens(dto: RefreshTokenDto) {
    const user = await this.userRepository.findById(dto.userId);
    if (!user || !user.refreshTokenHash) {
      throw new RpcException('Access denied');
    }

    const refreshTokenMatches = await bcrypt.compare(
      dto.refreshToken,
      user.refreshTokenHash,
    );
    if (!refreshTokenMatches) {
      throw new RpcException('Access denied');
    }

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.updateRefreshTokenHash(userId, null);
    return { success: true };
  }

  // --- PROFILE AND USER MANAGEMENT ---

  getUsers(query: { search?: string; page?: number; limit?: number }) {
    return this.userRepository.findManyWithPagination(query);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updatedUser = await this.userRepository.update(userId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, refreshTokenHash: __, ...safeUser } = updatedUser;
    return safeUser;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new RpcException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.oldPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new RpcException('Invalid old password');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.update(userId, { passwordHash: newPasswordHash });

    return { success: true, message: 'Password changed successfully' };
  }

  async deleteAccount(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new RpcException('User not found');
    }

    await this.userRepository.delete(userId);

    // Send account deletion email
    await this.mailService.sendAccountDeletedEmail(user.email);

    return {
      success: true,
      message: 'Your account has been successfully deleted',
    };
  }
}
