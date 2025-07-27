import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Store image analysis results in the database
 */
export const storeImageAnalysis = mutation({
  args: {
    userId: v.string(),
    imageUrl: v.string(),
    imageHash: v.string(),
    analysisResults: v.object({
      identifiedItems: v.array(v.object({
        name: v.string(),
        confidence: v.number(),
        category: v.string(),
        alternatives: v.optional(v.array(v.string()))
      })),
      ingredients: v.array(v.object({
        name: v.string(),
        confidence: v.number(),
        category: v.string(),
        alternatives: v.optional(v.array(v.string()))
      })),
      overallConfidence: v.number()
    }),
    supplierSuggestions: v.array(v.object({
      supplierId: v.id("suppliers"),
      relevantIngredients: v.array(v.string()),
      matchScore: v.number(),
      priceEstimate: v.optional(v.number())
    }))
  },
  handler: async (ctx, args) => {
    // Check if image was already analyzed (duplicate detection)
    const existingAnalysis = await ctx.db
      .query("imageAnalysis")
      .filter((q) => q.eq(q.field("imageHash"), args.imageHash))
      .first();

    if (existingAnalysis) {
      // Return existing analysis ID instead of creating duplicate
      return existingAnalysis._id;
    }

    const imageAnalysisId = await ctx.db.insert("imageAnalysis", {
      userId: args.userId,
      imageUrl: args.imageUrl,
      imageHash: args.imageHash,
      analysisResults: args.analysisResults,
      supplierSuggestions: args.supplierSuggestions,
      createdAt: Date.now()
    });

    return imageAnalysisId;
  }
});

/**
 * Get image analysis by ID
 */
export const getImageAnalysis = query({
  args: {
    imageAnalysisId: v.id("imageAnalysis")
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.imageAnalysisId);
    
    if (!analysis) {
      throw new Error("Image analysis not found");
    }

    // Fetch supplier details for suggestions
    const suppliersWithDetails = await Promise.all(
      analysis.supplierSuggestions.map(async (suggestion) => {
        const supplier = await ctx.db.get(suggestion.supplierId);
        return {
          ...suggestion,
          supplier
        };
      })
    );

    return {
      ...analysis,
      supplierSuggestions: suppliersWithDetails
    };
  }
});

/**
 * Get image analysis history for a user
 */
export const getImageAnalysisHistory = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const analyses = await ctx.db
      .query("imageAnalysis")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .order("desc")
      .take(args.limit || 20);

    return analyses;
  }
});

/**
 * Update image analysis with user feedback
 */
export const updateImageAnalysisFeedback = mutation({
  args: {
    imageAnalysisId: v.id("imageAnalysis"),
    feedback: v.object({
      correctIdentification: v.boolean(),
      actualItems: v.optional(v.array(v.string())),
      rating: v.number(),
      comments: v.optional(v.string())
    })
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.imageAnalysisId, {
      userFeedback: args.feedback
    });

    return args.imageAnalysisId;
  }
});

/**
 * Search suppliers based on identified ingredients from image analysis
 */
export const searchSuppliersForIngredients = query({
  args: {
    ingredients: v.array(v.string()),
    userLocation: v.optional(v.object({
      city: v.string(),
      coordinates: v.object({
        lat: v.number(),
        lng: v.number()
      })
    })),
    filters: v.optional(v.object({
      maxDistance: v.optional(v.number()),
      minTrustScore: v.optional(v.number()),
      fssaiRequired: v.optional(v.boolean()),
      priceRange: v.optional(v.object({
        min: v.number(),
        max: v.number()
      })),
      categories: v.optional(v.array(v.string()))
    }))
  },
  handler: async (ctx, args) => {
    let suppliersQuery = ctx.db.query("suppliers");

    // Filter by location if provided
    if (args.userLocation) {
      suppliersQuery = suppliersQuery.filter((q) => 
        q.eq(q.field("location.city"), args.userLocation!.city)
      );
    }

    // Filter by trust score
    if (args.filters?.minTrustScore) {
      suppliersQuery = suppliersQuery.filter((q) => 
        q.gte(q.field("trustScore"), args.filters!.minTrustScore!)
      );
    }

    // Filter by FSSAI requirement
    if (args.filters?.fssaiRequired) {
      suppliersQuery = suppliersQuery.filter((q) => 
        q.eq(q.field("fssaiCertified"), true)
      );
    }

    const suppliers = await suppliersQuery.collect();

    // Get inventory for matching ingredients
    const relevantSuppliers: Array<{
      supplier: any;
      matchingItems: any[];
      matchScore: number;
      ingredientCoverage: number;
      estimatedPrice: number;
      availableIngredients: string[];
    }> = [];
    
    for (const supplier of suppliers) {
      const inventory = await ctx.db
        .query("inventory")
        .filter((q) => q.eq(q.field("supplierId"), supplier._id))
        .filter((q) => q.eq(q.field("isAvailable"), true))
        .collect();

      const matchingItems = inventory.filter(item => 
        args.ingredients.some(ingredient => 
          item.itemName.toLowerCase().includes(ingredient.toLowerCase()) ||
          ingredient.toLowerCase().includes(item.itemName.toLowerCase()) ||
          checkIngredientAlternatives(ingredient, item.itemName)
        )
      );

      if (matchingItems.length > 0) {
        // Filter by price range if specified
        const validItems = args.filters?.priceRange 
          ? matchingItems.filter(item => 
              item.pricePerUnit >= args.filters!.priceRange!.min &&
              item.pricePerUnit <= args.filters!.priceRange!.max
            )
          : matchingItems;

        // Filter by categories if specified
        const categoryFilteredItems = args.filters?.categories?.length
          ? validItems.filter(item => 
              args.filters!.categories!.includes(item.category)
            )
          : validItems;

        if (categoryFilteredItems.length > 0) {
          // Calculate match score based on ingredient coverage and supplier quality
          const ingredientCoverage = categoryFilteredItems.length / args.ingredients.length;
          const qualityScore = supplier.trustScore / 5; // Normalize to 0-1
          const matchScore = (ingredientCoverage * 0.7) + (qualityScore * 0.3);

          // Calculate estimated total price
          const estimatedPrice = categoryFilteredItems.reduce(
            (total, item) => total + (item.pricePerUnit * item.minimumOrder), 
            0
          );

          relevantSuppliers.push({
            supplier,
            matchingItems: categoryFilteredItems,
            matchScore,
            ingredientCoverage,
            estimatedPrice,
            availableIngredients: categoryFilteredItems.map(item => item.itemName)
          });
        }
      }
    }

    // Sort by match score (descending)
    relevantSuppliers.sort((a, b) => b.matchScore - a.matchScore);

    return relevantSuppliers.slice(0, 10); // Return top 10 matches
  }
});

/**
 * Helper function to check ingredient alternatives
 */
function checkIngredientAlternatives(ingredient: string, itemName: string): boolean {
  const ingredientAlternatives: Record<string, string[]> = {
    'tomato': ['tamatar', 'टमाटर', 'தக்காளி', 'టమాట'],
    'onion': ['pyaz', 'प्याज', 'வெங்காயம்', 'ఉల్లిపాయ'],
    'potato': ['aloo', 'आलू', 'உருளைக்கிழங்கு', 'బంగాళాదుంప'],
    'rice': ['chawal', 'चावल', 'அரிசி', 'బియ్యం'],
    'wheat': ['gehun', 'गेहूं', 'கோதுமை', 'గోధుమ'],
    'turmeric': ['haldi', 'हल्दी', 'மஞ்சள்', 'పసుపు'],
    'chili': ['mirch', 'मिर्च', 'மிளகாய்', 'మిర్చి']
  };

  const lowerIngredient = ingredient.toLowerCase();
  const lowerItemName = itemName.toLowerCase();

  // Check if ingredient has alternatives
  for (const [key, alternatives] of Object.entries(ingredientAlternatives)) {
    if (lowerIngredient.includes(key) || key.includes(lowerIngredient)) {
      return alternatives.some(alt => 
        lowerItemName.includes(alt.toLowerCase()) || 
        alt.toLowerCase().includes(lowerItemName)
      );
    }
  }

  return false;
}

/**
 * Get image analysis statistics for a user
 */
export const getImageAnalysisStats = query({
  args: {
    userId: v.string(),
    timeRange: v.optional(v.string()) // "week", "month", "year"
  },
  handler: async (ctx, args) => {
    const timeRanges = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000
    };

    const timeRange = timeRanges[args.timeRange as keyof typeof timeRanges] || timeRanges.month;
    const cutoffTime = Date.now() - timeRange;

    const analyses = await ctx.db
      .query("imageAnalysis")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.gte(q.field("createdAt"), cutoffTime))
      .collect();

    const totalAnalyses = analyses.length;
    const avgConfidence = analyses.length > 0 
      ? analyses.reduce((sum, a) => sum + a.analysisResults.overallConfidence, 0) / analyses.length 
      : 0;

    // Category distribution
    const categoryStats: Record<string, number> = {};
    const ingredientStats: Record<string, number> = {};

    analyses.forEach(analysis => {
      analysis.analysisResults.identifiedItems.forEach(item => {
        categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
      });

      analysis.analysisResults.ingredients.forEach(ingredient => {
        ingredientStats[ingredient.name] = (ingredientStats[ingredient.name] || 0) + 1;
      });
    });

    // Feedback statistics
    const feedbackStats = {
      totalFeedback: 0,
      correctIdentifications: 0,
      averageRating: 0
    };

    const analysesWithFeedback = analyses.filter(a => a.userFeedback);
    feedbackStats.totalFeedback = analysesWithFeedback.length;

    if (analysesWithFeedback.length > 0) {
      feedbackStats.correctIdentifications = analysesWithFeedback.filter(
        a => a.userFeedback!.correctIdentification
      ).length;

      feedbackStats.averageRating = analysesWithFeedback.reduce(
        (sum, a) => sum + a.userFeedback!.rating, 0
      ) / analysesWithFeedback.length;
    }

    return {
      totalAnalyses,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      categoryStats,
      ingredientStats,
      feedbackStats,
      recentAnalyses: analyses.slice(0, 5)
    };
  }
});

/**
 * Delete image analysis (for privacy compliance)
 */
export const deleteImageAnalysis = mutation({
  args: {
    imageAnalysisId: v.id("imageAnalysis"),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.imageAnalysisId);
    
    if (!analysis) {
      throw new Error("Image analysis not found");
    }

    if (analysis.userId !== args.userId) {
      throw new Error("Unauthorized: Cannot delete another user's analysis");
    }

    await ctx.db.delete(args.imageAnalysisId);
    return { success: true };
  }
});

/**
 * Bulk delete image analyses for a user (privacy compliance)
 */
export const bulkDeleteImageAnalyses = mutation({
  args: {
    userId: v.string(),
    olderThan: v.optional(v.number()) // Delete analyses older than this timestamp
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("imageAnalysis")
      .filter((q) => q.eq(q.field("userId"), args.userId));

    if (args.olderThan) {
      query = query.filter((q) => q.lt(q.field("createdAt"), args.olderThan!));
    }

    const analyses = await query.collect();
    
    for (const analysis of analyses) {
      await ctx.db.delete(analysis._id);
    }

    return { deletedCount: analyses.length };
  }
});