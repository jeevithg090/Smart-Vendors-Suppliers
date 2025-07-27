import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Helper function to validate user authentication
async function validateUser(ctx: any, userEmail: string) {
  const vendor = await ctx.db
    .query("vendors")
    .withIndex("by_user", (q: any) => q.eq("userId", userEmail))
    .first();

  const supplier = await ctx.db
    .query("suppliers")
    .withIndex("by_user", (q: any) => q.eq("userId", userEmail))
    .first();

  if (!vendor && !supplier) {
    throw new Error("Not authenticated");
  }

  return { userEmail, role: vendor ? "vendor" : "supplier" };
}

// Create a notification
export const createNotification = mutation({
  args: {
    userEmail: v.string(), // User's email for authentication
    userType: v.string(), // "vendor", "supplier", "support"
    type: v.string(), // "order_update", "message", "price_alert", "group_order", "system"
    title: v.string(),
    message: v.string(),
    data: v.optional(v.object({
      orderId: v.optional(v.id("orders")),
      messageId: v.optional(v.id("messages")),
      supplierId: v.optional(v.id("suppliers")),
      vendorId: v.optional(v.id("vendors")),
      groupOrderId: v.optional(v.id("groupOrders")),
    })),
    priority: v.optional(v.string()), // "low", "medium", "high", "urgent"
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate user authentication
    const identity = await validateUser(ctx, args.userEmail);

    const notificationId = await ctx.db.insert("notifications", {
      userId: identity.userEmail,
      userType: args.userType,
      type: args.type,
      title: args.title,
      message: args.message,
      data: args.data,
      isRead: false,
      priority: args.priority || "medium",
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
    });

    return notificationId;
  },
});

// Get user's notifications
export const getUserNotifications = query({
  args: { userEmail: v.string() }, // User's email for authentication
  handler: async (ctx, args) => {
    // Validate user authentication
    const identity = await validateUser(ctx, args.userEmail);

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", identity.userEmail))
      .order("desc")
      .collect();

    return notifications;
  },
});

// Mark notification as read
export const markNotificationAsRead = mutation({
  args: { 
    userEmail: v.string(), // User's email for authentication
    notificationId: v.id("notifications") 
  },
  handler: async (ctx, args) => {
    // Get user identity using manual auth
    const identity = await ctx.runQuery(api.authHelpers.getUserIdentity, { email: args.userEmail });
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== identity.subject) {
      throw new Error("Not authorized to mark this notification as read");
    }

    await ctx.db.patch(args.notificationId, { isRead: true });
    return true;
  },
});

// Mark all notifications as read
export const markAllNotificationsAsRead = mutation({
  args: { userEmail: v.string() }, // User's email for authentication
  handler: async (ctx, args) => {
    // Get user identity using manual auth
    const identity = await ctx.runQuery(api.authHelpers.getUserIdentity, { email: args.userEmail });
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

// Delete a notification
export const deleteNotification = mutation({
  args: { 
    userEmail: v.string(), // User's email for authentication
    notificationId: v.id("notifications") 
  },
  handler: async (ctx, args) => {
    // Get user identity using manual auth
    const identity = await ctx.runQuery(api.authHelpers.getUserIdentity, { email: args.userEmail });
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== identity.subject) {
      throw new Error("Not authorized to delete this notification");
    }

    await ctx.db.delete(args.notificationId);
    return true;
  },
});

// Get unread notification count
export const getUnreadCount = query({
  args: { userEmail: v.string() }, // User's email for authentication
  handler: async (ctx, args) => {
    // Validate user exists with our manual auth system
    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", args.userEmail))
      .first();

    const supplier = await ctx.db
      .query("suppliers")
      .withIndex("by_user", (q) => q.eq("userId", args.userEmail))
      .first();

    if (!vendor && !supplier) {
      throw new Error("Not authenticated");
    }

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userEmail))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    return unreadNotifications.length;
  },
});

// Send message notification (helper function)
export const sendMessageNotification = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Create notification for the receiver
    const notificationId = await ctx.db.insert("notifications", {
      userId: message.receiverId,
      userType: message.receiverType,
      type: "message",
      title: "New Message",
      message: `You have a new message from ${message.senderType}`,
      data: {
        messageId: message._id,
      },
      isRead: false,
      priority: "medium",
      createdAt: Date.now(),
    });

    return notificationId;
  },
});
