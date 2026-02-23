import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getRecipesByVendor = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("recipes")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .order("desc")
      .collect();
  },
});

export const createRecipe = mutation({
  args: {
    vendorId: v.id("vendors"),
    name: v.string(),
    description: v.optional(v.string()),
    servings: v.number(),
    ingredients: v.array(v.object({
      name: v.string(),
      quantity: v.number(),
      unit: v.string(),
      pricePerUnit: v.number(),
      category: v.string(),
      supplierId: v.optional(v.id("suppliers")),
      supplierName: v.optional(v.string()),
    })),
    totalCost: v.number(),
    costPerServing: v.number(),
    suggestedSellingPrice: v.number(),
    profitMargin: v.number(),
    category: v.string(),
    preparationTime: v.number(),
    difficulty: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("recipes", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateRecipe = mutation({
  args: {
    recipeId: v.id("recipes"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    servings: v.optional(v.number()),
    ingredients: v.optional(v.array(v.object({
      name: v.string(),
      quantity: v.number(),
      unit: v.string(),
      pricePerUnit: v.number(),
      category: v.string(),
      supplierId: v.optional(v.id("suppliers")),
      supplierName: v.optional(v.string()),
    }))),
    totalCost: v.optional(v.number()),
    costPerServing: v.optional(v.number()),
    suggestedSellingPrice: v.optional(v.number()),
    profitMargin: v.optional(v.number()),
    category: v.optional(v.string()),
    preparationTime: v.optional(v.number()),
    difficulty: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { recipeId, ...updates } = args;
    await ctx.db.patch(recipeId, {
      ...updates,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(recipeId);
  },
});

export const deleteRecipe = mutation({
  args: { recipeId: v.id("recipes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.recipeId);
  },
});
