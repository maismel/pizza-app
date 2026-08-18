import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { OrderService } from './order-service.service';
import {
  ORDER_REPOSITORY,
  IOrderRepository,
} from './repositories/order.repository.interface';

describe('OrderService - Cart Unit Tests', () => {
  let service: OrderService;
  let orderRepositoryMock: jest.Mocked<Partial<IOrderRepository>>;

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
    orderRepositoryMock = {
      findCartItems: jest.fn(),
      findPizzaById: jest.fn(),
      findCartItem: jest.fn(),
      findCartItemById: jest.fn(),
      createCartItem: jest.fn(),
      updateCartItemQuantity: jest.fn(),
      deleteCartItem: jest.fn(),
    };

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
      (orderRepositoryMock.findCartItems as jest.Mock).mockResolvedValue([
        mockCartItem,
      ]);

      const result = await service.getCart(mockUserId);

      expect(orderRepositoryMock.findCartItems).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(result).toEqual([mockCartItem]);
    });
  });

  describe('addToCart', () => {
    it('should throw RpcException if pizza not found or inactive', async () => {
      (orderRepositoryMock.findPizzaById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addToCart(mockUserId, { pizzaId: 'invalid-id', quantity: 1 }),
      ).rejects.toThrow(RpcException);
    });

    it('should successfully add new pizza to cart', async () => {
      (orderRepositoryMock.findPizzaById as jest.Mock).mockResolvedValue(
        mockPizza,
      );
      (orderRepositoryMock.findCartItem as jest.Mock).mockResolvedValue(null);
      (orderRepositoryMock.createCartItem as jest.Mock).mockResolvedValue(
        mockCartItem,
      );

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
      (orderRepositoryMock.findCartItemById as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.updateCartQuantity(mockUserId, 'invalid-id', 5),
      ).rejects.toThrow(RpcException);
    });

    it('should update cart item quantity', async () => {
      (orderRepositoryMock.findCartItemById as jest.Mock).mockResolvedValue(
        mockCartItem,
      );
      (
        orderRepositoryMock.updateCartItemQuantity as jest.Mock
      ).mockResolvedValue({
        ...mockCartItem,
        quantity: 5,
      });

      const result = await service.updateCartQuantity(
        mockUserId,
        mockCartItemId,
        5,
      );

      expect(orderRepositoryMock.updateCartItemQuantity).toHaveBeenCalledWith(
        mockCartItemId,
        5,
      );
      expect(result.quantity).toBe(5);
    });

    it('should delete item if passed quantity <= 0', async () => {
      (orderRepositoryMock.findCartItemById as jest.Mock).mockResolvedValue(
        mockCartItem,
      );
      (orderRepositoryMock.deleteCartItem as jest.Mock).mockResolvedValue(
        mockCartItem,
      );

      const result = await service.updateCartQuantity(
        mockUserId,
        mockCartItemId,
        0,
      );

      expect(orderRepositoryMock.deleteCartItem).toHaveBeenCalledWith(
        mockCartItemId,
      );
      expect(result.success).toBe(true);
    });
  });

  describe('removeFromCart', () => {
    it('should throw RpcException if cart item to remove is not found', async () => {
      (orderRepositoryMock.findCartItemById as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.removeFromCart(mockUserId, 'non-existent-id'),
      ).rejects.toThrow(RpcException);
    });

    it('should successfully remove item from cart', async () => {
      (orderRepositoryMock.findCartItemById as jest.Mock).mockResolvedValue(
        mockCartItem,
      );
      (orderRepositoryMock.deleteCartItem as jest.Mock).mockResolvedValue(
        mockCartItem,
      );

      const result = await service.removeFromCart(mockUserId, mockCartItemId);

      expect(orderRepositoryMock.deleteCartItem).toHaveBeenCalledWith(
        mockCartItemId,
      );
      expect(result).toEqual({ success: true });
    });
  });
});
