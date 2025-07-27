import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
// import type { Id } from "./_generated/dataModel";

// Create a new order
export const createOrder = mutation({
  args: {
    vendorId: v.id("vendors"),
    supplierId: v.id("suppliers"),
    items: v.array(v.object({
      itemName: v.string(),
      quantity: v.number(),
      unit: v.string(),
      pricePerUnit: v.number(),
      totalPrice: v.number()
    })),
    deliveryAddress: v.string(),
    paymentMethod: v.string(),
    notes: v.optional(v.string()),
    orderType: v.optional(v.string()),
    groupOrderId: v.optional(v.id("groupOrders"))
  },
  handler: async (ctx, args) => {
    // Check if vendor exists
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Check if supplier exists
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) {
      throw new Error("Supplier not found");
    }

    // Check inventory availability for each item
    for (const item of args.items) {
      const inventoryItem = await ctx.db
        .query("inventory")
        .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
        .filter((q) => q.eq(q.field("itemName"), item.itemName))
        .first();

      if (!inventoryItem) {
        throw new Error(`Item ${item.itemName} not found in supplier inventory`);
      }

      if (!inventoryItem.isAvailable) {
        throw new Error(`Item ${item.itemName} is currently unavailable`);
      }

      if (inventoryItem.currentStock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.itemName}. Available: ${inventoryItem.currentStock}, Requested: ${item.quantity}`);
      }

      if (item.quantity < inventoryItem.minimumOrder) {
        throw new Error(`Minimum order quantity for ${item.itemName} is ${inventoryItem.minimumOrder}`);
      }
    }

    // Calculate total cost
    const totalCost = args.items.reduce((sum, item) => sum + item.totalPrice, 0);

    // Check supplier minimum order
    if (totalCost < supplier.minimumOrder) {
      throw new Error(`Minimum order value is ₹${supplier.minimumOrder}. Current order: ₹${totalCost}`);
    }

    const now = Date.now();
    
    // Create the order
    const orderId = await ctx.db.insert("orders", {
      vendorId: args.vendorId,
      supplierId: args.supplierId,
      items: args.items,
      totalCost,
      status: "pending",
      orderType: args.orderType || "individual",
      groupOrderId: args.groupOrderId,
      deliveryAddress: args.deliveryAddress,
      estimatedDelivery: now + (24 * 60 * 60 * 1000), // 24 hours from now
      paymentStatus: "pending",
      paymentMethod: args.paymentMethod,
      notes: args.notes,
      createdAt: now,
      updatedAt: now
    });

    // Update inventory for each item
    for (const item of args.items) {
      const inventoryItem = await ctx.db
        .query("inventory")
        .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
        .filter((q) => q.eq(q.field("itemName"), item.itemName))
        .first();

      if (inventoryItem) {
        await ctx.db.patch(inventoryItem._id, {
          currentStock: inventoryItem.currentStock - item.quantity,
          lastUpdated: now
        });
      }
    }

    // Create financial record
    await ctx.db.insert("financialRecords", {
      vendorId: args.vendorId,
      orderId,
      amount: totalCost,
      category: args.items[0]?.itemName || "Mixed",
      itemName: args.items.length === 1 ? args.items[0].itemName : "Multiple Items",
      supplierId: args.supplierId,
      date: now,
      month: new Date(now).toISOString().slice(0, 7), // YYYY-MM format
      year: new Date(now).getFullYear()
    });

    // Send order placed notifications
    await ctx.db.insert("messages", {
      senderId: "system",
      receiverId: vendor.userId,
      senderType: "system",
      receiverType: "vendor",
      content: `Order Placed: Your order from ${supplier.businessName} has been placed successfully and is awaiting confirmation.`,
      messageType: "order_placed",
      orderId,
      isRead: false,
      createdAt: now
    });

    await ctx.db.insert("messages", {
      senderId: "system",
      receiverId: supplier.userId,
      senderType: "system",
      receiverType: "supplier",
      content: `New Order: You have received a new order from ${vendor.businessName}. Please review and confirm.`,
      messageType: "order_placed",
      orderId,
      isRead: false,
      createdAt: now
    });

    return orderId;
  }
});

// Update order status
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.string(),
    notes: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const [vendor, supplier] = await Promise.all([
      ctx.db.get(order.vendorId),
      ctx.db.get(order.supplierId)
    ]);

    if (!vendor || !supplier) {
      throw new Error("Vendor or supplier not found");
    }

    const now = Date.now();
    const updates: any = {
      status: args.status,
      updatedAt: now
    };

    // Set actual delivery time when order is delivered
    if (args.status === "delivered") {
      updates.actualDelivery = now;
    }

    await ctx.db.patch(args.orderId, updates);

    // Send status update notifications
    let title = "";
    let vendorMessage = "";
    let supplierMessage = "";

    switch (args.status) {
      case "confirmed":
        title = "Order Confirmed";
        vendorMessage = `Your order from ${supplier.businessName} has been confirmed and is being prepared.`;
        supplierMessage = `Order from ${vendor.businessName} has been confirmed. Please start preparation.`;
        break;
      case "processing":
        title = "Order Processing";
        vendorMessage = `Your order from ${supplier.businessName} is now being processed.`;
        supplierMessage = `Order from ${vendor.businessName} is being processed.`;
        break;
      case "shipped":
        title = "Order Shipped";
        vendorMessage = `Your order from ${supplier.businessName} has been shipped and is on the way.`;
        supplierMessage = `Order for ${vendor.businessName} has been marked as shipped.`;
        break;
      case "delivered":
        title = "Order Delivered";
        vendorMessage = `Your order from ${supplier.businessName} has been delivered. Please rate your experience.`;
        supplierMessage = `Order for ${vendor.businessName} has been delivered successfully.`;
        break;
      case "cancelled":
        title = "Order Cancelled";
        vendorMessage = `Your order from ${supplier.businessName} has been cancelled.`;
        supplierMessage = `Order from ${vendor.businessName} has been cancelled.`;
        break;
      default:
        title = "Order Update";
        vendorMessage = args.notes || `Your order status has been updated to ${args.status}.`;
        supplierMessage = args.notes || `Order status updated to ${args.status}.`;
    }

    // Send notification to vendor
    await ctx.db.insert("messages", {
      senderId: "system",
      receiverId: vendor.userId,
      senderType: "system",
      receiverType: "vendor",
      content: `${title}: ${vendorMessage}`,
      messageType: `order_${args.status}`,
      orderId: args.orderId,
      isRead: false,
      createdAt: now
    });

    // Send notification to supplier
    await ctx.db.insert("messages", {
      senderId: "system",
      receiverId: supplier.userId,
      senderType: "system",
      receiverType: "supplier",
      content: `${title}: ${supplierMessage}`,
      messageType: `order_${args.status}`,
      orderId: args.orderId,
      isRead: false,
      createdAt: now
    });

    return args.orderId;
  }
});

// Get orders for a vendor with filtering and pagination
export const getVendorOrders = query({
  args: {
    vendorId: v.id("vendors"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("orders")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const orders = await query
      .order("desc")
      .take(args.limit || 50);

    // Get supplier details for each order
    const ordersWithSuppliers = await Promise.all(
      orders.map(async (order) => {
        const supplier = await ctx.db.get(order.supplierId);
        return {
          ...order,
          supplier: supplier ? {
            businessName: supplier.businessName,
            location: supplier.location,
            phone: supplier.phone
          } : null
        };
      })
    );

    return ordersWithSuppliers;
  }
});

// Get orders for a supplier with filtering and pagination
export const getOrdersBySupplier = query({
  args: {
    supplierId: v.id("suppliers"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("orders")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const orders = await query
      .order("desc")
      .take(args.limit || 50);

    // Get vendor details for each order
    const ordersWithVendors = await Promise.all(
      orders.map(async (order) => {
        const vendor = await ctx.db.get(order.vendorId);
        return {
          ...order,
          totalAmount: order.totalCost, // Alias for consistency
          vendor: vendor ? {
            businessName: vendor.businessName,
            location: vendor.location,
            phone: vendor.phone
          } : null
        };
      })
    );

    return ordersWithVendors;
  }
});

// Get single order details
export const getOrderDetails = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return null;
    }

    // Get vendor and supplier details
    const [vendor, supplier] = await Promise.all([
      ctx.db.get(order.vendorId),
      ctx.db.get(order.supplierId)
    ]);

    return {
      ...order,
      vendor: vendor ? {
        businessName: vendor.businessName,
        ownerName: vendor.ownerName,
        phone: vendor.phone,
        location: vendor.location
      } : null,
      supplier: supplier ? {
        businessName: supplier.businessName,
        ownerName: supplier.ownerName,
        phone: supplier.phone,
        location: supplier.location
      } : null
    };
  }
});

// Cancel an order
export const cancelOrder = mutation({
  args: {
    orderId: v.id("orders"),
    reason: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Only allow cancellation if order is pending or confirmed
    if (!["pending", "confirmed"].includes(order.status)) {
      throw new Error("Order cannot be cancelled at this stage");
    }

    // Restore inventory
    for (const item of order.items) {
      const inventoryItem = await ctx.db
        .query("inventory")
        .withIndex("by_supplier", (q) => q.eq("supplierId", order.supplierId))
        .filter((q) => q.eq(q.field("itemName"), item.itemName))
        .first();

      if (inventoryItem) {
        await ctx.db.patch(inventoryItem._id, {
          currentStock: inventoryItem.currentStock + item.quantity,
          lastUpdated: Date.now()
        });
      }
    }

    // Update order status
    await ctx.db.patch(args.orderId, {
      status: "cancelled",
      notes: args.reason,
      updatedAt: Date.now()
    });

    return args.orderId;
  }
});

// Get order statistics for vendor dashboard
export const getOrderStats = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .collect();

    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === "pending").length,
      confirmed: orders.filter(o => o.status === "confirmed").length,
      processing: orders.filter(o => o.status === "processing").length,
      shipped: orders.filter(o => o.status === "shipped").length,
      delivered: orders.filter(o => o.status === "delivered").length,
      cancelled: orders.filter(o => o.status === "cancelled").length,
      totalValue: orders
        .filter(o => o.status !== "cancelled")
        .reduce((sum, o) => sum + o.totalCost, 0)
    };

    return stats;
  }
});

// Search orders by item name or supplier
export const searchOrders = query({
  args: {
    vendorId: v.id("vendors"),
    searchTerm: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .order("desc")
      .take(args.limit || 100);

    // Filter orders based on search term
    const filteredOrders = orders.filter(order => {
      const searchLower = args.searchTerm.toLowerCase();
      
      // Search in item names
      const hasMatchingItem = order.items.some(item => 
        item.itemName.toLowerCase().includes(searchLower)
      );
      
      // Search in notes
      const hasMatchingNotes = order.notes?.toLowerCase().includes(searchLower);
      
      return hasMatchingItem || hasMatchingNotes;
    });

    // Get supplier details for filtered orders
    const ordersWithSuppliers = await Promise.all(
      filteredOrders.map(async (order) => {
        const supplier = await ctx.db.get(order.supplierId);
        return {
          ...order,
          supplier: supplier ? {
            businessName: supplier.businessName,
            location: supplier.location
          } : null
        };
      })
    );

    return ordersWithSuppliers;
  }
});
