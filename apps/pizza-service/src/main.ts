import { NestFactory } from '@nestjs/core';
import { PizzaServiceModule } from './pizza-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    PizzaServiceModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
        queue: 'pizza_queue',
        queueOptions: {
          durable: false,
        },
      },
    },
  );

  await app.listen();
  console.log('Pizza Microservice is listening to RabbitMQ...');
}
bootstrap();
