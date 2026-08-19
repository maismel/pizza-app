import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  Inject,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type JwtPayload } from '../auth/types/jwt-payload.interface';
import { UpdateProfileDto } from '../../../user-service/src/dto/update-profile.dto';
import { ChangePasswordDto } from '../../../user-service/src/dto/change-password.dto';

@ApiTags('Users & Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
  ) {}

  @ApiOperation({ summary: 'Get current user profile' })
  @Get('me')
  getProfile(@CurrentUser() user: JwtPayload) {
    return user;
  }

  @ApiOperation({ summary: 'Update current user profile' })
  @Patch('me')
  updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userClient.send({ cmd: 'update_profile' }, { userId, dto });
  }

  @ApiOperation({ summary: 'Change password for current user' })
  @Patch('me/change-password')
  changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.userClient.send({ cmd: 'change_password' }, { userId, dto });
  }

  @ApiOperation({ summary: 'Delete current user account' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('me')
  deleteAccount(@CurrentUser('sub') userId: string) {
    return this.userClient.send({ cmd: 'delete_account' }, userId);
  }

  // --- ADMIN ENDPOINTS ---

  @ApiOperation({
    summary: 'Get all users with pagination and search (Admin only)',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get()
  getUsers(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.userClient.send({ cmd: 'get_users' }, { search, page, limit });
  }
}
