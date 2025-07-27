import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import SupplierCard from './SupplierCard';
import SupplierDetails from './SupplierDetails';

interface SupplierSearchProps {
  vendorLocation?: {
    lat: number;
    lng: number;
    city: string;
  };
  onSupplierSelect?: (supplierId: string) => void;
}

interface SearchFilters {
  searchTerm: string;
  city: string;
  categories: string[];
  minTrustScore: number;
  maxDistance: number;
  sortBy: 'trustScore' | 'distance' | 'name';
}

const FOOD_CATEGORIES = [
  'Vegetables',
  'Fruits',
  'Grains & Cereals',
  'Spices & Condiments',
  'Dairy Products',
  'Meat & Poultry',
  'Seafood',
  'Oil & Ghee',
  'Snacks & Beverages',
  'Packaging Materials'
];

const INDIAN_CITIES = [
  'Mumbai',
  'Delhi',
  'Bangalore',
  'Chennai',
  'Kolkata',
  'Hyderabad',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Lucknow'
];

export default function SupplierSearch({ vendorLocation, onSupplierSelect }: SupplierSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    city: vendorLocation?.city || '',
    categories: [],
    minTrustScore: 0,
    maxDistance: 50,
    sortBy: 'trustScore'
  });

  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Mutation to create sample suppliers
  const createSampleSuppliers = useMutation(api.sampleSuppliers.createSampleSuppliers);

  // Debounced search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(filters.searchTerm);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(filters.searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [filters.searchTerm]);

  // Search suppliers with filters
  const suppliers = useQuery(api.suppliers.searchSuppliers, {
    searchTerm: debouncedSearchTerm || undefined,
    city: filters.city || undefined,
    categories: filters.categories.length > 0 ? filters.categories : undefined,
    minTrustScore: filters.minTrustScore > 0 ? filters.minTrustScore : undefined,
    maxDistance: vendorLocation ? filters.maxDistance : undefined,
    vendorLocation: vendorLocation ? {
      lat: vendorLocation.lat,
      lng: vendorLocation.lng
    } : undefined,
    sortBy: filters.sortBy,
    limit: 50
  });

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCategoryToggle = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      city: vendorLocation?.city || '',
      categories: [],
      minTrustScore: 0,
      maxDistance: 50,
      sortBy: 'trustScore'
    });
  };

  const handleSupplierClick = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    onSupplierSelect?.(supplierId);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.city && filters.city !== vendorLocation?.city) count++;
    if (filters.categories.length > 0) count++;
    if (filters.minTrustScore > 0) count++;
    if (filters.maxDistance < 50) count++;
    return count;
  }, [filters, vendorLocation]);

  if (selectedSupplierId) {
    return (
      <SupplierDetails
        supplierId={selectedSupplierId}
        onBack={() => setSelectedSupplierId(null)}
        vendorLocation={vendorLocation}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto section-padding">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Find Suppliers</h1>
        <p className="text-gray-600 text-sm md:text-base">
          Discover trusted suppliers for your raw material needs
        </p>
      </div>

      {/* Search Bar */}
      <div className="card mb-4 md:mb-6">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search suppliers..."
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex-1 md:flex-none px-4 py-3 rounded-lg border font-medium transition-colors flex items-center justify-center ${
                showFilters 
                  ? 'bg-orange-500 text-white border-orange-500' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="hidden xs:inline">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="ml-2 bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="px-3 md:px-4 py-3 text-gray-600 hover:text-gray-800 font-medium text-sm"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 animate-slide-down">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* City Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <select
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                  className="form-input"
                >
                  <option value="">All Cities</option>
                  {INDIAN_CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Trust Score Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Trust Score
                </label>
                <select
                  value={filters.minTrustScore}
                  onChange={(e) => handleFilterChange('minTrustScore', Number(e.target.value))}
                  className="form-input"
                >
                  <option value={0}>Any Score</option>
                  <option value={2}>2.0+</option>
                  <option value={3}>3.0+</option>
                  <option value={4}>4.0+</option>
                  <option value={4.5}>4.5+</option>
                </select>
              </div>

              {/* Distance Filter */}
              {vendorLocation && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Distance ({filters.maxDistance} km)
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={filters.maxDistance}
                    onChange={(e) => handleFilterChange('maxDistance', Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
              )}

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="form-input"
                >
                  <option value="trustScore">Trust Score</option>
                  {vendorLocation && <option value="distance">Distance</option>}
                  <option value="name">Name</option>
                </select>
              </div>
            </div>

            {/* Category Filter */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {FOOD_CATEGORIES.map(category => (
                  <button
                    key={category}
                    onClick={() => handleCategoryToggle(category)}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors min-h-touch ${
                      filters.categories.includes(category)
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-gray-600 text-sm md:text-base">
          {suppliers ? (
            <>
              {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''} found
              {filters.city && ` in ${filters.city}`}
            </>
          ) : (
            'Searching...'
          )}
        </div>
      </div>

      {/* Suppliers Grid */}
      {suppliers ? (
        suppliers.length > 0 ? (
          <div className="grid-responsive">
            {suppliers.map((supplier) => (
              <SupplierCard
                key={supplier._id}
                supplier={supplier}
                onClick={() => handleSupplierClick(supplier._id)}
                showDistance={!!vendorLocation}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 md:py-12">
            <div className="text-3xl md:text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              No suppliers found
            </h3>
            <p className="text-gray-600 max-w-md mx-auto text-sm md:text-base px-4">
              Try adjusting your search criteria or filters to find more suppliers.
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-4 text-orange-500 hover:text-orange-600 font-medium min-h-touch"
              >
                Clear all filters
              </button>
            )}
          </div>
        )
      ) : (
        <div className="grid-responsive">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card loading-skeleton">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-3 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-4"></div>
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-16"></div>
                <div className="h-3 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
