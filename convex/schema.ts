import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Vendors table (enhanced)
  vendors: defineTable({
    userId: v.string(), // Clerk user ID
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
    isVerified: v.boolean(),
    trustScore: v.number(),
    preferences: v.object({
      maxDeliveryDistance: v.number(),
      preferredCategories: v.array(v.string()),
      budgetRange: v.object({
        min: v.number(),
        max: v.number()
      }),
      qualityPreference: v.string(),
      deliveryTimePreference: v.string()
    }),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_user", ["userId"])
    .index("by_city", ["location.city"])
    .index("by_trust_score", ["trustScore"]),

  // Suppliers table (enhanced)
  suppliers: defineTable({
    userId: v.string(), // Clerk user ID
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
    fssaiVerificationStatus: v.optional(v.string()), // "pending", "verified", "rejected", "expired", "invalid"
    fssaiVerificationDate: v.optional(v.number()),
    fssaiCertificateData: v.optional(v.object({
      licenseNumber: v.string(),
      businessName: v.string(),
      ownerName: v.string(),
      address: v.string(),
      validityDate: v.string(),
      category: v.string(),
      confidence: v.number()
    })),
    fssaiVerificationError: v.optional(v.string()),
    isVerified: v.boolean(),
    trustScore: v.number(),
    businessHours: v.object({
      open: v.string(),
      close: v.string(),
      days: v.array(v.string())
    }),
    deliveryRadius: v.number(),
    minimumOrder: v.number(),
    forecasts: v.optional(v.array(v.object({
      item: v.string(),
      predictedQty: v.number(),
      confidence: v.number(),
      forecastDate: v.number(),
      reason: v.optional(v.string())
    }))),
    lastForecastUpdate: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_user", ["userId"])
    .index("by_city", ["location.city"])
    .index("by_category", ["categories"])
    .index("by_trust_score", ["trustScore"]),

  // Inventory table
  inventory: defineTable({
    supplierId: v.id("suppliers"),
    itemName: v.string(),
    category: v.string(),
    currentStock: v.number(),
    unit: v.string(),
    pricePerUnit: v.number(),
    minimumOrder: v.number(),
    quality: v.string(),
    expiryDate: v.optional(v.number()),
    lastUpdated: v.number(),
    isAvailable: v.boolean()
  }).index("by_supplier", ["supplierId"])
    .index("by_category", ["category"])
    .index("by_item", ["itemName"])
    .index("by_availability", ["isAvailable"]),

  // Orders table (enhanced)
  orders: defineTable({
    vendorId: v.id("vendors"),
    supplierId: v.id("suppliers"),
    items: v.array(v.object({
      itemName: v.string(),
      quantity: v.number(),
      unit: v.string(),
      pricePerUnit: v.number(),
      totalPrice: v.number()
    })),
    totalCost: v.number(),
    status: v.string(), // "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"
    orderType: v.string(), // "individual", "group"
    groupOrderId: v.optional(v.id("groupOrders")),
    deliveryAddress: v.string(),
    estimatedDelivery: v.number(),
    actualDelivery: v.optional(v.number()),
    paymentStatus: v.string(), // "pending", "paid", "failed", "refunded"
    paymentMethod: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_vendor", ["vendorId"])
    .index("by_supplier", ["supplierId"])
    .index("by_status", ["status"])
    .index("by_payment_status", ["paymentStatus"]),

  // Group Orders table
  groupOrders: defineTable({
    initiatorId: v.id("vendors"),
    itemName: v.string(),
    category: v.string(),
    targetQuantity: v.number(),
    currentQuantity: v.number(),
    pricePerUnit: v.number(),
    participants: v.array(v.object({
      vendorId: v.id("vendors"),
      quantity: v.number(),
      joinedAt: v.number()
    })),
    supplierId: v.id("suppliers"),
    status: v.string(), // "open", "locked", "completed", "cancelled"
    location: v.string(),
    expiresAt: v.number(),
    createdAt: v.number()
  }).index("by_initiator", ["initiatorId"])
    .index("by_supplier", ["supplierId"])
    .index("by_status", ["status"])
    .index("by_location", ["location"])
    .index("by_category", ["category"]),

  // Ratings table
  ratings: defineTable({
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
    }),
    createdAt: v.number()
  }).index("by_vendor", ["vendorId"])
    .index("by_supplier", ["supplierId"])
    .index("by_order", ["orderId"])
    .index("by_rating", ["rating"]),

  // Messages table
  messages: defineTable({
    senderId: v.string(), // Clerk user ID
    receiverId: v.string(), // Clerk user ID
    senderType: v.string(), // "vendor" or "supplier"
    receiverType: v.string(), // "vendor" or "supplier"
    content: v.string(),
    messageType: v.string(), // "text", "order_inquiry", "support"
    orderId: v.optional(v.id("orders")),
    isRead: v.boolean(),
    createdAt: v.number()
  }).index("by_sender", ["senderId"])
    .index("by_receiver", ["receiverId"])
    .index("by_conversation", ["senderId", "receiverId"])
    .index("by_order", ["orderId"]),

  // AI Recommendations table
  recommendations: defineTable({
    vendorId: v.id("vendors"),
    supplierId: v.id("suppliers"),
    score: v.number(), // 0-1 recommendation strength
    reasons: v.array(v.string()),
    itemCategories: v.array(v.string()),
    priceAdvantage: v.optional(v.number()),
    trustFactor: v.number(),
    locationScore: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    expiresAt: v.number()
  }).index("by_vendor", ["vendorId"])
    .index("by_supplier", ["supplierId"])
    .index("by_score", ["score"])
    .index("by_active", ["isActive"]),

  // Price Alerts table
  priceAlerts: defineTable({
    vendorId: v.id("vendors"),
    itemName: v.string(),
    targetPrice: v.number(),
    currentPrice: v.number(),
    supplierId: v.optional(v.id("suppliers")),
    isActive: v.boolean(),
    lastTriggered: v.optional(v.number()),
    createdAt: v.number()
  }).index("by_vendor", ["vendorId"])
    .index("by_item", ["itemName"])
    .index("by_active", ["isActive"]),

  // Financial Analytics table
  financialRecords: defineTable({
    vendorId: v.id("vendors"),
    orderId: v.id("orders"),
    amount: v.number(),
    category: v.string(),
    itemName: v.string(),
    supplierId: v.id("suppliers"),
    date: v.number(),
    month: v.string(), // "2024-01" format
    year: v.number()
  }).index("by_vendor", ["vendorId"])
    .index("by_month", ["month"])
    .index("by_year", ["year"])
    .index("by_category", ["category"]),

  // Recommendation Feedback table
  recommendationFeedback: defineTable({
    recommendationId: v.id("recommendations"),
    vendorId: v.id("vendors"),
    supplierId: v.id("suppliers"),
    feedback: v.string(), // "helpful", "not_helpful", "contacted", "ordered"
    notes: v.optional(v.string()),
    recommendationScore: v.number(),
    createdAt: v.number()
  }).index("by_recommendation", ["recommendationId"])
    .index("by_vendor", ["vendorId"])
    .index("by_supplier", ["supplierId"])
    .index("by_feedback", ["feedback"]),

  // Demand Requests table
  requests: defineTable({
    vendorId: v.id("vendors"),
    itemName: v.string(),
    quantity: v.number(),
    unit: v.string(),
    priceMin: v.optional(v.number()),
    priceMax: v.optional(v.number()),
    urgency: v.string(), // "low", "medium", "high"
    location: v.string(),
    notes: v.optional(v.string()),
    requireFssai: v.optional(v.boolean()),
    status: v.string(), // "open", "responded", "fulfilled", "closed"
    responses: v.array(v.object({
      supplierId: v.id("suppliers"),
      quote: v.optional(v.number()),
      message: v.optional(v.string()),
      respondedAt: v.number()
    })),
    createdAt: v.number()
  }).index("by_vendor", ["vendorId"])
    .index("by_status", ["status"])
    .index("by_item", ["itemName"])
    .index("by_location", ["location"])
    .index("by_urgency", ["urgency"]),

  // Notifications table
  notifications: defineTable({
    userId: v.string(), // Clerk user ID
    userType: v.string(), // "vendor", "supplier", "support"
    type: v.string(), // "order_update", "message", "price_alert", "group_order", "system"
    title: v.string(),
    message: v.string(),
    data: v.optional(v.object({
      orderId: v.optional(v.id("orders")),
      messageId: v.optional(v.id("messages")),
      supplierId: v.optional(v.id("suppliers")),
      vendorId: v.optional(v.id("vendors")),
      groupOrderId: v.optional(v.id("groupOrders")),
    })),
    isRead: v.boolean(),
    priority: v.string(), // "low", "medium", "high", "urgent"
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_type", ["type"])
    .index("by_read", ["isRead"])
    .index("by_priority", ["priority"])
    .index("by_created", ["createdAt"]),

  // Support Tickets table
  supportTickets: defineTable({
    userId: v.string(), // Clerk user ID
    userType: v.string(), // "vendor" or "supplier"
    subject: v.string(),
    description: v.string(),
    category: v.string(), // "technical", "billing", "dispute", "general"
    priority: v.string(), // "low", "medium", "high", "urgent"
    status: v.string(), // "open", "in_progress", "resolved", "closed"
    assignedTo: v.optional(v.string()), // Support agent ID
    orderId: v.optional(v.id("orders")),
    attachments: v.optional(v.array(v.string())), // File URLs
    createdAt: v.number(),
    updatedAt: v.number(),
    resolvedAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_category", ["category"])
    .index("by_assigned", ["assignedTo"]),

  // Support Messages table
  supportMessages: defineTable({
    ticketId: v.id("supportTickets"),
    senderId: v.string(), // Clerk user ID or support agent ID
    senderType: v.string(), // "user" or "support"
    content: v.string(),
    attachments: v.optional(v.array(v.string())), // File URLs
    isInternal: v.boolean(), // Internal notes for support team
    createdAt: v.number(),
  }).index("by_ticket", ["ticketId"])
    .index("by_sender", ["senderId"])
    .index("by_created", ["createdAt"]),

  // Disputes table
  disputes: defineTable({
    orderId: v.id("orders"),
    initiatorId: v.string(), // Clerk user ID
    initiatorType: v.string(), // "vendor" or "supplier"
    respondentId: v.string(), // Clerk user ID
    respondentType: v.string(), // "vendor" or "supplier"
    category: v.string(), // "quality", "delivery", "payment", "communication", "other"
    description: v.string(),
    evidence: v.optional(v.array(v.string())), // File URLs
    status: v.string(), // "open", "under_review", "mediation", "resolved", "closed"
    resolution: v.optional(v.string()),
    mediatorId: v.optional(v.string()), // Support agent ID
    createdAt: v.number(),
    updatedAt: v.number(),
    resolvedAt: v.optional(v.number()),
  }).index("by_order", ["orderId"])
    .index("by_initiator", ["initiatorId"])
    .index("by_respondent", ["respondentId"])
    .index("by_status", ["status"])
    .index("by_category", ["category"]),

  // Enhanced Voice Queries table
  voiceQueries: defineTable({
    userId: v.string(), // Clerk user ID
    userRole: v.string(), // "vendor" or "supplier"
    queryType: v.string(), // "search", "filter", "general", "image_description"
    queryText: v.string(), // Original transcribed text
    language: v.string(), // Detected language code
    englishText: v.string(), // Translated to English
    confidence: v.number(), // Speech recognition confidence
    
    // Search-specific fields
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
    
    // Filter-specific fields
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
    
    // Image-related fields
    imageId: v.optional(v.string()),
    identifiedItems: v.optional(v.array(v.string())),
    
    response: v.string(), // AI response
    responseLanguage: v.string(), // Response language
    processingTime: v.number(), // Processing time in ms
    audioDuration: v.optional(v.number()), // Recording duration in ms
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_role", ["userRole"])
    .index("by_language", ["language"])
    .index("by_query_type", ["queryType"])
    .index("by_created", ["createdAt"]),

  // Image Analysis table
  imageAnalysis: defineTable({
    userId: v.string(),
    imageUrl: v.string(),
    imageHash: v.string(), // For duplicate detection
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
    })),
    userFeedback: v.optional(v.object({
      correctIdentification: v.boolean(),
      actualItems: v.optional(v.array(v.string())),
      rating: v.number(),
      comments: v.optional(v.string())
    })),
    createdAt: v.number()
  }).index("by_user", ["userId"])
    .index("by_hash", ["imageHash"])
    .index("by_created", ["createdAt"]),

  // Voice Preferences table
  voicePreferences: defineTable({
    userId: v.string(),
    preferredLanguage: v.string(),
    voiceSpeed: v.number(), // For TTS
    autoTranslate: v.boolean(),
    voiceShortcuts: v.object({}), // Dynamic key-value pairs for custom commands
    filterPresets: v.object({}), // Named filter configurations
    privacySettings: v.object({
      storeAudio: v.boolean(),
      shareForImprovement: v.boolean(),
      retentionDays: v.number()
    }),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_user", ["userId"]),

  // Voice Learning Data table (for improving recognition)
  voiceLearningData: defineTable({
    userId: v.string(),
    language: v.string(),
    commonPhrases: v.array(v.object({
      phrase: v.string(),
      frequency: v.number(),
      context: v.string(),
      lastUsed: v.number()
    })),
    vocabularyPreferences: v.array(v.object({
      term: v.string(),
      preferredTranslation: v.string(),
      category: v.string()
    })),
    correctionHistory: v.array(v.object({
      original: v.string(),
      corrected: v.string(),
      timestamp: v.number()
    })),
    updatedAt: v.number()
  }).index("by_user", ["userId"])
    .index("by_language", ["language"]),
});