import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth/auth.controller';
import { PizzaController } from './pizzas/pizza.controller';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { OrderController } from 'apps/api-gateway/src/orders/order.controller';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { UsersController } from 'apps/api-gateway/src/users/users.controller';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [
            process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
          ],
          queue: 'user_queue',
          queueOptions: {
            durable: false,
          },
        },
      },
      {
        name: 'PIZZA_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [
            process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
          ],
          queue: 'pizza_queue',
          queueOptions: {
            durable: false,
          },
        },
      },
      {
        name: 'ORDER_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [
            process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
          ],
          queue: 'order_queue',
          queueOptions: { durable: false },
        },
      },
    ]),
  ],
  controllers: [
    AuthController,
    PizzaController,
    OrderController,
    UsersController,
  ],
  providers: [JwtStrategy],
})
export class ApiGatewayModule {}
