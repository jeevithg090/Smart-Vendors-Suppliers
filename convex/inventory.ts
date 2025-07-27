import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get inventory for a specific supplier
export const getInventoryBySupplier = query({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("inventory")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .collect();
  },
});

// Alias for getInventoryBySupplier (used by OrderPlacement component)
export const getSupplierInventory = query({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("inventory")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
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

// Get inventory item by name
export const getInventoryByItem = query({
  args: { itemName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("inventory")
      .withIndex("by_item", (q) => q.eq("itemName", args.itemName))
      .filter((q) => q.eq(q.field("isAvailable"), true))
      .collect();
  },
});

// Get all available inventory with real-time updates
export const getAvailableInventory = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("inventory")
      .withIndex("by_availability", (q) => q.eq("isAvailable", true))
      .collect();
  },
});

// Update inventory stock
export const updateInventoryStock = mutation({
  args: {
    inventoryId: v.id("inventory"),
    newStock: v.number(),
    pricePerUnit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const inventory = await ctx.db.get(args.inventoryId);
    if (!inventory) {
      throw new Error("Inventory item not found");
    }

    const updateData: any = {
      currentStock: args.newStock,
      lastUpdated: Date.now(),
      isAvailable: args.newStock > 0,
    };

    if (args.pricePerUnit !== undefined) {
      updateData.pricePerUnit = args.pricePerUnit;
    }

    await ctx.db.patch(args.inventoryId, updateData);

    // Trigger price alert checks if price changed
    if (args.pricePerUnit !== undefined && args.pricePerUnit !== inventory.pricePerUnit) {
      await checkPriceAlerts(ctx, inventory.itemName, args.pricePerUnit, inventory.supplierId);
    }

    return await ctx.db.get(args.inventoryId);
  },
});

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
    expiryDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const inventoryId = await ctx.db.insert("inventory", {
      ...args,
      lastUpdated: Date.now(),
      isAvailable: args.currentStock > 0,
    });

    return await ctx.db.get(inventoryId);
  },
});

// Get price history for an item
export const getPriceHistory = query({
  args: { 
    itemName: v.string(),
    supplierId: v.optional(v.id("suppliers")),
    days: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const daysBack = args.days || 30;
    const cutoffTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);

    let query = ctx.db
      .query("inventory")
      .withIndex("by_item", (q) => q.eq("itemName", args.itemName));

    if (args.supplierId) {
      query = query.filter((q) => q.eq(q.field("supplierId"), args.supplierId));
    }

    const inventoryHistory = await query
      .filter((q) => q.gte(q.field("lastUpdated"), cutoffTime))
      .collect();

    // Group by supplier and create price history
    const priceHistory = inventoryHistory.map(item => ({
      supplierId: item.supplierId,
      price: item.pricePerUnit,
      stock: item.currentStock,
      timestamp: item.lastUpdated,
      isAvailable: item.isAvailable,
    })).sort((a, b) => a.timestamp - b.timestamp);

    return priceHistory;
  },
});

// Get low stock alerts
export const getLowStockAlerts = query({
  args: { supplierId: v.optional(v.id("suppliers")) },
  handler: async (ctx, args) => {
    const inventory = args.supplierId 
      ? await ctx.db.query("inventory")
          .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId!))
          .collect()
      : await ctx.db.query("inventory").collect();

    return inventory.filter(item => 
      item.currentStock <= item.minimumOrder && item.isAvailable
    );
  },
});

// Helper function to check price alerts
async function checkPriceAlerts(ctx: any, itemName: string, newPrice: number, supplierId: any) {
  // Update alerts for this specific supplier and item
  const specificAlerts = await ctx.db
    .query("priceAlerts")
    .withIndex("by_item", (q: any) => q.eq("itemName", itemName))
    .filter((q: any) => q.eq(q.field("supplierId"), supplierId))
    .filter((q: any) => q.eq(q.field("isActive"), true))
    .collect();

  for (const alert of specificAlerts) {
    const updateData: any = { currentPrice: newPrice };
    
    if (newPrice <= alert.targetPrice) {
      updateData.lastTriggered = Date.now();
    }
    
    await ctx.db.patch(alert._id, updateData);
  }

  // Update alerts for this item without specific supplier (they track lowest price)
  const generalAlerts = await ctx.db
    .query("priceAlerts")
    .withIndex("by_item", (q: any) => q.eq("itemName", itemName))
    .filter((q: any) => q.eq(q.field("supplierId"), undefined))
    .filter((q: any) => q.eq(q.field("isActive"), true))
    .collect();

  for (const alert of generalAlerts) {
    // Get the current lowest price across all suppliers
    const inventoryItems = await ctx.db
      .query("inventory")
      .withIndex("by_item", (q: any) => q.eq("itemName", itemName))
      .filter((q: any) => q.eq(q.field("isAvailable"), true))
      .collect();
    
    if (inventoryItems.length > 0) {
      const lowestPrice = Math.min(...inventoryItems.map((item: any) => item.pricePerUnit));
      const updateData: any = { currentPrice: lowestPrice };
      
      if (lowestPrice <= alert.targetPrice) {
        updateData.lastTriggered = Date.now();
      }
      
      await ctx.db.patch(alert._id, updateData);
    }
  }
}