import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { OrderService } from './order-service.service';
import {
  ORDER_REPOSITORY,
  IOrderRepository,
} from './repositories/order.repository.interface';

describe('OrderService - Cart Unit Tests', () => {
  let service: OrderService;

  // Упрощаем типизацию мока для Vitest
  let orderRepositoryMock: Record<keyof IOrderRepository, Mock>;

  const mockUserId = 'user-123';
  const mockPizzaId = 'pizza-456';
  const mockCartItemId = 'cart-item-789';

  const mockPizza = {
    id: mockPizzaId,
    name: 'Pepperoni',
    price: 500,
    isActive: true,
    deletedAt: null,
  };

  const mockCartItem = {
    id: mockCartItemId,
    userId: mockUserId,
    pizzaId: mockPizzaId,
    quantity: 2,
    pizza: mockPizza,
  };

  beforeEach(async () => {
    // vi.fn() вместо jest.fn()
    orderRepositoryMock = {
      findCartItems: vi.fn(),
      findPizzaById: vi.fn(),
      findCartItem: vi.fn(),
      findCartItemById: vi.fn(),
      createCartItem: vi.fn(),
      updateCartItemQuantity: vi.fn(),
      deleteCartItem: vi.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: ORDER_REPOSITORY,
          useValue: orderRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCart', () => {
    it('should return cart items for user', async () => {
      // Больше не нужно приводить тип (as jest.Mock), так как мы описали Record<..., Mock>
      orderRepositoryMock.findCartItems.mockResolvedValue([mockCartItem]);

      const result = await service.getCart(mockUserId);

      expect(orderRepositoryMock.findCartItems).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(result).toEqual([mockCartItem]);
    });
  });

  describe('addToCart', () => {
    it('should throw RpcException if pizza not found or inactive', async () => {
      orderRepositoryMock.findPizzaById.mockResolvedValue(null);

      await expect(
        service.addToCart(mockUserId, { pizzaId: 'invalid-id', quantity: 1 }),
      ).rejects.toThrow(RpcException);
    });

    it('should successfully add new pizza to cart', async () => {
      orderRepositoryMock.findPizzaById.mockResolvedValue(mockPizza);
      orderRepositoryMock.findCartItem.mockResolvedValue(null);
      orderRepositoryMock.createCartItem.mockResolvedValue(mockCartItem);

      const result = await service.addToCart(mockUserId, {
        pizzaId: mockPizzaId,
        quantity: 2,
      });

      expect(orderRepositoryMock.createCartItem).toHaveBeenCalledWith(
        mockUserId,
        mockPizzaId,
        2,
      );
      expect(result).toEqual(mockCartItem);
    });
  });

  describe('updateCartQuantity', () => {
    it('should throw RpcException if cart item not found', async () => {
      orderRepositoryMock.findCartItemById.mockResolvedValue(null);

      await expect(
        service.updateCartQuantity(mockUserId, 'invalid-id', 5),
      ).rejects.toThrow(RpcException);
    });

    it('should update cart item quantity', async () => {
      orderRepositoryMock.findCartItemById.mockResolvedValue(mockCartItem);

      const updatedItem = { ...mockCartItem, quantity: 5 };
      orderRepositoryMock.updateCartItemQuantity.mockResolvedValue(updatedItem);

      const result = await service.updateCartQuantity(
        mockUserId,
        mockCartItemId,
        5,
      );

      expect(orderRepositoryMock.updateCartItemQuantity).toHaveBeenCalledWith(
        mockCartItemId,
        5,
      );
      // Сравниваем объект целиком, чтобы TypeScript не ругался на .quantity
      expect(result).toEqual(updatedItem);
    });

    it('should delete item if passed quantity <= 0', async () => {
      orderRepositoryMock.findCartItemById.mockResolvedValue(mockCartItem);
      orderRepositoryMock.deleteCartItem.mockResolvedValue(undefined);

      const result = await service.updateCartQuantity(
        mockUserId,
        mockCartItemId,
        0,
      );

      expect(orderRepositoryMock.deleteCartItem).toHaveBeenCalledWith(
        mockCartItemId,
      );
      expect(result).toEqual({
        success: true,
        message: 'Item removed from cart',
      });
    });
  });

  describe('removeFromCart', () => {
    it('should throw RpcException if cart item to remove is not found', async () => {
      orderRepositoryMock.findCartItemById.mockResolvedValue(null);

      await expect(
        service.removeFromCart(mockUserId, 'non-existent-id'),
      ).rejects.toThrow(RpcException);
    });

    it('should successfully remove item from cart', async () => {
      orderRepositoryMock.findCartItemById.mockResolvedValue(mockCartItem);
      orderRepositoryMock.deleteCartItem.mockResolvedValue(mockCartItem);

      const result = await service.removeFromCart(mockUserId, mockCartItemId);

      expect(orderRepositoryMock.deleteCartItem).toHaveBeenCalledWith(
        mockCartItemId,
      );
      expect(result).toEqual({ success: true });
    });
  });
});
