import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Test inventory functionality
export const testInventorySystem = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("Testing inventory system...");
    
    // Get all inventory
    const inventory = await ctx.db.query("inventory").collect();
    console.log(`Found ${inventory.length} inventory items`);
    
    if (inventory.length > 0) {
      const firstItem = inventory[0];
      console.log(`First item: ${firstItem.itemName} - ₹${firstItem.pricePerUnit}`);
      
      // Update the price to test price alerts
      const newPrice = firstItem.pricePerUnit - 5; // Reduce price by 5
      await ctx.db.patch(firstItem._id, {
        pricePerUnit: newPrice,
        lastUpdated: Date.now()
      });
      
      console.log(`Updated ${firstItem.itemName} price to ₹${newPrice}`);
      
      // Check if any price alerts were triggered
      const alerts = await ctx.db
        .query("priceAlerts")
        .withIndex("by_item", (q) => q.eq("itemName", firstItem.itemName))
        .collect();
      
      console.log(`Found ${alerts.length} price alerts for ${firstItem.itemName}`);
      
      for (const alert of alerts) {
        if (alert.currentPrice <= alert.targetPrice) {
          console.log(`Alert triggered! Current: ₹${alert.currentPrice}, Target: ₹${alert.targetPrice}`);
        }
      }
    }
    
    return { success: true, inventoryCount: inventory.length };
  },
});

// Test price alerts functionality
export const testPriceAlerts = query({
  args: {},
  handler: async (ctx) => {
    const alerts = await ctx.db.query("priceAlerts").collect();
    const triggeredAlerts = alerts.filter(alert => 
      alert.currentPrice > 0 && alert.currentPrice <= alert.targetPrice
    );
    
    return {
      totalAlerts: alerts.length,
      triggeredAlerts: triggeredAlerts.length,
      alerts: alerts.map(alert => ({
        itemName: alert.itemName,
        targetPrice: alert.targetPrice,
        currentPrice: alert.currentPrice,
        isTriggered: alert.currentPrice > 0 && alert.currentPrice <= alert.targetPrice
      }))
    };
  },
});

// Get inventory stats
export const getInventoryStats = query({
  args: {},
  handler: async (ctx) => {
    const inventory = await ctx.db.query("inventory").collect();
    const available = inventory.filter(item => item.isAvailable);
    const lowStock = inventory.filter(item => 
      item.currentStock <= item.minimumOrder && item.isAvailable
    );
    
    const categories = [...new Set(inventory.map(item => item.category))];
    
    return {
      totalItems: inventory.length,
      availableItems: available.length,
      lowStockItems: lowStock.length,
      categories: categories.length,
      categoryBreakdown: categories.map(category => ({
        category,
        count: inventory.filter(item => item.category === category).length
      }))
    };
  },
});

// Test order management system
export const testOrderManagement = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("Testing order management system...");
    
    // Get test vendor and supplier
    const vendors = await ctx.db.query("vendors").take(1);
    const suppliers = await ctx.db.query("suppliers").take(1);
    
    if (vendors.length === 0 || suppliers.length === 0) {
      console.log("No vendors or suppliers found for testing");
      return { success: false, error: "Missing test data" };
    }
    
    const vendor = vendors[0];
    const supplier = suppliers[0];
    
    console.log(`Testing with vendor: ${vendor.businessName} and supplier: ${supplier.businessName}`);
    
    // Get supplier inventory
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_supplier", (q) => q.eq("supplierId", supplier._id))
      .filter((q) => q.eq(q.field("isAvailable"), true))
      .take(2);
    
    if (inventory.length === 0) {
      console.log("No inventory available for testing");
      return { success: false, error: "No inventory available" };
    }
    
    // Create test order
    const testItems = inventory.map(item => ({
      itemName: item.itemName,
      quantity: Math.max(item.minimumOrder, 2),
      unit: item.unit,
      pricePerUnit: item.pricePerUnit,
      totalPrice: Math.max(item.minimumOrder, 2) * item.pricePerUnit
    }));
    
    const totalCost = testItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const now = Date.now();
    
    // Create order
    const orderId = await ctx.db.insert("orders", {
      vendorId: vendor._id,
      supplierId: supplier._id,
      items: testItems,
      totalCost,
      status: "pending",
      orderType: "individual",
      deliveryAddress: vendor.location.address,
      estimatedDelivery: now + (24 * 60 * 60 * 1000),
      paymentStatus: "pending",
      paymentMethod: "cash",
      notes: "Test order created by system",
      createdAt: now,
      updatedAt: now
    });
    
    console.log(`Created test order: ${orderId}`);
    
    // Test order status updates
    const statusUpdates = ["confirmed", "processing", "shipped", "delivered"];
    
    for (const status of statusUpdates) {
      await ctx.db.patch(orderId, {
        status,
        updatedAt: Date.now()
      });
      
      // Send notifications
      await ctx.db.insert("messages", {
        senderId: "system",
        receiverId: vendor.userId,
        senderType: "system",
        receiverType: "vendor",
        content: `Order Update: Your order status has been updated to ${status}`,
        messageType: `order_${status}`,
        orderId,
        isRead: false,
        createdAt: Date.now()
      });
      
      console.log(`Updated order status to: ${status}`);
    }
    
    // Test order statistics
    const orderStats = await ctx.db
      .query("orders")
      .withIndex("by_vendor", (q) => q.eq("vendorId", vendor._id))
      .collect();
    
    const stats = {
      total: orderStats.length,
      pending: orderStats.filter(o => o.status === "pending").length,
      confirmed: orderStats.filter(o => o.status === "confirmed").length,
      delivered: orderStats.filter(o => o.status === "delivered").length,
      totalValue: orderStats.reduce((sum, o) => sum + o.totalCost, 0)
    };
    
    console.log("Order statistics:", stats);
    
    // Test notifications
    const notifications = await ctx.db
      .query("messages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", vendor.userId))
      .filter((q) => q.eq(q.field("senderType"), "system"))
      .collect();
    
    console.log(`Found ${notifications.length} notifications for vendor`);
    
    return {
      success: true,
      testOrderId: orderId,
      orderStats: stats,
      notificationCount: notifications.length,
      testItems: testItems.length
    };
  },
});

// Test order search functionality
export const testOrderSearch = query({
  args: {
    vendorId: v.id("vendors"),
    searchTerm: v.string()
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .take(50);

    const filteredOrders = orders.filter(order => {
      const searchLower = args.searchTerm.toLowerCase();
      
      const hasMatchingItem = order.items.some(item => 
        item.itemName.toLowerCase().includes(searchLower)
      );
      
      const hasMatchingNotes = order.notes?.toLowerCase().includes(searchLower);
      
      return hasMatchingItem || hasMatchingNotes;
    });

    return {
      totalOrders: orders.length,
      matchingOrders: filteredOrders.length,
      searchTerm: args.searchTerm,
      results: filteredOrders.map(order => ({
        id: order._id,
        items: order.items.map(item => item.itemName),
        totalCost: order.totalCost,
        status: order.status,
        createdAt: order.createdAt
      }))
    };
  },
});