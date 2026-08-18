import { Injectable } from '@nestjs/common';
import { IUserRepository } from 'apps/user-service/src/repositories/user.repository.interface';
import { PrismaService } from '@app/shared/prisma/prisma.service';
import { UserEntity } from '@app/shared';

@Injectable()
export class PostgresUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<any> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<any> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(userData: any): Promise<any> {
    return this.prisma.user.create({ data: userData });
  }

  update(id: string, userData: any): Promise<any> {
    return this.prisma.user.update({
      where: { id },
      data: userData,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async findManyWithPagination(params: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
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
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          orders: {
            include: { items: { include: { pizza: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data as unknown as UserEntity[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
