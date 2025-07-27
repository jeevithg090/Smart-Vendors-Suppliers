import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
// import type { Id } from "./_generated/dataModel";

// Send a message
export const sendMessage = mutation({
  args: {
    receiverId: v.string(),
    receiverType: v.string(),
    content: v.string(),
    messageType: v.string(),
    orderId: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Determine sender type based on user
    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
    
    const supplier = await ctx.db
      .query("suppliers")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    const senderType = vendor ? "vendor" : supplier ? "supplier" : "support";

    const messageId = await ctx.db.insert("messages", {
      senderId: identity.subject,
      receiverId: args.receiverId,
      senderType,
      receiverType: args.receiverType,
      content: args.content,
      messageType: args.messageType,
      orderId: args.orderId,
      isRead: false,
      createdAt: Date.now(),
    });

    return messageId;
  },
});

// Get conversation between two users
export const getConversation = query({
  args: {
    otherUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => 
        q.eq("senderId", identity.subject).eq("receiverId", args.otherUserId)
      )
      .collect();

    const reverseMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => 
        q.eq("senderId", args.otherUserId).eq("receiverId", identity.subject)
      )
      .collect();

    const allMessages = [...messages, ...reverseMessages]
      .sort((a, b) => a.createdAt - b.createdAt);

    return allMessages;
  },
});

// Get all conversations for current user
export const getConversations = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get messages where user is sender or receiver
    const sentMessages = await ctx.db
      .query("messages")
      .withIndex("by_sender", (q) => q.eq("senderId", identity.subject))
      .collect();

    const receivedMessages = await ctx.db
      .query("messages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", identity.subject))
      .collect();

    // Group by conversation partner
    const conversationMap = new Map();

    [...sentMessages, ...receivedMessages].forEach((message) => {
      const partnerId = message.senderId === identity.subject 
        ? message.receiverId 
        : message.senderId;
      
      if (!conversationMap.has(partnerId) || 
          message.createdAt > conversationMap.get(partnerId).lastMessage.createdAt) {
        conversationMap.set(partnerId, {
          partnerId,
          partnerType: message.senderId === identity.subject 
            ? message.receiverType 
            : message.senderType,
          lastMessage: message,
          unreadCount: 0,
        });
      }
    });

    // Calculate unread counts
    for (const [partnerId, conversation] of conversationMap) {
      const unreadCount = receivedMessages.filter(
        (msg) => msg.senderId === partnerId && !msg.isRead
      ).length;
      conversation.unreadCount = unreadCount;
    }

    // Get partner details
    const conversations = [];
    for (const [partnerId, conversation] of conversationMap) {
      let partnerDetails = null;
      
      if (conversation.partnerType === "vendor") {
        partnerDetails = await ctx.db
          .query("vendors")
          .withIndex("by_user", (q) => q.eq("userId", partnerId))
          .first();
      } else if (conversation.partnerType === "supplier") {
        partnerDetails = await ctx.db
          .query("suppliers")
          .withIndex("by_user", (q) => q.eq("userId", partnerId))
          .first();
      }

      conversations.push({
        ...conversation,
        partnerDetails,
      });
    }

    return conversations.sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);
  },
});

// Mark messages as read
export const markAsRead = mutation({
  args: {
    senderId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => 
        q.eq("senderId", args.senderId).eq("receiverId", identity.subject)
      )
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    for (const message of unreadMessages) {
      await ctx.db.patch(message._id, { isRead: true });
    }

    return unreadMessages.length;
  },
});

// Get unread message count
export const getUnreadCount = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", identity.subject))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    return unreadMessages.length;
  },
});

// Get messages for an order
export const getOrderMessages = query({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    return messages.sort((a, b) => a.createdAt - b.createdAt);
  },
});