import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Inject,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { firstValueFrom } from 'rxjs';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { CreatePizzaDto } from '../../pizza-service/src/dto/create-pizza.dto';
import { CreateIngredientDto } from '../../pizza-service/src/dto/create-ingredient.dto';
import { AddIngredientsDto } from '../../pizza-service/src/dto/add-ingredients.dto';

@ApiTags('Pizzas 🍕')
@Controller()
export class PizzaController {
  constructor(
    @Inject('PIZZA_SERVICE') private readonly pizzaClient: ClientProxy,
  ) {}

  @ApiOperation({ summary: 'Get list of all pizzas with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @Get('pizzas')
  async getAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return await firstValueFrom(
      this.pizzaClient.send({ cmd: 'get_all_pizzas' }, { page, limit }),
    );
  }

  @ApiOperation({ summary: 'Get detailed pizza information by ID' })
  @ApiParam({ name: 'id', description: 'Unique pizza identifier' })
  @Get('pizzas/:id')
  async getById(@Param('id') id: string) {
    return await firstValueFrom(
      this.pizzaClient.send({ cmd: 'get_pizza_by_id' }, id),
    );
  }

  // Создание пиццы с загрузкой изображения (Admin)
  @ApiBearerAuth() // <-- Добавлено для авторизации в Swagger
  @ApiOperation({
    summary: 'Create a new pizza with image upload (Admin only)',
  })
  @ApiConsumes('multipart/form-data') // <-- Позволяет загружать файлы через Swagger UI
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Pizza image file',
        },
        name: { type: 'string', example: 'Margherita' },
        price: { type: 'number', example: 15.99 },
        description: {
          type: 'string',
          example: 'Classic pizza with fresh tomatoes and mozzarella',
        },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('pizzas')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `pizza-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreatePizzaDto,
  ) {
    const imageUrl = file ? `/uploads/${file.filename}` : undefined;
    return await firstValueFrom(
      this.pizzaClient.send({ cmd: 'create_pizza' }, { ...dto, imageUrl }),
    );
  }

  // Транзакционное удаление пиццы (Admin)
  @ApiBearerAuth() // <-- Добавлено для авторизации в Swagger
  @ApiOperation({ summary: 'Delete pizza by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Unique pizza identifier' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('pizzas/:id')
  async delete(@Param('id') id: string) {
    return await firstValueFrom(
      this.pizzaClient.send({ cmd: 'delete_pizza' }, id),
    );
  }

  // --- ИНГРЕДИЕНТЫ ---

  @ApiBearerAuth() // <-- Добавлено для авторизации в Swagger
  @ApiOperation({ summary: 'Create a new ingredient (Admin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('ingredients')
  async createIngredient(@Body() dto: CreateIngredientDto) {
    return await firstValueFrom(
      this.pizzaClient.send({ cmd: 'create_ingredient' }, dto),
    );
  }

  @ApiOperation({ summary: 'Get list of all ingredients' })
  @Get('ingredients')
  async getAllIngredients() {
    return await firstValueFrom(
      this.pizzaClient.send({ cmd: 'get_all_ingredients' }, {}),
    );
  }

  @ApiBearerAuth() // <-- Добавлено для авторизации в Swagger
  @ApiOperation({ summary: 'Attach ingredients to a pizza (Admin only)' })
  @ApiParam({ name: 'id', description: 'Unique pizza identifier' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('pizzas/:id/ingredients')
  async attachIngredients(
    @Param('id') pizzaId: string,
    @Body() dto: AddIngredientsDto,
  ) {
    return await firstValueFrom(
      this.pizzaClient.send(
        { cmd: 'attach_ingredients' },
        { pizzaId, ingredientIds: dto.ingredientIds },
      ),
    );
  }
}
