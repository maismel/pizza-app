import { Injectable } from '@nestjs/common';
import { IUserRepository } from 'apps/user-service/src/repositories/user.repository.interface';
import { PrismaService } from '@app/shared/prisma/prisma.service';
import {
  UserEntity,
  PaginatedResult,
} from '../../../../libs/shared/src/entities/index';

@Injectable()
export class PostgresUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(userData: Partial<UserEntity>): Promise<UserEntity> {
    return this.prisma.user.create({
      data: {
        email: userData.email!,
        passwordHash: userData.passwordHash!,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        refreshTokenHash: userData.refreshTokenHash,
      },
    });
  }

  update(id: string, userData: Partial<UserEntity>): Promise<UserEntity> {
    return this.prisma.user.update({
      where: { id },
      data: {
        email: userData.email,
        passwordHash: userData.passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        refreshTokenHash: userData.refreshTokenHash,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async findManyWithPagination(params: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<UserEntity>> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 10);
    const skip = (page - 1) * limit;

    const where = params.search
      ? {
          OR: [
            {
              firstName: {
                contains: params.search,
                mode: 'insensitive' as const,
              },
            },
            {
              lastName: {
                contains: params.search,
                mode: 'insensitive' as const,
              },
            },
            {
              email: { contains: params.search, mode: 'insensitive' as const },
            },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          orders: {
            include: { items: { include: { pizza: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
