import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrderService } from './order-service.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreatePromocodeDto } from 'apps/order-service/src/dto/create-promocode.dto';

@Controller()
export class OrderServiceController {
  constructor(private readonly orderService: OrderService) {}

  @MessagePattern({ cmd: 'get_cart' })
  getCart(@Payload() userId: string) {
    return this.orderService.getCart(userId);
  }

  @MessagePattern({ cmd: 'add_to_cart' })
  addToCart(@Payload() data: { userId: string; dto: AddToCartDto }) {
    return this.orderService.addToCart(data.userId, data.dto);
  }

  @MessagePattern({ cmd: 'remove_from_cart' })
  removeFromCart(@Payload() data: { userId: string; cartItemId: string }) {
    return this.orderService.removeFromCart(data.userId, data.cartItemId);
  }

  @MessagePattern({ cmd: 'create_order' })
  createOrder(@Payload() data: { userId: string; dto: CreateOrderDto }) {
    return this.orderService.createOrder(data.userId, data.dto);
  }

  @MessagePattern({ cmd: 'get_user_orders' })
  getUserOrders(@Payload() userId: string) {
    return this.orderService.getUserOrders(userId);
  }

  @MessagePattern({ cmd: 'update_order_status' })
  updateOrderStatus(@Payload() data: { orderId: string; status: string }) {
    return this.orderService.updateOrderStatus(data.orderId, data.status);
  }

  @MessagePattern({ cmd: 'update_cart_quantity' })
  async updateCartQuantity(
    @Payload() data: { userId: string; cartItemId: string; quantity: number },
  ) {
    return this.orderService.updateCartQuantity(
      data.userId,
      data.cartItemId,
      data.quantity,
    );
  }

  @MessagePattern({ cmd: 'create_promocode' })
  async createPromocode(@Payload() dto: CreatePromocodeDto) {
    return this.orderService.createPromocode(dto);
  }

  @MessagePattern({ cmd: 'get_all_orders_admin' })
  async getAllOrdersAdmin(@Payload() query: { page?: number; limit?: number }) {
    return this.orderService.getAllOrdersWithPagination(
      query.page,
      query.limit,
    );
  }

  @MessagePattern({ cmd: 'get_most_popular_pizza' })
  async getMostPopularPizza(@Payload() data: { month: number; year: number }) {
    return this.orderService.getMostPopularPizza(data.month, data.year);
  }

  @MessagePattern({ cmd: 'get_high_value_users' })
  getHighValueUsers() {
    return this.orderService.getHighValueUsers();
  }
}
