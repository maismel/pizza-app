import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/shared/prisma/prisma.service';
import { IPizzaRepository } from './pizza.repository.interface';
import { RpcException } from '@nestjs/microservices';
import {
  PizzaEntity,
  IngredientEntity,
  PaginatedResult,
} from '../../../../libs/shared/src/entities/index';
import { CreateIngredientDto } from 'apps/pizza-service/src/dto/create-ingredient.dto';
import { CreatePizzaDto } from 'apps/pizza-service/src/dto/create-pizza.dto';

@Injectable()
export class PostgresPizzaRepository implements IPizzaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllWithPagination({
    page = 1,
    limit = 10,
  }: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<PizzaEntity>> {
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
      data: data.map((pizza) => ({
        ...pizza,
        ingredients: pizza.ingredients.map((pi) => pi.ingredient),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<PizzaEntity | null> {
    const pizza = await this.prisma.pizza.findFirst({
      where: { id, deletedAt: null },
      include: {
        ingredients: {
          include: { ingredient: true },
        },
      },
    });

    if (!pizza) return null;

    return {
      ...pizza,
      ingredients: pizza.ingredients.map((pi) => pi.ingredient),
    };
  }

  create(data: CreatePizzaDto): Promise<PizzaEntity> {
    return this.prisma.pizza.create({
      data: {
        name: data.name,
        price: data.price,
        description: data.description,
        imageUrl: data.imageUrl,
        isActive: data.isActive ?? true,
      },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.pizza.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  createIngredient(data: CreateIngredientDto): Promise<IngredientEntity> {
    return this.prisma.ingredient.create({
      data: { name: data.name },
    });
  }

  findAllIngredients(): Promise<IngredientEntity[]> {
    return this.prisma.ingredient.findMany();
  }

  async attachIngredients(
    pizzaId: string,
    ingredientIds: string[],
  ): Promise<PizzaEntity | null> {
    await this.prisma.$transaction(async (tx) => {
      await tx.pizzaIngredient.deleteMany({
        where: { pizzaId },
      });

      await tx.pizzaIngredient.createMany({
        data: ingredientIds.map((ingredientId) => ({
          pizzaId,
          ingredientId,
        })),
      });
    });

    return this.findById(pizzaId);
  }

  findIngredientByName(name: string): Promise<IngredientEntity | null> {
    return this.prisma.ingredient.findUnique({
      where: { name },
    });
  }

  async deletePizzaWithFile(
    id: string,
    imageUrl: string | undefined,
    deleteFileCallback: (url: string) => Promise<void>,
  ): Promise<{ success: boolean; message: string }> {
    return await this.prisma.$transaction(async (tx) => {
      await tx.pizza.delete({ where: { id } });

      if (imageUrl) {
        try {
          await deleteFileCallback(imageUrl);
        } catch (error) {
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

  findUnusedPizzas(sinceDate: Date): Promise<PizzaEntity[]> {
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
