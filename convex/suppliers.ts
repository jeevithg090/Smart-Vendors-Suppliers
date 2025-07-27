import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new supplier
export const create = mutation({
  args: {
    userId: v.string(),
    businessName: v.string(),
    ownerName: v.string(),
    email: v.string(),
    phone: v.string(),
    location: v.object({
      address: v.string(),
      city: v.string(),
      state: v.string(),
      pincode: v.string(),
      coordinates: v.object({
        lat: v.number(),
        lng: v.number()
      })
    }),
    categories: v.array(v.string()),
    fssaiCertified: v.boolean(),
    fssaiLicense: v.optional(v.string()),
    businessHours: v.object({
      open: v.string(),
      close: v.string(),
      days: v.array(v.string())
    }),
    deliveryRadius: v.number(),
    minimumOrder: v.number()
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Initialize trust score based on profile completeness
    let initialTrustScore = 2.0; // Base score for new suppliers
    
    if (args.fssaiCertified && args.fssaiLicense) initialTrustScore += 1.0;
    if (args.categories.length >= 3) initialTrustScore += 0.5;
    if (args.deliveryRadius >= 10) initialTrustScore += 0.3;
    
    // Cap initial score at 4.0 for new suppliers
    initialTrustScore = Math.min(initialTrustScore, 4.0);
    
    return await ctx.db.insert("suppliers", {
      userId: args.userId,
      businessName: args.businessName,
      ownerName: args.ownerName,
      email: args.email,
      phone: args.phone,
      location: args.location,
      categories: args.categories,
      fssaiCertified: args.fssaiCertified,
      fssaiLicense: args.fssaiLicense,
      isVerified: false,
      trustScore: initialTrustScore,
      businessHours: args.businessHours,
      deliveryRadius: args.deliveryRadius,
      minimumOrder: args.minimumOrder,
      createdAt: now,
      updatedAt: now
    });
  },
});

// Get supplier by user ID
export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("suppliers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Get supplier by ID
export const getSupplierById = query({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.supplierId);
  },
});

// Search suppliers with filters
export const searchSuppliers = query({
  args: {
    searchTerm: v.optional(v.string()),
    city: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
    minTrustScore: v.optional(v.number()),
    maxDistance: v.optional(v.number()),
    vendorLocation: v.optional(v.object({
      lat: v.number(),
      lng: v.number()
    })),
    sortBy: v.optional(v.string()), // "trustScore", "distance", "name"
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    let suppliers;
    
    // Apply city filter if provided
    if (args.city) {
      suppliers = await ctx.db
        .query("suppliers")
        .withIndex("by_city", (q) => q.eq("location.city", args.city!))
        .collect();
    } else {
      suppliers = await ctx.db.query("suppliers").collect();
    }
    
    // Apply search term filter
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      suppliers = suppliers.filter(supplier => 
        supplier.businessName.toLowerCase().includes(searchLower) ||
        supplier.categories.some(cat => cat.toLowerCase().includes(searchLower)) ||
        supplier.location.address.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply category filter
    if (args.categories && args.categories.length > 0) {
      suppliers = suppliers.filter(supplier =>
        args.categories!.some(cat => supplier.categories.includes(cat))
      );
    }
    
    // Apply trust score filter
    if (args.minTrustScore) {
      suppliers = suppliers.filter(supplier => supplier.trustScore >= args.minTrustScore!);
    }
    
    // Calculate distance and apply distance filter if vendor location provided
    if (args.vendorLocation) {
      suppliers = suppliers.map(supplier => ({
        ...supplier,
        distance: calculateDistance(
          args.vendorLocation!.lat,
          args.vendorLocation!.lng,
          supplier.location.coordinates.lat,
          supplier.location.coordinates.lng
        )
      }));
      
      if (args.maxDistance) {
        suppliers = suppliers.filter(supplier => 
          (supplier as any).distance <= args.maxDistance!
        );
      }
    }
    
    // Sort suppliers
    if (args.sortBy === "trustScore") {
      suppliers.sort((a, b) => b.trustScore - a.trustScore);
    } else if (args.sortBy === "distance" && args.vendorLocation) {
      suppliers.sort((a, b) => (a as any).distance - (b as any).distance);
    } else if (args.sortBy === "name") {
      suppliers.sort((a, b) => a.businessName.localeCompare(b.businessName));
    } else {
      // Default sort by trust score
      suppliers.sort((a, b) => b.trustScore - a.trustScore);
    }
    
    // Apply limit
    if (args.limit) {
      suppliers = suppliers.slice(0, args.limit);
    }
    
    return suppliers;
  },
});

// Get supplier details with inventory
export const getSupplierDetails = query({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) return null;
    
    // Get supplier's inventory
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .filter((q) => q.eq(q.field("isAvailable"), true))
      .collect();
    
    // Get supplier's ratings
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .order("desc")
      .take(10);
    
    // Calculate average ratings by category
    const avgRatings = ratings.length > 0 ? {
      overall: ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length,
      quality: ratings.reduce((sum, r) => sum + r.categories.quality, 0) / ratings.length,
      delivery: ratings.reduce((sum, r) => sum + r.categories.delivery, 0) / ratings.length,
      communication: ratings.reduce((sum, r) => sum + r.categories.communication, 0) / ratings.length,
      pricing: ratings.reduce((sum, r) => sum + r.categories.pricing, 0) / ratings.length,
    } : null;
    
    return {
      ...supplier,
      inventory,
      ratings,
      avgRatings,
      totalRatings: ratings.length
    };
  },
});

// Get suppliers by category
export const getSuppliersByCategory = query({
  args: { 
    category: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const allSuppliers = await ctx.db.query("suppliers").collect();
    const filteredSuppliers = allSuppliers.filter(supplier => 
      supplier.categories.includes(args.category)
    );
    
    const sortedSuppliers = filteredSuppliers.sort((a, b) => b.trustScore - a.trustScore);
    
    return args.limit ? sortedSuppliers.slice(0, args.limit) : sortedSuppliers;
  },
});

// Get nearby suppliers
export const getNearbySuppliers = query({
  args: {
    vendorLocation: v.object({
      lat: v.number(),
      lng: v.number()
    }),
    maxDistance: v.number(), // in kilometers
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const allSuppliers = await ctx.db.query("suppliers").collect();
    
    const nearbySuppliers = allSuppliers
      .map(supplier => ({
        ...supplier,
        distance: calculateDistance(
          args.vendorLocation.lat,
          args.vendorLocation.lng,
          supplier.location.coordinates.lat,
          supplier.location.coordinates.lng
        )
      }))
      .filter(supplier => supplier.distance <= args.maxDistance)
      .sort((a, b) => a.distance - b.distance);
    
    return args.limit ? nearbySuppliers.slice(0, args.limit) : nearbySuppliers;
  },
});

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Get suppliers by location (city)
export const getSuppliersByLocation = query({
  args: { city: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("suppliers")
      .withIndex("by_city", (q) => q.eq("location.city", args.city))
      .filter((q) => q.eq(q.field("isVerified"), true))
      .order("desc")
      .collect();
  },
});

// Get supplier inventory
export const getSupplierInventory = query({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("inventory")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .filter((q) => q.eq(q.field("isAvailable"), true))
      .collect();
  },
});

// Update supplier information
export const update = mutation({
  args: {
    id: v.id("suppliers"),
    businessName: v.optional(v.string()),
    ownerName: v.optional(v.string()),
    phone: v.optional(v.string()),
    location: v.optional(v.object({
      address: v.string(),
      city: v.string(),
      state: v.string(),
      pincode: v.string(),
      coordinates: v.object({
        lat: v.number(),
        lng: v.number()
      })
    })),
    categories: v.optional(v.array(v.string())),
    fssaiCertified: v.optional(v.boolean()),
    fssaiLicense: v.optional(v.string()),
    businessHours: v.optional(v.object({
      open: v.string(),
      close: v.string(),
      days: v.array(v.string())
    })),
    deliveryRadius: v.optional(v.number()),
    minimumOrder: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now()
    });
  },
});