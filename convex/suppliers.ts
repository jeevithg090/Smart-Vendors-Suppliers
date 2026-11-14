import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  FORECAST_LOOKBACK_DAYS,
  buildFallbackForecast,
  buildForecastPrompt,
  normalizeForecast,
  type ForecastEntry,
  type ForecastInventoryItem,
  type ForecastOrder,
  type ForecastSupplierContext,
} from "./lib/forecasting";
import { completeWithFallback, extractJson } from "./lib/openRouter";

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

// ---------------------------------------------------------------------------
// Inventory forecasting
//
// Convex queries/mutations cannot make network requests, so the AI call lives
// in actions. The actions read data via internal queries, compute a forecast
// (AI first, deterministic fallback second) and persist it via a mutation.
// ---------------------------------------------------------------------------

const forecastEntryValidator = v.object({
  item: v.string(),
  predictedQty: v.number(),
  confidence: v.number(),
  reason: v.optional(v.string()),
});

export const getForecastInputs = internalQuery({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) return null;

    const since = Date.now() - FORECAST_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    const recentOrders = await ctx.db
      .query("orders")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .filter((q) => q.gt(q.field("createdAt"), since))
      .collect();
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .collect();

    return {
      supplier: {
        businessName: supplier.businessName,
        categories: supplier.categories,
        city: supplier.location.city,
        state: supplier.location.state,
        fssaiCertified: supplier.fssaiCertified,
      },
      orders: recentOrders.map((order) => ({
        items: order.items.map((line) => ({ itemName: line.itemName, quantity: line.quantity })),
        createdAt: order.createdAt,
        totalCost: order.totalCost,
      })),
      inventory: inventory.map((item) => ({
        itemName: item.itemName,
        category: item.category,
        currentStock: item.currentStock,
        unit: item.unit,
        pricePerUnit: item.pricePerUnit,
      })),
    };
  },
});

export const listSupplierIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const suppliers = await ctx.db.query("suppliers").collect();
    return suppliers.map((supplier) => supplier._id);
  },
});

export const saveForecast = internalMutation({
  args: { supplierId: v.id("suppliers"), forecasts: v.array(forecastEntryValidator) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const forecasts = args.forecasts.map((entry) => ({ ...entry, forecastDate: now }));
    await ctx.db.patch(args.supplierId, { forecasts, lastForecastUpdate: now });
    return forecasts;
  },
});

interface ForecastInputs {
  supplier: ForecastSupplierContext;
  orders: ForecastOrder[];
  inventory: ForecastInventoryItem[];
}

async function computeForecast(inputs: ForecastInputs): Promise<ForecastEntry[]> {
  if (!process.env.OPENROUTER_API_KEY) {
    return buildFallbackForecast(inputs.orders, inputs.inventory, inputs.supplier);
  }
  try {
    const prompt = buildForecastPrompt(inputs.orders, inputs.inventory, inputs.supplier);
    return await completeWithFallback(prompt, (content) => normalizeForecast(extractJson(content, "array")), {
      temperature: 0.3,
    });
  } catch (error) {
    console.warn("AI forecast failed, using deterministic fallback:", error);
    return buildFallbackForecast(inputs.orders, inputs.inventory, inputs.supplier);
  }
}

// Scheduled daily by crons.ts for every supplier with orders and inventory.
export const generateInventoryForecast = internalAction({
  args: {},
  handler: async (ctx) => {
    const supplierIds = await ctx.runQuery(internal.suppliers.listSupplierIds, {});
    for (const supplierId of supplierIds) {
      try {
        const inputs = await ctx.runQuery(internal.suppliers.getForecastInputs, { supplierId });
        if (!inputs || inputs.orders.length === 0 || inputs.inventory.length === 0) continue;
        const forecasts = await computeForecast(inputs);
        await ctx.runMutation(internal.suppliers.saveForecast, { supplierId, forecasts });
      } catch (error) {
        console.error(`Error generating forecast for supplier ${supplierId}:`, error);
      }
    }
  },
});

// Get supplier forecasts
export const getSupplierForecasts = query({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    return supplier?.forecasts || [];
  },
});

// FSSAI License Verification
export const verifyFSSAILicense = mutation({
  args: {
    supplierId: v.id("suppliers"),
    licenseNumber: v.string(),
    verificationData: v.object({
      isValid: v.boolean(),
      licenseNumber: v.string(),
      businessName: v.string(),
      ownerName: v.string(),
      address: v.string(),
      validityDate: v.string(),
      category: v.string(),
      confidence: v.number()
    })
  },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) {
      throw new Error("Supplier not found");
    }

    if (args.verificationData.isValid) {
      await ctx.db.patch(args.supplierId, {
        fssaiCertified: true,
        fssaiLicense: args.licenseNumber,
        fssaiVerificationStatus: "verified",
        fssaiVerificationDate: Date.now(),
        fssaiCertificateData: {
          licenseNumber: args.verificationData.licenseNumber,
          businessName: args.verificationData.businessName,
          ownerName: args.verificationData.ownerName,
          address: args.verificationData.address,
          validityDate: args.verificationData.validityDate,
          category: args.verificationData.category,
          confidence: args.verificationData.confidence
        },
        updatedAt: Date.now()
      });

      // Recalculate trust score with FSSAI bonus
      const currentTrustScore = supplier.trustScore;
      const newTrustScore = Math.min(currentTrustScore + 0.5, 5.0); // Add 0.5 for FSSAI certification
      
      await ctx.db.patch(args.supplierId, {
        trustScore: newTrustScore
      });

      return { success: true, message: "FSSAI license verified successfully" };
    } else {
      await ctx.db.patch(args.supplierId, {
        fssaiVerificationStatus: "invalid",
        fssaiVerificationError: "Invalid license number",
        updatedAt: Date.now()
      });

      return { success: false, message: "Invalid FSSAI license number" };
    }
  },
});

// Manual forecast generation for a specific supplier
export const generateForecastForSupplier = action({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args): Promise<Array<ForecastEntry & { forecastDate: number }>> => {
    const inputs = await ctx.runQuery(internal.suppliers.getForecastInputs, args);
    if (!inputs) {
      throw new Error("Supplier not found");
    }
    if (inputs.orders.length === 0 || inputs.inventory.length === 0) {
      throw new Error("Insufficient data for forecasting");
    }
    const forecasts = await computeForecast(inputs);
    return await ctx.runMutation(internal.suppliers.saveForecast, {
      supplierId: args.supplierId,
      forecasts,
    });
  },
});

// List all suppliers (for marketplace filter)
export const listAllSuppliers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("suppliers").collect();
  },
});

// Get all suppliers (alias for compatibility)
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("suppliers").collect();
  },
});
