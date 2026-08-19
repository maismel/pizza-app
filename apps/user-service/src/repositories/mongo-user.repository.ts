import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUserRepository } from 'apps/user-service/src/repositories/user.repository.interface';
import {
  UserEntity,
  PaginatedResult,
} from '../../../../libs/shared/src/entities/index';

@Injectable()
export class MongoUserRepository implements IUserRepository {
  constructor(@InjectModel('User') private readonly userModel: Model<any>) {}

  // --- Вспомогательный метод маппинга (Mongoose Document -> Entity) ---
  private mapToEntity(doc: any): UserEntity | null {
    if (!doc) return null;
    const { _id, ...rest } = doc.toObject ? doc.toObject() : doc;

    // Если через populate подтянулись заказы, мапим их _id
    if (rest.orders && Array.isArray(rest.orders)) {
      rest.orders = rest.orders.map((order: any) => {
        if (order._id) {
          order.id = order._id.toString();
          delete order._id;
          delete order.__v;
        }
        return order;
      });
    }

    return { id: _id.toString(), ...rest } as UserEntity;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.userModel.findById(id).exec();
    return this.mapToEntity(user);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.userModel.findOne({ email }).exec();
    return this.mapToEntity(user);
  }

  async create(userData: Partial<UserEntity>): Promise<UserEntity> {
    const createdUser = new this.userModel({
      email: userData.email,
      passwordHash: userData.passwordHash,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      refreshTokenHash: userData.refreshTokenHash,
    });

    const savedUser = await createdUser.save();
    return this.mapToEntity(savedUser)!;
  }

  async update(id: string, userData: Partial<UserEntity>): Promise<UserEntity> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: userData },
        { new: true }, // Возвращаем обновленный документ
      )
      .exec();

    return this.mapToEntity(updatedUser)!;
  }

  async delete(id: string): Promise<void> {
    await this.userModel.findByIdAndDelete(id).exec();
  }

  async findManyWithPagination(params: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<UserEntity>> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 10);
    const skip = (page - 1) * limit;

    const query: any = {};

    // Заменяем Prisma OR и insensitive contains на MongoDB $or и RegExp
    if (params.search) {
      const searchRegex = new RegExp(params.search, 'i'); // 'i' делает поиск нечувствиствительным к регистру
      query.$or = [
        { firstName: { $regex: searchRegex } },
        { lastName: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
      ];
    }

    const [data, total] = await Promise.all([
      this.userModel
        .find(query)
        .sort({ createdAt: -1 }) // Аналог orderBy: { createdAt: 'desc' }
        .skip(skip)
        .limit(limit)
        // В Mongoose для связи с другой коллекцией (заказами) используется populate.
        // Чтобы это работало 1 в 1 как в Prisma, у твоей схемы User должен быть настроен Virtual Populate
        .populate({
          path: 'orders',
          populate: { path: 'items.pizza' },
        })
        .exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    return {
      data: data.map((doc) => this.mapToEntity(doc)!),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
