import { CreateOrderDto } from 'apps/order-service/src/dto/create-order.dto';
import {
  CartItemEntity,
  OrderEntity,
  PromocodeEntity,
  PizzaEntity,
  PaginatedResult,
} from '../../../../libs/shared/src/entities/index';

export const ORDER_REPOSITORY = 'ORDER_REPOSITORY';

export interface IOrderRepository {
  // Cart
  findCartItems(userId: string): Promise<CartItemEntity[]>;
  findCartItem(userId: string, pizzaId: string): Promise<CartItemEntity | null>;
  findCartItemById(
    cartItemId: string,
    userId: string,
  ): Promise<CartItemEntity | null>;
  createCartItem(
    userId: string,
    pizzaId: string,
    quantity: number,
  ): Promise<CartItemEntity>;
  updateCartItemQuantity(
    cartItemId: string,
    quantity: number,
  ): Promise<CartItemEntity>;
  deleteCartItem(cartItemId: string): Promise<CartItemEntity>;
  clearCart(userId: string): Promise<void>;

  findPizzaById(pizzaId: string): Promise<PizzaEntity | null>;

  // Orders and transactions
  createOrderTransaction(data: {
    userId: string;
    dto: CreateOrderDto;
    totalAmount: number;
    promocodeId?: string;
    cartItems: CartItemEntity[];
  }): Promise<OrderEntity>;
  findUserOrders(userId: string): Promise<OrderEntity[]>;
  findOrderById(orderId: string): Promise<OrderEntity | null>;
  updateOrderStatus(orderId: string, status: string): Promise<OrderEntity>;
  findAllOrdersWithPagination(params: {
    page: number;
    limit: number;
  }): Promise<PaginatedResult<OrderEntity>>;

  // Promo codes
  findPromocodeByCode(code: string): Promise<PromocodeEntity | null>;
  createPromocode(dto: Partial<PromocodeEntity>): Promise<PromocodeEntity>;

  // Analytics using raw SQL
  getMostPopularPizza(
    month: number,
    year: number,
  ): Promise<{
    id: string;
    name: string;
    description: string | null;
    totalOrdered: number;
  } | null>;
  getHighValueUsers(): Promise<any[]>; // Можно описать отдельный интерфейс для статистики пользователей
}
