import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

// Send a message
export const sendMessage = mutation({
  args: {
    userEmail: v.string(), // User's email for authentication
    receiverId: v.string(),
    receiverType: v.string(),
    content: v.string(),
    messageType: v.string(),
    orderId: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    // Get user identity using manual auth
    const identity = await ctx.runQuery(api.authHelpers.getUserIdentity, { email: args.userEmail });
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

// Get conversation messages
export const getConversation = query({
  args: { 
    userEmail: v.string(), // User's email for authentication
    otherUserId: v.string() 
  },
  handler: async (ctx, args) => {
    // Get user identity using manual auth
    const identity = await ctx.runQuery(api.auth.getUserIdentity, { email: args.userEmail });
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

    return [...messages, ...reverseMessages].sort((a, b) => a.createdAt - b.createdAt);
  },
});

// Mark messages as read
export const markAsRead = mutation({
  args: { 
    userEmail: v.string(), // User's email for authentication
    senderId: v.string() 
  },
  handler: async (ctx, args) => {
    // Get user identity using manual auth
    const identity = await ctx.runQuery(api.auth.getUserIdentity, { email: args.userEmail });
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => 
        q.eq("senderId", args.senderId).eq("receiverId", identity.subject)
      )
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    for (const message of messages) {
      await ctx.db.patch(message._id, { isRead: true });
    }

    return messages.length;
  },
});

// Get user's conversations list
export const getConversations = query({
  args: { userEmail: v.string() }, // User's email for authentication
  handler: async (ctx, args) => {
    // Get user identity using manual auth
    const identity = await ctx.runQuery(api.auth.getUserIdentity, { email: args.userEmail });
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const sentMessages = await ctx.db
      .query("messages")
      .withIndex("by_sender", (q) => q.eq("senderId", identity.subject))
      .collect();

    const receivedMessages = await ctx.db
      .query("messages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", identity.subject))
      .collect();

    // Get unique conversation partners
    const conversationPartners = new Set<string>();
    
    sentMessages.forEach(msg => conversationPartners.add(msg.receiverId));
    receivedMessages.forEach(msg => conversationPartners.add(msg.senderId));

    const conversations = [];
    
    for (const partnerId of conversationPartners) {
      const lastMessage = [...sentMessages, ...receivedMessages]
        .filter(msg => msg.senderId === partnerId || msg.receiverId === partnerId)
        .sort((a, b) => b.createdAt - a.createdAt)[0];

      if (lastMessage) {
        conversations.push({
          partnerId,
          lastMessage: lastMessage.content,
          lastMessageTime: lastMessage.createdAt,
          unreadCount: receivedMessages.filter(msg => 
            msg.senderId === partnerId && !msg.isRead
          ).length
        });
      }
    }

    return conversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
  },
});

// Get unread message count
export const getUnreadCount = query({
  args: { userEmail: v.string() }, // User's email for authentication
  handler: async (ctx, args) => {
    // Get user identity using manual auth
    const identity = await ctx.runQuery(api.auth.getUserIdentity, { email: args.userEmail });
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

// Delete a message
export const deleteMessage = mutation({
  args: { 
    userEmail: v.string(), // User's email for authentication
    messageId: v.id("messages") 
  },
  handler: async (ctx, args) => {
    // Get user identity using manual auth
    const identity = await ctx.runQuery(api.auth.getUserIdentity, { email: args.userEmail });
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    if (message.senderId !== identity.subject) {
      throw new Error("Not authorized to delete this message");
    }

    await ctx.db.delete(args.messageId);
    return true;
  },
});