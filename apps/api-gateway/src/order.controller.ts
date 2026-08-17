import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Inject,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { CurrentUser } from './auth/current-user.decorator';
import { AddToCartDto } from '../../order-service/src/dto/add-to-cart.dto';
import { CreateOrderDto } from '../../order-service/src/dto/create-order.dto';
import { CreatePromocodeDto } from 'apps/order-service/src/dto/create-promocode.dto';

@ApiTags('Orders & Cart 🛒')
@ApiBearerAuth() // <-- Применяет авторизацию Bearer токеном ко ВСЕМ эндпоинтам контроллера
@UseGuards(JwtAuthGuard)
@Controller()
export class OrderController {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
  ) {}

  // --- КОРЗИНА ---

  @ApiOperation({ summary: 'Get current user cart' })
  @Get('cart')
  async getCart(@CurrentUser('userId') userId: string) {
    return await firstValueFrom(
      this.orderClient.send({ cmd: 'get_cart' }, userId),
    );
  }

  @ApiOperation({ summary: 'Add pizza to cart' })
  @Post('cart')
  async addToCart(
    @CurrentUser('userId') userId: string,
    @Body() dto: AddToCartDto,
  ) {
    return await firstValueFrom(
      this.orderClient.send({ cmd: 'add_to_cart' }, { userId, dto }),
    );
  }

  @ApiOperation({ summary: 'Remove item from cart by ID' })
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @Delete('cart/:id')
  async removeFromCart(
    @CurrentUser('userId') userId: string,
    @Param('id') cartItemId: string,
  ) {
    return await firstValueFrom(
      this.orderClient.send(
        { cmd: 'remove_from_cart' },
        { userId, cartItemId },
      ),
    );
  }

  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        quantity: { type: 'number', example: 3, minimum: 1 },
      },
    },
  })
  @Patch('cart/:id')
  async updateCartQuantity(
    @CurrentUser('userId') userId: string,
    @Param('id') cartItemId: string,
    @Body('quantity') quantity: number,
  ) {
    return await firstValueFrom(
      this.orderClient.send(
        { cmd: 'update_cart_quantity' },
        { userId, cartItemId, quantity: Number(quantity) },
      ),
    );
  }

  // --- ЗАКАЗЫ ---

  @ApiOperation({ summary: 'Create a new order from current cart' })
  @Post('orders')
  async createOrder(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return await firstValueFrom(
      this.orderClient.send({ cmd: 'create_order' }, { userId, dto }),
    );
  }

  @ApiOperation({ summary: 'Get order history for current user' })
  @Get('orders')
  async getUserOrders(@CurrentUser('userId') userId: string) {
    return await firstValueFrom(
      this.orderClient.send({ cmd: 'get_user_orders' }, userId),
    );
  }

  // Изменение статуса заказа (только для админа)
  @ApiOperation({ summary: 'Update order status (Admin only)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'delivered' },
      },
    },
  })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch('orders/:id/status')
  async updateStatus(
    @Param('id') orderId: string,
    @Body('status') status: string,
  ) {
    return await firstValueFrom(
      this.orderClient.send(
        { cmd: 'update_order_status' },
        { orderId, status },
      ),
    );
  }

  @ApiOperation({ summary: 'Create a new discount promo code (Admin only)' })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post('promocodes')
  async createPromocode(@Body() dto: CreatePromocodeDto) {
    return await firstValueFrom(
      this.orderClient.send({ cmd: 'create_promocode' }, dto),
    );
  }

  // Просмотр всех заказов с пагинацией (Admin)
  @ApiOperation({ summary: 'Get all user orders with pagination (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('admin/orders')
  async getAllOrdersAdmin(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return await firstValueFrom(
      this.orderClient.send({ cmd: 'get_all_orders_admin' }, { page, limit }),
    );
  }

  // Аналитика 1: Топ-пицца за выбранный месяц
  @ApiOperation({
    summary:
      'Analytics: Get most ordered pizza for a given month/year (Admin only)',
  })
  @ApiQuery({ name: 'month', required: true, type: Number, example: 8 })
  @ApiQuery({ name: 'year', required: true, type: Number, example: 2026 })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('analytics/top-pizza')
  async getTopPizza(
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return await firstValueFrom(
      this.orderClient.send(
        { cmd: 'get_most_popular_pizza' },
        { month: Number(month), year: Number(year) },
      ),
    );
  }

  // Аналитика 2: Пользователи с высоким средним чеком
  @ApiOperation({
    summary: 'Analytics: Get users with high average check (Admin only)',
  })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('analytics/high-value-users')
  async getHighValueUsers() {
    return await firstValueFrom(
      this.orderClient.send({ cmd: 'get_high_value_users' }, {}),
    );
  }
}
