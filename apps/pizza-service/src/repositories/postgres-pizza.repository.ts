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
      data: data as unknown as PizzaEntity[],
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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return pizza as unknown as PizzaEntity | null;
  }

  async create(data: CreatePizzaDto): Promise<PizzaEntity> {
    const newPizza = await this.prisma.pizza.create({
      data: {
        name: data.name,
        price: data.price,
        description: data.description,
        imageUrl: data.imageUrl,
        isActive: data.isActive ?? true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return {
      ...newPizza,
      price: Number(newPizza.price),
    } as unknown as PizzaEntity;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.pizza.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async createIngredient(data: CreateIngredientDto): Promise<IngredientEntity> {
    const ingredient = await this.prisma.ingredient.create({
      data: {
        name: data.name,
      },
    });

    return ingredient;
  }

  async findAllIngredients(): Promise<IngredientEntity[]> {
    const ingredients = await this.prisma.ingredient.findMany();

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return ingredients as unknown as IngredientEntity[];
  }

  async attachIngredients(
    pizzaId: string,
    ingredientIds: string[],
  ): Promise<PizzaEntity | null> {
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

  async findIngredientByName(name: string): Promise<IngredientEntity | null> {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { name },
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return ingredient as unknown as IngredientEntity | null;
  }

  async deletePizzaWithFile(
    id: string,
    imageUrl: string | undefined,
    deleteFileCallback: (url: string) => Promise<void>,
  ): Promise<{ success: boolean; message: string }> {
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
  async findUnusedPizzas(sinceDate: Date): Promise<PizzaEntity[]> {
    const pizzas = await this.prisma.pizza.findMany({
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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return pizzas as unknown as PizzaEntity[];
  }
}
