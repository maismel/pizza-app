import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/shared/prisma/prisma.module';
import { OrderServiceController } from './order-service.controller';
import { OrderService } from './order-service.service';
import { ORDER_REPOSITORY } from './repositories/order.repository.interface';
import { PostgresOrderRepository } from './repositories/postgres-order.repository';

@Module({
  imports: [PrismaModule],
  controllers: [OrderServiceController],
  providers: [
    OrderService,
    {
      provide: ORDER_REPOSITORY,
      useClass: PostgresOrderRepository,
    },
  ],
})
export class OrderServiceModule {}
