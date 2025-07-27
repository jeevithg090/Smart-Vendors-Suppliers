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
