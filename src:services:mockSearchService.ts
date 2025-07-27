import { AlgoliaSearchFilters, AlgoliaSearchResult } from '../types/search';

export class MockSearchService {
  async search(
    query: string = '',
    filters: AlgoliaSearchFilters = {},
    options: {
      hitsPerPage?: number;
      page?: number;
      sortBy?: string;
    } = {}
  ): Promise{
    // Simple mock data
    const mockResults: AlgoliaSearchResult[] = [
      {
        objectID: 'vendor-1',
        name: 'Fresh Valley Farms',
        description: 'Premium organic vegetables and fruits supplier',
        category: 'Vegetables & Fruits',
        tags: ['organic', 'fresh', 'premium'],
        rating: 4.8,
        reviewCount: 127,
        location: {
          lat: 19.0760,
          lng: 72.8777,
          address: '123 Agriculture Market, Dadar',
          city: 'Mumbai',
          state: 'Maharashtra'
        },
        isVerified: true,
        isFastDelivery: true,
        minOrder: 500,
        deliveryRadius: 15,
        businessHours: {
          open: '06:00',
          close: '20:00',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        }
      },
      {
        objectID: 'vendor-2',
        name: 'Spice Master Trading',
        description: 'Traditional spices and masalas',
        category: 'Spices & Condiments',
        tags: ['spices', 'traditional', 'authentic'],
        rating: 4.6,
        reviewCount: 89,
        location: {
          lat: 19.0176,
          lng: 72.8561,
          address: '456 Spice Bazaar, Crawford Market',
          city: 'Mumbai',
          state: 'Maharashtra'
        },
        isVerified: true,
        isFastDelivery: false,
        minOrder: 1000,
        deliveryRadius: 25,
        businessHours: {
          open: '09:00',
          close: '19:00',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        }
      }
    ];

    let results = [...mockResults];

    // Apply text search
    if (query) {
      const searchTerm = query.toLowerCase();
      results = results.filter(vendor =>
        vendor.name.toLowerCase().includes(searchTerm) ||
        vendor.description.toLowerCase().includes(searchTerm) ||
        vendor.category.toLowerCase().includes(searchTerm) ||
        vendor.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Apply filters
    if (filters.categories && filters.categories.length > 0) {
      results = results.filter(vendor =>
        filters.categories!.includes(vendor.category)
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
      processingTimeMS: 5
    };
  }
}

export const mockSearchService = new MockSearchService();