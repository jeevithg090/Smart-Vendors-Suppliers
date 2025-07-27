import { mutation, query, internalMutation } from "./_generated/server";
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

// AI-Powered Inventory Forecasting
export const generateInventoryForecast = internalMutation({
  handler: async (ctx) => {
    const suppliers = await ctx.db.query("suppliers").collect();
    
    for (const supplier of suppliers) {
      try {
        // Get recent orders for this supplier (last 30 days)
        const recentOrders = await ctx.db.query("orders")
          .filter((q) => q.eq(q.field("supplierId"), supplier._id))
          .filter((q) => q.gt(q.field("createdAt"), Date.now() - 30 * 24 * 60 * 60 * 1000))
          .collect();

        // Get supplier's inventory
        const inventory = await ctx.db.query("inventory")
          .filter((q) => q.eq(q.field("supplierId"), supplier._id))
          .collect();

        if (recentOrders.length === 0 || inventory.length === 0) {
          continue; // Skip suppliers with no orders or inventory
        }

        // Prepare data for AI analysis
        const orderData = recentOrders.map(order => ({
          items: order.items,
          createdAt: order.createdAt,
          totalCost: order.totalCost
        }));

        const inventoryData = inventory.map(item => ({
          itemName: item.itemName,
          category: item.category,
          currentStock: item.currentStock,
          unit: item.unit,
          pricePerUnit: item.pricePerUnit
        }));

        // Create AI prompt for forecasting with Indian context
        const prompt = `Analyze this order and inventory data for inventory forecasting in the Indian market:f

Order History (Last 30 days):
${JSON.stringify(orderData, null, 2)}

Current Inventory:
${JSON.stringify(inventoryData, null, 2)}

Business Context:
- Supplier: ${supplier.businessName}
- Categories: ${supplier.categories.join(', ')}
- Location: ${supplier.location.city}, ${supplier.location.state}
- FSSAI Certified: ${supplier.fssaiCertified}

Indian Market Context to Consider:
1. **Festivals & Seasons**: Diwali, Holi, Raksha Bandhan, Navratri, Eid, Christmas, Makar Sankranti, Pongal, Onam, etc.
2. **Weather Patterns**: Monsoon season (June-September), Summer (March-June), Winter (November-February)
3. **Street Food Demand**: Higher during festivals, weekends, and tourist seasons
4. **Regional Preferences**: Different states have varying food preferences and festivals
5. **FSSAI Compliance**: Certified suppliers often have higher demand during festivals
6. **Local Events**: Weddings, local fairs, temple festivals, school/college events

Current Date Context: ${new Date().toLocaleDateString('en-IN')}

Predict demand for the next 7 days for each inventory item. Consider:
1. Historical order patterns from the data
2. Upcoming Indian festivals and seasonal factors
3. Weather impact on ingredient demand
4. Current stock levels and minimum order requirements
5. Regional food preferences based on location
6. FSSAI certification impact on demand

Output as JSON array:
[{
  "item": "item name",
  "predictedQty": number (predicted demand in units),
  "confidence": number (0-1, confidence in prediction),
  "reason": "brief explanation considering Indian market factors"
}]

Focus on Indian market accuracy and practical recommendations for street food vendors.`;

        // Call OpenRouter API with fallback models
        const models = [
          'openai/gpt-4o-mini',
          'anthropic/claude-3-haiku',
          'meta-llama/llama-3.1-8b-instruct',
          'google/gemini-flash-1.5'
        ];

        let forecast = null;
        let lastError = null;

        for (const model of models) {
          try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer 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`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://smart-vendors-suppliers.vercel.app',
                'X-Title': 'Smart Vendors Suppliers'
              },
              body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                temperature: 0.3
              })
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.choices && data.choices[0] && data.choices[0].message) {
              const content = data.choices[0].message.content;
              
              // Try to parse JSON from the response
              const jsonMatch = content.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                forecast = JSON.parse(jsonMatch[0]);
                break; // Success, exit the model loop
              }
            }
          } catch (error) {
            lastError = error;
            console.error(`Failed with model ${model}:`, error);
            continue; // Try next model
          }
        }

        // If all models failed, create a basic forecast based on recent orders with Indian market context
        if (!forecast) {
          console.warn(`All AI models failed for supplier ${supplier._id}, using fallback forecast with Indian market context`);
          
          const currentDate = new Date();
          const currentMonth = currentDate.getMonth() + 1; // 1-12
          const currentDay = currentDate.getDate();
          
          // Indian festival and seasonal adjustments
          const getSeasonalMultiplier = (itemName: string, month: number) => {
            const itemLower = itemName.toLowerCase();
            
            // Festival season adjustments (October-December)
            if (month >= 10 && month <= 12) {
              if (itemLower.includes('sugar') || itemLower.includes('ghee') || itemLower.includes('dry fruits')) return 1.5; // Diwali sweets
              if (itemLower.includes('spices') || itemLower.includes('masala')) return 1.3; // Festival cooking
            }
            
            // Summer adjustments (March-June)
            if (month >= 3 && month <= 6) {
              if (itemLower.includes('coconut') || itemLower.includes('curd') || itemLower.includes('mint')) return 1.4; // Summer cooling foods
              if (itemLower.includes('onion') || itemLower.includes('tomato')) return 1.2; // Summer vegetables
            }
            
            // Monsoon adjustments (June-September)
            if (month >= 6 && month <= 9) {
              if (itemLower.includes('ginger') || itemLower.includes('garlic') || itemLower.includes('turmeric')) return 1.3; // Immunity boosters
            }
            
            return 1.0; // Default multiplier
          };
          
          forecast = inventoryData.map(item => {
            // Find recent orders for this item
            const itemOrders = orderData.filter(order => 
              order.items.some(orderItem => 
                orderItem.itemName.toLowerCase().includes(item.itemName.toLowerCase())
              )
            );
            
            const avgDailyDemand = itemOrders.length > 0 
              ? itemOrders.reduce((sum, order) => {
                  const orderItem = order.items.find(oi => 
                    oi.itemName.toLowerCase().includes(item.itemName.toLowerCase())
                  );
                  return sum + (orderItem?.quantity || 0);
                }, 0) / 30 // Average over 30 days
              : 0;
            
            // Apply seasonal multiplier for Indian market
            const seasonalMultiplier = getSeasonalMultiplier(item.itemName, currentMonth);
            const basePredictedQty = avgDailyDemand * 7 * seasonalMultiplier;
            const predictedQty = Math.max(basePredictedQty, 1); // 7-day forecast, minimum 1
            
            const confidence = itemOrders.length > 0 ? 0.6 : 0.3; // Lower confidence for items with no recent orders
            
            // Enhanced reasoning with Indian context
            let reason = '';
            if (itemOrders.length > 0) {
              reason = `Based on ${itemOrders.length} recent orders averaging ${avgDailyDemand.toFixed(2)} units/day`;
              if (seasonalMultiplier > 1.0) {
                reason += ` with ${Math.round((seasonalMultiplier - 1) * 100)}% seasonal increase`;
              }
            } else {
              reason = 'Limited historical data available';
            }
            
            // Add FSSAI certification benefit
            if (supplier.fssaiCertified) {
              reason += '. FSSAI certified supplier may see higher demand.';
            }
            
            return {
              item: item.itemName,
              predictedQty: Math.round(predictedQty * 100) / 100,
              confidence: Math.round(confidence * 100) / 100,
              reason: reason
            };
          });
        }

        // Add forecast date to each prediction
        const forecastWithDate = forecast!.map(f => ({
          ...f,
          forecastDate: Date.now()
        }));

        // Update supplier with forecasts
        await ctx.db.patch(supplier._id, {
          forecasts: forecastWithDate,
          lastForecastUpdate: Date.now()
        });

        console.log(`Generated forecast for supplier ${supplier.businessName}:`, forecastWithDate.length, 'items');

      } catch (error) {
        console.error(`Error generating forecast for supplier ${supplier._id}:`, error);
        // Continue with next supplier even if one fails
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

// Manual forecast generation for a specific supplier
export const generateForecastForSupplier = mutation({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) {
      throw new Error("Supplier not found");
    }

    // Get recent orders for this supplier (last 30 days)
    const recentOrders = await ctx.db.query("orders")
      .filter((q) => q.eq(q.field("supplierId"), args.supplierId))
      .filter((q) => q.gt(q.field("createdAt"), Date.now() - 30 * 24 * 60 * 60 * 1000))
      .collect();

    // Get supplier's inventory
    const inventory = await ctx.db.query("inventory")
      .filter((q) => q.eq(q.field("supplierId"), args.supplierId))
      .collect();

    if (recentOrders.length === 0 || inventory.length === 0) {
      throw new Error("Insufficient data for forecasting");
    }

    // Prepare data for AI analysis
    const orderData = recentOrders.map(order => ({
      items: order.items,
      createdAt: order.createdAt,
      totalCost: order.totalCost
    }));

    const inventoryData = inventory.map(item => ({
      itemName: item.itemName,
      category: item.category,
      currentStock: item.currentStock,
      unit: item.unit,
      pricePerUnit: item.pricePerUnit
    }));

    // Create AI prompt for forecasting with Indian context
    const prompt = `Analyze this order and inventory data for inventory forecasting in the Indian market:

Order History (Last 30 days):
${JSON.stringify(orderData, null, 2)}

Current Inventory:
${JSON.stringify(inventoryData, null, 2)}

Business Context:
- Supplier: ${supplier.businessName}
- Categories: ${supplier.categories.join(', ')}
- Location: ${supplier.location.city}, ${supplier.location.state}
- FSSAI Certified: ${supplier.fssaiCertified}

Indian Market Context to Consider:
1. **Festivals & Seasons**: Diwali, Holi, Raksha Bandhan, Navratri, Eid, Christmas, Makar Sankranti, Pongal, Onam, etc.
2. **Weather Patterns**: Monsoon season (June-September), Summer (March-June), Winter (November-February)
3. **Street Food Demand**: Higher during festivals, weekends, and tourist seasons
4. **Regional Preferences**: Different states have varying food preferences and festivals
5. **FSSAI Compliance**: Certified suppliers often have higher demand during festivals
6. **Local Events**: Weddings, local fairs, temple festivals, school/college events

Current Date Context: ${new Date().toLocaleDateString('en-IN')}

Predict demand for the next 7 days for each inventory item. Consider:
1. Historical order patterns from the data
2. Upcoming Indian festivals and seasonal factors
3. Weather impact on ingredient demand
4. Current stock levels and minimum order requirements
5. Regional food preferences based on location
6. FSSAI certification impact on demand

Output as JSON array:
[{
  "item": "item name",
  "predictedQty": number (predicted demand in units),
  "confidence": number (0-1, confidence in prediction),
  "reason": "brief explanation considering Indian market factors"
}]

Focus on Indian market accuracy and practical recommendations for street food vendors.`;

    // Call OpenRouter API with fallback models
    const models = [
      'openai/gpt-4o-mini',
      'anthropic/claude-3-haiku',
      'meta-llama/llama-3.1-8b-instruct',
      'google/gemini-flash-1.5'
    ];

    let forecast = null;
    let lastError = null;

    for (const model of models) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer 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`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://smart-vendors-suppliers.vercel.app',
            'X-Title': 'Smart Vendors Suppliers'
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000,
            temperature: 0.3
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
          const content = data.choices[0].message.content;
          
          // Try to parse JSON from the response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            forecast = JSON.parse(jsonMatch[0]);
            break; // Success, exit the model loop
          }
        }
      } catch (error) {
        lastError = error;
        console.error(`Failed with model ${model}:`, error);
        continue; // Try next model
      }
    }

    // If all models failed, create a basic forecast based on recent orders with Indian market context
    if (!forecast) {
      console.warn(`All AI models failed for supplier ${args.supplierId}, using fallback forecast with Indian market context`);
      
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // 1-12
      
      // Indian festival and seasonal adjustments
      const getSeasonalMultiplier = (itemName: string, month: number) => {
        const itemLower = itemName.toLowerCase();
        
        // Festival season adjustments (October-December)
        if (month >= 10 && month <= 12) {
          if (itemLower.includes('sugar') || itemLower.includes('ghee') || itemLower.includes('dry fruits')) return 1.5; // Diwali sweets
          if (itemLower.includes('spices') || itemLower.includes('masala')) return 1.3; // Festival cooking
        }
        
        // Summer adjustments (March-June)
        if (month >= 3 && month <= 6) {
          if (itemLower.includes('coconut') || itemLower.includes('curd') || itemLower.includes('mint')) return 1.4; // Summer cooling foods
          if (itemLower.includes('onion') || itemLower.includes('tomato')) return 1.2; // Summer vegetables
        }
        
        // Monsoon adjustments (June-September)
        if (month >= 6 && month <= 9) {
          if (itemLower.includes('ginger') || itemLower.includes('garlic') || itemLower.includes('turmeric')) return 1.3; // Immunity boosters
        }
        
        return 1.0; // Default multiplier
      };
      
      forecast = inventoryData.map(item => {
        // Find recent orders for this item
        const itemOrders = orderData.filter(order => 
          order.items.some(orderItem => 
            orderItem.itemName.toLowerCase().includes(item.itemName.toLowerCase())
          )
        );
        
        const avgDailyDemand = itemOrders.length > 0 
          ? itemOrders.reduce((sum, order) => {
              const orderItem = order.items.find(oi => 
                oi.itemName.toLowerCase().includes(item.itemName.toLowerCase())
              );
              return sum + (orderItem?.quantity || 0);
            }, 0) / 30 // Average over 30 days
          : 0;
        
        // Apply seasonal multiplier for Indian market
        const seasonalMultiplier = getSeasonalMultiplier(item.itemName, currentMonth);
        const basePredictedQty = avgDailyDemand * 7 * seasonalMultiplier;
        const predictedQty = Math.max(basePredictedQty, 1); // 7-day forecast, minimum 1
        
        const confidence = itemOrders.length > 0 ? 0.6 : 0.3; // Lower confidence for items with no recent orders
        
        // Enhanced reasoning with Indian context
        let reason = '';
        if (itemOrders.length > 0) {
          reason = `Based on ${itemOrders.length} recent orders averaging ${avgDailyDemand.toFixed(2)} units/day`;
          if (seasonalMultiplier > 1.0) {
            reason += ` with ${Math.round((seasonalMultiplier - 1) * 100)}% seasonal increase`;
          }
        } else {
          reason = 'Limited historical data available';
        }
        
        // Add FSSAI certification benefit
        if (supplier.fssaiCertified) {
          reason += '. FSSAI certified supplier may see higher demand.';
        }
        
        return {
          item: item.itemName,
          predictedQty: Math.round(predictedQty * 100) / 100,
          confidence: Math.round(confidence * 100) / 100,
          reason: reason
        };
      });
    }

    // Add forecast date to each prediction
    const forecastWithDate = forecast!.map(f => ({
      ...f,
      forecastDate: Date.now()
    }));

    // Update supplier with forecasts
    await ctx.db.patch(args.supplierId, {
      forecasts: forecastWithDate,
      lastForecastUpdate: Date.now()
    });

    return forecastWithDate;
  },
});

// List all suppliers (for marketplace filter)
export const listAllSuppliers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("suppliers").collect();
  },
});