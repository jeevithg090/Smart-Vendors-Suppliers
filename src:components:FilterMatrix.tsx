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
  filters: Partial;
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
  const [activePreset, setActivePreset] = useState(null);

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
  const updateFilter =(
    key: K, 
    value: SearchFilters[K]
  ) => {
    setActivePreset(null); // Clear preset when manually changing filters
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  // Toggle array filter (categories, tags)
  const toggleArrayFilter =(
    key: K,
    value: string
  ) => {
    const currentArray = (filters[key] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    updateFilter(key, newArray as SearchFilters[K]);
  };

  // Count active filters
  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.categories && filters.categories.length > 0) count++;
    if (filters.tags && filters.tags.length > 0) count++;
    if (filters.isVerified !== undefined) count++;
    if (filters.isFastDelivery !== undefined) count++;
    if (filters.minRating !== undefined && filters.minRating > 0) count++;
    if (filters.maxDistance !== undefined && filters.maxDistance{/* Header */}Smart Filters</h3activeFilterCount > 0 && ({activeFilterCount} active</span{activeFilterCount > 0 && (Clear All)}setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >{/* Quick Presets */}Quick Filters{FILTER_PRESETS.map(preset => (applyPreset(preset)}
                className={`p-3 rounded-lg border text-left transition-all hover:shadow-sm ${
                  activePreset === preset.id
                    ? 'bg-orange-50 border-orange-200 text-orange-800'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >{preset.icon}{preset.name}{preset.description}))}</div Expanded Filters */}
        {isExpanded && ({/* Rating Filter */}Minimum Rating{[0, 3, 3.5, 4, 4.5].map(rating => (updateFilter('minRating', rating === 0 ? undefined : rating)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filters.minRating === rating || (rating === 0 && !filters.minRating)
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {rating === 0 ? 'Any' : `${rating}+`}
                    {rating > 0 &&⭐}))}</div Categories */}Categories{CATEGORIES.map(category => (toggleArrayFilter('categories', category)}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                      filters.categories?.includes(category)
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}</button{/* Tags */}Specialty Tags{POPULAR_TAGS.map(tag => (toggleArrayFilter('tags', tag)}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                      filters.tags?.includes(tag)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    #{tag}))}{/* Distance Filter (if user location available) */}
            {userLocation && (Delivery Distance: {filters.maxDistance || 50} km</h4updateFilter('maxDistance', Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />5 km100 km)}

            {/* Service Features */}Service FeaturesupdateFilter('isVerified', e.target.checked || undefined)}
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />✅ Verified Suppliers OnlyupdateFilter('isFastDelivery', e.target.checked || undefined)}
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />🚀 Fast Delivery Available)});
}