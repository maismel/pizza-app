export const ORDER_REPOSITORY = 'ORDER_REPOSITORY';

export interface IOrderRepository {
  // Cart
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

  // Pizza validation
  findPizzaById(pizzaId: string): Promise<any>;

  // Orders and transactions
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

  // Promo codes
  findPromocodeByCode(code: string): Promise<any>;
  createPromocode(dto: any): Promise<any>;

  // Analytics using raw SQL
  getMostPopularPizza(month: number, year: number): Promise<any>;
  getHighValueUsers(): Promise<any[]>;
}
