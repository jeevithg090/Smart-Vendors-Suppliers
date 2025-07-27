import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface VendorFormData {
  businessName: string;
  ownerName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  businessType: string;
  fssaiLicense: string;
  maxDeliveryDistance: number;
  preferredCategories: string[];
  budgetMin: number;
  budgetMax: number;
  qualityPreference: string;
  deliveryTimePreference: string;
}

const BUSINESS_TYPES = [
  'Street Food Cart',
  'Food Truck',
  'Small Restaurant',
  'Catering Service',
  'Home Kitchen',
  'Other'
];

const FOOD_CATEGORIES = [
  'Vegetables',
  'Fruits',
  'Grains & Cereals',
  'Spices & Condiments',
  'Dairy Products',
  'Meat & Poultry',
  'Seafood',
  'Oils & Fats',
  'Beverages',
  'Packaging Materials'
];

const QUALITY_PREFERENCES = [
  'Premium Quality',
  'Good Quality',
  'Budget Friendly'
];

const DELIVERY_TIME_PREFERENCES = [
  'Same Day',
  'Next Day',
  'Within 3 Days',
  'Within a Week'
];

interface VendorProfileManagementProps {
  onProfileUpdate?: () => void;
}

export default function VendorProfileManagement({ onProfileUpdate }: VendorProfileManagementProps) {
  const { user } = useAuth();
  const vendor = useQuery(api.vendors.getByUserId, user ? { userId: user.id } : "skip");
  const updateVendor = useMutation(api.vendors.update);
  
  const [formData, setFormData] = useState<VendorFormData>({
    businessName: '',
    ownerName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    businessType: '',
    fssaiLicense: '',
    maxDeliveryDistance: 10,
    preferredCategories: [],
    budgetMin: 1000,
    budgetMax: 10000,
    qualityPreference: 'Good Quality',
    deliveryTimePreference: 'Next Day'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Load vendor data into form when available
  useEffect(() => {
    if (vendor) {
      setFormData({
        businessName: vendor.businessName,
        ownerName: vendor.ownerName,
        phone: vendor.phone,
        address: vendor.location.address,
        city: vendor.location.city,
        state: vendor.location.state,
        pincode: vendor.location.pincode,
        businessType: vendor.businessType,
        fssaiLicense: vendor.fssaiLicense || '',
        maxDeliveryDistance: vendor.preferences.maxDeliveryDistance,
        preferredCategories: vendor.preferences.preferredCategories,
        budgetMin: vendor.preferences.budgetRange.min,
        budgetMax: vendor.preferences.budgetRange.max,
        qualityPreference: vendor.preferences.qualityPreference,
        deliveryTimePreference: vendor.preferences.deliveryTimePreference
      });
    }
  }, [vendor]);

  const handleInputChange = (field: keyof VendorFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      preferredCategories: prev.preferredCategories.includes(category)
        ? prev.preferredCategories.filter(c => c !== category)
        : [...prev.preferredCategories, category]
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required';
    if (!formData.ownerName.trim()) newErrors.ownerName = 'Owner name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.pincode.trim()) newErrors.pincode = 'Pincode is required';
    if (!formData.businessType) newErrors.businessType = 'Business type is required';
    if (formData.preferredCategories.length === 0) {
      newErrors.preferredCategories = 'Select at least one category';
    }

    // Phone validation
    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    // Pincode validation
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'Please enter a valid 6-digit pincode';
    }

    // Budget validation
    if (formData.budgetMin >= formData.budgetMax) {
      newErrors.budgetMin = 'Minimum budget must be less than maximum budget';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !vendor) return;

    setIsSubmitting(true);
    try {
      await updateVendor({
        id: vendor._id,
        businessName: formData.businessName,
        ownerName: formData.ownerName,
        phone: formData.phone,
        location: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          coordinates: vendor.location.coordinates // Keep existing coordinates
        },
        businessType: formData.businessType,
        fssaiLicense: formData.fssaiLicense || undefined,
        preferences: {
          maxDeliveryDistance: formData.maxDeliveryDistance,
          preferredCategories: formData.preferredCategories,
          budgetRange: {
            min: formData.budgetMin,
            max: formData.budgetMax
          },
          qualityPreference: formData.qualityPreference,
          deliveryTimePreference: formData.deliveryTimePreference
        }
      });
      
      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);
      onProfileUpdate?.();
    } catch (error) {
      console.error('Profile update failed:', error);
      setErrors({ submit: 'Profile update failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (vendor) {
      // Reset form to original values
      setFormData({
        businessName: vendor.businessName,
        ownerName: vendor.ownerName,
        phone: vendor.phone,
        address: vendor.location.address,
        city: vendor.location.city,
        state: vendor.location.state,
        pincode: vendor.location.pincode,
        businessType: vendor.businessType,
        fssaiLicense: vendor.fssaiLicense || '',
        maxDeliveryDistance: vendor.preferences.maxDeliveryDistance,
        preferredCategories: vendor.preferences.preferredCategories,
        budgetMin: vendor.preferences.budgetRange.min,
        budgetMax: vendor.preferences.budgetRange.max,
        qualityPreference: vendor.preferences.qualityPreference,
        deliveryTimePreference: vendor.preferences.deliveryTimePreference
      });
    }
    setIsEditing(false);
    setErrors({});
    setSuccessMessage('');
  };

  if (!vendor) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Profile Management</h2>
            <p className="text-gray-600 mt-1">Manage your vendor profile and preferences</p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors font-medium flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </button>
          )}
        </div>

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-green-600 font-medium">{successMessage}</p>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Information */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name *
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.businessName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your business name"
                />
              ) : (
                <p className="px-3 py-2 bg-gray-50 rounded-md text-gray-800">{formData.businessName}</p>
              )}
              {errors.businessName && (
                <p className="text-red-500 text-sm mt-1">{errors.businessName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Owner Name *
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => handleInputChange('ownerName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.ownerName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter owner name"
                />
              ) : (
                <p className="px-3 py-2 bg-gray-50 rounded-md text-gray-800">{formData.ownerName}</p>
              )}
              {errors.ownerName && (
                <p className="text-red-500 text-sm mt-1">{errors.ownerName}</p>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter 10-digit phone number"
                />
              ) : (
                <p className="px-3 py-2 bg-gray-50 rounded-md text-gray-800">{formData.phone}</p>
              )}
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type *
              </label>
              {isEditing ? (
                <select
                  value={formData.businessType}
                  onChange={(e) => handleInputChange('businessType', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.businessType ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select business type</option>
                  {BUSINESS_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              ) : (
                <p className="px-3 py-2 bg-gray-50 rounded-md text-gray-800">{formData.businessType}</p>
              )}
              {errors.businessType && (
                <p className="text-red-500 text-sm mt-1">{errors.businessType}</p>
              )}
            </div>
          </div>

          {/* Location Information */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address *
            </label>
            {isEditing ? (
              <textarea
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  errors.address ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter complete address"
              />
            ) : (
              <p className="px-3 py-2 bg-gray-50 rounded-md text-gray-800">{formData.address}</p>
            )}
            {errors.address && (
              <p className="text-red-500 text-sm mt-1">{errors.address}</p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City *
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.city ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter city"
                />
              ) : (
                <p className="px-3 py-2 bg-gray-50 rounded-md text-gray-800">{formData.city}</p>
              )}
              {errors.city && (
                <p className="text-red-500 text-sm mt-1">{errors.city}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State *
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.state ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter state"
                />
              ) : (
                <p className="px-3 py-2 bg-gray-50 rounded-md text-gray-800">{formData.state}</p>
              )}
              {errors.state && (
                <p className="text-red-500 text-sm mt-1">{errors.state}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pincode *
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => handleInputChange('pincode', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.pincode ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter 6-digit pincode"
                />
              ) : (
                <p className="px-3 py-2 bg-gray-50 rounded-md text-gray-800">{formData.pincode}</p>
              )}
              {errors.pincode && (
                <p className="text-red-500 text-sm mt-1">{errors.pincode}</p>
              )}
            </div>
          </div>

          {/* FSSAI License */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              FSSAI License (Optional)
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.fssaiLicense}
                onChange={(e) => handleInputChange('fssaiLicense', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Enter FSSAI license number"
              />
            ) : (
              <p className="px-3 py-2 bg-gray-50 rounded-md text-gray-800">
                {formData.fssaiLicense || 'Not provided'}
              </p>
            )}
          </div>

          {/* Preferred Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Categories *
            </label>
            {isEditing ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {FOOD_CATEGORIES.map(category => (
                  <label key={category} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.preferredCategories.includes(category)}
                      onChange={() => handleCategoryToggle(category)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm">{category}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {formData.preferredCategories.map(category => (
                  <span key={category} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                    {category}
                  </span>
                ))}
              </div>
            )}
            {errors.preferredCategories && (
              <p className="text-red-500 text-sm mt-1">{errors.preferredCategories}</p>
            )}
          </div>

          {/* Preferences */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Delivery Distance (km)
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.maxDeliveryDistance}
                  onChange={(e) => handleInputChange('maxDeliveryDistance', parseInt(e.target.value))}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              ) : (
                <p className="px-3 py-2 bg-gray-50 rounded-md text-gray-800">{formData.maxDeliveryDistance} km</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quality Preference
              </label>
              {isEditing ? (
                <select
                  value={formData.qualityPreference}
                  onChange={(e) => handleInputChange('qualityPreference', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {QUALITY_PREFERENCES.map(pref => (
                    <option key={pref} value={pref}>{pref}</option>
                  ))}
                </select>
              ) : (
                <p className="px-3 py-2 bg-gray-50 rounded-md text-gray-800">{formData.qualityPreference}</p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget Range (₹)
              </label>
              {isEditing ? (
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={formData.budgetMin}
                    onChange={(e) => handleInputChange('budgetMin', parseInt(e.target.value))}
                    placeholder="Min"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="number"
                    value={formData.budgetMax}
                    onChange={(e) => handleInputChange('budgetMax', parseInt(e.target.value))}
                    placeholder="Max"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              ) : (
                <p className="px-3 py-2 bg-gray-50 rounded-md text-gray-800">
                  ₹{formData.budgetMin.toLocaleString()} - ₹{formData.budgetMax.toLocaleString()}
                </p>
              )}
              {errors.budgetMin && (
                <p className="text-red-500 text-sm mt-1">{errors.budgetMin}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Time Preference
              </label>
              {isEditing ? (
                <select
                  value={formData.deliveryTimePreference}
                  onChange={(e) => handleInputChange('deliveryTimePreference', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {DELIVERY_TIME_PREFERENCES.map(pref => (
                    <option key={pref} value={pref}>{pref}</option>
                  ))}
                </select>
              ) : (
                <p className="px-3 py-2 bg-gray-50 rounded-md text-gray-800">{formData.deliveryTimePreference}</p>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          {isEditing && (
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
