import { CreateOrderDto } from 'apps/order-service/src/dto/create-order.dto';
import {
  CartItemEntity,
  OrderEntity,
  PromocodeEntity,
  PizzaEntity,
  PaginatedResult,
} from '../../../../libs/shared/src/entities/index';
import { CreatePromocodeDto } from 'apps/order-service/src/dto/create-promocode.dto';

export const ORDER_REPOSITORY = 'ORDER_REPOSITORY';

export interface HighValueUserResult {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  userAverageCheck: number;
  ordersCount: number;
  systemGlobalAverageCheck: number;
}

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
  deleteCartItem(cartItemId: string): Promise<void>;
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
  deleteOrder(orderId: string): Promise<void>;
  findUserOrders(params: {
    userId: string;
    page: number;
    limit: number;
  }): Promise<PaginatedResult<OrderEntity>>;
  findOrderById(orderId: string): Promise<OrderEntity | null>;
  updateOrderStatus(orderId: string, status: string): Promise<OrderEntity>;
  findAllOrdersWithPagination(params: {
    page: number;
    limit: number;
  }): Promise<PaginatedResult<OrderEntity>>;

  // Promo codes
  findPromocodeByCode(code: string): Promise<PromocodeEntity | null>;
  createPromocode(dto: CreatePromocodeDto): Promise<PromocodeEntity>;

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
  getHighValueUsers(): Promise<HighValueUserResult[]>;
}
