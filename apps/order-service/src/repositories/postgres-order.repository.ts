import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/shared/prisma/prisma.service';
import { IOrderRepository } from './order.repository.interface';
import {
  CartItemEntity,
  OrderEntity,
  PizzaEntity,
  PromocodeEntity,
  PaginatedResult,
} from '../../../../libs/shared/src/entities/index';
import { CreatePromocodeDto } from 'apps/order-service/src/dto/create-promocode.dto';

@Injectable()
export class PostgresOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- CART ---

  async findCartItems(userId: string): Promise<CartItemEntity[]> {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: { pizza: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return items as unknown as CartItemEntity[];
  }

  async findCartItem(
    userId: string,
    pizzaId: string,
  ): Promise<CartItemEntity | null> {
    const item = await this.prisma.cartItem.findFirst({
      where: { userId, pizzaId },
      include: { pizza: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return item as unknown as CartItemEntity | null;
  }

  async findCartItemById(
    cartItemId: string,
    userId: string,
  ): Promise<CartItemEntity | null> {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, userId },
      include: { pizza: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return item as unknown as CartItemEntity | null;
  }

  async createCartItem(
    userId: string,
    pizzaId: string,
    quantity: number,
  ): Promise<CartItemEntity> {
    const item = await this.prisma.cartItem.create({
      data: { userId, pizzaId, quantity },
      include: { pizza: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return item as unknown as CartItemEntity;
  }

  async updateCartItemQuantity(
    cartItemId: string,
    quantity: number,
  ): Promise<CartItemEntity> {
    const item = await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
      include: { pizza: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return item as unknown as CartItemEntity;
  }

  async deleteCartItem(cartItemId: string): Promise<void> {
    await this.prisma.cartItem.delete({ where: { id: cartItemId } });
  }

  async clearCart(userId: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
  }

  // --- PIZZA VALIDATION ---

  async findPizzaById(pizzaId: string): Promise<PizzaEntity | null> {
    const pizza = await this.prisma.pizza.findUnique({
      where: { id: pizzaId },
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return pizza as unknown as PizzaEntity | null;
  }

  // --- ORDERS AND TRANSACTIONS ---

  async createOrderTransaction(data: {
    userId: string;
    dto: any;
    totalAmount: number;
    promocodeId?: string;
    cartItems: CartItemEntity[];
  }): Promise<OrderEntity> {
    const { userId, dto, totalAmount, promocodeId, cartItems } = data;

    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId,
          address: dto.address,
          deliveryMethod: dto.deliveryMethod,
          paymentMethod: dto.paymentMethod,
          comment: dto.comment,
          promocodeId,
          totalAmount,
          status: 'pending',
          items: {
            create: cartItems.map((item) => ({
              pizzaId: item.pizzaId,
              quantity: item.quantity,
              priceAtPurchase: item.pizza ? Number(item.pizza.price) : 0,
            })),
          },
        },
        include: { items: { include: { pizza: true } }, promocode: true },
      });

      await tx.cartItem.deleteMany({ where: { userId } });

      return createdOrder;
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return order as unknown as OrderEntity;
  }

  async findUserOrders(userId: string): Promise<OrderEntity[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { items: { include: { pizza: true } }, promocode: true },
      orderBy: { createdAt: 'desc' },
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return orders as unknown as OrderEntity[];
  }

  async findOrderById(orderId: string): Promise<OrderEntity | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { pizza: true } }, promocode: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return order as unknown as OrderEntity | null;
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
  ): Promise<OrderEntity> {
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: { items: { include: { pizza: true } }, promocode: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return updatedOrder as unknown as OrderEntity;
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
      this.prisma.order.findMany({
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          items: { include: { pizza: true } },
          promocode: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count(),
    ]);

    return {
      data: data as unknown as OrderEntity[],
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // --- PROMO CODES ---

  async findPromocodeByCode(code: string): Promise<PromocodeEntity | null> {
    const promocode = await this.prisma.promocode.findUnique({
      where: { code },
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return promocode as unknown as PromocodeEntity | null;
  }

  async createPromocode(dto: CreatePromocodeDto): Promise<PromocodeEntity> {
    const promocode = await this.prisma.promocode.create({
      data: {
        code: dto.code,
        discountPercent: dto.discountPercent,
        validUntil: new Date(dto.validUntil),
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return promocode as unknown as PromocodeEntity;
  }

  // --- ANALYTICS (RAW SQL) ---

  async getMostPopularPizza(
    month: number,
    year: number,
  ): Promise<{
    id: string;
    name: string;
    description: string | null;
    totalOrdered: number;
  } | null> {
    const result = await this.prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        description: string | null;
        totalOrdered: number;
      }>
    >`
      SELECT 
        p.id, 
        p.name, 
        p.description,
        SUM(oi.quantity)::INT as "totalOrdered"
      FROM order_items oi
      JOIN orders o ON oi."orderId" = o.id
      JOIN pizzas p ON oi."pizzaId" = p.id
      WHERE EXTRACT(MONTH FROM o."createdAt") = ${month}
        AND EXTRACT(YEAR FROM o."createdAt") = ${year}
      GROUP BY p.id, p.name, p.description
      ORDER BY "totalOrdered" DESC
      LIMIT 1;
    `;

    if (!result || result.length === 0) {
      return null;
    }

    return {
      id: result[0].id,
      name: result[0].name,
      description: result[0].description,
      totalOrdered: Number(result[0].totalOrdered),
    };
  }

  getHighValueUsers(): Promise<any[]> {
    return this.prisma.$queryRaw<any[]>`
      WITH global_stats AS (
        SELECT COALESCE(AVG("totalAmount"), 0) as global_avg FROM orders
      ),
      user_stats AS (
        SELECT 
          "userId", 
          COUNT(id) as order_count, 
          AVG("totalAmount") as user_avg
        FROM orders
        GROUP BY "userId"
        HAVING COUNT(id) >= 3
      )
      SELECT 
        u.id, 
        u.email, 
        u."firstName", 
        u."lastName",
        us.user_avg::FLOAT as "userAverageCheck",
        us.order_count::INT as "ordersCount",
        gs.global_avg::FLOAT as "systemGlobalAverageCheck"
      FROM user_stats us
      CROSS JOIN global_stats gs
      JOIN users u ON us."userId" = u.id
      WHERE us.user_avg >= gs.global_avg;
    `;
  }
}
