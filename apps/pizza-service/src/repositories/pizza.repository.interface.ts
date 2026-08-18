import {
  PizzaEntity,
  IngredientEntity,
  PaginatedResult,
} from '../../../../libs/shared/src/entities/index';

export const PIZZA_REPOSITORY = 'PIZZA_REPOSITORY';

export interface IPizzaRepository {
  findAllWithPagination(params: {
    page: number;
    limit: number;
  }): Promise<PaginatedResult<PizzaEntity>>;
  findById(id: string): Promise<PizzaEntity | null>;
  create(data: Partial<PizzaEntity>): Promise<PizzaEntity>;
  deletePizzaWithFile(
    id: string,
    imageUrl: string | undefined,
    deleteFileCallback: (url: string) => Promise<void>,
  ): Promise<{ success: boolean; message: string }>;
  findUnusedPizzas(sinceDate: Date): Promise<PizzaEntity[]>;

  // Ingredients
  findIngredientByName(name: string): Promise<IngredientEntity | null>;
  createIngredient(data: Partial<IngredientEntity>): Promise<IngredientEntity>;
  findAllIngredients(): Promise<IngredientEntity[]>;
  attachIngredients(
    pizzaId: string,
    ingredientIds: string[],
  ): Promise<PizzaEntity | null>;
}
