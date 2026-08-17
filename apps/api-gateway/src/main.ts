import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApiGatewayModule } from './api-gateway.module';
// import { MongoLoggerService } from './logger/mongo-logger.service';
// import { LoggingInterceptor } from './logger/logging.interceptor';
// import { HttpErrorFilter } from './logger/http-error.filter';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Достаем экземпляр MongoLoggerService
  // const mongoLogger = app.get(MongoLoggerService);

  // Назначаем глобальный Interceptor и Filter
  // app.useGlobalInterceptors(new LoggingInterceptor(mongoLogger));
  // app.useGlobalFilters(new HttpErrorFilter(mongoLogger));

  const config = new DocumentBuilder()
    .setTitle('Pizza App API')
    .setDescription(
      'Документация и интерфейс для тестирования микросервисов Pizza App 🍕',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document, {
    customCssUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.js',
    ],
  });

  await app.listen(3000);
  console.log('API Gateway is running on: http://localhost:3000');
  console.log(
    'Swagger Documentation is available at: http://localhost:3000/api',
  );
}
bootstrap();
