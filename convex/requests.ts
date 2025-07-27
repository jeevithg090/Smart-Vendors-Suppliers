import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Create a new demand request
export const createDemandRequest = mutation({
  args: {
    userEmail: v.string(), // User's email for authentication
    itemName: v.string(),
    quantity: v.number(),
    unit: v.string(),
    priceMin: v.optional(v.number()),
    priceMax: v.optional(v.number()),
    urgency: v.string(),
    location: v.string(),
    notes: v.optional(v.string()),
    requireFssai: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get user identity using manual auth
    const identity = await ctx.runQuery(api.authHelpers.getUserIdentity, { email: args.userEmail });
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the vendor
    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Validate quantity
    if (args.quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    // Validate price range if provided
    if (args.priceMin && args.priceMax && args.priceMin > args.priceMax) {
      throw new Error("Minimum price cannot be greater than maximum price");
    }

    // Create the request
    const requestId = await ctx.db.insert("requests", {
      vendorId: vendor._id,
      itemName: args.itemName,
      quantity: args.quantity,
      unit: args.unit,
      priceMin: args.priceMin,
      priceMax: args.priceMax,
      urgency: args.urgency,
      location: args.location,
      notes: args.notes,
      requireFssai: args.requireFssai,
      status: "open",
      responses: [],
      createdAt: Date.now(),
    });

    return requestId;
  },
});

// Get demand requests for a vendor
export const getVendorRequests = query({
  args: { userEmail: v.string() }, // User's email for authentication
  handler: async (ctx, args) => {
    // Get user identity using manual auth
    const identity = await ctx.runQuery(api.authHelpers.getUserIdentity, { email: args.userEmail });
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (!vendor) {
      throw new Error("Vendor not found");
    }

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_vendor", (q) => q.eq("vendorId", vendor._id))
      .order("desc")
      .collect();

    return requests;
  },
});

// Get all open demand requests (for suppliers to browse)
export const getOpenRequests = query({
  args: { userEmail: v.string() }, // User's email for authentication
  handler: async (ctx, args) => {
    // Get user identity using manual auth
    const identity = await ctx.runQuery(api.authHelpers.getUserIdentity, { email: args.userEmail });
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .collect();

    return requests;
  },
});

// Respond to a demand request
export const respondToRequest = mutation({
  args: {
    userEmail: v.string(), // User's email for authentication
    requestId: v.id("requests"),
    quote: v.optional(v.number()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get user identity using manual auth
    const identity = await ctx.runQuery(api.authHelpers.getUserIdentity, { email: args.userEmail });
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const supplier = await ctx.db
      .query("suppliers")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (!supplier) {
      throw new Error("Supplier not found");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    if (request.status !== "open") {
      throw new Error("Request is no longer open for responses");
    }

    // Add response to the request
    const response = {
      supplierId: supplier._id,
      quote: args.quote,
      message: args.message,
      respondedAt: Date.now(),
    };

    await ctx.db.patch(args.requestId, {
      responses: [...request.responses, response],
    });

    return true;
  },
});

// Close a demand request
export const closeRequest = mutation({
  args: {
    userEmail: v.string(), // User's email for authentication
    requestId: v.id("requests"),
  },
  handler: async (ctx, args) => {
    // Get user identity using manual auth
    const identity = await ctx.runQuery(api.authHelpers.getUserIdentity, { email: args.userEmail });
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (!vendor || request.vendorId !== vendor._id) {
      throw new Error("Not authorized to close this request");
    }

    await ctx.db.patch(args.requestId, {
      status: "closed",
    });

    return true;
  },
}); 