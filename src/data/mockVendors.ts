export interface MockVendor {
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
  createdAt: Date;
  updatedAt: Date;
}

export const mockVendors: MockVendor[] = [
  {
    name: "Fresh Valley Farms",
    description: "Premium organic vegetables and fruits supplier for restaurants and vendors",
    category: "Vegetables & Fruits",
    tags: ["organic", "vegetables", "fruits", "premium", "fresh"],
    rating: 4.8,
    reviewCount: 127,
    location: {
      lat: 19.0760,
      lng: 72.8777,
      address: "123 Agriculture Market, Dadar",
      city: "Mumbai",
      state: "Maharashtra"
    },
    isVerified: true,
    isFastDelivery: true,
    minOrder: 500,
    deliveryRadius: 15,
    businessHours: {
      open: "06:00",
      close: "20:00",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    },
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2024-12-20')
  },
  {
    name: "Spice Master Trading",
    description: "Traditional spices, masalas and specialty ingredients for authentic Indian cuisine",
    category: "Spices & Condiments",
    tags: ["spices", "masala", "traditional", "authentic", "indian"],
    rating: 4.6,
    reviewCount: 89,
    location: {
      lat: 19.0176,
      lng: 72.8561,
      address: "456 Spice Bazaar, Crawford Market",
      city: "Mumbai",
      state: "Maharashtra"
    },
    isVerified: true,
    isFastDelivery: false,
    minOrder: 1000,
    deliveryRadius: 25,
    businessHours: {
      open: "09:00",
      close: "19:00",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    },
    createdAt: new Date('2022-08-20'),
    updatedAt: new Date('2024-12-15')
  },
  {
    name: "Ocean Fresh Seafood",
    description: "Daily fresh fish and seafood direct from coastal suppliers",
    category: "Seafood",
    tags: ["seafood", "fish", "fresh", "coastal", "daily"],
    rating: 4.7,
    reviewCount: 156,
    location: {
      lat: 19.0330,
      lng: 72.8642,
      address: "789 Fish Market, Sassoon Dock",
      city: "Mumbai",
      state: "Maharashtra"
    },
    isVerified: true,
    isFastDelivery: true,
    minOrder: 800,
    deliveryRadius: 20,
    businessHours: {
      open: "05:00",
      close: "14:00",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    },
    createdAt: new Date('2023-03-10'),
    updatedAt: new Date('2024-12-18')
  },
  {
    name: "Metro Dairy Products",
    description: "Quality milk, yogurt, cheese and dairy products for commercial use",
    category: "Dairy",
    tags: ["dairy", "milk", "cheese", "yogurt", "commercial"],
    rating: 4.5,
    reviewCount: 203,
    location: {
      lat: 19.1197,
      lng: 72.9073,
      address: "321 Dairy Complex, Powai",
      city: "Mumbai",
      state: "Maharashtra"
    },
    isVerified: true,
    isFastDelivery: true,
    minOrder: 600,
    deliveryRadius: 30,
    businessHours: {
      open: "06:00",
      close: "22:00",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    },
    createdAt: new Date('2022-11-05'),
    updatedAt: new Date('2024-12-22')
  },
  {
    name: "Golden Grains Supply",
    description: "Wholesale rice, wheat, pulses and grain products for bulk orders",
    category: "Grains & Pulses",
    tags: ["grains", "rice", "wheat", "pulses", "wholesale", "bulk"],
    rating: 4.4,
    reviewCount: 78,
    location: {
      lat: 19.0896,
      lng: 72.8656,
      address: "654 Grain Market, Mulund",
      city: "Mumbai",
      state: "Maharashtra"
    },
    isVerified: true,
    isFastDelivery: false,
    minOrder: 2000,
    deliveryRadius: 35,
    businessHours: {
      open: "08:00",
      close: "18:00",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    },
    createdAt: new Date('2023-06-12'),
    updatedAt: new Date('2024-12-10')
  },
  {
    name: "Urban Herbs & Greens",
    description: "Hydroponic vegetables and exotic herbs for modern cuisine",
    category: "Vegetables & Fruits",
    tags: ["hydroponic", "herbs", "exotic", "modern", "premium"],
    rating: 4.9,
    reviewCount: 45,
    location: {
      lat: 19.1334,
      lng: 72.9133,
      address: "987 Green Complex, Andheri East",
      city: "Mumbai",
      state: "Maharashtra"
    },
    isVerified: true,
    isFastDelivery: true,
    minOrder: 400,
    deliveryRadius: 18,
    businessHours: {
      open: "07:00",
      close: "19:00",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    },
    createdAt: new Date('2023-09-08'),
    updatedAt: new Date('2024-12-25')
  }
];
