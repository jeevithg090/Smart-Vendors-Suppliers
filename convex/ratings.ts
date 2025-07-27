import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Submit a rating for a supplier after order completion
export const submitRating = mutation({
  args: {
    vendorId: v.id("vendors"),
    supplierId: v.id("suppliers"),
    orderId: v.id("orders"),
    rating: v.number(), // Overall rating 1-5
    review: v.optional(v.string()),
    categories: v.object({
      quality: v.number(),
      delivery: v.number(),
      communication: v.number(),
      pricing: v.number()
    })
  },
  handler: async (ctx, args) => {
    // Validate rating values
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Overall rating must be between 1 and 5");
    }

    const categoryRatings = Object.values(args.categories);
    if (categoryRatings.some(rating => rating < 1 || rating > 5)) {
      throw new Error("Category ratings must be between 1 and 5");
    }

    // Check if order exists and belongs to the vendor
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.vendorId !== args.vendorId) {
      throw new Error("Order does not belong to this vendor");
    }

    if (order.supplierId !== args.supplierId) {
      throw new Error("Order supplier mismatch");
    }

    // Check if order is delivered
    if (order.status !== "delivered") {
      throw new Error("Can only rate completed orders");
    }

    // Check if rating already exists for this order
    const existingRating = await ctx.db
      .query("ratings")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .first();

    if (existingRating) {
      throw new Error("Rating already submitted for this order");
    }

    const now = Date.now();

    // Create the rating
    const ratingId = await ctx.db.insert("ratings", {
      vendorId: args.vendorId,
      supplierId: args.supplierId,
      orderId: args.orderId,
      rating: args.rating,
      review: args.review,
      categories: args.categories,
      createdAt: now
    });

    // Update supplier trust score
    await updateSupplierTrustScore(ctx, args.supplierId);

    // Basic fraud detection (enhanced version will be added later)
    await detectSuspiciousRatingPatterns(ctx, args.vendorId, args.supplierId);

    return ratingId;
  }
});

// Get ratings for a supplier
export const getSupplierRatings = query({
  args: {
    supplierId: v.id("suppliers"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .order("desc")
      .take(args.limit || 20);

    // Get vendor details for each rating
    const ratingsWithVendors = await Promise.all(
      ratings.map(async (rating) => {
        const vendor = await ctx.db.get(rating.vendorId);
        const order = await ctx.db.get(rating.orderId);
        
        return {
          ...rating,
          vendor: vendor ? {
            businessName: vendor.businessName,
            location: vendor.location.city
          } : null,
          order: order ? {
            items: order.items,
            totalCost: order.totalCost,
            createdAt: order.createdAt
          } : null
        };
      })
    );

    return ratingsWithVendors;
  }
});

// Get rating statistics for a supplier
export const getSupplierRatingStats = query({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .collect();

    if (ratings.length === 0) {
      return {
        totalRatings: 0,
        averageRating: 0,
        categoryAverages: {
          quality: 0,
          delivery: 0,
          communication: 0,
          pricing: 0
        },
        ratingDistribution: {
          1: 0, 2: 0, 3: 0, 4: 0, 5: 0
        },
        recentRatings: []
      };
    }

    // Calculate averages
    const totalRatings = ratings.length;
    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;
    
    const categoryAverages = {
      quality: ratings.reduce((sum, r) => sum + r.categories.quality, 0) / totalRatings,
      delivery: ratings.reduce((sum, r) => sum + r.categories.delivery, 0) / totalRatings,
      communication: ratings.reduce((sum, r) => sum + r.categories.communication, 0) / totalRatings,
      pricing: ratings.reduce((sum, r) => sum + r.categories.pricing, 0) / totalRatings
    };

    // Calculate rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(rating => {
      const roundedRating = Math.round(rating.rating) as keyof typeof ratingDistribution;
      ratingDistribution[roundedRating]++;
    });

    // Get recent ratings with reviews
    const recentRatings = ratings
      .filter(r => r.review && r.review.trim().length > 0)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);

    return {
      totalRatings,
      averageRating: Math.round(averageRating * 10) / 10,
      categoryAverages: {
        quality: Math.round(categoryAverages.quality * 10) / 10,
        delivery: Math.round(categoryAverages.delivery * 10) / 10,
        communication: Math.round(categoryAverages.communication * 10) / 10,
        pricing: Math.round(categoryAverages.pricing * 10) / 10
      },
      ratingDistribution,
      recentRatings
    };
  }
});

// Get vendor's rating history
export const getVendorRatingHistory = query({
  args: {
    vendorId: v.id("vendors"),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .order("desc")
      .take(args.limit || 50);

    // Get supplier details for each rating
    const ratingsWithSuppliers = await Promise.all(
      ratings.map(async (rating) => {
        const supplier = await ctx.db.get(rating.supplierId);
        const order = await ctx.db.get(rating.orderId);
        
        return {
          ...rating,
          supplier: supplier ? {
            businessName: supplier.businessName,
            location: supplier.location.city
          } : null,
          order: order ? {
            items: order.items,
            totalCost: order.totalCost
          } : null
        };
      })
    );

    return ratingsWithSuppliers;
  }
});

// Check if vendor can rate an order
export const canRateOrder = query({
  args: {
    vendorId: v.id("vendors"),
    orderId: v.id("orders")
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return { canRate: false, reason: "Order not found" };
    }

    if (order.vendorId !== args.vendorId) {
      return { canRate: false, reason: "Order does not belong to this vendor" };
    }

    if (order.status !== "delivered") {
      return { canRate: false, reason: "Order must be delivered to rate" };
    }

    // Check if already rated
    const existingRating = await ctx.db
      .query("ratings")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .first();

    if (existingRating) {
      return { canRate: false, reason: "Order already rated" };
    }

    return { canRate: true, reason: null };
  }
});

// Basic fraud detection for suspicious rating patterns
async function detectSuspiciousRatingPatterns(ctx: any, vendorId: Id<"vendors">, supplierId: Id<"suppliers">) {
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

  // Get recent ratings from this vendor
  const vendorRatings = await ctx.db
    .query("ratings")
    .withIndex("by_vendor", (q: any) => q.eq("vendorId", vendorId))
    .filter((q: any) => q.gte(q.field("createdAt"), oneWeekAgo))
    .collect();

  // Get recent ratings for this supplier
  const supplierRatings = await ctx.db
    .query("ratings")
    .withIndex("by_supplier", (q: any) => q.eq("supplierId", supplierId))
    .filter((q: any) => q.gte(q.field("createdAt"), oneDayAgo))
    .collect();

  let suspiciousFlags: string[] = [];

  // Flag 1: Too many ratings from same vendor in short time
  const vendorRatingsToday = vendorRatings.filter((r: any) => r.createdAt >= oneDayAgo);
  if (vendorRatingsToday.length > 5) {
    suspiciousFlags.push("Excessive ratings from single vendor");
  }

  // Flag 2: All ratings are extreme (all 5s or all 1s)
  const supplierRatingsToday = supplierRatings.filter((r: any) => r.createdAt >= oneDayAgo);
  if (supplierRatingsToday.length >= 3) {
    const allHigh = supplierRatingsToday.every((r: any) => r.rating >= 4.5);
    const allLow = supplierRatingsToday.every((r: any) => r.rating <= 1.5);
    
    if (allHigh || allLow) {
      suspiciousFlags.push("Suspicious rating pattern detected");
    }
  }

  // Flag 3: Identical review text
  const recentReviews = supplierRatingsToday
    .filter((r: any) => r.review && r.review.trim().length > 10)
    .map((r: any) => r.review!.toLowerCase().trim());
  
  const uniqueReviews = new Set(recentReviews);
  if (recentReviews.length >= 3 && uniqueReviews.size < recentReviews.length * 0.7) {
    suspiciousFlags.push("Similar review content detected");
  }

  // Log suspicious activity if flags exist
  if (suspiciousFlags.length > 0) {
    console.warn(`Suspicious rating activity detected:`, {
      vendorId,
      supplierId,
      flags: suspiciousFlags,
      timestamp: now
    });
  }
}

// Update supplier trust score based on ratings
async function updateSupplierTrustScore(ctx: any, supplierId: Id<"suppliers">) {
  const supplier = await ctx.db.get(supplierId);
  if (!supplier) return;

  const ratings = await ctx.db
    .query("ratings")
    .withIndex("by_supplier", (q: any) => q.eq("supplierId", supplierId))
    .collect();

  if (ratings.length === 0) return;

  // Calculate weighted trust score
  const recentRatings = ratings
    .sort((a: any, b: any) => b.createdAt - a.createdAt)
    .slice(0, 50); // Consider last 50 ratings

  // Weight recent ratings more heavily
  let weightedSum = 0;
  let totalWeight = 0;

  recentRatings.forEach((rating: any, index: number) => {
    const weight = Math.exp(-index * 0.1); // Exponential decay for older ratings
    const compositeScore = (
      rating.rating * 0.4 +
      rating.categories.quality * 0.25 +
      rating.categories.delivery * 0.2 +
      rating.categories.communication * 0.1 +
      rating.categories.pricing * 0.05
    );
    
    weightedSum += compositeScore * weight;
    totalWeight += weight;
  });

  const baseScore = weightedSum / totalWeight;

  // Apply bonuses and penalties
  let trustScore = baseScore;

  // Bonus for high volume of ratings
  if (ratings.length >= 50) trustScore += 0.2;
  else if (ratings.length >= 20) trustScore += 0.1;

  // Bonus for consistency (low standard deviation)
  const avgRating = ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length;
  const variance = ratings.reduce((sum: number, r: any) => sum + Math.pow(r.rating - avgRating, 2), 0) / ratings.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev < 0.5) trustScore += 0.15;
  else if (stdDev < 1.0) trustScore += 0.05;

  // Bonus for FSSAI certification
  if (supplier.fssaiCertified) trustScore += 0.1;

  // Bonus for being verified
  if (supplier.isVerified) trustScore += 0.1;

  // Cap the trust score between 1 and 5
  trustScore = Math.max(1, Math.min(5, trustScore));

  await ctx.db.patch(supplierId, {
    trustScore: Math.round(trustScore * 10) / 10,
    updatedAt: Date.now()
  });
}



// Get trust score breakdown for a supplier
export const getTrustScoreBreakdown = query({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) return null;

    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .collect();

    const breakdown = {
      currentScore: supplier.trustScore,
      factors: {
        baseRating: 0,
        volumeBonus: 0,
        consistencyBonus: 0,
        certificationBonus: 0,
        verificationBonus: 0
      },
      metrics: {
        totalRatings: ratings.length,
        averageRating: 0,
        consistency: 0,
        isFssaiCertified: supplier.fssaiCertified,
        isVerified: supplier.isVerified
      }
    };

    if (ratings.length > 0) {
      const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      const variance = ratings.reduce((sum, r) => sum + Math.pow(r.rating - avgRating, 2), 0) / ratings.length;
      const stdDev = Math.sqrt(variance);

      breakdown.factors.baseRating = avgRating;
      breakdown.metrics.averageRating = Math.round(avgRating * 10) / 10;
      breakdown.metrics.consistency = Math.round((5 - stdDev) * 10) / 10; // Higher is better

      // Calculate bonuses
      if (ratings.length >= 50) breakdown.factors.volumeBonus = 0.2;
      else if (ratings.length >= 20) breakdown.factors.volumeBonus = 0.1;

      if (stdDev < 0.5) breakdown.factors.consistencyBonus = 0.15;
      else if (stdDev < 1.0) breakdown.factors.consistencyBonus = 0.05;
    }

    if (supplier.fssaiCertified) breakdown.factors.certificationBonus = 0.1;
    if (supplier.isVerified) breakdown.factors.verificationBonus = 0.1;

    return breakdown;
  }
});