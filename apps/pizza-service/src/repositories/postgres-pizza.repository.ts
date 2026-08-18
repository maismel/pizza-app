import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/shared/prisma/prisma.service';
import { IPizzaRepository } from './pizza.repository.interface';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class PostgresPizzaRepository implements IPizzaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllWithPagination({
    page = 1,
    limit = 10,
  }: {
    page?: number;
    limit?: number;
  }) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.pizza.findMany({
        where: { deletedAt: null, isActive: true },
        skip,
        take: limit,
        include: {
          ingredients: {
            include: { ingredient: true },
          },
        },
      }),
      this.prisma.pizza.count({ where: { deletedAt: null, isActive: true } }),
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

  findById(id: string) {
    return this.prisma.pizza.findFirst({
      where: { id, deletedAt: null },
      include: {
        ingredients: {
          include: { ingredient: true },
        },
      },
    });
  }

  create(data: any) {
    return this.prisma.pizza.create({ data });
  }

  softDelete(id: string) {
    return this.prisma.pizza.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  createIngredient(data: any) {
    return this.prisma.ingredient.create({ data });
  }

  findAllIngredients() {
    return this.prisma.ingredient.findMany();
  }

  async attachIngredients(pizzaId: string, ingredientIds: string[]) {
    await this.prisma.pizzaIngredient.deleteMany({
      where: { pizzaId },
    });

    await this.prisma.pizzaIngredient.createMany({
      data: ingredientIds.map((ingredientId) => ({
        pizzaId,
        ingredientId,
      })),
    });

    return this.findById(pizzaId);
  }

  findIngredientByName(name: string) {
    return this.prisma.ingredient.findUnique({
      where: { name },
    });
  }

  async deletePizzaWithFile(
    id: string,
    imageUrl: string | undefined,
    deleteFileCallback: (url: string) => Promise<void>,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // Delete pizza from database
      await tx.pizza.delete({ where: { id } });

      // If image exists, call file deletion callback
      if (imageUrl) {
        try {
          await deleteFileCallback(imageUrl);
        } catch (error) {
          // On file system error, throw exception -> Prisma automatically rollbacks database deletion!
          throw new RpcException(
            `Failed to delete image file. Aborting pizza deletion: ${(error as Error).message}`,
          );
        }
      }

      return {
        success: true,
        message: 'Pizza and associated image file were successfully deleted',
      };
    });
  }

  // 2. Search for unused pizzas during period
  findUnusedPizzas(sinceDate: Date) {
    return this.prisma.pizza.findMany({
      where: {
        createdAt: { lte: sinceDate },
        orderItems: {
          none: {
            order: {
              createdAt: { gte: sinceDate },
            },
          },
        },
      },
    });
  }
}
