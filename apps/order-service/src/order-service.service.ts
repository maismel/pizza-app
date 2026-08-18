import { Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreatePromocodeDto } from './dto/create-promocode.dto';
import {
  type IOrderRepository,
  ORDER_REPOSITORY,
} from './repositories/order.repository.interface';

@Injectable()
export class OrderService {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
  ) {}

  getCart(userId: string) {
    return this.orderRepository.findCartItems(userId);
  }

  async addToCart(userId: string, dto: AddToCartDto) {
    const pizza = await this.orderRepository.findPizzaById(dto.pizzaId);

    if (!pizza || !pizza.isActive || pizza.deletedAt) {
      throw new RpcException('Pizza is not available for order');
    }

    const existingItem = await this.orderRepository.findCartItem(
      userId,
      dto.pizzaId,
    );

    if (existingItem) {
      return this.orderRepository.updateCartItemQuantity(
        existingItem.id,
        existingItem.quantity + dto.quantity,
      );
    }

    return this.orderRepository.createCartItem(
      userId,
      dto.pizzaId,
      dto.quantity,
    );
  }

  async removeFromCart(userId: string, cartItemId: string) {
    const item = await this.orderRepository.findCartItemById(
      cartItemId,
      userId,
    );

    if (!item) {
      throw new RpcException('Cart item not found');
    }

    await this.orderRepository.deleteCartItem(cartItemId);
    return { success: true };
  }

  async updateCartQuantity(
    userId: string,
    cartItemId: string,
    quantity: number,
  ) {
    const item = await this.orderRepository.findCartItemById(
      cartItemId,
      userId,
    );

    if (!item) {
      throw new RpcException('Cart item not found');
    }

    if (quantity <= 0) {
      await this.orderRepository.deleteCartItem(cartItemId);
      return { success: true, message: 'Item removed from cart' };
    }

    return this.orderRepository.updateCartItemQuantity(cartItemId, quantity);
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    const cartItems = await this.orderRepository.findCartItems(userId);

    if (cartItems.length === 0) {
      throw new RpcException('Your cart is empty');
    }

    let rawTotal = cartItems.reduce((sum, item) => {
      return sum + Number(item.pizza?.price) * item.quantity;
    }, 0);

    let promocodeId: string | undefined = undefined;

    if (dto.promocodeCode) {
      const promocode = await this.orderRepository.findPromocodeByCode(
        dto.promocodeCode,
      );

      if (!promocode || promocode.validUntil < new Date()) {
        throw new RpcException('Invalid or expired promo code');
      }

      promocodeId = promocode.id;
      rawTotal = rawTotal * (1 - promocode.discountPercent / 100);
    }

    return this.orderRepository.createOrderTransaction({
      userId,
      dto,
      totalAmount: rawTotal,
      promocodeId,
      cartItems,
    });
  }

  getUserOrders(userId: string) {
    return this.orderRepository.findUserOrders(userId);
  }

  async updateOrderStatus(orderId: string, status: string) {
    const order = await this.orderRepository.findOrderById(orderId);
    if (!order) {
      throw new RpcException('Order not found');
    }

    return this.orderRepository.updateOrderStatus(orderId, status);
  }

  // --- PROMO CODES ---

  async createPromocode(dto: CreatePromocodeDto) {
    const existing = await this.orderRepository.findPromocodeByCode(dto.code);

    if (existing) {
      throw new RpcException('Promo code with this text already exists');
    }

    return this.orderRepository.createPromocode(dto);
  }

  // --- PAGINATION (Admin) ---

  async getAllOrdersWithPagination(page = 1, limit = 10) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Number(limit) || 10);

    return this.orderRepository.findAllOrdersWithPagination({
      page: p,
      limit: l,
    });
  }

  // --- ANALYTICS ---

  async getMostPopularPizza(month: number, year: number) {
    const result = await this.orderRepository.getMostPopularPizza(month, year);

    if (!result) {
      return { message: 'No orders found for the selected month' };
    }

    return result[0];
  }

  getHighValueUsers() {
    return this.orderRepository.getHighValueUsers();
  }
}
