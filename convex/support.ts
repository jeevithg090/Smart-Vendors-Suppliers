import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
// import type { Id } from "./_generated/dataModel";

// Create a support ticket
export const createSupportTicket = mutation({
  args: {
    subject: v.string(),
    description: v.string(),
    category: v.string(),
    priority: v.string(),
    orderId: v.optional(v.id("orders")),
    attachments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Determine user type
    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
    
    const supplier = await ctx.db
      .query("suppliers")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    const userType = vendor ? "vendor" : supplier ? "supplier" : "unknown";

    const ticketId = await ctx.db.insert("supportTickets", {
      userId: identity.subject,
      userType,
      subject: args.subject,
      description: args.description,
      category: args.category,
      priority: args.priority,
      status: "open",
      orderId: args.orderId,
      attachments: args.attachments,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create initial message
    await ctx.db.insert("supportMessages", {
      ticketId,
      senderId: identity.subject,
      senderType: "user",
      content: args.description,
      attachments: args.attachments,
      isInternal: false,
      createdAt: Date.now(),
    });

    return ticketId;
  },
});

// Get support tickets for current user
export const getSupportTickets = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    let query = ctx.db
      .query("supportTickets")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const tickets = await query.order("desc").collect();
    return tickets;
  },
});

// Get support ticket by ID
export const getSupportTicket = query({
  args: {
    ticketId: v.id("supportTickets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket || ticket.userId !== identity.subject) {
      throw new Error("Ticket not found or unauthorized");
    }

    return ticket;
  },
});

// Get support messages for a ticket
export const getSupportMessages = query({
  args: {
    ticketId: v.id("supportTickets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify user has access to this ticket
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket || ticket.userId !== identity.subject) {
      throw new Error("Ticket not found or unauthorized");
    }

    const messages = await ctx.db
      .query("supportMessages")
      .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
      .filter((q) => q.eq(q.field("isInternal"), false))
      .order("asc")
      .collect();

    return messages;
  },
});

// Add message to support ticket
export const addSupportMessage = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    content: v.string(),
    attachments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify user has access to this ticket
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket || ticket.userId !== identity.subject) {
      throw new Error("Ticket not found or unauthorized");
    }

    const messageId = await ctx.db.insert("supportMessages", {
      ticketId: args.ticketId,
      senderId: identity.subject,
      senderType: "user",
      content: args.content,
      attachments: args.attachments,
      isInternal: false,
      createdAt: Date.now(),
    });

    // Update ticket status if it was resolved
    if (ticket.status === "resolved") {
      await ctx.db.patch(args.ticketId, {
        status: "open",
        updatedAt: Date.now(),
      });
    }

    return messageId;
  },
});

// Close support ticket
export const closeSupportTicket = mutation({
  args: {
    ticketId: v.id("supportTickets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket || ticket.userId !== identity.subject) {
      throw new Error("Ticket not found or unauthorized");
    }

    await ctx.db.patch(args.ticketId, {
      status: "closed",
      updatedAt: Date.now(),
      resolvedAt: Date.now(),
    });
  },
});

// Create a dispute
export const createDispute = mutation({
  args: {
    orderId: v.id("orders"),
    category: v.string(),
    description: v.string(),
    evidence: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const vendor = await ctx.db.get(order.vendorId);
    const supplier = await ctx.db.get(order.supplierId);

    if (!vendor || !supplier) {
      throw new Error("Vendor or supplier not found");
    }

    // Determine initiator and respondent
    const isVendorInitiator = vendor.userId === identity.subject;
    const isSupplierInitiator = supplier.userId === identity.subject;

    if (!isVendorInitiator && !isSupplierInitiator) {
      throw new Error("Unauthorized to create dispute for this order");
    }

    const disputeId = await ctx.db.insert("disputes", {
      orderId: args.orderId,
      initiatorId: identity.subject,
      initiatorType: isVendorInitiator ? "vendor" : "supplier",
      respondentId: isVendorInitiator ? supplier.userId : vendor.userId,
      respondentType: isVendorInitiator ? "supplier" : "vendor",
      category: args.category,
      description: args.description,
      evidence: args.evidence,
      status: "open",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Notify the respondent
    await ctx.db.insert("notifications", {
      userId: isVendorInitiator ? supplier.userId : vendor.userId,
      userType: isVendorInitiator ? "supplier" : "vendor",
      type: "dispute",
      title: "New Dispute Created",
      message: `A dispute has been created for order #${order._id.slice(-8)}`,
      data: { orderId: args.orderId },
      isRead: false,
      priority: "high",
      createdAt: Date.now(),
    });

    return disputeId;
  },
});

// Get disputes for current user
export const getDisputes = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get disputes where user is initiator
    let initiatorQuery = ctx.db
      .query("disputes")
      .withIndex("by_initiator", (q) => q.eq("initiatorId", identity.subject));

    // Get disputes where user is respondent
    let respondentQuery = ctx.db
      .query("disputes")
      .withIndex("by_respondent", (q) => q.eq("respondentId", identity.subject));

    if (args.status) {
      initiatorQuery = initiatorQuery.filter((q) => q.eq(q.field("status"), args.status));
      respondentQuery = respondentQuery.filter((q) => q.eq(q.field("status"), args.status));
    }

    const [initiatorDisputes, respondentDisputes] = await Promise.all([
      initiatorQuery.collect(),
      respondentQuery.collect(),
    ]);

    const allDisputes = [...initiatorDisputes, ...respondentDisputes];
    return allDisputes.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get dispute by ID
export const getDispute = query({
  args: {
    disputeId: v.id("disputes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const dispute = await ctx.db.get(args.disputeId);
    if (!dispute || 
        (dispute.initiatorId !== identity.subject && 
         dispute.respondentId !== identity.subject)) {
      throw new Error("Dispute not found or unauthorized");
    }

    // Get order details
    const order = await ctx.db.get(dispute.orderId);
    
    return {
      ...dispute,
      order,
    };
  },
});