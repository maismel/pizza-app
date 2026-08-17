import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PizzaService } from './pizza-service.service';
import { CreatePizzaDto } from './dto/create-pizza.dto';
import { CreateIngredientDto } from './dto/create-ingredient.dto';

@Controller()
export class PizzaServiceController {
  constructor(private readonly pizzaService: PizzaService) {}

  @MessagePattern({ cmd: 'get_all_pizzas' })
  async getAll(@Payload() query: { page?: number; limit?: number }) {
    return this.pizzaService.getAllPizzas(query);
  }

  @MessagePattern({ cmd: 'get_pizza_by_id' })
  getById(@Payload() id: string) {
    return this.pizzaService.getPizzaById(id);
  }

  @MessagePattern({ cmd: 'create_pizza' })
  create(@Payload() dto: CreatePizzaDto & { imageUrl?: string }) {
    return this.pizzaService.createPizza(dto);
  }

  @MessagePattern({ cmd: 'delete_pizza' })
  delete(@Payload() id: string) {
    return this.pizzaService.deletePizza(id);
  }

  // --- ИНГРЕДИЕНТЫ ---
  @MessagePattern({ cmd: 'create_ingredient' })
  createIngredient(@Payload() dto: CreateIngredientDto) {
    return this.pizzaService.createIngredient(dto);
  }

  @MessagePattern({ cmd: 'get_all_ingredients' })
  getAllIngredients() {
    return this.pizzaService.getAllIngredients();
  }

  @MessagePattern({ cmd: 'attach_ingredients' })
  attachIngredients(
    @Payload() data: { pizzaId: string; ingredientIds: string[] },
  ) {
    return this.pizzaService.attachIngredientsToPizza(
      data.pizzaId,
      data.ingredientIds,
    );
  }
}
