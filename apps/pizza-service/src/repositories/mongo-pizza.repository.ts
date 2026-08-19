import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { IPizzaRepository } from './pizza.repository.interface';
import {
  PizzaEntity,
  IngredientEntity,
  PaginatedResult,
} from '../../../../libs/shared/src/entities/index';
import { CreateIngredientDto } from 'apps/pizza-service/src/dto/create-ingredient.dto';
import { CreatePizzaDto } from 'apps/pizza-service/src/dto/create-pizza.dto';

@Injectable()
export class MongoPizzaRepository implements IPizzaRepository {
  constructor(
    @InjectModel('Pizza') private readonly pizzaModel: Model<any>,
    @InjectModel('Ingredient') private readonly ingredientModel: Model<any>,
    @InjectModel('Order') private readonly orderModel: Model<any>, // Для findUnusedPizzas
  ) {}

  // --- Вспомогательные методы маппинга (Mongoose Document -> Entity) ---

  private mapIngredient(doc: any): IngredientEntity | null {
    if (!doc) return null;
    const { _id, ...rest } = doc.toObject ? doc.toObject() : doc;
    return { id: _id.toString(), ...rest } as IngredientEntity;
  }

  private mapPizza(doc: any): PizzaEntity | null {
    if (!doc) return null;
    const { _id, ingredients, ...rest } = doc.toObject ? doc.toObject() : doc;

    return {
      id: _id.toString(),
      ...rest,
      // Если ингредиенты сджойнены (populated), мапим их, иначе возвращаем пустой массив
      ingredients: Array.isArray(ingredients)
        ? ingredients.map((i: any) =>
            i._id ? this.mapIngredient(i) : i.toString(),
          )
        : [],
    } as PizzaEntity;
  }

  // --- Основные методы (Пиццы) ---

  async findAllWithPagination({
    page = 1,
    limit = 10,
  }: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<PizzaEntity>> {
    const skip = (page - 1) * limit;
    const query = { deletedAt: null, isActive: true };

    const [data, total] = await Promise.all([
      this.pizzaModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .populate('ingredients') // MongoDB автоматически "джойнит" коллекцию ингредиентов
        .exec(),
      this.pizzaModel.countDocuments(query).exec(),
    ]);

    return {
      data: data.map((doc) => this.mapPizza(doc)!),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<PizzaEntity | null> {
    const pizza = await this.pizzaModel
      .findOne({ _id: id, deletedAt: null })
      .populate('ingredients')
      .exec();

    return this.mapPizza(pizza);
  }

  async create(data: CreatePizzaDto): Promise<PizzaEntity> {
    const createdPizza = new this.pizzaModel({
      name: data.name,
      price: data.price,
      description: data.description,
      imageUrl: data.imageUrl,
      isActive: data.isActive ?? true,
      ingredients: [],
    });

    const saved = await createdPizza.save();
    return this.mapPizza(saved)!;
  }

  async softDelete(id: string): Promise<void> {
    await this.pizzaModel
      .findByIdAndUpdate(id, {
        $set: { deletedAt: new Date(), isActive: false },
      })
      .exec();
  }

  // Транзакционное удаление пиццы и физического файла
  async deletePizzaWithFile(
    id: string,
    imageUrl: string | undefined,
    deleteFileCallback: (url: string) => Promise<void>,
  ): Promise<{ success: boolean; message: string }> {
    const session: ClientSession = await this.pizzaModel.db.startSession();
    session.startTransaction();

    try {
      await this.pizzaModel.findByIdAndDelete(id, { session }).exec();

      if (imageUrl) {
        try {
          await deleteFileCallback(imageUrl);
        } catch (error) {
          throw new RpcException(
            `Failed to delete image file. Aborting pizza deletion: ${(error as Error).message}`,
          );
        }
      }

      await session.commitTransaction();
      return {
        success: true,
        message: 'Pizza and associated image file were successfully deleted',
      };
    } catch (error) {
      await session.abortTransaction();
      throw error; // Прокидываем ошибку выше
    } finally {
      session.endSession();
    }
  }

  // Сложный аналитический запрос через Aggregation Pipeline
  async findUnusedPizzas(sinceDate: Date): Promise<PizzaEntity[]> {
    const unusedDocs = await this.pizzaModel.aggregate([
      // 1. Берем все пиццы, созданные ДО указанной даты
      { $match: { createdAt: { $lte: sinceDate } } },

      // 2. Джойним коллекцию заказов для проверки активности
      {
        $lookup: {
          from: 'orders', // Название коллекции заказов в MongoDB
          let: { pizzaId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    // Заказ должен быть свежим (ПОСЛЕ sinceDate)
                    { $gte: ['$createdAt', sinceDate] },
                    // Эта пицца должна присутствовать в массиве items.pizza заказа
                    { $in: ['$$pizzaId', '$items.pizza'] },
                  ],
                },
              },
            },
          ],
          as: 'recentOrders',
        },
      },

      // 3. Оставляем только те пиццы, для которых не нашлось свежих заказов (массив пуст)
      { $match: { recentOrders: { $size: 0 } } },
    ]);

    return unusedDocs.map((doc) => this.mapPizza(doc)!);
  }

  // --- Основные методы (Ингредиенты) ---

  async createIngredient(data: CreateIngredientDto): Promise<IngredientEntity> {
    const ingredient = new this.ingredientModel({ name: data.name });
    const saved = await ingredient.save();
    return this.mapIngredient(saved)!;
  }

  async findAllIngredients(): Promise<IngredientEntity[]> {
    const ingredients = await this.ingredientModel.find().exec();
    return ingredients.map((doc) => this.mapIngredient(doc)!);
  }

  async findIngredientByName(name: string): Promise<IngredientEntity | null> {
    const ingredient = await this.ingredientModel.findOne({ name }).exec();
    return this.mapIngredient(ingredient);
  }

  // В MongoDB привязка "многие ко многим" это просто перезапись массива ObjectId
  async attachIngredients(
    pizzaId: string,
    ingredientIds: string[],
  ): Promise<PizzaEntity | null> {
    const updatedPizza = await this.pizzaModel
      .findByIdAndUpdate(
        pizzaId,
        { $set: { ingredients: ingredientIds } },
        { new: true }, // Возвращаем уже обновленный документ
      )
      .populate('ingredients')
      .exec();

    return this.mapPizza(updatedPizza);
  }
}
