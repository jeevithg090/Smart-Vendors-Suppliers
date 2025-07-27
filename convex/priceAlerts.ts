import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get price alerts for a vendor
export const getVendorPriceAlerts = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("priceAlerts")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .collect();
  },
});

// Get active price alerts for a vendor
export const getActivePriceAlerts = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("priceAlerts")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Create a new price alert
export const createPriceAlert = mutation({
  args: {
    vendorId: v.id("vendors"),
    itemName: v.string(),
    targetPrice: v.number(),
    supplierId: v.optional(v.id("suppliers")),
  },
  handler: async (ctx, args) => {
    // Get current price for the item
    let currentPrice = 0;
    
    if (args.supplierId) {
      const inventory = await ctx.db
        .query("inventory")
        .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId!))
        .filter((q) => q.eq(q.field("itemName"), args.itemName))
        .first();
      
      if (inventory) {
        currentPrice = inventory.pricePerUnit;
      }
    } else {
      // Get the lowest current price across all suppliers
      const inventoryItems = await ctx.db
        .query("inventory")
        .withIndex("by_item", (q) => q.eq("itemName", args.itemName))
        .filter((q) => q.eq(q.field("isAvailable"), true))
        .collect();
      
      if (inventoryItems.length > 0) {
        currentPrice = Math.min(...inventoryItems.map(item => item.pricePerUnit));
      }
    }

    const alertId = await ctx.db.insert("priceAlerts", {
      vendorId: args.vendorId,
      itemName: args.itemName,
      targetPrice: args.targetPrice,
      currentPrice,
      supplierId: args.supplierId,
      isActive: true,
      createdAt: Date.now(),
    });

    return await ctx.db.get(alertId);
  },
});

// Update price alert
export const updatePriceAlert = mutation({
  args: {
    alertId: v.id("priceAlerts"),
    targetPrice: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const alert = await ctx.db.get(args.alertId);
    if (!alert) {
      throw new Error("Price alert not found");
    }

    const updateData: any = {};
    
    if (args.targetPrice !== undefined) {
      updateData.targetPrice = args.targetPrice;
    }
    
    if (args.isActive !== undefined) {
      updateData.isActive = args.isActive;
    }

    await ctx.db.patch(args.alertId, updateData);
    return await ctx.db.get(args.alertId);
  },
});

// Delete price alert
export const deletePriceAlert = mutation({
  args: { alertId: v.id("priceAlerts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.alertId);
  },
});

// Get triggered alerts (alerts where current price <= target price)
export const getTriggeredAlerts = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    const alerts = await ctx.db
      .query("priceAlerts")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return alerts.filter(alert => 
      alert.currentPrice <= alert.targetPrice && alert.currentPrice > 0
    );
  },
});

// Get price alert statistics
export const getPriceAlertStats = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    const alerts = await ctx.db
      .query("priceAlerts")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .collect();

    const activeAlerts = alerts.filter(alert => alert.isActive);
    const triggeredAlerts = activeAlerts.filter(alert => 
      alert.currentPrice <= alert.targetPrice && alert.currentPrice > 0
    );

    return {
      totalAlerts: alerts.length,
      activeAlerts: activeAlerts.length,
      triggeredAlerts: triggeredAlerts.length,
      recentlyTriggered: triggeredAlerts.filter(alert => 
        alert.lastTriggered && (Date.now() - alert.lastTriggered) < 24 * 60 * 60 * 1000
      ).length,
    };
  },
});

// Update current prices for all alerts (called when inventory prices change)
export const updateAlertPrices = mutation({
  args: { itemName: v.string(), newPrice: v.number(), supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    // Update alerts for this specific supplier and item
    const specificAlerts = await ctx.db
      .query("priceAlerts")
      .withIndex("by_item", (q) => q.eq("itemName", args.itemName))
      .filter((q) => q.eq(q.field("supplierId"), args.supplierId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    for (const alert of specificAlerts) {
      const updateData: any = { currentPrice: args.newPrice };
      
      if (args.newPrice <= alert.targetPrice) {
        updateData.lastTriggered = Date.now();
      }
      
      await ctx.db.patch(alert._id, updateData);
    }

    // Update alerts for this item without specific supplier (they track lowest price)
    const generalAlerts = await ctx.db
      .query("priceAlerts")
      .withIndex("by_item", (q) => q.eq("itemName", args.itemName))
      .filter((q) => q.eq(q.field("supplierId"), undefined))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    for (const alert of generalAlerts) {
      // Get the current lowest price across all suppliers
      const inventoryItems = await ctx.db
        .query("inventory")
        .withIndex("by_item", (q) => q.eq("itemName", args.itemName))
        .filter((q) => q.eq(q.field("isAvailable"), true))
        .collect();
      
      if (inventoryItems.length > 0) {
        const lowestPrice = Math.min(...inventoryItems.map(item => item.pricePerUnit));
        const updateData: any = { currentPrice: lowestPrice };
        
        if (lowestPrice <= alert.targetPrice) {
          updateData.lastTriggered = Date.now();
        }
        
        await ctx.db.patch(alert._id, updateData);
      }
    }
  },
});