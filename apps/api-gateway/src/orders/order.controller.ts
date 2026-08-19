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
  BadRequestException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type JwtPayload } from '../auth/types/jwt-payload.interface'; // <-- Импортируем интерфейс
import { AddToCartDto } from '../../../order-service/src/dto/add-to-cart.dto';
import { CreateOrderDto } from '../../../order-service/src/dto/create-order.dto';
import { CreatePromocodeDto } from 'apps/order-service/src/dto/create-promocode.dto';

@ApiTags('Orders & Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class OrderController {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
  ) {}

  // --- CART ---

  @ApiOperation({ summary: 'Get current user cart' })
  @Get('cart')
  getCart(@CurrentUser('userId') userId: string) {
    return this.orderClient.send({ cmd: 'get_cart' }, userId);
  }

  @ApiOperation({ summary: 'Add pizza to cart' })
  @Post('cart')
  addToCart(@CurrentUser('userId') userId: string, @Body() dto: AddToCartDto) {
    return this.orderClient.send({ cmd: 'add_to_cart' }, { userId, dto });
  }

  @ApiOperation({ summary: 'Remove item from cart by ID' })
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @Delete('cart/:id')
  removeFromCart(
    @CurrentUser('userId') userId: string,
    @Param('id') cartItemId: string,
  ) {
    return this.orderClient.send(
      { cmd: 'remove_from_cart' },
      { userId, cartItemId },
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
  updateCartQuantity(
    @CurrentUser('userId') userId: string,
    @Param('id') cartItemId: string,
    @Body('quantity') quantity: number,
  ) {
    return this.orderClient.send(
      { cmd: 'update_cart_quantity' },
      { userId, cartItemId, quantity: Number(quantity) },
    );
  }

  // --- ORDERS ---

  @ApiOperation({ summary: 'Create a new order from current cart' })
  @Post('orders')
  createOrder(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderClient.send({ cmd: 'create_order' }, { userId, dto });
  }

  @ApiOperation({
    summary: 'Get orders list (Role-based)',
    description:
      'Admins see all orders in the system. Regular users see only their own orders. Both support pagination.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @Get('orders')
  getOrders(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = user.sub;

    if (user.role === 'admin') {
      return this.orderClient.send(
        { cmd: 'get_all_orders_admin' },
        { page, limit },
      );
    }

    return this.orderClient.send(
      { cmd: 'get_user_orders' },
      { userId, page, limit },
    );
  }

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
  updateStatus(@Param('id') orderId: string, @Body('status') status: string) {
    return this.orderClient.send(
      { cmd: 'update_order_status' },
      { orderId, status },
    );
  }

  @ApiOperation({
    summary: 'Delete an order (Admin can delete any, User can delete own)',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @Delete('orders/:id')
  deleteOrder(@CurrentUser() user: JwtPayload, @Param('id') orderId: string) {
    return this.orderClient.send(
      { cmd: 'delete_order' },
      { orderId, userId: user.sub, role: user.role },
    );
  }

  @ApiOperation({ summary: 'Create a new discount promo code (Admin only)' })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post('promocodes')
  createPromocode(@Body() dto: CreatePromocodeDto) {
    return this.orderClient.send({ cmd: 'create_promocode' }, dto);
  }

  // --- ANALYTICS ---

  @ApiOperation({
    summary: 'Get analytics reports (Admin only)',
    description:
      'Generates different analytical reports based on the type provided.',
  })
  @ApiQuery({
    name: 'type',
    required: true,
    enum: ['top-pizza', 'high-value-users'],
    description: 'Type of report to generate',
  })
  @ApiQuery({
    name: 'month',
    required: false,
    type: Number,
    description:
      'Month (1-12) for top-pizza report. Defaults to current month.',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Year for top-pizza report. Defaults to current year.',
  })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('analytics')
  getAnalytics(
    @Query('type') type: string,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    if (type === 'top-pizza') {
      const currentDate = new Date();
      const targetMonth = month ? Number(month) : currentDate.getMonth() + 1;
      const targetYear = year ? Number(year) : currentDate.getFullYear();

      return this.orderClient.send(
        { cmd: 'get_most_popular_pizza' },
        { month: targetMonth, year: targetYear },
      );
    }

    if (type === 'high-value-users') {
      return this.orderClient.send({ cmd: 'get_high_value_users' }, {});
    }

    throw new BadRequestException(
      `Invalid analytics type: '${type}'. Allowed types are: 'top-pizza', 'high-value-users'`,
    );
  }
}
