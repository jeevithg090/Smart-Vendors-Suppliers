import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getCompetitorInsights = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("competitorInsights")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .order("desc")
      .collect();
  },
});

export const createCompetitorInsight = mutation({
  args: {
    vendorId: v.id("vendors"),
    competitorName: v.string(),
    businessType: v.string(),
    location: v.string(),
    popularItems: v.array(v.string()),
    priceStrategy: v.string(),
    estimatedRevenue: v.optional(v.string()),
    uniqueSellingPoints: v.array(v.string()),
    strengths: v.array(v.string()),
    opportunities: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("competitorInsights", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteCompetitorInsight = mutation({
  args: { insightId: v.id("competitorInsights") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.insightId);
  },
});

export const getSeasonalInsights = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("seasonalInsights")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .order("desc")
      .collect();
  },
});

export const createSeasonalInsight = mutation({
  args: {
    vendorId: v.id("vendors"),
    period: v.string(),
    peakItems: v.array(v.string()),
    priceIncrease: v.number(),
    demandIncrease: v.number(),
    preparation: v.array(v.string()),
    opportunity: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("seasonalInsights", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteSeasonalInsight = mutation({
  args: { insightId: v.id("seasonalInsights") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.insightId);
  },
});

export const getMarketReports = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("marketReports")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .order("desc")
      .collect();
  },
});

export const createMarketReport = mutation({
  args: {
    vendorId: v.id("vendors"),
    title: v.string(),
    type: v.string(),
    content: v.string(),
    generatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("marketReports", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
