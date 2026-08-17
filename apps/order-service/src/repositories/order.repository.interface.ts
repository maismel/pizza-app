export const ORDER_REPOSITORY = 'ORDER_REPOSITORY';

export interface IOrderRepository {
  // Корзина
  findCartItems(userId: string): Promise<any[]>;
  findCartItem(userId: string, pizzaId: string): Promise<any>;
  findCartItemById(cartItemId: string, userId: string): Promise<any>;
  createCartItem(
    userId: string,
    pizzaId: string,
    quantity: number,
  ): Promise<any>;
  updateCartItemQuantity(cartItemId: string, quantity: number): Promise<any>;
  deleteCartItem(cartItemId: string): Promise<any>;
  clearCart(userId: string): Promise<any>;

  // Проверка пиццы
  findPizzaById(pizzaId: string): Promise<any>;

  // Заказы и транзакции
  createOrderTransaction(data: {
    userId: string;
    dto: any;
    totalAmount: number;
    promocodeId?: string;
    cartItems: any[];
  }): Promise<any>;
  findUserOrders(userId: string): Promise<any[]>;
  findOrderById(orderId: string): Promise<any>;
  updateOrderStatus(orderId: string, status: string): Promise<any>;
  findAllOrdersWithPagination(params: {
    page: number;
    limit: number;
  }): Promise<any>;

  // Промокоды
  findPromocodeByCode(code: string): Promise<any>;
  createPromocode(dto: any): Promise<any>;

  // Аналитика на чистом SQL
  getMostPopularPizza(month: number, year: number): Promise<any>;
  getHighValueUsers(): Promise<any[]>;
}
