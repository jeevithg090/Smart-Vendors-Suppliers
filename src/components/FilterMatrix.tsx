import { useState, useEffect } from 'react';

interface SearchFilters {
  categories?: string[];
  tags?: string[];
  isVerified?: boolean;
  isFastDelivery?: boolean;
  minRating?: number;
  maxDistance?: number;
  userLocation?: {
    lat: number;
    lng: number;
  };
}

interface FilterMatrixProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  userLocation?: { lat: number; lng: number; city: string };
  className?: string;
}

interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filters: Partial<AlgoliaSearchFilters>;
  icon: string;
}

const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'premium',
    name: 'Premium Only',
    description: 'High-rated, verified suppliers',
    filters: {
      isVerified: true,
      minRating: 4.5,
      tags: ['premium', 'organic']
    },
    icon: '⭐'
  },
  {
    id: 'fast_delivery',
    name: 'Fast Delivery',
    description: 'Quick delivery options',
    filters: {
      isFastDelivery: true,
      maxDistance: 15
    },
    icon: '🚀'
  },
  {
    id: 'budget_friendly',
    name: 'Budget Friendly',
    description: 'Affordable options',
    filters: {
      minRating: 3.5,
      maxDistance: 25
    },
    icon: '💰'
  },
  {
    id: 'organic_only',
    name: 'Organic Only',
    description: 'Organic and natural products',
    filters: {
      tags: ['organic', 'natural'],
      isVerified: true
    },
    icon: '🌱'
  }
];

const CATEGORIES = [
  'Vegetables & Fruits',
  'Spices & Condiments',
  'Seafood',
  'Dairy',
  'Grains & Pulses',
  'Meat & Poultry',
  'Oil & Ghee',
  'Snacks & Beverages',
  'Packaging Materials'
];

const POPULAR_TAGS = [
  'organic', 'fresh', 'premium', 'traditional', 'wholesale',
  'bulk', 'local', 'imported', 'seasonal', 'processed'
];

export default function FilterMatrix({ 
  filters, 
  onFiltersChange, 
  userLocation,
  className = '' 
}: FilterMatrixProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Apply filter preset
  const applyPreset = (preset: FilterPreset) => {
    setActivePreset(preset.id);
    onFiltersChange({
      ...filters,
      ...preset.filters
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setActivePreset(null);
    onFiltersChange({
      userLocation: filters.userLocation
    });
  };

  // Update specific filter
  const updateFilter = <K extends keyof AlgoliaSearchFilters>(
    key: K, 
    value: AlgoliaSearchFilters[K]
  ) => {
    setActivePreset(null); // Clear preset when manually changing filters
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  // Toggle array filter (categories, tags)
  const toggleArrayFilter = <K extends keyof AlgoliaSearchFilters>(
    key: K,
    value: string
  ) => {
    const currentArray = (filters[key] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    updateFilter(key, newArray as AlgoliaSearchFilters[K]);
  };

  // Count active filters
  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.categories && filters.categories.length > 0) count++;
    if (filters.tags && filters.tags.length > 0) count++;
    if (filters.isVerified !== undefined) count++;
    if (filters.isFastDelivery !== undefined) count++;
    if (filters.minRating !== undefined && filters.minRating > 0) count++;
    if (filters.maxDistance !== undefined && filters.maxDistance < 50) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-800">Smart Filters</h3>
            {activeFilterCount > 0 && (
              <span className="bg-orange-100 text-orange-800 text-sm px-2 py-1 rounded-full font-medium">
                {activeFilterCount} active
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg 
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="p-4">
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Filters</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {FILTER_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`p-3 rounded-lg border text-left transition-all hover:shadow-sm ${
                  activePreset === preset.id
                    ? 'bg-orange-50 border-orange-200 text-orange-800'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-lg">{preset.icon}</span>
                  <span className="font-medium text-sm">{preset.name}</span>
                </div>
                <p className="text-xs text-gray-600">{preset.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="space-y-6 animate-slide-down">
            {/* Rating Filter */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Minimum Rating</h4>
              <div className="flex space-x-2">
                {[0, 3, 3.5, 4, 4.5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => updateFilter('minRating', rating === 0 ? undefined : rating)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filters.minRating === rating || (rating === 0 && !filters.minRating)
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {rating === 0 ? 'Any' : `${rating}+`}
                    {rating > 0 && <span className="ml-1">⭐</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Categories</h4>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(category => (
                  <button
                    key={category}
                    onClick={() => toggleArrayFilter('categories', category)}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                      filters.categories?.includes(category)
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Specialty Tags</h4>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleArrayFilter('tags', tag)}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                      filters.tags?.includes(tag)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Distance Filter (if user location available) */}
            {userLocation && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Delivery Distance: {filters.maxDistance || 50} km
                </h4>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={filters.maxDistance || 50}
                  onChange={(e) => updateFilter('maxDistance', Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5 km</span>
                  <span>100 km</span>
                </div>
              </div>
            )}

            {/* Service Features */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Service Features</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.isVerified || false}
                    onChange={(e) => updateFilter('isVerified', e.target.checked || undefined)}
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">✅ Verified Suppliers Only</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.isFastDelivery || false}
                    onChange={(e) => updateFilter('isFastDelivery', e.target.checked || undefined)}
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">🚀 Fast Delivery Available</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
