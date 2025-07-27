import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { validateNumber, safePercentage, safeMultiply, safeRound } from '../utils/numberValidation';

interface GroupOrderCreationProps {
  vendorId: Id<"vendors">;
  vendorLocation: string;
  onOrderCreated: (groupOrderId: Id<"groupOrders">) => void;
  onCancel: () => void;
}

interface Supplier {
  _id: Id<"suppliers">;
  businessName: string;
  location: {
    city: string;
    address: string;
  };
  trustScore: number;
}

interface InventoryItem {
  _id: Id<"inventory">;
  supplierId: Id<"suppliers">;
  itemName: string;
  category: string;
  currentStock: number;
  unit: string;
  pricePerUnit: number;
  minimumOrder: number;
  quality: string;
  isAvailable: boolean;
}

const GroupOrderCreation: React.FC<GroupOrderCreationProps> = ({
  vendorId,
  vendorLocation,
  onOrderCreated,
  onCancel,
}) => {
  const [selectedSupplier, setSelectedSupplier] = useState<Id<"suppliers"> | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [targetQuantity, setTargetQuantity] = useState<number>(10);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [expirationHours, setExpirationHours] = useState<number>(24);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const createGroupOrder = useMutation(api.groupOrders.createGroupOrder);

  // Get suppliers in the same city
  const suppliers = useQuery(api.suppliers.getSuppliersByLocation, {
    city: vendorLocation,
  }) as Supplier[] | undefined;

  // Get inventory for selected supplier
  const inventory = useQuery(
    api.suppliers.getSupplierInventory,
    selectedSupplier ? { supplierId: selectedSupplier } : "skip"
  ) as InventoryItem[] | undefined;

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!selectedSupplier) {
      newErrors.supplier = 'Please select a supplier';
    }

    if (!selectedItem) {
      newErrors.item = 'Please select an item';
    }

    if (targetQuantity < 5) {
      newErrors.targetQuantity = 'Target quantity must be at least 5 kg';
    }

    if (selectedItem && targetQuantity > selectedItem.currentStock) {
      newErrors.targetQuantity = `Target quantity cannot exceed available stock (${selectedItem.currentStock} ${selectedItem.unit})`;
    }

    if (expirationHours < 1 || expirationHours > 168) {
      newErrors.expirationHours = 'Expiration must be between 1 and 168 hours (7 days)';
    }

    if (customPrice && customPrice <= 0) {
      newErrors.customPrice = 'Custom price must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedItem) return;

    setIsSubmitting(true);
    
    try {
      const expiresAt = Date.now() + (expirationHours * 60 * 60 * 1000);
      const pricePerUnit = customPrice || selectedItem.pricePerUnit;

      const groupOrderId = await createGroupOrder({
        initiatorId: vendorId,
        itemName: selectedItem.itemName,
        category: selectedItem.category,
        targetQuantity,
        pricePerUnit,
        supplierId: selectedSupplier!,
        location: vendorLocation,
        expiresAt,
      });

      if (groupOrderId) {
        onOrderCreated(groupOrderId);
      }
    } catch (error) {
      console.error('Error creating group order:', error);
      setErrors({ submit: 'Failed to create group order. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplier(supplierId as Id<"suppliers">);
    setSelectedItem(null);
    setCustomPrice(null);
  };

  const handleItemChange = (itemId: string) => {
    const item = inventory?.find(i => i._id === itemId);
    setSelectedItem(item || null);
    setCustomPrice(item ? item.pricePerUnit : null);
  };

  const calculatePotentialSavings = () => {
    if (!selectedItem || !customPrice) return 0;
    const regularPrice = validateNumber(selectedItem.pricePerUnit, 0);
    const groupPrice = validateNumber(customPrice, 0);
    return safePercentage((regularPrice - groupPrice), regularPrice, 0);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create Group Order</h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Supplier Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Supplier
          </label>
          <select
            value={selectedSupplier || ''}
            onChange={(e) => handleSupplierChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a supplier...</option>
            {suppliers?.map((supplier) => (
              <option key={supplier._id} value={supplier._id}>
                {supplier.businessName} - {supplier.location.city} (Trust: {supplier.trustScore.toFixed(1)})
              </option>
            ))}
          </select>
          {errors.supplier && (
            <p className="text-red-500 text-sm mt-1">{errors.supplier}</p>
          )}
        </div>

        {/* Item Selection */}
        {selectedSupplier && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Item
            </label>
            <select
              value={selectedItem?._id || ''}
              onChange={(e) => handleItemChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose an item...</option>
              {inventory?.filter(item => item.isAvailable && item.currentStock > 0).map((item) => (
                <option key={item._id} value={item._id}>
                  {item.itemName} - ₹{item.pricePerUnit}/{item.unit} (Stock: {item.currentStock} {item.unit})
                </option>
              ))}
            </select>
            {errors.item && (
              <p className="text-red-500 text-sm mt-1">{errors.item}</p>
            )}
          </div>
        )}

        {/* Item Details */}
        {selectedItem && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Item Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Category:</span>
                <span className="ml-2 font-medium">{selectedItem.category}</span>
              </div>
              <div>
                <span className="text-gray-600">Quality:</span>
                <span className="ml-2 font-medium">{selectedItem.quality}</span>
              </div>
              <div>
                <span className="text-gray-600">Regular Price:</span>
                <span className="ml-2 font-medium">₹{selectedItem.pricePerUnit}/{selectedItem.unit}</span>
              </div>
              <div>
                <span className="text-gray-600">Available Stock:</span>
                <span className="ml-2 font-medium">{selectedItem.currentStock} {selectedItem.unit}</span>
              </div>
            </div>
          </div>
        )}

        {/* Target Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Quantity ({selectedItem?.unit || 'kg'})
          </label>
          <input
            type="number"
            min="5"
            max={selectedItem?.currentStock || 1000}
            value={targetQuantity}
            onChange={(e) => setTargetQuantity(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Minimum 5 {selectedItem?.unit || 'kg'}, Maximum {selectedItem?.currentStock || 1000} {selectedItem?.unit || 'kg'}
          </p>
          {errors.targetQuantity && (
            <p className="text-red-500 text-sm mt-1">{errors.targetQuantity}</p>
          )}
        </div>

        {/* Custom Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Group Price per {selectedItem?.unit || 'kg'} (Optional)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={customPrice || ''}
            onChange={(e) => setCustomPrice(parseFloat(e.target.value) || null)}
            placeholder={selectedItem ? `Regular price: ₹${selectedItem.pricePerUnit}` : 'Enter custom price'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {customPrice && selectedItem && customPrice < selectedItem.pricePerUnit && (
            <p className="text-green-600 text-sm mt-1">
              Potential savings: {calculatePotentialSavings().toFixed(1)}% per {selectedItem.unit}
            </p>
          )}
          {errors.customPrice && (
            <p className="text-red-500 text-sm mt-1">{errors.customPrice}</p>
          )}
        </div>

        {/* Expiration Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Order Expires In (Hours)
          </label>
          <select
            value={expirationHours}
            onChange={(e) => setExpirationHours(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={6}>6 hours</option>
            <option value={12}>12 hours</option>
            <option value={24}>24 hours (1 day)</option>
            <option value={48}>48 hours (2 days)</option>
            <option value={72}>72 hours (3 days)</option>
            <option value={168}>168 hours (7 days)</option>
          </select>
          {errors.expirationHours && (
            <p className="text-red-500 text-sm mt-1">{errors.expirationHours}</p>
          )}
        </div>

        {/* Order Summary */}
        {selectedItem && customPrice && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Order Summary</h3>
            <div className="space-y-1 text-sm text-blue-800">
              <div className="flex justify-between">
                <span>Item:</span>
                <span>{selectedItem.itemName}</span>
              </div>
              <div className="flex justify-between">
                <span>Target Quantity:</span>
                <span>{targetQuantity} {selectedItem.unit}</span>
              </div>
              <div className="flex justify-between">
                <span>Price per {selectedItem.unit}:</span>
                <span>₹{customPrice}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total Value:</span>
                <span>₹{safeRound(safeMultiply(validateNumber(targetQuantity, 0), validateNumber(customPrice, 0), 0), 2, 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Submit Error */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-600 text-sm">{errors.submit}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !selectedItem}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Group Order'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GroupOrderCreation;
