import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
// import type { Id } from "./_generated/dataModel";

// Create a notification
export const createNotification = mutation({
  args: {
    userId: v.string(),
    userType: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.object({
      orderId: v.optional(v.id("orders")),
      messageId: v.optional(v.id("messages")),
      supplierId: v.optional(v.id("suppliers")),
      vendorId: v.optional(v.id("vendors")),
      groupOrderId: v.optional(v.id("groupOrders")),
    })),
    priority: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      userType: args.userType,
      type: args.type,
      title: args.title,
      message: args.message,
      data: args.data,
      isRead: false,
      priority: args.priority,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
    });

    return notificationId;
  },
});

// Get notifications for current user
export const getNotifications = query({
  args: {
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    let query = ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject));

    if (args.unreadOnly) {
      query = query.filter((q) => q.eq(q.field("isRead"), false));
    }

    // Filter out expired notifications
    const now = Date.now();
    query = query.filter((q) => 
      q.or(
        q.eq(q.field("expiresAt"), undefined),
        q.gt(q.field("expiresAt"), now)
      )
    );

    const notifications = await query
      .order("desc")
      .take(args.limit || 50);

    return notifications;
  },
});

// Mark notification as read
export const markNotificationAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== identity.subject) {
      throw new Error("Notification not found or unauthorized");
    }

    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

// Mark all notifications as read
export const markAllNotificationsAsRead = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return unreadNotifications.length;
  },
});

// Get unread notification count
export const getUnreadNotificationCount = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    return unreadNotifications.length;
  },
});

// Delete notification
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== identity.subject) {
      throw new Error("Notification not found or unauthorized");
    }

    await ctx.db.delete(args.notificationId);
  },
});

// Helper function to send order update notification
export const sendOrderUpdateNotification = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const vendor = await ctx.db.get(order.vendorId);
    const supplier = await ctx.db.get(order.supplierId);

    if (!vendor || !supplier) {
      throw new Error("Vendor or supplier not found");
    }

    // Notify vendor
    await ctx.db.insert("notifications", {
      userId: vendor.userId,
      userType: "vendor",
      type: "order_update",
      title: "Order Status Update",
      message: `Your order #${order._id.slice(-8)} status changed to ${args.status}`,
      data: { orderId: args.orderId },
      isRead: false,
      priority: "medium",
      createdAt: Date.now(),
    });

    // Notify supplier
    await ctx.db.insert("notifications", {
      userId: supplier.userId,
      userType: "supplier",
      type: "order_update",
      title: "Order Status Update",
      message: `Order #${order._id.slice(-8)} status changed to ${args.status}`,
      data: { orderId: args.orderId },
      isRead: false,
      priority: "medium",
      createdAt: Date.now(),
    });
  },
});

// Helper function to send message notification
export const sendMessageNotification = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    let senderName = "Someone";
    if (message.senderType === "vendor") {
      const vendor = await ctx.db
        .query("vendors")
        .withIndex("by_user", (q) => q.eq("userId", message.senderId))
        .first();
      senderName = vendor?.businessName || "Vendor";
    } else if (message.senderType === "supplier") {
      const supplier = await ctx.db
        .query("suppliers")
        .withIndex("by_user", (q) => q.eq("userId", message.senderId))
        .first();
      senderName = supplier?.businessName || "Supplier";
    }

    await ctx.db.insert("notifications", {
      userId: message.receiverId,
      userType: message.receiverType,
      type: "message",
      title: "New Message",
      message: `${senderName} sent you a message`,
      data: { messageId: args.messageId },
      isRead: false,
      priority: "medium",
      createdAt: Date.now(),
    });
  },
});