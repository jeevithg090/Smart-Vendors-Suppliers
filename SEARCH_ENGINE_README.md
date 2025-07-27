# Search Engine & Filter Matrix Features

This document describes the new search engine and filter matrix features integrated into Smart Street.

## Features Overview

### 🎯 Enhanced Search Engine
- **Algolia-powered search** with instant results and typo tolerance
- **Fallback mode** for development without Algolia configuration
- **Geo-location based search** with distance filtering
- **Advanced text search** across name, description, categories, and tags
- **Real-time search** with debounced input for optimal performance

### 🔧 Smart Filter Matrix
- **Quick filter presets** for common scenarios (Premium, Fast Delivery, Budget-Friendly, Organic)
- **Multi-dimensional filtering** by categories, tags, ratings, and location
- **Interactive UI** with expandable filter panels
- **Real-time filter counts** showing active filters
- **One-click filter clearing** for easy reset

### 📍 Location-Based Features
- **Distance calculation** from vendor location to suppliers
- **Radius filtering** with customizable distance ranges
- **Geo-sorted results** when location is available
- **City-based search** for regional filtering

## File Structure

```
src/
├── components/
│   ├── EnhancedSupplierSearch.tsx    # Main search component
│   ├── FilterMatrix.tsx              # Advanced filter interface
│   └── SupplierSearch.tsx           # Original search component
├── services/
│   └── algoliaSearchService.ts       # Algolia integration service
├── data/
│   └── mockVendors.ts               # Sample data for development
└── pages/
    └── VendorDashboard.tsx          # Updated dashboard with new search tab

scripts/
└── setupAlgolia.js                  # Algolia index population script
```

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
# Algolia Configuration (optional)
VITE_ALGOLIA_APP_ID=your_algolia_app_id
VITE_ALGOLIA_SEARCH_KEY=your_search_only_api_key
VITE_ALGOLIA_INDEX_NAME=vendors

# For setup script only (admin key required)
REACT_APP_ALGOLIA_APP_ID=your_algolia_app_id
REACT_APP_ALGOLIA_ADMIN_KEY=your_admin_api_key
REACT_APP_ALGOLIA_INDEX_NAME=vendors
```

### 2. Algolia Setup (Optional)

If you want to use Algolia for enhanced search:

1. Create an Algolia account at [algolia.com](https://www.algolia.com)
2. Get your App ID, Search Key, and Admin Key
3. Add them to your `.env` file
4. Run the setup script:

```bash
npm run algolia:setup
```

### 3. Development Mode

Without Algolia configuration, the search engine automatically falls back to:
- Local mock data search
- Client-side filtering and sorting
- All features work without external dependencies

## Usage

### Basic Search
```typescript
import EnhancedSupplierSearch from './components/EnhancedSupplierSearch';

<EnhancedSupplierSearch
  vendorLocation={{
    lat: 19.0760,
    lng: 72.8777,
    city: "Mumbai"
  }}
  onSupplierSelect={(supplier) => {
    console.log('Selected supplier:', supplier);
  }}
/>
```

### Filter Matrix
```typescript
import FilterMatrix from './components/FilterMatrix';

<FilterMatrix
  filters={currentFilters}
  onFiltersChange={setFilters}
  userLocation={vendorLocation}
/>
```

## Filter Types

### Quick Presets
- **Premium Only**: Verified suppliers with 4.5+ rating
- **Fast Delivery**: Suppliers offering quick delivery within 15km
- **Budget Friendly**: Good quality suppliers with reasonable pricing
- **Organic Only**: Certified organic and natural product suppliers

### Advanced Filters
- **Categories**: Vegetables & Fruits, Spices, Seafood, Dairy, etc.
- **Tags**: organic, fresh, premium, traditional, wholesale, etc.
- **Rating**: Minimum rating from 3.0 to 4.5 stars
- **Distance**: 5km to 100km radius (when location available)
- **Features**: Verified status, fast delivery availability

### Location-Based
- **Geo-search**: Find suppliers near vendor location
- **Distance sorting**: Sort by proximity
- **City filtering**: Filter by specific cities
- **Delivery radius**: Match supplier delivery areas

## API Integration

### Algolia Service Methods

```typescript
// Search with filters
const results = await algoliaSearchService.search(
  'organic vegetables',
  {
    categories: ['Vegetables & Fruits'],
    isVerified: true,
    minRating: 4.0,
    maxDistance: 25,
    userLocation: { lat: 19.0760, lng: 72.8777 }
  },
  {
    hitsPerPage: 20,
    sortBy: 'rating'
  }
);

// Get facet values for filter UI
const categories = await algoliaSearchService.getFacetValues('categories');
```

### Search Result Structure

```typescript
interface AlgoliaSearchResult {
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
  distance?: number; // Calculated if user location provided
}
```

## Dashboard Integration

The enhanced search is integrated into the vendor dashboard as a new tab:

1. **Smart Search Tab**: Full-featured search with filters
2. **Basic Search Tab**: Original simple search functionality
3. **Quick Action Button**: Direct access from dashboard

## Performance Features

- **Debounced search**: 300ms delay to reduce API calls
- **Client-side caching**: Results cached for repeated searches
- **Lazy loading**: Load more results on demand
- **Optimized rendering**: Virtual scrolling for large result sets

## Development Notes

### Fallback Strategy
When Algolia is not configured:
- Mock data is used automatically
- All search and filter functionality works
- Performance is still excellent for development
- No external API calls made

### Error Handling
- Graceful fallback to mock data on API errors
- User-friendly error messages
- Retry mechanisms for network issues
- Loading states for better UX

### Mobile Optimization
- Responsive filter panels
- Touch-friendly interface
- Optimized for small screens
- Fast tap interactions

## Future Enhancements

- **AI-powered suggestions**: Smart search completions
- **Voice search integration**: Spoken queries
- **Image search**: Visual product matching
- **Recommendation engine**: Personalized supplier suggestions
- **Advanced analytics**: Search behavior tracking
- **Bulk operations**: Multi-supplier selection

## Troubleshooting

### Common Issues

1. **Search not working**: Check Algolia configuration or verify fallback mode
2. **Location not detected**: Ensure geolocation permissions
3. **Filters not applying**: Verify filter state management
4. **Slow performance**: Check network connectivity and API limits

### Debug Mode

Enable debug logging:
```javascript
localStorage.setItem('DEBUG_SEARCH', 'true');
```

This will log all search queries and results to the console.

## Support

For technical issues or feature requests related to the search engine:
1. Check this documentation
2. Review the console for error messages
3. Verify environment configuration
4. Test with fallback mode enabled
