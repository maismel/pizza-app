import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@app/shared/prisma/prisma.module';
import { PizzaServiceController } from './pizza-service.controller';
import { PizzaService } from './pizza-service.service';
import { PIZZA_REPOSITORY } from './repositories/pizza.repository.interface';
import { PostgresPizzaRepository } from './repositories/postgres-pizza.repository';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  controllers: [PizzaServiceController],
  providers: [
    PizzaService,
    {
      provide: PIZZA_REPOSITORY,
      useClass: PostgresPizzaRepository,
    },
  ],
})
export class PizzaServiceModule {}
