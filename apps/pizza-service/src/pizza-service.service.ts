import { Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreatePizzaDto } from './dto/create-pizza.dto';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  type IPizzaRepository,
  PIZZA_REPOSITORY,
} from './repositories/pizza.repository.interface';

@Injectable()
export class PizzaService {
  private readonly logger = new Logger(PizzaService.name);

  constructor(
    @Inject(PIZZA_REPOSITORY)
    private readonly pizzaRepository: IPizzaRepository,
  ) {}

  // --- INGREDIENTS ---

  async createIngredient(dto: CreateIngredientDto) {
    const existing = await this.pizzaRepository.findIngredientByName(dto.name);
    if (existing) {
      throw new RpcException('Ingredient with this name already exists');
    }
    return this.pizzaRepository.createIngredient(dto);
  }

  getAllIngredients() {
    return this.pizzaRepository.findAllIngredients();
  }

  async attachIngredientsToPizza(pizzaId: string, ingredientIds: string[]) {
    await this.getPizzaById(pizzaId);
    return this.pizzaRepository.attachIngredients(pizzaId, ingredientIds);
  }

  // --- PIZZAS ---

  async getAllPizzas(query: { page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);

    return this.pizzaRepository.findAllWithPagination({ page, limit });
  }

  async getPizzaById(id: string) {
    const pizza = await this.pizzaRepository.findById(id);

    if (!pizza) {
      throw new RpcException('Pizza not found');
    }

    return pizza;
  }

  createPizza(dto: CreatePizzaDto & { imageUrl?: string }) {
    return this.pizzaRepository.create({
      name: dto.name,
      price: dto.price,
      description: dto.description,
      imageUrl: dto.imageUrl,
      isActive: dto.isActive ?? true,
    });
  }

  // Transactional pizza and file deletion from disk
  async deletePizza(id: string) {
    const pizza = await this.getPizzaById(id);

    // Call transactional deletion from repository
    return await this.pizzaRepository.deletePizzaWithFile(
      id,
      pizza.imageUrl,
      async (imageUrl) => {
        const filePath = path.join(process.cwd(), imageUrl);
        await fs.unlink(filePath);
      },
    );
  }

  // Automatic deletion of inactive pizzas
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleAutoDeleteUnorderedPizzas() {
    this.logger.log('Checking for inactive pizzas...');

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const unusedPizzas =
      await this.pizzaRepository.findUnusedPizzas(oneMonthAgo);

    for (const pizza of unusedPizzas) {
      try {
        await this.deletePizza(pizza.id);
        this.logger.log(`Auto-deleted pizza ID: ${pizza.id} (${pizza.name})`);
      } catch (err) {
        this.logger.error(
          `Failed to auto-delete pizza ${pizza.id}: ${(err as Error).message}`,
        );
      }
    }
  }
}
