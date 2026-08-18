export const PIZZA_REPOSITORY = 'PIZZA_REPOSITORY';

export interface IPizzaRepository {
  findAllWithPagination(params: { page: number; limit: number }): Promise<any>;
  findById(id: string): Promise<any>;
  create(data: any): Promise<any>;
  deletePizzaWithFile(
    id: string,
    imageUrl: string | undefined,
    deleteFileCallback: (url: string) => Promise<void>,
  ): Promise<any>;
  findUnusedPizzas(sinceDate: Date): Promise<any[]>;

  // --- Ingredients ---
  findIngredientByName(name: string): Promise<any>;
  createIngredient(data: any): Promise<any>;
  findAllIngredients(): Promise<any>;
  attachIngredients(pizzaId: string, ingredientIds: string[]): Promise<any>;
}
