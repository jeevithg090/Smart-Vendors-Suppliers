import { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface DemandRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  itemName: string;
  quantity: number;
  unit: string;
  priceMin: number | undefined;
  priceMax: number | undefined;
  urgency: 'low' | 'medium' | 'high';
  location: string;
  notes: string;
  requireFssai: boolean;
}

const UNITS = ['kg', 'liters', 'pieces', 'grams', 'tons', 'boxes'];
const URGENCY_OPTIONS = [
  { value: 'low', label: 'Low (3+ days)', color: 'text-green-600' },
  { value: 'medium', label: 'Medium (1-2 days)', color: 'text-yellow-600' },
  { value: 'high', label: 'High (Today)', color: 'text-red-600' },
];

export default function DemandRequestModal({ isOpen, onClose, onSuccess }: DemandRequestModalProps) {
  const [formData, setFormData] = useState<FormData>({
    itemName: '',
    quantity: 1,
    unit: 'kg',
    priceMin: undefined,
    priceMax: undefined,
    urgency: 'medium',
    location: '',
    notes: '',
    requireFssai: false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createRequest = useMutation(api.requests.createDemandRequest);
  const similarRequests = useQuery(
    api.requests.getSimilarRequests, 
    formData.itemName.length > 2 ? { item: formData.itemName, location: formData.location } : 'skip'
  );

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        itemName: '',
        quantity: 1,
        unit: 'kg',
        priceMin: undefined,
        priceMax: undefined,
        urgency: 'medium',
        location: '',
        notes: '',
        requireFssai: false,
      });
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.itemName.trim()) {
      newErrors.itemName = 'Item name is required';
    }

    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (formData.priceMin && formData.priceMax && formData.priceMin > formData.priceMax) {
      newErrors.priceMax = 'Maximum price must be greater than minimum price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createRequest({
        itemName: formData.itemName.trim(),
        quantity: formData.quantity,
        unit: formData.unit,
        priceMin: formData.priceMin,
        priceMax: formData.priceMax,
        urgency: formData.urgency,
        location: formData.location.trim(),
        notes: formData.notes.trim() || undefined,
        requireFssai: formData.requireFssai,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating request:', error);
      // You could add a toast notification here
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create New Demand Request</h2>
            <p className="text-sm text-gray-600 mt-1">Specify what you need—suppliers will respond</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Name *
            </label>
            <input
              type="text"
              value={formData.itemName}
              onChange={(e) => handleInputChange('itemName', e.target.value)}
              placeholder="e.g., Wheat Flour, Tomatoes, Cooking Oil"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.itemName ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.itemName && <p className="text-red-500 text-sm mt-1">{errors.itemName}</p>}
          </div>

          {/* Quantity and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  errors.quantity ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              />
              {errors.quantity && <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit *
              </label>
              <select
                value={formData.unit}
                onChange={(e) => handleInputChange('unit', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={isSubmitting}
              >
                {UNITS.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Price Range (per {formData.unit})
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.priceMin || ''}
                  onChange={(e) => handleInputChange('priceMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="Min price (₹)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.priceMax || ''}
                  onChange={(e) => handleInputChange('priceMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="Max price (₹)"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.priceMax ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.priceMax && <p className="text-red-500 text-sm mt-1">{errors.priceMax}</p>}
              </div>
            </div>
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urgency Level *
            </label>
            <div className="space-y-2">
              {URGENCY_OPTIONS.map(option => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    name="urgency"
                    value={option.value}
                    checked={formData.urgency === option.value}
                    onChange={(e) => handleInputChange('urgency', e.target.value as 'low' | 'medium' | 'high')}
                    className="mr-2 text-orange-500 focus:ring-orange-500"
                    disabled={isSubmitting}
                  />
                  <span className={`text-sm ${option.color}`}>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Location *
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="e.g., Mumbai, Andheri"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.location ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quality/Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="e.g., Organic preferred, no additives, specific quality requirements..."
              rows={3}
              maxLength={200}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">{formData.notes.length}/200 characters</p>
          </div>

          {/* FSSAI Requirement */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.requireFssai}
                onChange={(e) => handleInputChange('requireFssai', e.target.checked)}
                className="mr-2 text-orange-500 focus:ring-orange-500"
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-700">Require FSSAI-certified suppliers only</span>
            </label>
          </div>

          {/* AI Suggestions */}
          {similarRequests && similarRequests.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">💡 Similar Requests Found</h3>
              <div className="space-y-2">
                {similarRequests.map((request) => (
                  <div key={request._id} className="bg-white rounded p-3 text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{request.itemName}</p>
                        <p className="text-gray-600">{request.quantity} {request.unit} • {request.location}</p>
                        <p className="text-xs text-gray-500">by {request.vendor?.businessName}</p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {request.responses.length} responses
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}