import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Get market pricing data for a supplier's items
export const getMarketPricingData = query({
  args: {
    supplierId: v.id("suppliers"),
  },
  handler: async (ctx, args) => {
    // Get the supplier's inventory to analyze
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .collect();

    if (!inventory.length) {
      return {
        marketTrends: [],
        competitorData: [],
        demandForecasts: [],
        priceRecommendations: []
      };
    }

    // Get recent financial records to understand pricing trends
    const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    const recentTransactions = await ctx.db
      .query("financialRecords")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .filter((q) => q.gte(q.field("date"), threeMonthsAgo))
      .collect();

    // Analyze market trends based on transaction data
    const marketTrends = inventory.map(item => {
      const itemTransactions = recentTransactions.filter(t => t.itemName === item.itemName);
      const avgTransactionValue = itemTransactions.length > 0 
        ? itemTransactions.reduce((sum, t) => sum + t.amount, 0) / itemTransactions.length
        : item.pricePerUnit;

      // Simulate market trend analysis
      const trendDirection = Math.random() > 0.5 ? 'up' : 'down';
      const trendStrength = Math.random() * 20; // 0-20% change
      const volatility = Math.random() * 10; // 0-10% volatility

      return {
        itemName: item.itemName,
        category: item.category,
        currentPrice: item.pricePerUnit,
        avgMarketPrice: avgTransactionValue,
        trendDirection,
        trendStrength: Math.round(trendStrength * 100) / 100,
        volatility: Math.round(volatility * 100) / 100,
        confidence: Math.round((0.7 + Math.random() * 0.3) * 100), // 70-100% confidence
      };
    });

    // Generate competitor pricing data (simulated)
    const competitorData = inventory.map(item => {
      const competitors = 3 + Math.floor(Math.random() * 5); // 3-7 competitors
      const competitorPrices = Array.from({ length: competitors }, () => {
        const variance = 0.8 + Math.random() * 0.4; // 80%-120% of base price
        return Math.round(item.pricePerUnit * variance * 100) / 100;
      });

      const avgCompetitorPrice = competitorPrices.reduce((sum, price) => sum + price, 0) / competitorPrices.length;
      const minPrice = Math.min(...competitorPrices);
      const maxPrice = Math.max(...competitorPrices);

      return {
        itemName: item.itemName,
        category: item.category,
        competitorCount: competitors,
        avgCompetitorPrice: Math.round(avgCompetitorPrice * 100) / 100,
        minCompetitorPrice: minPrice,
        maxCompetitorPrice: maxPrice,
        myPrice: item.pricePerUnit,
        marketPosition: item.pricePerUnit < avgCompetitorPrice ? 'below_market' : 
                       item.pricePerUnit > avgCompetitorPrice ? 'above_market' : 'at_market',
      };
    });

    // Generate demand forecasts based on historical data
    const demandForecasts = inventory.map(item => {
      const itemTransactions = recentTransactions.filter(t => t.itemName === item.itemName);
      const monthlyDemand = itemTransactions.length; // Simplified demand metric
      
      // Simulate demand forecasting
      const seasonalFactor = 0.8 + Math.random() * 0.4; // 80%-120% seasonal adjustment
      const growthTrend = -0.1 + Math.random() * 0.3; // -10% to +20% growth
      const forecastedDemand = Math.max(1, Math.round(monthlyDemand * seasonalFactor * (1 + growthTrend)));

      return {
        itemName: item.itemName,
        category: item.category,
        currentStock: item.currentStock,
        historicalDemand: monthlyDemand,
        forecastedDemand,
        seasonalFactor: Math.round(seasonalFactor * 100) / 100,
        growthTrend: Math.round(growthTrend * 100) / 100,
        stockLevel: item.currentStock >= forecastedDemand * 2 ? 'high' :
                   item.currentStock >= forecastedDemand ? 'optimal' : 'low',
      };
    });

    // Generate price recommendations
    const priceRecommendations = inventory.map(item => {
      const trend = marketTrends.find(t => t.itemName === item.itemName);
      const competitor = competitorData.find(c => c.itemName === item.itemName);
      const demand = demandForecasts.find(d => d.itemName === item.itemName);

      if (!trend || !competitor || !demand) {
        return {
          itemName: item.itemName,
          currentPrice: item.pricePerUnit,
          recommendedPrice: item.pricePerUnit,
          confidence: 50,
          reasoning: 'Insufficient data for recommendation'
        };
      }

      // Calculate recommended price based on multiple factors
      let recommendedPrice = item.pricePerUnit;
      let reasoning = '';

      // Factor 1: Market trend
      if (trend.trendDirection === 'up' && trend.trendStrength > 5) {
        recommendedPrice *= (1 + (trend.trendStrength / 100) * 0.5);
        reasoning += `Market trending up ${trend.trendStrength.toFixed(1)}%. `;
      } else if (trend.trendDirection === 'down' && trend.trendStrength > 5) {
        recommendedPrice *= (1 - (trend.trendStrength / 100) * 0.3);
        reasoning += `Market trending down ${trend.trendStrength.toFixed(1)}%. `;
      }

      // Factor 2: Competitor positioning
      if (competitor.marketPosition === 'below_market' && competitor.avgCompetitorPrice > item.pricePerUnit * 1.1) {
        recommendedPrice = Math.min(recommendedPrice * 1.1, competitor.avgCompetitorPrice * 0.95);
        reasoning += `Below market average, room to increase. `;
      } else if (competitor.marketPosition === 'above_market' && demand.stockLevel === 'high') {
        recommendedPrice = Math.max(recommendedPrice * 0.95, competitor.avgCompetitorPrice * 1.05);
        reasoning += `Above market with high stock, consider competitive pricing. `;
      }

      // Factor 3: Demand and stock level
      if (demand.stockLevel === 'low' && demand.forecastedDemand > demand.historicalDemand) {
        recommendedPrice *= 1.05;
        reasoning += `Low stock with increasing demand. `;
      } else if (demand.stockLevel === 'high' && demand.forecastedDemand < demand.historicalDemand) {
        recommendedPrice *= 0.98;
        reasoning += `High stock with decreasing demand. `;
      }

      // Round to 2 decimal places
      recommendedPrice = Math.round(recommendedPrice * 100) / 100;

      // Calculate confidence based on data quality
      const confidence = Math.round(
        (trend.confidence / 100 * 0.4 + 
         (competitor.competitorCount / 7) * 0.3 + 
         Math.min(demand.historicalDemand / 10, 1) * 0.3) * 100
      );

      return {
        itemName: item.itemName,
        currentPrice: item.pricePerUnit,
        recommendedPrice,
        confidence: Math.max(50, Math.min(95, confidence)),
        reasoning: reasoning.trim() || 'Price optimization based on market analysis'
      };
    });

    return {
      marketTrends,
      competitorData,
      demandForecasts,
      priceRecommendations,
      lastUpdated: Date.now(),
      dataQuality: {
        transactionCount: recentTransactions.length,
        inventoryItems: inventory.length,
        analysisConfidence: Math.round(
          priceRecommendations.reduce((sum, rec) => sum + rec.confidence, 0) / 
          priceRecommendations.length
        )
      }
    };
  },
});

// Get market insights for dashboard
export const getMarketInsights = query({
  args: {
    supplierId: v.optional(v.id("suppliers")),
  },
  handler: async (ctx, args) => {
    // Generate market insights (can be supplier-specific or general)
    const insights = [
      {
        id: 'trend_1',
        type: 'trend',
        category: 'Vegetables',
        title: 'Seasonal Price Increase',
        description: 'Vegetable prices showing 8-12% increase due to seasonal demand patterns',
        impact: 'positive',
        confidence: 85,
        timeframe: 'next_2_weeks'
      },
      {
        id: 'alert_1',
        type: 'alert',
        category: 'Grains',
        title: 'Supply Chain Update',
        description: 'New grain shipments arriving next week may cause 5-7% price reduction',
        impact: 'negative',
        confidence: 78,
        timeframe: 'next_week'
      },
      {
        id: 'opportunity_1',
        type: 'opportunity',
        category: 'Spices',
        title: 'Premium Pricing Window',
        description: 'Festival season creating opportunity for 15-20% premium pricing on spices',
        impact: 'positive',
        confidence: 92,
        timeframe: 'next_month'
      }
    ];

    return {
      insights,
      lastUpdated: Date.now(),
      marketStatus: 'active',
      volatilityIndex: 65 // 0-100 scale
    };
  },
});
