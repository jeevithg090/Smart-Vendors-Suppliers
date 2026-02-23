import { useState, useEffect, useMemo } from 'react';
import { useQuery } from 'convex/react';
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

interface SupplierSearchResult {
  _id: string;
  businessName: string;
  ownerName: string;
  trustScore: number;
  minimumOrder: number;
  deliveryRadius: number;
  fssaiCertified: boolean;
  isVerified: boolean;
  categories: string[];
  distance?: number;
  location: {
    city: string;
    state: string;
    address: string;
    pincode: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  businessHours: {
    open: string;
    close: string;
    days: string[];
  };
}

type ShortlistMode = 'balanced' | 'lowBudget' | 'qualityFirst';

interface SupplierRecommendation {
  supplier: SupplierSearchResult;
  score: number;
  reasons: string[];
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
  const [comparisonSupplierIds, setComparisonSupplierIds] = useState<string[]>([]);
  const [showComparisonPanel, setShowComparisonPanel] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [shortlistMode, setShortlistMode] = useState<ShortlistMode>('balanced');

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

  const typedSuppliers = suppliers as SupplierSearchResult[] | undefined;

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

  const comparisonSuppliers = useMemo(() => {
    if (!typedSuppliers) return [];
    return typedSuppliers.filter((supplier) => comparisonSupplierIds.includes(supplier._id));
  }, [typedSuppliers, comparisonSupplierIds]);

  const marketSnapshot = useMemo(() => {
    if (!typedSuppliers || typedSuppliers.length === 0) return null;

    const total = typedSuppliers.length;
    const avgTrustScore = typedSuppliers.reduce((sum, supplier) => sum + supplier.trustScore, 0) / total;
    const avgMinimumOrder = typedSuppliers.reduce((sum, supplier) => sum + supplier.minimumOrder, 0) / total;
    const verifiedSuppliers = typedSuppliers.filter((supplier) => supplier.isVerified).length;
    const fssaiSuppliers = typedSuppliers.filter((supplier) => supplier.fssaiCertified).length;

    const bestValueSupplier = [...typedSuppliers].sort((a, b) => {
      const aScore = (a.trustScore * 1000) / Math.max(a.minimumOrder, 1);
      const bScore = (b.trustScore * 1000) / Math.max(b.minimumOrder, 1);
      return bScore - aScore;
    })[0];

    return {
      total,
      avgTrustScore,
      avgMinimumOrder,
      verifiedSuppliers,
      fssaiSuppliers,
      bestValueSupplier,
    };
  }, [typedSuppliers]);

  useEffect(() => {
    if (!typedSuppliers) return;
    setComparisonSupplierIds((previousIds) =>
      previousIds.filter((supplierId) =>
        typedSuppliers.some((supplier) => supplier._id === supplierId)
      )
    );
  }, [typedSuppliers]);

  useEffect(() => {
    if (!infoMessage) return;
    const timer = window.setTimeout(() => setInfoMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [infoMessage]);

  const handleToggleComparison = (supplierId: string) => {
    setComparisonSupplierIds((previousIds) => {
      if (previousIds.includes(supplierId)) {
        return previousIds.filter((id) => id !== supplierId);
      }

      if (previousIds.length >= 3) {
        setInfoMessage('You can compare up to 3 suppliers at once.');
        return previousIds;
      }

      return [...previousIds, supplierId];
    });
  };

  const clearComparison = () => {
    setComparisonSupplierIds([]);
    setShowComparisonPanel(false);
  };

  const exportComparisonCsv = () => {
    if (comparisonSuppliers.length === 0) return;

    const csvEscape = (value: string | number | boolean) => {
      const text = String(value ?? '');
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const rows: (string | number | boolean)[][] = [
      ['Metric', ...comparisonSuppliers.map((supplier) => supplier.businessName)],
      ['Trust score', ...comparisonSuppliers.map((supplier) => supplier.trustScore.toFixed(1))],
      ['Minimum order', ...comparisonSuppliers.map((supplier) => supplier.minimumOrder)],
      ['Delivery radius (km)', ...comparisonSuppliers.map((supplier) => supplier.deliveryRadius)],
      ['Verified', ...comparisonSuppliers.map((supplier) => supplier.isVerified)],
      ['FSSAI certified', ...comparisonSuppliers.map((supplier) => supplier.fssaiCertified)],
      ['Top categories', ...comparisonSuppliers.map((supplier) => supplier.categories.slice(0, 3).join(' | '))]
    ];

    const csvContent = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `supplier-comparison-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
    setInfoMessage('Comparison exported as CSV.');
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

  const shortlistRecommendations = useMemo<SupplierRecommendation[]>(() => {
    if (!typedSuppliers || typedSuppliers.length === 0) return [];

    const weightByMode: Record<ShortlistMode, { trust: number; affordability: number; proximity: number; compliance: number }> = {
      balanced: { trust: 0.35, affordability: 0.25, proximity: 0.20, compliance: 0.20 },
      lowBudget: { trust: 0.20, affordability: 0.50, proximity: 0.20, compliance: 0.10 },
      qualityFirst: { trust: 0.45, affordability: 0.10, proximity: 0.10, compliance: 0.35 }
    };

    const weights = weightByMode[shortlistMode];
    const maxMinimumOrder = Math.max(...typedSuppliers.map((supplier) => Math.max(supplier.minimumOrder, 1)));
    const maxDistance = Math.max(
      ...typedSuppliers.map((supplier) => supplier.distance ?? filters.maxDistance),
      filters.maxDistance,
      1
    );
    const avgMinimumOrder = marketSnapshot?.avgMinimumOrder ?? maxMinimumOrder;

    return typedSuppliers
      .map((supplier) => {
        const normalizedTrust = Math.min(Math.max(supplier.trustScore / 5, 0), 1);
        const affordability = 1 - Math.min(supplier.minimumOrder / maxMinimumOrder, 1);
        const supplierDistance = supplier.distance ?? maxDistance / 2;
        const proximity = 1 - Math.min(supplierDistance / maxDistance, 1);
        const compliance = (supplier.isVerified ? 0.6 : 0) + (supplier.fssaiCertified ? 0.4 : 0);

        const score =
          normalizedTrust * weights.trust * 100 +
          affordability * weights.affordability * 100 +
          proximity * weights.proximity * 100 +
          compliance * weights.compliance * 100;

        const reasons: string[] = [];
        if (supplier.trustScore >= 4.3) reasons.push('High trust score');
        if (supplier.minimumOrder <= avgMinimumOrder) reasons.push('Affordable minimum order');
        if ((supplier.distance ?? Number.POSITIVE_INFINITY) <= 10) reasons.push('Close delivery radius');
        if (supplier.isVerified && supplier.fssaiCertified) reasons.push('Verified and FSSAI certified');
        if (reasons.length === 0) reasons.push('Strong overall match for current filters');

        return {
          supplier,
          score: Math.round(score),
          reasons: reasons.slice(0, 2)
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [typedSuppliers, shortlistMode, filters.maxDistance, marketSnapshot]);

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
          {typedSuppliers ? (
            <>
              {typedSuppliers.length} supplier{typedSuppliers.length !== 1 ? 's' : ''} found
              {filters.city && ` in ${filters.city}`}
            </>
          ) : (
            'Searching...'
          )}
        </div>
        {comparisonSupplierIds.length > 0 && (
          <button
            type="button"
            onClick={() => setShowComparisonPanel((value) => !value)}
            className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            {showComparisonPanel ? 'Hide' : 'Compare'} {comparisonSupplierIds.length} supplier{comparisonSupplierIds.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Marketplace insights */}
      {marketSnapshot && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-orange-100 bg-orange-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-orange-700">Average Trust</div>
            <div className="mt-1 text-xl font-bold text-orange-900">{marketSnapshot.avgTrustScore.toFixed(1)}/5</div>
          </div>
          <div className="rounded-lg border border-green-100 bg-green-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-green-700">Average Min Order</div>
            <div className="mt-1 text-xl font-bold text-green-900">₹{Math.round(marketSnapshot.avgMinimumOrder)}</div>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Verified Suppliers</div>
            <div className="mt-1 text-xl font-bold text-blue-900">{marketSnapshot.verifiedSuppliers}/{marketSnapshot.total}</div>
          </div>
          <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-purple-700">Best Value Pick</div>
            <div className="mt-1 text-sm font-semibold text-purple-900">
              {marketSnapshot.bestValueSupplier.businessName}
            </div>
            <div className="mt-1 text-xs text-purple-700">
              Trust {marketSnapshot.bestValueSupplier.trustScore.toFixed(1)} • Min ₹{marketSnapshot.bestValueSupplier.minimumOrder}
            </div>
          </div>
        </div>
      )}

      {shortlistRecommendations.length > 0 && (
        <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-base font-semibold text-emerald-900">Smart Shortlist</h3>
              <p className="text-sm text-emerald-800">
                Auto-ranked suppliers tuned to your sourcing strategy.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShortlistMode('balanced')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  shortlistMode === 'balanced'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Balanced
              </button>
              <button
                type="button"
                onClick={() => setShortlistMode('lowBudget')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  shortlistMode === 'lowBudget'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Low Budget
              </button>
              <button
                type="button"
                onClick={() => setShortlistMode('qualityFirst')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  shortlistMode === 'qualityFirst'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Quality First
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {shortlistRecommendations.map(({ supplier, score, reasons }, index) => (
              <div key={supplier._id} className="rounded-lg border border-emerald-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      #{index + 1} Recommendation
                    </div>
                    <div className="text-sm font-semibold text-gray-900">{supplier.businessName}</div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                    {score}/100 fit
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  {supplier.categories.slice(0, 2).join(' • ')}
                </div>
                <div className="mt-2 space-y-1 text-xs text-gray-700">
                  {reasons.map((reason) => (
                    <div key={`${supplier._id}-${reason}`}>• {reason}</div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSupplierClick(supplier._id)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleComparison(supplier._id)}
                    className="rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    {comparisonSupplierIds.includes(supplier._id) ? 'Compared' : 'Compare'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {infoMessage && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          {infoMessage}
        </div>
      )}


      {/* Comparison panel */}
      {showComparisonPanel && comparisonSuppliers.length > 0 && (
        <div className="mb-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Supplier Comparison</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportComparisonCsv}
                className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={clearComparison}
                className="text-xs font-medium text-gray-500 underline hover:text-gray-700"
              >
                Clear selection
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="border-b border-gray-200 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Metric</th>
                  {comparisonSuppliers.map((supplier) => (
                    <th key={supplier._id} className="border-b border-gray-200 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      {supplier.businessName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-b border-gray-100 px-3 py-2 text-sm font-medium text-gray-700">Trust score</td>
                  {comparisonSuppliers.map((supplier) => (
                    <td key={`${supplier._id}-trust`} className="border-b border-gray-100 px-3 py-2 text-sm text-gray-800">{supplier.trustScore.toFixed(1)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="border-b border-gray-100 px-3 py-2 text-sm font-medium text-gray-700">Minimum order</td>
                  {comparisonSuppliers.map((supplier) => (
                    <td key={`${supplier._id}-min-order`} className="border-b border-gray-100 px-3 py-2 text-sm text-gray-800">₹{supplier.minimumOrder}</td>
                  ))}
                </tr>
                <tr>
                  <td className="border-b border-gray-100 px-3 py-2 text-sm font-medium text-gray-700">Delivery radius</td>
                  {comparisonSuppliers.map((supplier) => (
                    <td key={`${supplier._id}-radius`} className="border-b border-gray-100 px-3 py-2 text-sm text-gray-800">{supplier.deliveryRadius} km</td>
                  ))}
                </tr>
                <tr>
                  <td className="border-b border-gray-100 px-3 py-2 text-sm font-medium text-gray-700">Verification</td>
                  {comparisonSuppliers.map((supplier) => (
                    <td key={`${supplier._id}-verification`} className="border-b border-gray-100 px-3 py-2 text-sm text-gray-800">
                      {supplier.isVerified ? 'Verified' : 'Unverified'} • {supplier.fssaiCertified ? 'FSSAI' : 'No FSSAI'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-2 text-sm font-medium text-gray-700">Top categories</td>
                  {comparisonSuppliers.map((supplier) => (
                    <td key={`${supplier._id}-categories`} className="px-3 py-2 text-sm text-gray-800">{supplier.categories.slice(0, 3).join(', ')}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suppliers Grid */}
      {typedSuppliers ? (
        typedSuppliers.length > 0 ? (
          <div className="grid-responsive">
            {typedSuppliers.map((supplier) => (
              <SupplierCard
                key={supplier._id}
                supplier={supplier}
                onClick={() => handleSupplierClick(supplier._id)}
                showDistance={!!vendorLocation}
                isSelectedForComparison={comparisonSupplierIds.includes(supplier._id)}
                comparisonDisabled={
                  comparisonSupplierIds.length >= 3 && !comparisonSupplierIds.includes(supplier._id)
                }
                onToggleComparison={() => handleToggleComparison(supplier._id)}
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
