import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { validateNumber, safeMultiply, safeRound } from '../utils/numberValidation';

interface OrderItem {
  itemName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
}

interface OrderPlacementProps {
  supplierId: Id<"suppliers">;
  vendorId: Id<"vendors">;
  onOrderPlaced?: (orderId: Id<"orders">) => void;
  onCancel?: () => void;
}

export const OrderPlacement: React.FC<OrderPlacementProps> = ({
  supplierId,
  vendorId,
  onOrderPlaced,
  onCancel
}) => {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get supplier inventory
  const inventory = useQuery(api.inventory.getSupplierInventory, { supplierId });
  const supplier = useQuery(api.suppliers.getSupplierById, { supplierId });
  const vendor = useQuery(api.vendors.getVendorById, { vendorId });
  
  const createOrder = useMutation(api.orders.createOrder);

  // Initialize delivery address from vendor profile
  useEffect(() => {
    if (vendor?.location?.address) {
      setDeliveryAddress(vendor.location.address);
    }
  }, [vendor]);

  const addItem = () => {
    setItems([...items, {
      itemName: '',
      quantity: 1,
      unit: 'kg',
      pricePerUnit: 0,
      totalPrice: 0
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate total price when quantity or price changes
    if (field === 'quantity' || field === 'pricePerUnit') {
      updatedItems[index].totalPrice = safeMultiply(
        validateNumber(updatedItems[index].quantity, 0),
        validateNumber(updatedItems[index].pricePerUnit, 0),
        0
      );
    }
    
    setItems(updatedItems);
  };

  const selectInventoryItem = (index: number, inventoryItem: any) => {
    updateItem(index, 'itemName', inventoryItem.itemName);
    updateItem(index, 'unit', inventoryItem.unit);
    updateItem(index, 'pricePerUnit', inventoryItem.pricePerUnit);
    updateItem(index, 'totalPrice', safeMultiply(
      validateNumber(items[index].quantity, 0),
      validateNumber(inventoryItem.pricePerUnit, 0),
      0
    ));
  };

  const getTotalCost = () => {
    return items.reduce((sum, item) => sum + validateNumber(item.totalPrice, 0), 0);
  };

  const validateOrder = (): string | null => {
    if (items.length === 0) {
      return 'Please add at least one item to your order';
    }

    for (const item of items) {
      if (!item.itemName) {
        return 'Please select an item for all order lines';
      }
      if (item.quantity <= 0) {
        return 'Quantity must be greater than 0';
      }
      if (item.pricePerUnit <= 0) {
        return 'Price must be greater than 0';
      }

      // Check inventory availability
      const inventoryItem = inventory?.find(inv => inv.itemName === item.itemName);
      if (!inventoryItem) {
        return `Item ${item.itemName} not found in inventory`;
      }
      if (!inventoryItem.isAvailable) {
        return `Item ${item.itemName} is currently unavailable`;
      }
      if (inventoryItem.currentStock < item.quantity) {
        return `Insufficient stock for ${item.itemName}. Available: ${inventoryItem.currentStock}`;
      }
      if (item.quantity < inventoryItem.minimumOrder) {
        return `Minimum order quantity for ${item.itemName} is ${inventoryItem.minimumOrder}`;
      }
    }

    if (!deliveryAddress.trim()) {
      return 'Please provide a delivery address';
    }

    // Check supplier minimum order
    const totalCost = getTotalCost();
    if (supplier && totalCost < supplier.minimumOrder) {
      return `Minimum order value is ₹${supplier.minimumOrder}. Current order: ₹${totalCost}`;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateOrder();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const orderId = await createOrder({
        vendorId,
        supplierId,
        items,
        deliveryAddress,
        paymentMethod,
        notes: notes.trim() || undefined
      });

      onOrderPlaced?.(orderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!inventory || !supplier) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Place Order</h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {/* Supplier Info */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-lg">{supplier.businessName}</h3>
        <p className="text-gray-600">{supplier.location.address}</p>
        <p className="text-sm text-gray-500">
          Minimum Order: ₹{supplier.minimumOrder} | 
          Delivery Radius: {supplier.deliveryRadius}km
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Items */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Order Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Add Item
            </button>
          </div>

          {items.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Item Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item
                  </label>
                  <select
                    value={item.itemName}
                    onChange={(e) => {
                      const selectedItem = inventory.find(inv => inv.itemName === e.target.value);
                      if (selectedItem) {
                        selectInventoryItem(index, selectedItem);
                      }
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="">Select Item</option>
                    {inventory
                      .filter(inv => inv.isAvailable && inv.currentStock > 0)
                      .map(inv => (
                        <option key={inv._id} value={inv.itemName}>
                          {inv.itemName} (₹{inv.pricePerUnit}/{inv.unit})
                        </option>
                      ))
                    }
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', validateNumber(parseInt(e.target.value), 0))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={item.unit}
                    readOnly
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                  />
                </div>

                {/* Price per Unit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price/Unit
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.pricePerUnit}
                    readOnly
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                  />
                </div>

                {/* Total Price */}
                <div className="flex items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total
                    </label>
                    <div className="text-lg font-semibold text-green-600">
                      ₹{safeRound(validateNumber(item.totalPrice, 0), 2, 0).toFixed(2)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Stock Info */}
              {item.itemName && (
                <div className="mt-2 text-sm text-gray-600">
                  {(() => {
                    const inventoryItem = inventory.find(inv => inv.itemName === item.itemName);
                    return inventoryItem ? (
                      <span>
                        Available: {inventoryItem.currentStock} {inventoryItem.unit} | 
                        Min Order: {inventoryItem.minimumOrder} {inventoryItem.unit}
                      </span>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No items added. Click "Add Item" to start building your order.
            </div>
          )}
        </div>

        {/* Order Summary */}
        {items.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Order Summary</h3>
            <div className="flex justify-between text-lg font-bold">
              <span>Total Cost:</span>
              <span className="text-green-600">₹{safeRound(getTotalCost(), 2, 0).toFixed(2)}</span>
            </div>
            {supplier && getTotalCost() < supplier.minimumOrder && (
              <p className="text-red-600 text-sm mt-1">
                Minimum order value: ₹{supplier.minimumOrder}
              </p>
            )}
          </div>
        )}

        {/* Delivery Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Delivery Address
          </label>
          <textarea
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="Enter complete delivery address"
            required
          />
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Method
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="cash">Cash on Delivery</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="Any special instructions or requirements"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || items.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>
      </form>
    </div>
  );
};
