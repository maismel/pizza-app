import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/shared/prisma/prisma.service';
import { IOrderRepository } from './order.repository.interface';

@Injectable()
export class PostgresOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- КОРЗИНА ---

  findCartItems(userId: string) {
    return this.prisma.cartItem.findMany({
      where: { userId },
      include: { pizza: true },
    });
  }

  findCartItem(userId: string, pizzaId: string) {
    return this.prisma.cartItem.findFirst({
      where: { userId, pizzaId },
    });
  }

  findCartItemById(cartItemId: string, userId: string) {
    return this.prisma.cartItem.findFirst({
      where: { id: cartItemId, userId },
    });
  }

  createCartItem(userId: string, pizzaId: string, quantity: number) {
    return this.prisma.cartItem.create({
      data: { userId, pizzaId, quantity },
    });
  }

  updateCartItemQuantity(cartItemId: string, quantity: number) {
    return this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });
  }

  deleteCartItem(cartItemId: string) {
    return this.prisma.cartItem.delete({ where: { id: cartItemId } });
  }

  clearCart(userId: string) {
    return this.prisma.cartItem.deleteMany({ where: { userId } });
  }

  // --- ВАЛИДАЦИЯ ПИЦЦЫ ---

  findPizzaById(pizzaId: string) {
    return this.prisma.pizza.findUnique({ where: { id: pizzaId } });
  }

  // --- ЗАКАЗЫ И ТРАНЗАКЦИИ ---

  createOrderTransaction(data: {
    userId: string;
    dto: any;
    totalAmount: number;
    promocodeId?: string;
    cartItems: any[];
  }) {
    const { userId, dto, totalAmount, promocodeId, cartItems } = data;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
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
              priceAtPurchase: item.pizza.price,
            })),
          },
        },
        include: { items: { include: { pizza: true } } },
      });

      await tx.cartItem.deleteMany({ where: { userId } });

      return order;
    });
  }

  findUserOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: { include: { pizza: true } }, promocode: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOrderById(orderId: string) {
    return this.prisma.order.findUnique({ where: { id: orderId } });
  }

  updateOrderStatus(orderId: string, status: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  }

  async findAllOrdersWithPagination({
    page,
    limit,
  }: {
    page: number;
    limit: number;
  }) {
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
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // --- ПРОМОКОДЫ ---

  findPromocodeByCode(code: string) {
    return this.prisma.promocode.findUnique({ where: { code } });
  }

  createPromocode(dto: any) {
    return this.prisma.promocode.create({
      data: {
        code: dto.code,
        discountPercent: dto.discountPercent,
        validUntil: new Date(dto.validUntil),
      },
    });
  }

  // --- АНАЛИТИКА (RAW SQL) ---

  getMostPopularPizza(month: number, year: number) {
    return this.prisma.$queryRaw<any[]>`
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
  }

  getHighValueUsers() {
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
