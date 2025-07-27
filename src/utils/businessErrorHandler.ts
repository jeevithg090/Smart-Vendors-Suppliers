import type { BusinessError } from '../types/errors';
// import { useErrorHandler } from '../hooks/useErrorHandler';

export interface BusinessRule {
  name: string;
  validate: (data: any) => Promise<boolean> | boolean;
  errorMessage: string;
  suggestions?: string[];
}

export interface BusinessValidationResult {
  isValid: boolean;
  errors: BusinessError[];
  warnings: string[];
}

export class BusinessLogicValidator {
  private rules: BusinessRule[] = [];
  // private errorHandler = useErrorHandler();

  addRule(rule: BusinessRule): void {
    this.rules.push(rule);
  }

  async validateOrderPlacement(orderData: any): Promise<BusinessValidationResult> {
    const errors: BusinessError[] = [];
    const warnings: string[] = [];

    // Check supplier availability
    if (!await this.isSupplierAvailable(orderData.supplierId)) {
      errors.push({
        type: 'BUSINESS_ERROR',
        code: 'SUPPLIER_UNAVAILABLE',
        message: 'Selected supplier is currently unavailable',
        timestamp: Date.now(),
        suggestions: ['Try a different supplier', 'Contact supplier directly'],
        actionable: true
      });
    }

    // Check inventory availability
    for (const item of orderData.items) {
      const stockCheck = await this.checkInventoryStock(orderData.supplierId, item);
      if (!stockCheck.available) {
        errors.push({
          type: 'BUSINESS_ERROR',
          code: 'INSUFFICIENT_STOCK',
          message: `Insufficient stock for ${item.itemName}. Available: ${stockCheck.available}, Requested: ${item.quantity}`,
          timestamp: Date.now(),
          suggestions: [
            'Reduce quantity',
            'Split order across multiple suppliers',
            'Join a group order'
          ],
          actionable: true,
          context: {
            itemName: item.itemName,
            availableStock: stockCheck.available,
            requestedQuantity: item.quantity
          }
        });
      } else if (stockCheck.available < item.quantity * 1.2) {
        warnings.push(`Low stock for ${item.itemName}. Consider ordering soon.`);
      }
    }

    // Check minimum order value
    const minOrderValue = await this.getMinimumOrderValue(orderData.supplierId);
    if (orderData.totalCost < minOrderValue) {
      errors.push({
        type: 'BUSINESS_ERROR',
        code: 'MINIMUM_ORDER_NOT_MET',
        message: `Order value ₹${orderData.totalCost} is below minimum ₹${minOrderValue}`,
        timestamp: Date.now(),
        suggestions: [
          'Add more items to reach minimum',
          'Join a group order',
          'Choose a different supplier'
        ],
        actionable: true,
        context: {
          currentValue: orderData.totalCost,
          minimumValue: minOrderValue
        }
      });
    }

    // Check delivery area
    if (!await this.isDeliveryAreaSupported(orderData.supplierId, orderData.deliveryAddress)) {
      errors.push({
        type: 'BUSINESS_ERROR',
        code: 'DELIVERY_AREA_NOT_SUPPORTED',
        message: 'Delivery not available to your area',
        timestamp: Date.now(),
        suggestions: [
          'Choose pickup option',
          'Select a different supplier',
          'Update delivery address'
        ],
        actionable: true
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateGroupOrderParticipation(groupOrderData: any): Promise<BusinessValidationResult> {
    const errors: BusinessError[] = [];
    const warnings: string[] = [];

    // Check if group order is still active
    if (groupOrderData.status !== 'active') {
      errors.push({
        type: 'BUSINESS_ERROR',
        code: 'GROUP_ORDER_EXPIRED',
        message: 'This group order is no longer accepting participants',
        timestamp: Date.now(),
        suggestions: ['Find another group order', 'Create your own group order'],
        actionable: true
      });
    }

    // Check if group order has space
    const remainingCapacity = groupOrderData.targetQuantity - groupOrderData.currentQuantity;
    if (remainingCapacity <= 0) {
      errors.push({
        type: 'BUSINESS_ERROR',
        code: 'GROUP_ORDER_FULL',
        message: 'This group order is already full',
        timestamp: Date.now(),
        suggestions: ['Find another group order', 'Create your own group order'],
        actionable: true
      });
    }

    // Check if requested quantity fits
    if (groupOrderData.requestedQuantity > remainingCapacity) {
      errors.push({
        type: 'BUSINESS_ERROR',
        code: 'QUANTITY_EXCEEDS_CAPACITY',
        message: `Requested quantity ${groupOrderData.requestedQuantity} exceeds remaining capacity ${remainingCapacity}`,
        timestamp: Date.now(),
        suggestions: [`Reduce quantity to ${remainingCapacity} or less`],
        actionable: true
      });
    }

    // Check expiry time
    const timeUntilExpiry = groupOrderData.expiresAt - Date.now();
    if (timeUntilExpiry < 30 * 60 * 1000) { // 30 minutes
      warnings.push('Group order expires soon. Complete your participation quickly.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validatePayment(paymentData: any): Promise<BusinessValidationResult> {
    const errors: BusinessError[] = [];
    const warnings: string[] = [];

    // Validate payment amount
    if (paymentData.amount <= 0) {
      errors.push({
        type: 'BUSINESS_ERROR',
        code: 'INVALID_PAYMENT_AMOUNT',
        message: 'Payment amount must be greater than zero',
        timestamp: Date.now(),
        suggestions: ['Check order total'],
        actionable: true
      });
    }

    // Check for suspicious payment patterns
    if (await this.isSuspiciousPayment(paymentData)) {
      warnings.push('Payment flagged for review. Processing may take longer.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Helper methods (these would integrate with your actual business logic)
  private async isSupplierAvailable(_supplierId: string): Promise<boolean> {
    // Check supplier status, business hours, etc.
    try {
      // This would be a real API call to check supplier availability
      return true; // Placeholder
    } catch (error) {
      return false;
    }
  }

  private async checkInventoryStock(_supplierId: string, _item: any): Promise<{ available: number; reserved: number }> {
    try {
      // This would be a real API call to check inventory
      return { available: 100, reserved: 10 }; // Placeholder
    } catch (error) {
      return { available: 0, reserved: 0 };
    }
  }

  private async getMinimumOrderValue(_supplierId: string): Promise<number> {
    try {
      // This would be a real API call to get supplier's minimum order value
      return 500; // Placeholder
    } catch (error) {
      return 0;
    }
  }

  private async isDeliveryAreaSupported(_supplierId: string, _address: string): Promise<boolean> {
    try {
      // This would check if supplier delivers to the given address
      return true; // Placeholder
    } catch (error) {
      return false;
    }
  }

  private async isSuspiciousPayment(paymentData: any): Promise<boolean> {
    // Implement fraud detection logic
    const suspiciousPatterns = [
      paymentData.amount > 50000, // Large amount
      paymentData.attempts > 3, // Multiple attempts
      // Add more patterns as needed
    ];

    return suspiciousPatterns.some(pattern => pattern);
  }
}

// Export singleton instance
export const businessValidator = new BusinessLogicValidator();

// Business error codes that need to be added to types
export type BusinessErrorCode = 
  | 'SUPPLIER_UNAVAILABLE'
  | 'INSUFFICIENT_STOCK'
  | 'MINIMUM_ORDER_NOT_MET'
  | 'DELIVERY_AREA_NOT_SUPPORTED'
  | 'GROUP_ORDER_EXPIRED'
  | 'GROUP_ORDER_FULL'
  | 'QUANTITY_EXCEEDS_CAPACITY'
  | 'INVALID_PAYMENT_AMOUNT'
  | 'PAYMENT_FAILED';