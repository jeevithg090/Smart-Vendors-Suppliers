export interface AlgoliaSearchFilters {
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
  priceRange?: {
    min: number;
    max: number;
  };
  businessHours?: {
    isOpen?: boolean;
    currentTime?: string;
  };
}

export interface AlgoliaSearchResult {
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
  _geoloc?: {
    lat: number;
    lng: number;
  };
  _highlightResult?: any;
  distance?: number;
}

class AlgoliaSearchService {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = false;
    console.log('AlgoliaSearchService initialized in fallback mode');
  }

  async search(
    query: string = '',
    filters: AlgoliaSearchFilters = {},
    options: {
      hitsPerPage?: number;
      page?: number;
      sortBy?: string;
    } = {}
  ): Promise<{
    hits: AlgoliaSearchResult[];
    nbHits: number;
    page: number;
    nbPages: number;
    processingTimeMS: number;
  }> {
    return this.fallbackSearch(query, filters, options);
  }

  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLng = this.toRad(point2.lng - point1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.lat)) *
        Math.cos(this.toRad(point2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }

  // Fallback search using mock data for development
  private async fallbackSearch(
    query: string,
    filters: AlgoliaSearchFilters,
    options: any
  ): Promise<any> {
    // Import mock data dynamically
    const { mockVendors } = await import('../data/mockVendors');

    let results: (AlgoliaSearchResult & { distance?: number })[] = mockVendors.map((vendor, index) => ({
      objectID: `vendor-${index + 1}`,
      ...vendor,
      _geoloc: {
        lat: vendor.location.lat,
        lng: vendor.location.lng
      }
    }));

    // Apply text search
    if (query) {
      const searchTerms = query.toLowerCase().split(' ');
      results = results.filter(vendor =>
        searchTerms.some(term =>
          vendor.name.toLowerCase().includes(term) ||
          vendor.description.toLowerCase().includes(term) ||
          vendor.tags.some(tag => tag.toLowerCase().includes(term)) ||
          vendor.category.toLowerCase().includes(term)
        )
      );
    }

    // Apply filters
    if (filters.categories && filters.categories.length > 0) {
      results = results.filter(vendor =>
        filters.categories!.includes(vendor.category)
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(vendor =>
        vendor.tags.some(tag => filters.tags!.includes(tag))
      );
    }

    if (filters.isVerified !== undefined) {
      results = results.filter(vendor => vendor.isVerified === filters.isVerified);
    }

    if (filters.isFastDelivery !== undefined) {
      results = results.filter(vendor => vendor.isFastDelivery === filters.isFastDelivery);
    }

    if (filters.minRating !== undefined) {
      results = results.filter(vendor => vendor.rating >= filters.minRating!);
    }

    // Calculate distance and apply distance filter
    if (filters.userLocation) {
      results = results.map(vendor => ({
        ...vendor,
        distance: this.calculateDistance(
          filters.userLocation!,
          { lat: vendor.location.lat, lng: vendor.location.lng }
        )
      }));

      if (filters.maxDistance) {
        results = results.filter(vendor => 
          vendor.distance! <= filters.maxDistance!
        );
      }
    }

    // Apply sorting
    if (options.sortBy === 'distance' && filters.userLocation) {
      results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else if (options.sortBy === 'rating') {
      results.sort((a, b) => b.rating - a.rating);
    } else if (options.sortBy === 'reviewCount') {
      results.sort((a, b) => b.reviewCount - a.reviewCount);
    } else {
      // Default: sort by rating then reviewCount
      results.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.reviewCount - a.reviewCount;
      });
    }

    // Apply pagination
    const hitsPerPage = options.hitsPerPage || 20;
    const page = options.page || 0;
    const startIndex = page * hitsPerPage;
    const endIndex = startIndex + hitsPerPage;
    const paginatedResults = results.slice(startIndex, endIndex);

    return {
      hits: paginatedResults,
      nbHits: results.length,
      page,
      nbPages: Math.ceil(results.length / hitsPerPage),
      processingTimeMS: 5 // Mock processing time
    };
  }

  // Get facet values for building filter UI
  async getFacetValues(facetName: string): Promise<any[]> {
    switch (facetName) {
      case 'categories':
        return [
          { value: 'Vegetables & Fruits', count: 2 },
          { value: 'Spices & Condiments', count: 1 },
          { value: 'Seafood', count: 1 },
          { value: 'Dairy', count: 1 },
          { value: 'Grains & Pulses', count: 1 }
        ];
      case 'tags':
        return [
          { value: 'organic', count: 1 },
          { value: 'fresh', count: 3 },
          { value: 'premium', count: 2 },
          { value: 'traditional', count: 1 },
          { value: 'wholesale', count: 1 }
        ];
      default:
        return [];
    }
  }
}

export const algoliaSearchService = new AlgoliaSearchService();
