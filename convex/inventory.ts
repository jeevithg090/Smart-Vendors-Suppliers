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

// Get supplier inventory (compatibility alias used by frontend order placement)
export const getSupplierInventory = query({
  args: {
    supplierId: v.id("suppliers"),
    availableOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .order("desc")
      .collect();

    if (args.availableOnly === false) {
      return inventory;
    }

    return inventory.filter((item) => item.isAvailable && item.currentStock > 0);
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

// Get inventory by item name (compatibility query used by inventory tracker)
export const getInventoryByItem = query({
  args: {
    itemName: v.string(),
    availableOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const itemName = args.itemName.trim().toLowerCase();
    const inventory = await ctx.db.query("inventory").collect();
    const filtered = inventory.filter((item) =>
      item.itemName.toLowerCase().includes(itemName)
    );

    if (args.availableOnly === false) {
      return filtered;
    }

    return filtered.filter((item) => item.isAvailable && item.currentStock > 0);
  },
});

// Get currently available marketplace inventory (compatibility query used by workflow/inventory views)
export const getAvailableInventory = query({
  args: {
    supplierId: v.optional(v.id("suppliers")),
    category: v.optional(v.string()),
    itemName: v.optional(v.string()),
    includeUnavailable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let inventory = await ctx.db.query("inventory").collect();

    if (args.supplierId) {
      inventory = inventory.filter((item) => item.supplierId === args.supplierId);
    }

    if (args.category) {
      const category = args.category.trim().toLowerCase();
      inventory = inventory.filter(
        (item) => item.category.toLowerCase() === category
      );
    }

    if (args.itemName) {
      const itemName = args.itemName.trim().toLowerCase();
      inventory = inventory.filter((item) =>
        item.itemName.toLowerCase().includes(itemName)
      );
    }

    if (!args.includeUnavailable) {
      inventory = inventory.filter((item) => item.isAvailable && item.currentStock > 0);
    }

    return inventory.sort((a, b) => b.lastUpdated - a.lastUpdated);
  },
});

// Historical price points derived from orders and latest inventory snapshots
export const getPriceHistory = query({
  args: {
    itemName: v.string(),
    supplierId: v.optional(v.id("suppliers")),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = Math.max(1, Math.min(args.days || 30, 365));
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const itemName = args.itemName.trim().toLowerCase();

    const allInventory = await ctx.db.query("inventory").collect();
    const matchingInventory = allInventory.filter((item) =>
      item.itemName.toLowerCase().includes(itemName)
    );
    const filteredInventory = args.supplierId
      ? matchingInventory.filter((item) => item.supplierId === args.supplierId)
      : matchingInventory;

    const stockBySupplier = new Map(
      filteredInventory.map((item) => [item.supplierId, item.currentStock])
    );
    const availableBySupplier = new Map(
      filteredInventory.map((item) => [item.supplierId, item.isAvailable])
    );

    const orders = args.supplierId
      ? await ctx.db
          .query("orders")
          .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId!))
          .collect()
      : await ctx.db.query("orders").collect();

    const pricePoints = orders
      .filter((order) => order.createdAt >= since)
      .flatMap((order) =>
        order.items
          .filter((item) => item.itemName.toLowerCase().includes(itemName))
          .map((item) => ({
            supplierId: order.supplierId,
            price: item.pricePerUnit,
            stock: stockBySupplier.get(order.supplierId) || 0,
            timestamp: order.createdAt,
            isAvailable: availableBySupplier.get(order.supplierId) || false,
          }))
      );

    // Include latest inventory snapshot so charts show current known prices even without recent orders.
    const snapshotPoints = filteredInventory.map((item) => ({
      supplierId: item.supplierId,
      price: item.pricePerUnit,
      stock: item.currentStock,
      timestamp: item.lastUpdated,
      isAvailable: item.isAvailable,
    }));

    return [...pricePoints, ...snapshotPoints]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-500);
  },
});

// Get price trends for multiple items (average price change over time)
export const getBulkPriceTrends = query({
  args: {
    itemNames: v.array(v.string()),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = Math.max(1, Math.min(args.days || 30, 365));
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const normalizedItems = args.itemNames.map((item) => item.trim().toLowerCase());

    const inventory = await ctx.db.query("inventory").collect();
    const orders = await ctx.db.query("orders").collect();

    const trends = normalizedItems.map((itemName) => {
      const matchingInventory = inventory.filter((item) =>
        item.itemName.toLowerCase().includes(itemName)
      );

      const orderPoints = orders
        .filter((order) => order.createdAt >= since)
        .flatMap((order) =>
          order.items
            .filter((item) => item.itemName.toLowerCase().includes(itemName))
            .map((item) => ({
              price: item.pricePerUnit,
              timestamp: order.createdAt,
            }))
        );

      const snapshotPoints = matchingInventory.map((item) => ({
        price: item.pricePerUnit,
        timestamp: item.lastUpdated,
      }));

      const points = [...orderPoints, ...snapshotPoints]
        .filter((p) => p.price > 0)
        .sort((a, b) => a.timestamp - b.timestamp);

      if (points.length < 2) {
        const latest = points[points.length - 1]?.price || 0;
        return {
          itemName,
          currentPrice: latest,
          change: 0,
          changePercent: 0,
          trend: "stable",
          dataPoints: points.length,
        };
      }

      const first = points[0].price;
      const last = points[points.length - 1].price;
      const change = last - first;
      const changePercent = first > 0 ? (change / first) * 100 : 0;
      const trend =
        Math.abs(changePercent) < 5 ? "stable" : changePercent > 0 ? "up" : "down";

      return {
        itemName,
        currentPrice: last,
        change,
        changePercent,
        trend,
        dataPoints: points.length,
      };
    });

    return trends;
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
