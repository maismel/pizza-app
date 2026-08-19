import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import {
  HighValueUserResult,
  IOrderRepository,
} from './order.repository.interface';
import {
  CartItemEntity,
  OrderEntity,
  PizzaEntity,
  PromocodeEntity,
  PaginatedResult,
} from '../../../../libs/shared/src/entities/index';
import { CreatePromocodeDto } from 'apps/order-service/src/dto/create-promocode.dto';
import { CreateOrderDto } from 'apps/order-service/src/dto/create-order.dto';

@Injectable()
export class MongoOrderRepository implements IOrderRepository {
  constructor(
    @InjectModel('CartItem') private readonly cartItemModel: Model<any>,
    @InjectModel('Order') private readonly orderModel: Model<any>,
    @InjectModel('Pizza') private readonly pizzaModel: Model<any>,
    @InjectModel('Promocode') private readonly promocodeModel: Model<any>,
    @InjectModel('User') private readonly userModel: Model<any>,
  ) {}

  // --- Вспомогательный метод маппинга (Mongoose Document -> Entity) ---
  private mapToEntity<T>(doc: any): T | null {
    if (!doc) return null;
    const { _id, ...rest } = doc.toObject ? doc.toObject() : doc;

    // Маппинг вложенных связей (populated fields)
    if (rest.pizza && rest.pizza._id) {
      rest.pizza.id = rest.pizza._id.toString();
      delete rest.pizza._id;
      delete rest.pizza.__v;
    }

    if (rest.promocode && rest.promocode._id) {
      rest.promocode.id = rest.promocode._id.toString();
      delete rest.promocode._id;
      delete rest.promocode.__v;
    }

    if (rest.user && rest.user._id) {
      rest.user.id = rest.user._id.toString();
      delete rest.user._id;
      delete rest.user.__v;
    }

    if (rest.items && Array.isArray(rest.items)) {
      rest.items = rest.items.map((item: any) => {
        if (item.pizza && item.pizza._id) {
          item.pizza.id = item.pizza._id.toString();
          delete item.pizza._id;
          delete item.pizza.__v;
        }
        return item;
      });
    }

    return { id: _id.toString(), ...rest };
  }

  // --- CART ---

  async findCartItems(userId: string): Promise<CartItemEntity[]> {
    const items = await this.cartItemModel
      .find({ userId })
      .populate('pizza')
      .exec();
    return items.map((doc) => this.mapToEntity<CartItemEntity>(doc)!);
  }

  async findCartItem(
    userId: string,
    pizzaId: string,
  ): Promise<CartItemEntity | null> {
    const item = await this.cartItemModel
      .findOne({ userId, pizzaId })
      .populate('pizza')
      .exec();
    return this.mapToEntity<CartItemEntity>(item);
  }

  async findCartItemById(
    cartItemId: string,
    userId: string,
  ): Promise<CartItemEntity | null> {
    const item = await this.cartItemModel
      .findOne({ _id: cartItemId, userId })
      .populate('pizza')
      .exec();
    return this.mapToEntity<CartItemEntity>(item);
  }

  async createCartItem(
    userId: string,
    pizzaId: string,
    quantity: number,
  ): Promise<CartItemEntity> {
    const created = new this.cartItemModel({ userId, pizzaId, quantity });
    const saved = await created.save();
    const populated = await saved.populate('pizza');
    return this.mapToEntity<CartItemEntity>(populated)!;
  }

  async updateCartItemQuantity(
    cartItemId: string,
    quantity: number,
  ): Promise<CartItemEntity> {
    const updated = await this.cartItemModel
      .findByIdAndUpdate(cartItemId, { $set: { quantity } }, { new: true })
      .populate('pizza')
      .exec();
    return this.mapToEntity<CartItemEntity>(updated)!;
  }

  async deleteCartItem(cartItemId: string): Promise<void> {
    await this.cartItemModel.findByIdAndDelete(cartItemId).exec();
  }

  async clearCart(userId: string): Promise<void> {
    await this.cartItemModel.deleteMany({ userId }).exec();
  }

  // --- PIZZA VALIDATION ---

  async findPizzaById(pizzaId: string): Promise<PizzaEntity | null> {
    const pizza = await this.pizzaModel.findById(pizzaId).exec();
    return this.mapToEntity<PizzaEntity>(pizza);
  }

  // --- ORDERS AND TRANSACTIONS ---

  async createOrderTransaction(data: {
    userId: string;
    dto: CreateOrderDto;
    totalAmount: number;
    promocodeId?: string;
    cartItems: CartItemEntity[];
  }): Promise<OrderEntity> {
    const { userId, dto, totalAmount, promocodeId, cartItems } = data;

    // В MongoDB транзакции требуют работы с сессией
    const session: ClientSession = await this.orderModel.db.startSession();
    session.startTransaction();

    try {
      const createdOrder = new this.orderModel({
        userId,
        address: dto.address,
        deliveryMethod: dto.deliveryMethod,
        paymentMethod: dto.paymentMethod,
        comment: dto.comment,
        promocode: promocodeId, // Ссылка (ObjectId) на промокод
        totalAmount,
        status: 'pending',
        items: cartItems.map((item) => ({
          pizza: item.pizzaId,
          quantity: item.quantity,
          priceAtPurchase: item.pizza ? item.pizza.price : 0,
        })),
      });

      const savedOrder = await createdOrder.save({ session });

      // Очищаем корзину в рамках той же транзакции
      await this.cartItemModel.deleteMany({ userId }).session(session);

      await session.commitTransaction();

      // Подтягиваем связи перед возвратом
      const populatedOrder = await this.orderModel
        .findById(savedOrder._id)
        .populate('items.pizza')
        .populate('promocode')
        .exec();

      return this.mapToEntity<OrderEntity>(populatedOrder)!;
    } catch (error) {
      await session.abortTransaction();
      throw new RpcException('Transaction failed: ' + (error as Error).message);
    } finally {
      session.endSession();
    }
  }

  async deleteOrder(orderId: string): Promise<void> {
    await this.orderModel.findByIdAndDelete(orderId).exec();
  }

  async findUserOrders(params: {
    userId: string;
    page: number;
    limit: number;
  }): Promise<PaginatedResult<OrderEntity>> {
    const { userId, page, limit } = params;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.orderModel
        .find({ userId })
        .sort({ createdAt: -1 }) // Аналог orderBy: { createdAt: 'desc' }
        .skip(skip)
        .limit(limit)
        .populate('items.pizza')
        .populate('promocode')
        .exec(),
      this.orderModel.countDocuments({ userId }).exec(),
    ]);

    return {
      data: data.map((doc) => this.mapToEntity<OrderEntity>(doc)!),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOrderById(orderId: string): Promise<OrderEntity | null> {
    const order = await this.orderModel
      .findById(orderId)
      .populate('items.pizza')
      .populate('promocode')
      .exec();
    return this.mapToEntity<OrderEntity>(order);
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
  ): Promise<OrderEntity> {
    const updated = await this.orderModel
      .findByIdAndUpdate(orderId, { $set: { status } }, { new: true })
      .populate('items.pizza')
      .populate('promocode')
      .exec();
    return this.mapToEntity<OrderEntity>(updated)!;
  }

  async findAllOrdersWithPagination({
    page,
    limit,
  }: {
    page: number;
    limit: number;
  }): Promise<PaginatedResult<OrderEntity>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.orderModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'email firstName lastName') // select для юзера
        .populate('items.pizza')
        .populate('promocode')
        .exec(),
      this.orderModel.countDocuments().exec(),
    ]);

    return {
      data: data.map((doc) => this.mapToEntity<OrderEntity>(doc)!),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // --- PROMO CODES ---

  async findPromocodeByCode(code: string): Promise<PromocodeEntity | null> {
    const promo = await this.promocodeModel.findOne({ code }).exec();
    return this.mapToEntity<PromocodeEntity>(promo);
  }

  async createPromocode(dto: CreatePromocodeDto): Promise<PromocodeEntity> {
    const created = new this.promocodeModel({
      code: dto.code,
      discountPercent: dto.discountPercent,
      validUntil: new Date(dto.validUntil),
    });
    const saved = await created.save();
    return this.mapToEntity<PromocodeEntity>(saved)!;
  }

  // --- ANALYTICS (MongoDB Aggregation Pipelines) ---

  async getMostPopularPizza(
    month: number,
    year: number,
  ): Promise<{
    id: string;
    name: string;
    description: string | null;
    totalOrdered: number;
  } | null> {
    // Границы месяца для поиска
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const result = await this.orderModel.aggregate([
      // 1. Фильтр заказов по дате
      { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
      // 2. Разворачиваем массив items, чтобы работать с каждым как с отдельной строкой
      { $unwind: '$items' },
      // 3. Группируем по ID пиццы и суммируем quantity
      {
        $group: {
          _id: '$items.pizza',
          totalOrdered: { $sum: '$items.quantity' },
        },
      },
      // 4. Сортируем по убыванию и берем самый первый (LIMIT 1)
      { $sort: { totalOrdered: -1 } },
      { $limit: 1 },
      // 5. Джойним коллекцию пицц
      {
        $lookup: {
          from: 'pizzas',
          localField: '_id',
          foreignField: '_id',
          as: 'pizzaInfo',
        },
      },
      { $unwind: '$pizzaInfo' },
    ]);

    if (!result || result.length === 0) {
      return null;
    }

    return {
      id: result[0]._id.toString(),
      name: result[0].pizzaInfo.name,
      description: result[0].pizzaInfo.description || null,
      totalOrdered: result[0].totalOrdered,
    };
  }

  async getHighValueUsers(): Promise<HighValueUserResult[]> {
    // 1. Вычисляем глобальный средний чек
    const globalStats = await this.orderModel.aggregate([
      { $group: { _id: null, global_avg: { $avg: '$totalAmount' } } },
    ]);
    const globalAvg = globalStats.length > 0 ? globalStats[0].global_avg : 0;

    // 2. Ищем пользователей с >= 3 заказами и средним чеком выше глобального
    const usersStats = await this.orderModel.aggregate([
      {
        $group: {
          _id: '$userId', // Если userId - строка в Mongo, группировка пройдет без проблем
          order_count: { $sum: 1 },
          user_avg: { $avg: '$totalAmount' },
        },
      },
      // Аналог HAVING в SQL
      {
        $match: {
          order_count: { $gte: 3 },
          user_avg: { $gte: globalAvg },
        },
      },
      // 3. (Опционально) Джойним коллекцию юзеров, если они в одной БД.
      // Если пользователи лежат в PostgreSQL, этот шаг придется выносить в OrderService (отправка запроса в UserService).
      // Предполагаем, что они здесь же в MongoDB:
      {
        $lookup: {
          from: 'users',
          let: { userIdStr: '$_id' }, // Если ID пользователя сохранен как строка
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', { $toObjectId: '$$userIdStr' }] },
              },
            },
          ],
          as: 'user',
        },
      },
      { $unwind: '$user' },
    ]);

    return usersStats.map((stat) => ({
      id: stat.user._id.toString(),
      email: stat.user.email,
      firstName: stat.user.firstName || null,
      lastName: stat.user.lastName || null,
      userAverageCheck: stat.user_avg,
      ordersCount: stat.order_count,
      systemGlobalAverageCheck: globalAvg,
    }));
  }
}
