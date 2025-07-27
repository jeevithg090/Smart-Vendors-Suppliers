import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
    businessType: v.string(),
    fssaiLicense: v.optional(v.string()),
    preferences: v.object({
      maxDeliveryDistance: v.number(),
      preferredCategories: v.array(v.string()),
      budgetRange: v.object({
        min: v.number(),
        max: v.number()
      }),
      qualityPreference: v.string(),
      deliveryTimePreference: v.string()
    })
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Initialize trust score based on profile completeness and verification status
    let initialTrustScore = 1.0; // Base score for new vendors
    
    // Add points for profile completeness
    if (args.fssaiLicense) initialTrustScore += 0.5;
    if (args.preferences.preferredCategories.length >= 3) initialTrustScore += 0.3;
    if (args.businessType && args.businessType !== 'Other') initialTrustScore += 0.2;
    
    // Cap initial score at 2.0 for new vendors
    initialTrustScore = Math.min(initialTrustScore, 2.0);
    
    return await ctx.db.insert("vendors", {
      userId: args.userId,
      businessName: args.businessName,
      ownerName: args.ownerName,
      email: args.email,
      phone: args.phone,
      location: args.location,
      businessType: args.businessType,
      fssaiLicense: args.fssaiLicense,
      isVerified: false,
      trustScore: initialTrustScore,
      preferences: args.preferences,
      createdAt: now,
      updatedAt: now
    });
  },
});

export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    try {
      return await ctx.db
        .query("vendors")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first();
    } catch (error) {
      console.error("Error fetching vendor by user ID:", error);
      return null;
    }
  },
});

export const getVendorById = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.vendorId);
  },
});

export const update = mutation({
  args: {
    id: v.id("vendors"),
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
    businessType: v.optional(v.string()),
    fssaiLicense: v.optional(v.string()),
    preferences: v.optional(v.object({
      maxDeliveryDistance: v.number(),
      preferredCategories: v.array(v.string()),
      budgetRange: v.object({
        min: v.number(),
        max: v.number()
      }),
      qualityPreference: v.string(),
      deliveryTimePreference: v.string()
    }))
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Recalculate trust score if profile information is updated
    const vendor = await ctx.db.get(id);
    if (!vendor) throw new Error("Vendor not found");
    
    let updatedTrustScore = vendor.trustScore;
    
    // If profile completeness changes, adjust trust score
    if (updates.fssaiLicense !== undefined || updates.preferences !== undefined || updates.businessType !== undefined) {
      const newFssaiLicense = updates.fssaiLicense ?? vendor.fssaiLicense;
      const newPreferences = updates.preferences ?? vendor.preferences;
      const newBusinessType = updates.businessType ?? vendor.businessType;
      
      // Recalculate profile completeness bonus
      let profileBonus = 0;
      if (newFssaiLicense) profileBonus += 0.5;
      if (newPreferences.preferredCategories.length >= 3) profileBonus += 0.3;
      if (newBusinessType && newBusinessType !== 'Other') profileBonus += 0.2;
      
      // Update trust score (keeping existing base score but updating profile bonus)
      const baseScore = Math.max(1.0, vendor.trustScore - 1.0); // Remove old profile bonus
      updatedTrustScore = Math.min(baseScore + profileBonus, 5.0);
    }
    
    return await ctx.db.patch(id, {
      ...updates,
      trustScore: updatedTrustScore,
      updatedAt: Date.now()
    });
  },
});

// Function to calculate trust score based on vendor performance
export const calculateTrustScore = mutation({
  args: {
    vendorId: v.id("vendors")
  },
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new Error("Vendor not found");
    
    // Get vendor's orders
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .collect();
    
    // Get vendor's ratings
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .collect();
    
    let trustScore = 1.0; // Base score
    
    // Profile completeness bonus (max 1.0)
    let profileBonus = 0;
    if (vendor.fssaiLicense) profileBonus += 0.5;
    if (vendor.preferences.preferredCategories.length >= 3) profileBonus += 0.3;
    if (vendor.businessType && vendor.businessType !== 'Other') profileBonus += 0.2;
    trustScore += Math.min(profileBonus, 1.0);
    
    // Verification bonus (0.5)
    if (vendor.isVerified) trustScore += 0.5;
    
    // Order completion rate (max 1.5)
    if (orders.length > 0) {
      const completedOrders = orders.filter(order => order.status === 'delivered').length;
      const completionRate = completedOrders / orders.length;
      trustScore += completionRate * 1.5;
    }
    
    // Average rating bonus (max 1.0)
    if (ratings.length > 0) {
      const averageRating = ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length;
      trustScore += (averageRating / 5) * 1.0;
    }
    
    // Cap at 5.0
    trustScore = Math.min(trustScore, 5.0);
    
    // Update vendor's trust score
    await ctx.db.patch(args.vendorId, {
      trustScore,
      updatedAt: Date.now()
    });
    
    return trustScore;
  },
});

// Get vendor statistics for trust score display
export const getVendorStats = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) return null;
    
    // Get orders
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .collect();
    
    // Get ratings
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .collect();
    
    const completedOrders = orders.filter(order => order.status === 'delivered');
    const onTimeOrders = completedOrders.filter(order => 
      order.actualDelivery && order.actualDelivery <= order.estimatedDelivery
    );
    
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
      : 0;
    
    const onTimeDeliveryRate = completedOrders.length > 0 
      ? (onTimeOrders.length / completedOrders.length) * 100 
      : 0;
    
    return {
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      averageRating,
      onTimeDeliveryRate,
      trustScore: vendor.trustScore,
      isVerified: vendor.isVerified
    };
  },
});

// Get vendor workflow state
export const getWorkflowState = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) return null;

    // Check completion status based on actual data
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .collect();

    const groupOrders = await ctx.db
      .query("groupOrders")
      .filter((q) => q.or(
        q.eq(q.field("initiatorId"), args.vendorId),
        q.neq(q.field("participants"), [])
      ))
      .collect();

    const priceAlerts = await ctx.db
      .query("priceAlerts")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .collect();

    const messages = await ctx.db
      .query("messages")
      .filter((q) => q.or(
        q.eq(q.field("senderId"), vendor.userId),
        q.eq(q.field("receiverId"), vendor.userId)
      ))
      .collect();

    // Check if vendor participated in any group orders
    const participatedInGroupOrders = groupOrders.some(go => 
      go.participants.some(p => p.vendorId === args.vendorId)
    );

    return {
      discoveryCompleted: true, // Always true if they have access
      recommendationsViewed: (vendor as any).lastActivity ? (vendor as any).lastActivity > 0 : false,
      groupOrderParticipated: participatedInGroupOrders,
      firstOrderPlaced: orders.length > 0,
      inventoryTracked: orders.length > 0, // If they placed orders, they've seen inventory
      priceAlertsSet: priceAlerts.length > 0,
      financialAnalyticsViewed: orders.length > 0,
      communicationUsed: messages.length > 0,
      currentStep: (vendor as any).currentWorkflowStep || 'discover',
      lastActivity: (vendor as any).lastActivity || Date.now()
    };
  }
});

// Update vendor workflow state
export const updateWorkflowState = mutation({
  args: {
    vendorId: v.id("vendors"),
    currentStep: v.optional(v.string()),
    discoveryCompleted: v.optional(v.boolean()),
    recommendationsViewed: v.optional(v.boolean()),
    groupOrderParticipated: v.optional(v.boolean()),
    firstOrderPlaced: v.optional(v.boolean()),
    inventoryTracked: v.optional(v.boolean()),
    priceAlertsSet: v.optional(v.boolean()),
    financialAnalyticsViewed: v.optional(v.boolean()),
    communicationUsed: v.optional(v.boolean()),
    lastActivity: v.number()
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.vendorId, {
      updatedAt: Date.now()
    });
  }
});
