import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';

export default function VendorProfileManagement() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    businessType: '',
    fssaiLicense: '',
    maxDeliveryDistance: 25,
    preferredCategories: [] as string[],
    budgetMin: 1000,
    budgetMax: 50000,
    qualityPreference: 'High',
    deliveryTimePreference: 'Same Day'
  });

  const vendor = useQuery(api.vendors.getByUserId, 
    user ? { userId: user.id } : "skip"
  );

  const updateVendor = useMutation(api.vendors.update);

  const categories = [
    'Vegetables', 'Fruits', 'Grains & Cereals', 'Spices & Condiments',
    'Dairy Products', 'Meat & Poultry', 'Seafood', 'Oil & Ghee',
    'Snacks & Beverages', 'Packaging Materials'
  ];

  const businessTypes = [
    'Street Food Stall', 'Restaurant', 'Cafe', 'Food Truck',
    'Catering Service', 'Cloud Kitchen', 'Bakery', 'Sweet Shop'
  ];

  const qualityOptions = ['Basic', 'Good', 'High', 'Premium'];
  const deliveryOptions = ['Same Day', 'Next Day', 'Within 3 Days', 'Flexible'];

  useEffect(() => {
    if (vendor) {
      setFormData({
        businessName: vendor.businessName || '',
        ownerName: vendor.ownerName || '',
        phone: vendor.phone || '',
        address: vendor.location?.address || '',
        city: vendor.location?.city || '',
        state: vendor.location?.state || '',
        pincode: vendor.location?.pincode || '',
        businessType: vendor.businessType || '',
        fssaiLicense: vendor.fssaiLicense || '',
        maxDeliveryDistance: vendor.preferences?.maxDeliveryDistance || 25,
        preferredCategories: vendor.preferences?.preferredCategories || [],
        budgetMin: vendor.preferences?.budgetRange?.min || 1000,
        budgetMax: vendor.preferences?.budgetRange?.max || 50000,
        qualityPreference: vendor.preferences?.qualityPreference || 'High',
        deliveryTimePreference: vendor.preferences?.deliveryTimePreference || 'Same Day'
      });
    }
  }, [vendor]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      preferredCategories: prev.preferredCategories.includes(category)
        ? prev.preferredCategories.filter(c => c !== category)
        : [...prev.preferredCategories, category]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;

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
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating vendor profile:', error);
    }
  };

  if (!vendor) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const profileCompleteness = () => {
    const fields = [
      formData.businessName, formData.ownerName, formData.phone,
      formData.address, formData.city, formData.state, formData.pincode,
      formData.businessType, formData.preferredCategories.length > 0
    ];
    const completed = fields.filter(field => field).length;
    return Math.round((completed / fields.length) * 100);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Vendor Profile</h2>
              <p className="text-gray-600">
                Manage your business information and preferences
              </p>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                isEditing
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {/* Profile Completeness */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Profile Completeness</span>
              <span>{profileCompleteness()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-orange-500 to-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${profileCompleteness()}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Owner Name *
                </label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => handleInputChange('ownerName', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Type *
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) => handleInputChange('businessType', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50"
                  required
                >
                  <option value="">Select Business Type</option>
                  {businessTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Location</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address *
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  disabled={!isEditing}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50"
                  required
                />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Sourcing Preferences</h3>
            
            {/* Preferred Categories */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategoryToggle(category)}
                    disabled={!isEditing}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                      formData.preferredCategories.includes(category)
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    } disabled:opacity-50`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Delivery Distance ({formData.maxDeliveryDistance} km)
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={formData.maxDeliveryDistance}
                  onChange={(e) => handleInputChange('maxDeliveryDistance', Number(e.target.value))}
                  disabled={!isEditing}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality Preference
                </label>
                <select
                  value={formData.qualityPreference}
                  onChange={(e) => handleInputChange('qualityPreference', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50"
                >
                  {qualityOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Range (₹)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={formData.budgetMin}
                    onChange={(e) => handleInputChange('budgetMin', Number(e.target.value))}
                    disabled={!isEditing}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50"
                    placeholder="Min"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="number"
                    value={formData.budgetMax}
                    onChange={(e) => handleInputChange('budgetMax', Number(e.target.value))}
                    disabled={!isEditing}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50"
                    placeholder="Max"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Time Preference
                </label>
                <select
                  value={formData.deliveryTimePreference}
                  onChange={(e) => handleInputChange('deliveryTimePreference', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50"
                >
                  {deliveryOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* FSSAI License */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Certification</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                FSSAI License Number (Optional)
              </label>
              <input
                type="text"
                value={formData.fssaiLicense}
                onChange={(e) => handleInputChange('fssaiLicense', e.target.value)}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50"
                placeholder="Enter 14-digit FSSAI license number"
                maxLength={14}
              />
              <p className="text-xs text-gray-500 mt-1">
                Adding FSSAI license improves your trust score and helps suppliers verify your business
              </p>
            </div>
          </div>

          {/* Submit Button */}
          {isEditing && (
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
              >
                Save Changes
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}