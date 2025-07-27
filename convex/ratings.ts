import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Add a new rating
export const addRating = mutation({
  args: {
    vendorId: v.id("vendors"),
    supplierId: v.id("suppliers"),
    orderId: v.id("orders"),
    rating: v.number(), // 1-5 scale
    review: v.optional(v.string()),
    categories: v.object({
      quality: v.number(),
      delivery: v.number(),
      communication: v.number(),
      pricing: v.number()
    })
  },
  handler: async (ctx, args) => {
    // Check if rating already exists for this order
    const existingRating = await ctx.db
      .query("ratings")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .first();
    
    if (existingRating) {
      throw new Error("Rating already exists for this order");
    }
    
    // Insert the rating
    const ratingId = await ctx.db.insert("ratings", {
      vendorId: args.vendorId,
      supplierId: args.supplierId,
      orderId: args.orderId,
      rating: args.rating,
      review: args.review,
      categories: args.categories,
      createdAt: Date.now()
    });
    
    // Update supplier's trust score
    await updateSupplierTrustScore(ctx, args.supplierId);
    
    return ratingId;
  },
});

// Get ratings for a supplier
export const getSupplierRatings = query({
  args: { 
    supplierId: v.id("suppliers"),
    limit: v.optional(v.number())
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
        return {
          ...rating,
          vendor: vendor ? {
            businessName: vendor.businessName,
            ownerName: vendor.ownerName
          } : null
        };
      })
    );
    
    return ratingsWithVendors;
  },
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
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0
        }
      };
    }
    
    const totalRatings = ratings.length;
    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;
    
    const categoryAverages = {
      quality: ratings.reduce((sum, r) => sum + r.categories.quality, 0) / totalRatings,
      delivery: ratings.reduce((sum, r) => sum + r.categories.delivery, 0) / totalRatings,
      communication: ratings.reduce((sum, r) => sum + r.categories.communication, 0) / totalRatings,
      pricing: ratings.reduce((sum, r) => sum + r.categories.pricing, 0) / totalRatings
    };
    
    const ratingDistribution = ratings.reduce((acc, r) => {
      const roundedRating = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
      acc[roundedRating] = (acc[roundedRating] || 0) + 1;
      return acc;
    }, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
    
    return {
      totalRatings,
      averageRating,
      categoryAverages,
      ratingDistribution
    };
  },
});

// Get trust score breakdown for a supplier
export const getTrustScoreBreakdown = query({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) {
      throw new Error("Supplier not found");
    }
    
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .collect();
    
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .collect();
    
    // Base score calculation
    let baseScore = 2.0; // Starting score
    
    // Rating-based score (40% weight)
    let ratingScore = 0;
    if (ratings.length > 0) {
      const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      ratingScore = avgRating * 0.4;
    }
    
    // Volume bonus (20% weight)
    const completedOrders = orders.filter(o => o.status === 'delivered').length;
    const volumeBonus = Math.min(completedOrders * 0.05, 1.0); // Max 1.0 bonus
    
    // Consistency bonus (20% weight)
    const recentOrders = orders.filter(o => 
      o.createdAt > Date.now() - 30 * 24 * 60 * 60 * 1000 // Last 30 days
    );
    const onTimeDeliveries = recentOrders.filter(o => 
      o.actualDelivery && o.actualDelivery <= o.estimatedDelivery
    ).length;
    const consistencyBonus = recentOrders.length > 0 
      ? (onTimeDeliveries / recentOrders.length) * 0.8 
      : 0;
    
    // Certification bonus (10% weight)
    const certificationBonus = supplier.fssaiCertified ? 0.5 : 0;
    
    // Verification bonus (10% weight)
    const verificationBonus = supplier.isVerified ? 0.3 : 0;
    
    const currentScore = Math.min(
      baseScore + ratingScore + volumeBonus + consistencyBonus + certificationBonus + verificationBonus,
      5.0
    );
    
    return {
      currentScore,
      factors: {
        baseScore,
        ratingScore,
        volumeBonus,
        consistencyBonus,
        certificationBonus,
        verificationBonus
      },
      breakdown: {
        totalOrders: orders.length,
        completedOrders,
        totalRatings: ratings.length,
        averageRating: ratings.length > 0 
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
          : 0,
        onTimeDeliveryRate: recentOrders.length > 0 
          ? (onTimeDeliveries / recentOrders.length) * 100 
          : 0
      }
    };
  },
});

// Update supplier trust score (internal function)
async function updateSupplierTrustScore(ctx: any, supplierId: any) {
  const supplier = await ctx.db.get(supplierId);
  if (!supplier) return;
  
  const ratings = await ctx.db
    .query("ratings")
    .withIndex("by_supplier", (q) => q.eq("supplierId", supplierId))
    .collect();
  
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_supplier", (q) => q.eq("supplierId", supplierId))
    .collect();
  
  // Calculate new trust score using the same logic as getTrustScoreBreakdown
  let baseScore = 2.0;
  
  let ratingScore = 0;
  if (ratings.length > 0) {
    const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    ratingScore = avgRating * 0.4;
  }
  
  const completedOrders = orders.filter(o => o.status === 'delivered').length;
  const volumeBonus = Math.min(completedOrders * 0.05, 1.0);
  
  const recentOrders = orders.filter(o => 
    o.createdAt > Date.now() - 30 * 24 * 60 * 60 * 1000
  );
  const onTimeDeliveries = recentOrders.filter(o => 
    o.actualDelivery && o.actualDelivery <= o.estimatedDelivery
  ).length;
  const consistencyBonus = recentOrders.length > 0 
    ? (onTimeDeliveries / recentOrders.length) * 0.8 
    : 0;
  
  const certificationBonus = supplier.fssaiCertified ? 0.5 : 0;
  const verificationBonus = supplier.isVerified ? 0.3 : 0;
  
  const newTrustScore = Math.min(
    baseScore + ratingScore + volumeBonus + consistencyBonus + certificationBonus + verificationBonus,
    5.0
  );
  
  // Update supplier's trust score
  await ctx.db.patch(supplierId, {
    trustScore: newTrustScore,
    updatedAt: Date.now()
  });
}

// Get ratings by vendor
export const getVendorRatings = query({
  args: { 
    vendorId: v.id("vendors"),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .order("desc")
      .take(args.limit || 20);
    
    // Get supplier details for each rating
    const ratingsWithSuppliers = await Promise.all(
      ratings.map(async (rating) => {
        const supplier = await ctx.db.get(rating.supplierId);
        return {
          ...rating,
          supplier: supplier ? {
            businessName: supplier.businessName,
            ownerName: supplier.ownerName
          } : null
        };
      })
    );
    
    return ratingsWithSuppliers;
  },
});

// Update rating
export const updateRating = mutation({
  args: {
    ratingId: v.id("ratings"),
    rating: v.optional(v.number()),
    review: v.optional(v.string()),
    categories: v.optional(v.object({
      quality: v.number(),
      delivery: v.number(),
      communication: v.number(),
      pricing: v.number()
    }))
  },
  handler: async (ctx, args) => {
    const { ratingId, ...updates } = args;
    
    const existingRating = await ctx.db.get(ratingId);
    if (!existingRating) {
      throw new Error("Rating not found");
    }
    
    await ctx.db.patch(ratingId, updates);
    
    // Update supplier's trust score
    await updateSupplierTrustScore(ctx, existingRating.supplierId);
    
    return ratingId;
  },
});

// Delete rating
export const deleteRating = mutation({
  args: { ratingId: v.id("ratings") },
  handler: async (ctx, args) => {
    const rating = await ctx.db.get(args.ratingId);
    if (!rating) {
      throw new Error("Rating not found");
    }
    
    await ctx.db.delete(args.ratingId);
    
    // Update supplier's trust score
    await updateSupplierTrustScore(ctx, rating.supplierId);
    
    return args.ratingId;
  },
});