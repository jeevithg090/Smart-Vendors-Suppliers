import { useState, useEffect, useMemo } from 'react';
import FilterMatrix from './FilterMatrix';

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

interface SearchResult {
  objectID: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  rating: number;
  reviewCount: number;
  location: {
    lat: number;
    lng: number;
    address: string;
    city: string;
    state: string;
  };
  isVerified: boolean;
  isFastDelivery: boolean;
  minOrder: number;
  deliveryRadius: number;
  businessHours: {
    open: string;
    close: string;
    days: string[];
  };
  distance?: number;
}

interface EnhancedSupplierSearchProps {
  vendorLocation?: {
    lat: number;
    lng: number;
    city: string;
  };
  onSupplierSelect?: (supplier: SearchResult) => void;
  className?: string;
}

interface SearchState {
  query: string;
  filters: SearchFilters;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  totalResults: number;
  currentPage: number;
  totalPages: number;
  sortBy: string;
}

const SORT_OPTIONS = [
  { value: 'rating', label: 'Best Rated' },
  { value: 'distance', label: 'Nearest First' },
  { value: 'reviewCount', label: 'Most Reviewed' },
  { value: 'default', label: 'Relevance' }
];

export default function EnhancedSupplierSearch({ 
  vendorLocation, 
  onSupplierSelect,
  className = ''
}: EnhancedSupplierSearchProps) {
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    filters: {
      userLocation: vendorLocation ? {
        lat: vendorLocation.lat,
        lng: vendorLocation.lng
      } : undefined,
      maxDistance: 25
    },
    results: [],
    isLoading: false,
    error: null,
    totalResults: 0,
    currentPage: 0,
    totalPages: 0,
    sortBy: 'rating'
  });

  const [debouncedQuery, setDebouncedQuery] = useState(searchState.query);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchState.query);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchState.query]);

  // Perform search when query or filters change
  useEffect(() => {
    performSearch();
  }, [debouncedQuery, searchState.filters, searchState.sortBy, searchState.currentPage]);

  const performSearch = async () => {
    setSearchState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await mockSearchService.search(
        debouncedQuery,
        searchState.filters,
        {
          hitsPerPage: 12,
          page: searchState.currentPage,
          sortBy: searchState.sortBy
        }
      );

      setSearchState(prev => ({
        ...prev,
        results: result.hits,
        totalResults: result.nbHits,
        totalPages: result.nbPages,
        isLoading: false
      }));
    } catch (error) {
      console.error('Search error:', error);
      setSearchState(prev => ({
        ...prev,
        error: 'Failed to search suppliers. Please try again.',
        isLoading: false
      }));
    }
  };

  const updateQuery = (query: string) => {
    setSearchState(prev => ({
      ...prev,
      query,
      currentPage: 0 // Reset to first page on new search
    }));
  };

  const updateFilters = (filters: AlgoliaSearchFilters) => {
    setSearchState(prev => ({
      ...prev,
      filters,
      currentPage: 0 // Reset to first page on filter change
    }));
  };

  const updateSortBy = (sortBy: string) => {
    setSearchState(prev => ({
      ...prev,
      sortBy,
      currentPage: 0
    }));
  };

  const loadNextPage = () => {
    if (searchState.currentPage < searchState.totalPages - 1) {
      setSearchState(prev => ({
        ...prev,
        currentPage: prev.currentPage + 1
      }));
    }
  };

  const getActiveFilterCount = useMemo(() => {
    let count = 0;
    const { filters } = searchState;
    if (filters.categories && filters.categories.length > 0) count++;
    if (filters.tags && filters.tags.length > 0) count++;
    if (filters.isVerified !== undefined) count++;
    if (filters.isFastDelivery !== undefined) count++;
    if (filters.minRating !== undefined && filters.minRating > 0) count++;
    if (filters.maxDistance !== undefined && filters.maxDistance < 50) count++;
    return count;
  }, [searchState.filters]);

  return (
    <div className={`max-w-7xl mx-auto ${className}`}>
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Find Perfect Suppliers
        </h1>
        <p className="text-gray-600">
          Advanced search with smart filtering to find exactly what you need
        </p>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <svg 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search for suppliers, products, or categories..."
                value={searchState.query}
                onChange={(e) => updateQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              {searchState.isLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={searchState.sortBy}
              onChange={(e) => updateSortBy(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-lg border font-medium transition-colors flex items-center ${
                showFilters || getActiveFilterCount > 0
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {getActiveFilterCount > 0 && (
                <span className="ml-2 bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                  {getActiveFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Matrix */}
      {showFilters && (
        <div className="mb-6">
          <FilterMatrix
            filters={searchState.filters}
            onFiltersChange={updateFilters}
            userLocation={vendorLocation}
          />
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-gray-600">
          {searchState.totalResults > 0 ? (
            <>
              Showing {searchState.results.length} of {searchState.totalResults} suppliers
              {vendorLocation && ` near ${vendorLocation.city}`}
            </>
          ) : searchState.isLoading ? (
            'Searching...'
          ) : (
            'No suppliers found'
          )}
        </div>
        
        {searchState.query && (
          <div className="text-sm text-gray-500">
            Search results for "{searchState.query}"
          </div>
        )}
      </div>

      {/* Error State */}
      {searchState.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700">{searchState.error}</p>
          </div>
        </div>
      )}

      {/* Results Grid */}
      {searchState.results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {searchState.results.map((supplier) => (
            <SupplierCard
              key={supplier.objectID}
              supplier={supplier}
              onSelect={() => onSupplierSelect?.(supplier)}
              showDistance={!!vendorLocation}
            />
          ))}
        </div>
      ) : !searchState.isLoading && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-medium text-gray-700 mb-2">
            No suppliers found
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Try adjusting your search terms or filters to find more suppliers.
          </p>
        </div>
      )}

      {/* Load More Button */}
      {searchState.currentPage < searchState.totalPages - 1 && (
        <div className="text-center">
          <button
            onClick={loadNextPage}
            disabled={searchState.isLoading}
            className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {searchState.isLoading ? 'Loading...' : 'Load More Suppliers'}
          </button>
        </div>
      )}
    </div>
  );
}

// Supplier Card Component
interface SupplierCardProps {
  supplier: AlgoliaSearchResult;
  onSelect: () => void;
  showDistance: boolean;
}

function SupplierCard({ supplier, onSelect, showDistance }: SupplierCardProps) {
  return (
    <div 
      onClick={onSelect}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
            {supplier.name}
          </h3>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {supplier.description}
          </p>
        </div>
        {supplier.isVerified && (
          <div className="flex-shrink-0 ml-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✅ Verified
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(supplier.rating) ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="ml-2 font-medium">{supplier.rating}</span>
              <span className="ml-1 text-gray-500">({supplier.reviewCount})</span>
            </div>
          </div>
          {showDistance && supplier.distance && (
            <span className="text-gray-500">
              {supplier.distance.toFixed(1)} km
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {supplier.category}
          </span>
          {supplier.isFastDelivery && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              🚀 Fast Delivery
            </span>
          )}
        </div>

        {supplier.tags && supplier.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {supplier.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800"
              >
                #{tag}
              </span>
            ))}
            {supplier.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{supplier.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
