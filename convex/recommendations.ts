import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate AI recommendations for a vendor
export const generateRecommendations = mutation({
  args: {
    vendorId: v.id("vendors"),
    refreshExisting: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new Error("Vendor not found");

    // Clear existing recommendations if refreshing
    if (args.refreshExisting) {
      const existingRecs = await ctx.db
        .query("recommendations")
        .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
        .collect();
      
      for (const rec of existingRecs) {
        await ctx.db.delete(rec._id);
      }
    }

    // Get vendor's order history for preference analysis
    const orderHistory = await ctx.db
      .query("orders")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .filter((q) => q.eq(q.field("status"), "delivered"))
      .order("desc")
      .take(50);

    // Get vendor's ratings to understand supplier preferences
    const vendorRatings = await ctx.db
      .query("ratings")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .order("desc")
      .take(20);

    // Get all suppliers for recommendation analysis
    const allSuppliers = await ctx.db.query("suppliers").collect();

    // Filter suppliers based on vendor location and delivery radius
    const eligibleSuppliers = allSuppliers.filter(supplier => {
      const distance = calculateDistance(
        vendor.location.coordinates.lat,
        vendor.location.coordinates.lng,
        supplier.location.coordinates.lat,
        supplier.location.coordinates.lng
      );
      return distance <= Math.min(supplier.deliveryRadius, vendor.preferences.maxDeliveryDistance);
    });

    // Generate recommendations using AI algorithm
    const recommendations = await generateAIRecommendations(
      vendor,
      eligibleSuppliers,
      orderHistory,
      vendorRatings,
      ctx
    );

    // Store recommendations in database
    const now = Date.now();
    const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours

    const savedRecommendations = [];
    for (const rec of recommendations) {
      const savedRec = await ctx.db.insert("recommendations", {
        vendorId: args.vendorId,
        supplierId: rec.supplierId,
        score: rec.score,
        reasons: rec.reasons,
        itemCategories: rec.itemCategories,
        priceAdvantage: rec.priceAdvantage,
        trustFactor: rec.trustFactor,
        locationScore: rec.locationScore,
        isActive: true,
        createdAt: now,
        expiresAt
      });
      savedRecommendations.push(savedRec);
    }

    return savedRecommendations;
  },
});

// Get active recommendations for a vendor
export const getRecommendations = query({
  args: {
    vendorId: v.id("vendors"),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get active, non-expired recommendations
    let recommendations = await ctx.db
      .query("recommendations")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .filter((q) => q.and(
        q.eq(q.field("isActive"), true),
        q.gt(q.field("expiresAt"), now)
      ))
      .order("desc")
      .collect();

    // Sort by score
    recommendations.sort((a, b) => b.score - a.score);

    // Apply limit if specified
    if (args.limit) {
      recommendations = recommendations.slice(0, args.limit);
    }

    // Enrich with supplier details
    const enrichedRecommendations = [];
    for (const rec of recommendations) {
      const supplier = await ctx.db.get(rec.supplierId);
      if (supplier) {
        // Get supplier's inventory for recommended categories
        const relevantInventory = await ctx.db
          .query("inventory")
          .withIndex("by_supplier", (q) => q.eq("supplierId", rec.supplierId))
          .filter((q) => q.eq(q.field("isAvailable"), true))
          .collect();

        const categoryInventory = relevantInventory.filter(item =>
          rec.itemCategories.includes(item.category)
        );

        enrichedRecommendations.push({
          ...rec,
          supplier,
          relevantInventory: categoryInventory
        });
      }
    }

    return enrichedRecommendations;
  },
});

// Submit feedback on a recommendation
export const submitFeedback = mutation({
  args: {
    recommendationId: v.id("recommendations"),
    vendorId: v.id("vendors"),
    feedback: v.string(), // "helpful", "not_helpful", "contacted", "ordered"
    notes: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const recommendation = await ctx.db.get(args.recommendationId);
    if (!recommendation || recommendation.vendorId !== args.vendorId) {
      throw new Error("Recommendation not found or access denied");
    }

    // Store feedback for ML improvement
    const feedbackRecord = await ctx.db.insert("recommendationFeedback", {
      recommendationId: args.recommendationId,
      vendorId: args.vendorId,
      supplierId: recommendation.supplierId,
      feedback: args.feedback,
      notes: args.notes,
      recommendationScore: recommendation.score,
      createdAt: Date.now()
    });

    // Update recommendation based on feedback
    if (args.feedback === "not_helpful") {
      await ctx.db.patch(args.recommendationId, {
        isActive: false
      });
    }

    return feedbackRecord;
  },
});

// Get recommendation analytics for ML improvement
export const getRecommendationAnalytics = query({
  args: {
    vendorId: v.optional(v.id("vendors")),
    supplierId: v.optional(v.id("suppliers")),
    days: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const daysAgo = args.days || 30;
    const cutoffTime = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);

    let query = ctx.db.query("recommendationFeedback");
    
    if (args.vendorId) {
      query = query.filter((q) => q.eq(q.field("vendorId"), args.vendorId));
    }
    
    if (args.supplierId) {
      query = query.filter((q) => q.eq(q.field("supplierId"), args.supplierId));
    }

    const feedback = await query
      .filter((q) => q.gt(q.field("createdAt"), cutoffTime))
      .collect();

    // Calculate analytics
    const totalFeedback = feedback.length;
    const helpfulCount = feedback.filter(f => f.feedback === "helpful").length;
    const notHelpfulCount = feedback.filter(f => f.feedback === "not_helpful").length;
    const contactedCount = feedback.filter(f => f.feedback === "contacted").length;
    const orderedCount = feedback.filter(f => f.feedback === "ordered").length;

    const helpfulRate = totalFeedback > 0 ? helpfulCount / totalFeedback : 0;
    const conversionRate = totalFeedback > 0 ? orderedCount / totalFeedback : 0;

    return {
      totalFeedback,
      helpfulCount,
      notHelpfulCount,
      contactedCount,
      orderedCount,
      helpfulRate,
      conversionRate,
      averageScore: feedback.length > 0 
        ? feedback.reduce((sum, f) => sum + f.recommendationScore, 0) / feedback.length 
        : 0
    };
  },
});

// AI Recommendation Algorithm
async function generateAIRecommendations(
  vendor: any,
  suppliers: any[],
  orderHistory: any[],
  vendorRatings: any[],
  ctx: any
): Promise<any[]> {
  const recommendations = [];

  // Analyze vendor's ordering patterns
  const categoryFrequency = analyzeOrderCategories(orderHistory);
  const pricePatterns = analyzePricePatterns(orderHistory);

  for (const supplier of suppliers) {
    // Skip if vendor has had bad experience with this supplier
    const supplierRating = vendorRatings.find(r => r.supplierId === supplier._id);
    if (supplierRating && supplierRating.rating < 2.5) continue;

    // Calculate various scoring factors
    const locationScore = calculateLocationScore(vendor, supplier);
    const trustFactor = calculateTrustFactor(supplier, vendorRatings);
    const categoryMatch = calculateCategoryMatch(supplier, categoryFrequency, vendor.preferences.preferredCategories);
    const priceScore = await calculatePriceScore(supplier, pricePatterns, ctx);
    const availabilityScore = await calculateAvailabilityScore(supplier, categoryFrequency, ctx);

    // Calculate overall recommendation score
    const score = (
      locationScore * 0.25 +
      trustFactor * 0.25 +
      categoryMatch * 0.20 +
      priceScore * 0.15 +
      availabilityScore * 0.15
    );

    // Only recommend if score is above threshold
    if (score >= 0.6) {
      const reasons = generateReasons(supplier, locationScore, trustFactor, categoryMatch, priceScore);
      const itemCategories = getRelevantCategories(supplier, categoryFrequency, vendor.preferences.preferredCategories);
      const priceAdvantage = await calculatePriceAdvantage(supplier, pricePatterns, ctx);

      recommendations.push({
        supplierId: supplier._id,
        score,
        reasons,
        itemCategories,
        priceAdvantage,
        trustFactor,
        locationScore
      });
    }
  }

  // Sort by score and return top recommendations
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

// Helper functions for AI algorithm
function analyzeOrderCategories(orderHistory: any[]): Record<string, number> {
  const categoryCount: Record<string, number> = {};
  
  for (const order of orderHistory) {
    for (const item of order.items) {
      // This would ideally map item names to categories
      // For now, we'll use a simple mapping
      const category = mapItemToCategory(item.itemName);
      categoryCount[category] = (categoryCount[category] || 0) + item.quantity;
    }
  }
  
  return categoryCount;
}



function analyzePricePatterns(orderHistory: any[]): Record<string, { avg: number, max: number }> {
  const pricePatterns: Record<string, { total: number, count: number, max: number }> = {};
  
  for (const order of orderHistory) {
    for (const item of order.items) {
      const category = mapItemToCategory(item.itemName);
      if (!pricePatterns[category]) {
        pricePatterns[category] = { total: 0, count: 0, max: 0 };
      }
      pricePatterns[category].total += item.pricePerUnit;
      pricePatterns[category].count += 1;
      pricePatterns[category].max = Math.max(pricePatterns[category].max, item.pricePerUnit);
    }
  }
  
  const result: Record<string, { avg: number, max: number }> = {};
  for (const [category, data] of Object.entries(pricePatterns)) {
    result[category] = {
      avg: data.total / data.count,
      max: data.max
    };
  }
  
  return result;
}

function calculateLocationScore(vendor: any, supplier: any): number {
  const distance = calculateDistance(
    vendor.location.coordinates.lat,
    vendor.location.coordinates.lng,
    supplier.location.coordinates.lat,
    supplier.location.coordinates.lng
  );
  
  // Score decreases with distance, max score at 0km, min score at max delivery distance
  const maxDistance = Math.min(supplier.deliveryRadius, vendor.preferences.maxDeliveryDistance);
  return Math.max(0, 1 - (distance / maxDistance));
}

function calculateTrustFactor(supplier: any, vendorRatings: any[]): number {
  const vendorRating = vendorRatings.find(r => r.supplierId === supplier._id);
  
  if (vendorRating) {
    // Use vendor's personal experience (weighted more heavily)
    return (vendorRating.rating / 5) * 0.7 + (supplier.trustScore / 5) * 0.3;
  } else {
    // Use general trust score
    return supplier.trustScore / 5;
  }
}

function calculateCategoryMatch(supplier: any, categoryFrequency: Record<string, number>, preferredCategories: string[]): number {
  const supplierCategories = supplier.categories;
  let matchScore = 0;
  let totalWeight = 0;
  
  // Check preferred categories
  for (const prefCat of preferredCategories) {
    totalWeight += 2; // Preferred categories have higher weight
    if (supplierCategories.includes(prefCat)) {
      matchScore += 2;
    }
  }
  
  // Check frequently ordered categories
  for (const [category, frequency] of Object.entries(categoryFrequency)) {
    const weight = Math.min(frequency / 10, 1); // Normalize frequency to weight
    totalWeight += weight;
    if (supplierCategories.includes(category)) {
      matchScore += weight;
    }
  }
  
  return totalWeight > 0 ? matchScore / totalWeight : 0;
}

async function calculatePriceScore(supplier: any, pricePatterns: Record<string, { avg: number, max: number }>, ctx: any): Promise<number> {
  const inventory = await ctx.db
    .query("inventory")
    .withIndex("by_supplier", (q: any) => q.eq("supplierId", supplier._id))
    .filter((q: any) => q.eq(q.field("isAvailable"), true))
    .collect();
  
  let totalScore = 0;
  let itemCount = 0;
  
  for (const item of inventory) {
    const category = item.category;
    if (pricePatterns[category]) {
      const avgPrice = pricePatterns[category].avg;
      const priceRatio = avgPrice / item.pricePerUnit;
      // Score is higher if supplier's price is lower than vendor's average
      const itemScore = Math.min(priceRatio, 2) / 2; // Cap at 2x better price
      totalScore += itemScore;
      itemCount++;
    }
  }
  
  return itemCount > 0 ? totalScore / itemCount : 0.5; // Default neutral score
}

async function calculateAvailabilityScore(supplier: any, categoryFrequency: Record<string, number>, ctx: any): Promise<number> {
  const inventory = await ctx.db
    .query("inventory")
    .withIndex("by_supplier", (q: any) => q.eq("supplierId", supplier._id))
    .filter((q: any) => q.eq(q.field("isAvailable"), true))
    .collect();
  
  let availabilityScore = 0;
  let totalCategories = Object.keys(categoryFrequency).length;
  
  for (const category of Object.keys(categoryFrequency)) {
    const hasCategory = inventory.some((item: any) => item.category === category);
    if (hasCategory) {
      availabilityScore += 1;
    }
  }
  
  return totalCategories > 0 ? availabilityScore / totalCategories : 0;
}

function generateReasons(supplier: any, locationScore: number, trustFactor: number, categoryMatch: number, priceScore: number): string[] {
  const reasons = [];
  
  if (locationScore > 0.8) {
    reasons.push("Very close to your location");
  } else if (locationScore > 0.6) {
    reasons.push("Convenient delivery distance");
  }
  
  if (trustFactor > 0.8) {
    reasons.push("Highly trusted supplier");
  } else if (trustFactor > 0.6) {
    reasons.push("Good reputation and ratings");
  }
  
  if (categoryMatch > 0.7) {
    reasons.push("Specializes in your preferred categories");
  } else if (categoryMatch > 0.5) {
    reasons.push("Offers products you frequently order");
  }
  
  if (priceScore > 0.7) {
    reasons.push("Competitive pricing");
  }
  
  if (supplier.fssaiCertified) {
    reasons.push("FSSAI certified");
  }
  
  return reasons;
}

function getRelevantCategories(supplier: any, categoryFrequency: Record<string, number>, preferredCategories: string[]): string[] {
  const relevantCategories = [];
  
  // Add preferred categories that supplier offers
  for (const prefCat of preferredCategories) {
    if (supplier.categories.includes(prefCat)) {
      relevantCategories.push(prefCat);
    }
  }
  
  // Add frequently ordered categories that supplier offers
  for (const category of Object.keys(categoryFrequency)) {
    if (supplier.categories.includes(category) && !relevantCategories.includes(category)) {
      relevantCategories.push(category);
    }
  }
  
  return relevantCategories;
}

async function calculatePriceAdvantage(supplier: any, pricePatterns: Record<string, { avg: number, max: number }>, ctx: any): Promise<number | undefined> {
  const inventory = await ctx.db
    .query("inventory")
    .withIndex("by_supplier", (q: any) => q.eq("supplierId", supplier._id))
    .filter((q: any) => q.eq(q.field("isAvailable"), true))
    .collect();
  
  let totalSavings = 0;
  let itemCount = 0;
  
  for (const item of inventory) {
    const category = item.category;
    if (pricePatterns[category]) {
      const avgPrice = pricePatterns[category].avg;
      const savings = avgPrice - item.pricePerUnit;
      if (savings > 0) {
        totalSavings += savings;
        itemCount++;
      }
    }
  }
  
  return itemCount > 0 ? totalSavings / itemCount : undefined;
}

function mapItemToCategory(itemName: string): string {
  const itemLower = itemName.toLowerCase();
  
  if (itemLower.includes('tomato') || itemLower.includes('onion') || itemLower.includes('potato') || 
      itemLower.includes('carrot') || itemLower.includes('cabbage') || itemLower.includes('spinach')) {
    return 'Vegetables';
  } else if (itemLower.includes('apple') || itemLower.includes('banana') || itemLower.includes('orange') ||
             itemLower.includes('mango') || itemLower.includes('grape')) {
    return 'Fruits';
  } else if (itemLower.includes('rice') || itemLower.includes('wheat') || itemLower.includes('flour') ||
             itemLower.includes('dal') || itemLower.includes('lentil')) {
    return 'Grains & Cereals';
  } else if (itemLower.includes('turmeric') || itemLower.includes('chili') || itemLower.includes('cumin') ||
             itemLower.includes('coriander') || itemLower.includes('garam masala')) {
    return 'Spices & Condiments';
  } else if (itemLower.includes('milk') || itemLower.includes('cheese') || itemLower.includes('yogurt') ||
             itemLower.includes('butter') || itemLower.includes('paneer')) {
    return 'Dairy Products';
  } else if (itemLower.includes('chicken') || itemLower.includes('mutton') || itemLower.includes('egg')) {
    return 'Meat & Poultry';
  } else if (itemLower.includes('fish') || itemLower.includes('prawn') || itemLower.includes('crab')) {
    return 'Seafood';
  } else if (itemLower.includes('oil') || itemLower.includes('ghee')) {
    return 'Oil & Ghee';
  } else if (itemLower.includes('box') || itemLower.includes('bag') || itemLower.includes('container') ||
             itemLower.includes('wrap') || itemLower.includes('cup')) {
    return 'Packaging Materials';
  } else {
    return 'Snacks & Beverages';
  }
}

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