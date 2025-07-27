import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Add tracking information to an order
export const addTrackingInfo = mutation({
  args: {
    orderId: v.id("orders"),
    trackingData: v.object({
      trackingNumber: v.string(),
      carrier: v.string(),
      estimatedDelivery: v.optional(v.number()),
      isThirdParty: v.boolean(),
      thirdPartyProvider: v.optional(v.string()),
      delegatedBy: v.optional(v.id("suppliers")),
      notes: v.optional(v.string())
    })
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Get current tracking info or create new array
    const currentTracking = order.trackingInfo || [];
    
    // Add new tracking entry
    const newTrackingEntry = {
      ...args.trackingData,
      addedAt: Date.now(),
      status: "shipped",
      trackingHistory: []
    };

    // Update order with tracking info
    await ctx.db.patch(args.orderId, {
      trackingInfo: [...currentTracking, newTrackingEntry],
      status: "shipped",
      updatedAt: Date.now()
    });

    // Get vendor and supplier for notifications
    const [vendor, supplier] = await Promise.all([
      ctx.db.get(order.vendorId),
      ctx.db.get(order.supplierId)
    ]);

    if (!vendor || !supplier) {
      throw new Error("Vendor or supplier not found");
    }

    const now = Date.now();
    const trackingMessage = args.trackingData.isThirdParty 
      ? `Your order has been shipped via ${args.trackingData.thirdPartyProvider}. Tracking: ${args.trackingData.trackingNumber}`
      : `Your order has been shipped. Tracking: ${args.trackingData.trackingNumber}`;

    // Send notification to vendor
    await ctx.db.insert("messages", {
      senderId: "system",
      receiverId: vendor.userId,
      senderType: "system",
      receiverType: "vendor",
      content: `Order Shipped: ${trackingMessage}`,
      messageType: "order_shipped",
      orderId: args.orderId,
      isRead: false,
      createdAt: now
    });

    return args.orderId;
  }
});

// Update tracking status
export const updateTrackingStatus = mutation({
  args: {
    orderId: v.id("orders"),
    trackingNumber: v.string(),
    status: v.string(),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    estimatedDelivery: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const trackingInfo = order.trackingInfo || [];
    const trackingIndex = trackingInfo.findIndex(t => t.trackingNumber === args.trackingNumber);
    
    if (trackingIndex === -1) {
      throw new Error("Tracking number not found");
    }

    const currentTracking = trackingInfo[trackingIndex];
    const newHistoryEntry = {
      status: args.status,
      location: args.location,
      notes: args.notes,
      timestamp: Date.now()
    };

    // Update tracking history
    const updatedTrackingInfo = [...trackingInfo];
    updatedTrackingInfo[trackingIndex] = {
      ...currentTracking,
      status: args.status,
      estimatedDelivery: args.estimatedDelivery || currentTracking.estimatedDelivery,
      trackingHistory: [...(currentTracking.trackingHistory || []), newHistoryEntry]
    };

    // Update order status if delivered
    const orderUpdates: any = {
      trackingInfo: updatedTrackingInfo,
      updatedAt: Date.now()
    };

    if (args.status === "delivered") {
      orderUpdates.status = "delivered";
      orderUpdates.actualDelivery = Date.now();
    }

    await ctx.db.patch(args.orderId, orderUpdates);

    // Send notification to vendor for important status updates
    if (["out_for_delivery", "delivered", "exception"].includes(args.status)) {
      const vendor = await ctx.db.get(order.vendorId);
      if (vendor) {
        let message = "";
        switch (args.status) {
          case "out_for_delivery":
            message = `Your order is out for delivery. Expected delivery: ${args.estimatedDelivery ? new Date(args.estimatedDelivery).toLocaleDateString() : 'today'}`;
            break;
          case "delivered":
            message = "Your order has been delivered successfully!";
            break;
          case "exception":
            message = `Delivery exception: ${args.notes || 'Please contact support for details'}`;
            break;
        }

        await ctx.db.insert("messages", {
          senderId: "system",
          receiverId: vendor.userId,
          senderType: "system",
          receiverType: "vendor",
          content: `Tracking Update: ${message}`,
          messageType: `tracking_${args.status}`,
          orderId: args.orderId,
          isRead: false,
          createdAt: Date.now()
        });
      }
    }

    return args.orderId;
  }
});

// Get detailed tracking information for an order
export const getOrderTracking = query({
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
      order: {
        ...order,
        vendor: vendor ? {
          businessName: vendor.businessName,
          phone: vendor.phone,
          location: vendor.location
        } : null,
        supplier: supplier ? {
          businessName: supplier.businessName,
          phone: supplier.phone,
          location: supplier.location
        } : null
      },
      trackingInfo: order.trackingInfo || [],
      timeline: generateOrderTimeline(order)
    };
  }
});

// Get all orders with tracking info for supplier
export const getSupplierOrdersWithTracking = query({
  args: {
    supplierId: v.id("suppliers"),
    status: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("orders")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const orders = await query.order("desc").take(50);

    // Enrich with vendor details and tracking summary
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const vendor = await ctx.db.get(order.vendorId);
        
        // Get latest tracking status
        const latestTracking = order.trackingInfo && order.trackingInfo.length > 0 
          ? order.trackingInfo[order.trackingInfo.length - 1]
          : null;

        return {
          ...order,
          vendor: vendor ? {
            businessName: vendor.businessName,
            phone: vendor.phone,
            location: vendor.location
          } : null,
          hasTracking: !!(order.trackingInfo && order.trackingInfo.length > 0),
          latestTrackingStatus: latestTracking?.status || order.status,
          trackingCount: order.trackingInfo?.length || 0,
          isThirdPartyDelivery: latestTracking?.isThirdParty || false
        };
      })
    );

    return enrichedOrders;
  }
});

// Get all orders with tracking info for vendor
export const getVendorOrdersWithTracking = query({
  args: {
    vendorId: v.id("vendors"),
    status: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("orders")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const orders = await query.order("desc").take(50);

    // Enrich with supplier details and tracking summary
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const supplier = await ctx.db.get(order.supplierId);
        
        // Get latest tracking status
        const latestTracking = order.trackingInfo && order.trackingInfo.length > 0 
          ? order.trackingInfo[order.trackingInfo.length - 1]
          : null;

        return {
          ...order,
          supplier: supplier ? {
            businessName: supplier.businessName,
            phone: supplier.phone,
            location: supplier.location
          } : null,
          hasTracking: !!(order.trackingInfo && order.trackingInfo.length > 0),
          latestTrackingStatus: latestTracking?.status || order.status,
          trackingNumbers: order.trackingInfo?.map(t => t.trackingNumber) || [],
          isThirdPartyDelivery: latestTracking?.isThirdParty || false,
          estimatedDelivery: latestTracking?.estimatedDelivery || order.estimatedDelivery
        };
      })
    );

    return enrichedOrders;
  }
});

// Helper function to generate order timeline
function generateOrderTimeline(order: any) {
  const timeline = [
    {
      status: "pending",
      timestamp: order.createdAt,
      title: "Order Placed",
      description: "Order has been placed and is awaiting confirmation"
    }
  ];

  if (order.status !== "pending") {
    timeline.push({
      status: "confirmed",
      timestamp: order.updatedAt, // This would ideally be tracked separately
      title: "Order Confirmed",
      description: "Supplier has confirmed the order"
    });
  }

  if (["processing", "shipped", "delivered"].includes(order.status)) {
    timeline.push({
      status: "processing",
      timestamp: order.updatedAt,
      title: "Order Processing",
      description: "Order is being prepared"
    });
  }

  // Add tracking events
  if (order.trackingInfo && order.trackingInfo.length > 0) {
    order.trackingInfo.forEach((tracking: any) => {
      timeline.push({
        status: "shipped",
        timestamp: tracking.addedAt,
        title: tracking.isThirdParty ? "Shipped via Third Party" : "Order Shipped",
        description: `Tracking: ${tracking.trackingNumber} ${tracking.thirdPartyProvider ? `via ${tracking.thirdPartyProvider}` : ''}`
      });

      // Add tracking history events
      if (tracking.trackingHistory) {
        tracking.trackingHistory.forEach((event: any) => {
          timeline.push({
            status: event.status,
            timestamp: event.timestamp,
            title: formatTrackingStatus(event.status),
            description: `${event.location ? `${event.location} - ` : ''}${event.notes || ''}`
          });
        });
      }
    });
  }

  if (order.status === "delivered" && order.actualDelivery) {
    timeline.push({
      status: "delivered",
      timestamp: order.actualDelivery,
      title: "Order Delivered",
      description: "Order has been successfully delivered"
    });
  }

  // Sort timeline by timestamp
  return timeline.sort((a, b) => a.timestamp - b.timestamp);
}

// Helper function to format tracking status
function formatTrackingStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    "shipped": "Shipped",
    "in_transit": "In Transit",
    "out_for_delivery": "Out for Delivery",
    "delivered": "Delivered",
    "exception": "Delivery Exception",
    "returned": "Returned",
    "pickup": "Available for Pickup"
  };
  return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
}
