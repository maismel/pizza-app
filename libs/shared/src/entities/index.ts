// Base interface for paginated results
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  refreshTokenHash?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IngredientEntity {
  id: string;
  name: string;
  createdAt: Date;
}

export interface PizzaEntity {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  ingredients?: IngredientEntity[];
}

export interface CartItemEntity {
  id: string;
  userId: string;
  pizzaId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  pizza?: PizzaEntity;
}

export interface PromocodeEntity {
  id: string;
  code: string;
  discountPercent: number;
  validUntil: Date;
  createdAt: Date;
}

export interface OrderItemEntity {
  id: string;
  orderId: string;
  pizzaId: string;
  priceAtPurchase: number;
  quantity: number;
  pizza?: PizzaEntity;
}

export interface OrderEntity {
  id: string;
  userId: string;
  promocodeId?: string | null;
  status: string;
  address: string;
  deliveryMethod: string;
  paymentMethod: string;
  comment?: string | null;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  items?: OrderItemEntity[];
  promocode?: PromocodeEntity | null;
}
