import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BusinessLogicValidator } from '../../utils/businessErrorHandler';

// Mock the useErrorHandler hook
vi.mock('../../hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: vi.fn(),
    handleBusinessError: vi.fn()
  })
}));

describe('BusinessLogicValidator', () => {
  let validator: BusinessLogicValidator;

  beforeEach(() => {
    validator = new BusinessLogicValidator();
  });

  describe('validateOrderPlacement', () => {
    it('should validate successful order placement', async () => {
      const orderData = {
        supplierId: 'supplier-1',
        items: [
          { itemName: 'Tomatoes', quantity: 10 }
        ],
        totalCost: 1000,
        deliveryAddress: 'Mumbai, Maharashtra'
      };

      const result = await validator.validateOrderPlacement(orderData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect insufficient stock', async () => {
      // Mock the checkInventoryStock method to return insufficient stock
      vi.spyOn(validator as any, 'checkInventoryStock').mockResolvedValue({
        available: 5,
        reserved: 0
      });

      const orderData = {
        supplierId: 'supplier-1',
        items: [
          { itemName: 'Tomatoes', quantity: 10 }
        ],
        totalCost: 1000,
        deliveryAddress: 'Mumbai, Maharashtra'
      };

      const result = await validator.validateOrderPlacement(orderData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INSUFFICIENT_STOCK');
      expect(result.errors[0].suggestions).toContain('Reduce quantity');
    });

    it('should detect minimum order not met', async () => {
      // Mock minimum order value
      vi.spyOn(validator as any, 'getMinimumOrderValue').mockResolvedValue(1000);

      const orderData = {
        supplierId: 'supplier-1',
        items: [
          { itemName: 'Tomatoes', quantity: 2 }
        ],
        totalCost: 200,
        deliveryAddress: 'Mumbai, Maharashtra'
      };

      const result = await validator.validateOrderPlacement(orderData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MINIMUM_ORDER_NOT_MET');
    });

    it('should detect unsupported delivery area', async () => {
      // Mock delivery area check
      vi.spyOn(validator as any, 'isDeliveryAreaSupported').mockResolvedValue(false);

      const orderData = {
        supplierId: 'supplier-1',
        items: [
          { itemName: 'Tomatoes', quantity: 10 }
        ],
        totalCost: 1000,
        deliveryAddress: 'Remote Area'
      };

      const result = await validator.validateOrderPlacement(orderData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('DELIVERY_AREA_NOT_SUPPORTED');
    });
  });

  describe('validateGroupOrderParticipation', () => {
    it('should validate successful group order participation', async () => {
      const groupOrderData = {
        status: 'active',
        targetQuantity: 100,
        currentQuantity: 50,
        requestedQuantity: 20,
        expiresAt: Date.now() + 2 * 60 * 60 * 1000 // 2 hours from now
      };

      const result = await validator.validateGroupOrderParticipation(groupOrderData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect expired group order', async () => {
      const groupOrderData = {
        status: 'expired',
        targetQuantity: 100,
        currentQuantity: 50,
        requestedQuantity: 20,
        expiresAt: Date.now() - 1000 // Already expired
      };

      const result = await validator.validateGroupOrderParticipation(groupOrderData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GROUP_ORDER_EXPIRED');
    });

    it('should detect full group order', async () => {
      const groupOrderData = {
        status: 'active',
        targetQuantity: 100,
        currentQuantity: 100, // Already full
        requestedQuantity: 20,
        expiresAt: Date.now() + 2 * 60 * 60 * 1000
      };

      const result = await validator.validateGroupOrderParticipation(groupOrderData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('GROUP_ORDER_FULL');
    });

    it('should detect quantity exceeding capacity', async () => {
      const groupOrderData = {
        status: 'active',
        targetQuantity: 100,
        currentQuantity: 90,
        requestedQuantity: 20, // Exceeds remaining capacity of 10
        expiresAt: Date.now() + 2 * 60 * 60 * 1000
      };

      const result = await validator.validateGroupOrderParticipation(groupOrderData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('QUANTITY_EXCEEDS_CAPACITY');
    });

    it('should warn about expiring group order', async () => {
      const groupOrderData = {
        status: 'active',
        targetQuantity: 100,
        currentQuantity: 50,
        requestedQuantity: 20,
        expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes from now
      };

      const result = await validator.validateGroupOrderParticipation(groupOrderData);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('expires soon');
    });
  });

  describe('validatePayment', () => {
    it('should validate successful payment', async () => {
      const paymentData = {
        amount: 1000,
        attempts: 1
      };

      const result = await validator.validatePayment(paymentData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid payment amount', async () => {
      const paymentData = {
        amount: 0,
        attempts: 1
      };

      const result = await validator.validatePayment(paymentData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_PAYMENT_AMOUNT');
    });

    it('should warn about suspicious payment', async () => {
      const paymentData = {
        amount: 60000, // Large amount
        attempts: 1
      };

      const result = await validator.validatePayment(paymentData);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('flagged for review');
    });
  });
});