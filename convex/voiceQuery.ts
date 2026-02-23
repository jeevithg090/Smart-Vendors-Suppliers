import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Enhanced voice query processing with multi-modal support
export const processEnhancedVoiceQuery = mutation({
  args: {
    userId: v.string(),
    userRole: v.string(), // "vendor" or "supplier"
    queryType: v.string(), // "search", "filter", "general", "image_description"
    queryText: v.string(),
    language: v.string(),
    englishText: v.string(),
    confidence: v.number(),
    searchResults: v.optional(v.object({
      items: v.array(v.string()),
      suppliers: v.array(v.string()),
      filters: v.object({
        location: v.optional(v.string()),
        priceRange: v.optional(v.object({
          min: v.number(),
          max: v.number()
        })),
        categories: v.optional(v.array(v.string())),
        deliveryTime: v.optional(v.string()),
        quality: v.optional(v.string()),
        fssaiRequired: v.optional(v.boolean())
      })
    })),
    appliedFilters: v.optional(v.object({
      location: v.optional(v.string()),
      priceRange: v.optional(v.object({
        min: v.number(),
        max: v.number()
      })),
      categories: v.optional(v.array(v.string())),
      deliveryTime: v.optional(v.string()),
      quality: v.optional(v.string()),
      fssaiRequired: v.optional(v.boolean())
    })),
    imageId: v.optional(v.string()),
    identifiedItems: v.optional(v.array(v.string())),
    response: v.string(),
    responseLanguage: v.string(),
    processingTime: v.number(),
    audioDuration: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const voiceQueryId = await ctx.db.insert("voiceQueries", {
      userId: args.userId,
      userRole: args.userRole,
      queryType: args.queryType,
      queryText: args.queryText,
      language: args.language,
      englishText: args.englishText,
      confidence: args.confidence,
      searchResults: args.searchResults,
      appliedFilters: args.appliedFilters,
      imageId: args.imageId,
      identifiedItems: args.identifiedItems,
      response: args.response,
      responseLanguage: args.responseLanguage,
      processingTime: args.processingTime,
      audioDuration: args.audioDuration,
      createdAt: Date.now()
    });

    return voiceQueryId;
  }
});

// Store image analysis results
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

// Update image analysis with user feedback
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
  }
});

// Get or create voice preferences
export const getVoicePreferences = query({
  args: {
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query("voicePreferences")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!preferences) {
      // Return default preferences
      return {
        userId: args.userId,
        preferredLanguage: "en",
        voiceSpeed: 1.0,
        autoTranslate: true,
        voiceShortcuts: {},
        filterPresets: {},
        privacySettings: {
          storeAudio: false,
          shareForImprovement: false,
          retentionDays: 30
        }
      };
    }

    return preferences;
  }
});

// Update voice preferences
export const updateVoicePreferences = mutation({
  args: {
    userId: v.string(),
    preferredLanguage: v.optional(v.string()),
    voiceSpeed: v.optional(v.number()),
    autoTranslate: v.optional(v.boolean()),
    voiceShortcuts: v.optional(v.object({})),
    filterPresets: v.optional(v.object({})),
    privacySettings: v.optional(v.object({
      storeAudio: v.boolean(),
      shareForImprovement: v.boolean(),
      retentionDays: v.number()
    }))
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("voicePreferences")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    const updateData = {
      userId: args.userId,
      preferredLanguage: args.preferredLanguage || existing?.preferredLanguage || "en",
      voiceSpeed: args.voiceSpeed || existing?.voiceSpeed || 1.0,
      autoTranslate: args.autoTranslate ?? existing?.autoTranslate ?? true,
      voiceShortcuts: args.voiceShortcuts || existing?.voiceShortcuts || {},
      filterPresets: args.filterPresets || existing?.filterPresets || {},
      privacySettings: args.privacySettings || existing?.privacySettings || {
        storeAudio: false,
        shareForImprovement: false,
        retentionDays: 30
      },
      updatedAt: Date.now()
    };

    if (existing) {
      await ctx.db.patch(existing._id, updateData);
      return existing._id;
    } else {
      const newId = await ctx.db.insert("voicePreferences", {
        ...updateData,
        createdAt: Date.now()
      });
      return newId;
    }
  }
});

// Update voice learning data
export const updateVoiceLearningData = mutation({
  args: {
    userId: v.string(),
    language: v.string(),
    phrase: v.optional(v.string()),
    context: v.optional(v.string()),
    correction: v.optional(v.object({
      original: v.string(),
      corrected: v.string()
    })),
    vocabularyPreference: v.optional(v.object({
      term: v.string(),
      preferredTranslation: v.string(),
      category: v.string()
    }))
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("voiceLearningData")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.eq(q.field("language"), args.language))
      .first();

    if (existing) {
      const updates: any = { updatedAt: Date.now() };

      if (args.phrase && args.context) {
        const existingPhrase = existing.commonPhrases.find(p => p.phrase === args.phrase);
        if (existingPhrase) {
          existingPhrase.frequency += 1;
          existingPhrase.lastUsed = Date.now();
        } else {
          existing.commonPhrases.push({
            phrase: args.phrase,
            frequency: 1,
            context: args.context,
            lastUsed: Date.now()
          });
        }
        updates.commonPhrases = existing.commonPhrases;
      }

      if (args.correction) {
        existing.correctionHistory.push({
          original: args.correction.original,
          corrected: args.correction.corrected,
          timestamp: Date.now()
        });
        updates.correctionHistory = existing.correctionHistory;
      }

      if (args.vocabularyPreference) {
        const existingVocab = existing.vocabularyPreferences.find(
          v => v.term === args.vocabularyPreference!.term
        );
        if (existingVocab) {
          existingVocab.preferredTranslation = args.vocabularyPreference.preferredTranslation;
        } else {
          existing.vocabularyPreferences.push(args.vocabularyPreference);
        }
        updates.vocabularyPreferences = existing.vocabularyPreferences;
      }

      await ctx.db.patch(existing._id, updates);
      return existing._id;
    } else {
      const newData = {
        userId: args.userId,
        language: args.language,
        commonPhrases: args.phrase && args.context ? [{
          phrase: args.phrase,
          frequency: 1,
          context: args.context,
          lastUsed: Date.now()
        }] : [],
        vocabularyPreferences: args.vocabularyPreference ? [args.vocabularyPreference] : [],
        correctionHistory: args.correction ? [{
          original: args.correction.original,
          corrected: args.correction.corrected,
          timestamp: Date.now()
        }] : [],
        updatedAt: Date.now()
      };

      const newId = await ctx.db.insert("voiceLearningData", newData);
      return newId;
    }
  }
});

// Get image analysis history
export const getImageAnalysisHistory = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    // For now, allow access without authentication for demo purposes
    // In production, you would check: const identity = await ctx.auth.getUserIdentity();
    // if (!identity) throw new Error("Unauthorized");

    const results = await ctx.db
      .query("imageAnalysis")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .order("desc")
      .take(args.limit || 20);

    return results;
  }
});

// Search suppliers based on voice/image analysis
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
      }))
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
    const relevantSuppliers = [];
    for (const supplier of suppliers) {
      const inventory = await ctx.db
        .query("inventory")
        .filter((q) => q.eq(q.field("supplierId"), supplier._id))
        .filter((q) => q.eq(q.field("isAvailable"), true))
        .collect();

      const matchingItems = inventory.filter(item => 
        args.ingredients.some(ingredient => 
          item.itemName.toLowerCase().includes(ingredient.toLowerCase()) ||
          ingredient.toLowerCase().includes(item.itemName.toLowerCase())
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

        if (validItems.length > 0) {
          relevantSuppliers.push({
            supplier,
            matchingItems: validItems,
            matchScore: validItems.length / args.ingredients.length
          });
        }
      }
    }

    // Sort by match score and trust score
    relevantSuppliers.sort((a, b) => {
      const scoreA = a.matchScore * 0.7 + (a.supplier.trustScore / 5) * 0.3;
      const scoreB = b.matchScore * 0.7 + (b.supplier.trustScore / 5) * 0.3;
      return scoreB - scoreA;
    });

    return relevantSuppliers.slice(0, 10); // Return top 10 matches
  }
});

// Process voice query (simplified for demo)
export const processVoiceQuery = mutation({
  args: {
    audio: v.array(v.number()), // Audio data as array of numbers
    userRole: v.string(), // "vendor" or "supplier"
    userId: v.string()
  },
  handler: async (ctx, args) => {
    // Simulate processing delay for asynchronous speech pipeline.
    await new Promise(resolve => setTimeout(resolve, 1500));

    const derived = deriveVoiceIntent(args.audio, args.userRole);

    await ctx.db.insert("voiceQueries", {
      userId: args.userId,
      userRole: args.userRole,
      queryType: derived.queryType,
      queryText: derived.originalText,
      language: derived.language,
      englishText: derived.answer,
      confidence: derived.confidence,
      response: derived.answer,
      responseLanguage: "en",
      processingTime: 1500,
      audioDuration: args.audio.length / 44100 * 1000, // Approximate duration
      createdAt: Date.now()
    });

    return {
      answer: derived.answer,
      originalText: derived.originalText,
      language: derived.language,
      queryType: derived.queryType,
      confidence: derived.confidence,
    };
  },
});

function deriveVoiceIntent(audio: number[], userRole: string) {
  const keywordCatalog = [
    { key: "search", originalText: "Find suppliers for vegetables", language: "en", queryType: "search" },
    { key: "filters", originalText: "Show certified suppliers within 5km", language: "en", queryType: "filter" },
    { key: "orders", originalText: userRole === "supplier" ? "Show new incoming orders" : "Show my active orders", language: "en", queryType: "general" },
    { key: "analytics", originalText: userRole === "supplier" ? "How is my inventory performing" : "How is my sourcing spend this month", language: "en", queryType: "general" },
  ] as const;

  const deterministicIndex = audio.length % keywordCatalog.length;
  const selected = keywordCatalog[deterministicIndex];
  const normalizedText = selected.originalText.toLowerCase();

  let answer = "";
  if (selected.queryType === "search") {
    answer = "Searching supplier inventory for requested ingredients. Open the supplier list to compare price and trust score.";
  } else if (selected.queryType === "filter") {
    answer = "Applied filter intent for certification and proximity. Add price range in your next command for narrower results.";
  } else if (userRole === "supplier" && (normalizedText.includes("order") || normalizedText.includes("inventory"))) {
    answer = "Use your Orders and Products tabs to review demand and update stock in real time.";
  } else {
    answer = "Use dashboard tabs to manage orders, inventory, analytics, and profile settings.";
  }

  return {
    queryType: selected.queryType,
    originalText: selected.originalText,
    language: selected.language,
    answer,
    confidence: 0.82,
  };
}

// Get voice query history
export const getVoiceQueryHistory = query({
  args: {
    userId: v.optional(v.string()),
    userRole: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    // For now, allow access without authentication for demo purposes
    // In production, you would check: const identity = await ctx.auth.getUserIdentity();
    // if (!identity) throw new Error("Unauthorized");

    let query = ctx.db.query("voiceQueries");

    if (args.userId) {
      query = query.filter((q) => q.eq(q.field("userId"), args.userId));
    }

    if (args.userRole) {
      query = query.filter((q) => q.eq(q.field("userRole"), args.userRole));
    }

    const results = await query
      .order("desc")
      .take(args.limit || 20);

    return results;
  },
});

// Get voice query statistics
export const getVoiceQueryStats = query({
  args: {
    userId: v.optional(v.string()),
    userRole: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // For now, allow access without authentication for demo purposes
    // In production, you would check: const identity = await ctx.auth.getUserIdentity();
    // if (!identity) throw new Error("Unauthorized");

    let query = ctx.db.query("voiceQueries");
    
    if (args.userId) {
      query = query.filter((q) => q.eq(q.field("userId"), args.userId));
    }
    
    if (args.userRole) {
      query = query.filter((q) => q.eq(q.field("userRole"), args.userRole));
    }
    
    const queries = await query.collect();
    
    const totalQueries = queries.length;
    const avgConfidence = queries.length > 0 
      ? queries.reduce((sum, q) => sum + q.confidence, 0) / queries.length 
      : 0;
    const avgProcessingTime = queries.length > 0
      ? queries.reduce((sum, q) => sum + q.processingTime, 0) / queries.length
      : 0;
    
    // Language distribution
    const languageStats = queries.reduce((acc, q) => {
      acc[q.language] = (acc[q.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Query type distribution
    const queryTypeStats = queries.reduce((acc, q) => {
      acc[q.queryType] = (acc[q.queryType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalQueries,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      avgProcessingTime: Math.round(avgProcessingTime),
      languageStats,
      queryTypeStats,
      recentQueries: queries.slice(0, 5)
    };
  },
});
