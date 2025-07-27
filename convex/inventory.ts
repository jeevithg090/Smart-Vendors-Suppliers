import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Add new inventory item
export const addInventoryItem = mutation({
  args: {
    supplierId: v.id("suppliers"),
    itemName: v.string(),
    category: v.string(),
    currentStock: v.number(),
    unit: v.string(),
    pricePerUnit: v.number(),
    minimumOrder: v.number(),
    quality: v.string(),
    expiryDate: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("inventory", {
      supplierId: args.supplierId,
      itemName: args.itemName,
      category: args.category,
      currentStock: args.currentStock,
      unit: args.unit,
      pricePerUnit: args.pricePerUnit,
      minimumOrder: args.minimumOrder,
      quality: args.quality,
      expiryDate: args.expiryDate,
      lastUpdated: Date.now(),
      isAvailable: args.currentStock > 0
    });
  },
});

// Get inventory by supplier
export const getInventoryBySupplier = query({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("inventory")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .order("desc")
      .collect();
  },
});

// Update inventory item
export const updateInventoryItem = mutation({
  args: {
    id: v.id("inventory"),
    currentStock: v.optional(v.number()),
    pricePerUnit: v.optional(v.number()),
    minimumOrder: v.optional(v.number()),
    quality: v.optional(v.string()),
    expiryDate: v.optional(v.number()),
    isAvailable: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // If stock is being updated, automatically set availability
    if (updates.currentStock !== undefined) {
      updates.isAvailable = updates.currentStock > 0;
    }
    
    return await ctx.db.patch(id, {
      ...updates,
      lastUpdated: Date.now()
    });
  },
});

// Delete inventory item
export const deleteInventoryItem = mutation({
  args: { id: v.id("inventory") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// Search inventory items
export const searchInventory = query({
  args: {
    searchTerm: v.optional(v.string()),
    category: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    availableOnly: v.optional(v.boolean()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    let items = await ctx.db.query("inventory").collect();
    
    // Apply filters
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      items = items.filter(item => 
        item.itemName.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower)
      );
    }
    
    if (args.category) {
      items = items.filter(item => item.category === args.category);
    }
    
    if (args.minPrice !== undefined) {
      items = items.filter(item => item.pricePerUnit >= args.minPrice!);
    }
    
    if (args.maxPrice !== undefined) {
      items = items.filter(item => item.pricePerUnit <= args.maxPrice!);
    }
    
    if (args.availableOnly) {
      items = items.filter(item => item.isAvailable && item.currentStock > 0);
    }
    
    // Sort by last updated (newest first)
    items.sort((a, b) => b.lastUpdated - a.lastUpdated);
    
    // Apply limit
    if (args.limit) {
      items = items.slice(0, args.limit);
    }
    
    return items;
  },
});

// Get low stock items for a supplier
export const getLowStockItems = query({
  args: { 
    supplierId: v.id("suppliers"),
    threshold: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const threshold = args.threshold || 10;
    
    return await ctx.db
      .query("inventory")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .filter((q) => q.lt(q.field("currentStock"), threshold))
      .collect();
  },
});

// Get inventory by category
export const getInventoryByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("inventory")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .filter((q) => q.eq(q.field("isAvailable"), true))
      .collect();
  },
});

// Bulk update inventory stock (for order processing)
export const bulkUpdateStock = mutation({
  args: {
    updates: v.array(v.object({
      itemId: v.id("inventory"),
      quantityUsed: v.number()
    }))
  },
  handler: async (ctx, args) => {
    const results = [];
    
    for (const update of args.updates) {
      const item = await ctx.db.get(update.itemId);
      if (item) {
        const newStock = Math.max(0, item.currentStock - update.quantityUsed);
        await ctx.db.patch(update.itemId, {
          currentStock: newStock,
          isAvailable: newStock > 0,
          lastUpdated: Date.now()
        });
        results.push({ itemId: update.itemId, newStock });
      }
    }
    
    return results;
  },
});

// Get inventory statistics for a supplier
export const getInventoryStats = query({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .collect();

    const totalItems = inventory.length;
    const availableItems = inventory.filter(item => item.isAvailable).length;
    const lowStockItems = inventory.filter(item => item.currentStock < 10).length;
    const outOfStockItems = inventory.filter(item => item.currentStock === 0).length;

    const totalValue = inventory.reduce((sum, item) =>
      sum + (item.currentStock * item.pricePerUnit), 0
    );

    const categories = [...new Set(inventory.map(item => item.category))];

    return {
      totalItems,
      availableItems,
      lowStockItems,
      outOfStockItems,
      totalValue,
      categories: categories.length
    };
  },
});

// Get all inventory items (alias for compatibility)
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("inventory").collect();
  },
});
