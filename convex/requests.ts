import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new demand request
export const createDemandRequest = mutation({
  args: {
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the vendor
    const vendor = await ctx.db
      .query("vendors")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
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

// Get all requests for a vendor
export const getVendorRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const vendor = await ctx.db
      .query("vendors")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (!vendor) {
      return [];
    }

    const requests = await ctx.db
      .query("requests")
      .filter((q) => q.eq(q.field("vendorId"), vendor._id))
      .order("desc")
      .collect();

    // Get vendor details for each request
    const requestsWithVendor = await Promise.all(
      requests.map(async (request) => {
        const vendorDetails = await ctx.db.get(request.vendorId);
        return {
          ...request,
          vendor: vendorDetails,
        };
      })
    );

    return requestsWithVendor;
  },
});

// Get all open requests (for suppliers to view)
export const getOpenRequests = query({
  args: { location: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let query = ctx.db.query("requests").filter((q) => q.eq(q.field("status"), "open"));
    
    if (args.location) {
      query = query.filter((q) => q.eq(q.field("location"), args.location));
    }

    const requests = await query.order("desc").collect();

    // Get vendor details for each request
    const requestsWithVendor = await Promise.all(
      requests.map(async (request) => {
        const vendorDetails = await ctx.db.get(request.vendorId);
        return {
          ...request,
          vendor: vendorDetails,
        };
      })
    );

    return requestsWithVendor;
  },
});

// Get similar requests for AI suggestions
export const getSimilarRequests = query({
  args: { item: v.string(), location: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("requests")
      .filter((q) => q.eq(q.field("itemName"), args.item))
      .filter((q) => q.eq(q.field("status"), "open"));

    if (args.location) {
      query = query.filter((q) => q.eq(q.field("location"), args.location));
    }

    const requests = await query.take(3);

    // Get vendor details for each request
    const requestsWithVendor = await Promise.all(
      requests.map(async (request) => {
        const vendorDetails = await ctx.db.get(request.vendorId);
        return {
          ...request,
          vendor: vendorDetails,
        };
      })
    );

    return requestsWithVendor;
  },
});

// Respond to a request (for suppliers)
export const respondToRequest = mutation({
  args: { 
    requestId: v.id("requests"), 
    quote: v.optional(v.number()), 
    message: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the supplier
    const supplier = await ctx.db
      .query("suppliers")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (!supplier) {
      throw new Error("Supplier not found");
    }

    // Get the request
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    if (request.status !== "open") {
      throw new Error("Request is no longer open");
    }

    // Add the response
    const updatedResponses = [
      ...request.responses,
      {
        supplierId: supplier._id,
        quote: args.quote,
        message: args.message,
        respondedAt: Date.now(),
      }
    ];

    // Update the request
    await ctx.db.patch(args.requestId, {
      responses: updatedResponses,
      status: updatedResponses.length > 0 ? "responded" : "open",
    });

    return request._id;
  },
});

// Close a request
export const closeRequest = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the vendor
    const vendor = await ctx.db
      .query("vendors")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Get the request
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    // Check if the vendor owns this request
    if (request.vendorId !== vendor._id) {
      throw new Error("Not authorized to close this request");
    }

    // Close the request
    await ctx.db.patch(args.requestId, {
      status: "closed",
    });

    return request._id;
  },
});

// Fulfill a request (convert to order)
export const fulfillRequest = mutation({
  args: { 
    requestId: v.id("requests"), 
    supplierId: v.id("suppliers"),
    items: v.array(
      v.object({
        itemName: v.string(),
        quantity: v.number(),
        unit: v.string(),
        pricePerUnit: v.number(),
        totalPrice: v.number(),
      })
    ),
    totalCost: v.number(),
    deliveryAddress: v.string(),
    estimatedDelivery: v.number(),
    paymentMethod: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the vendor
    const vendor = await ctx.db
      .query("vendors")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Get the request
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    // Check if the vendor owns this request
    if (request.vendorId !== vendor._id) {
      throw new Error("Not authorized to fulfill this request");
    }

    // Create the order
    const orderId = await ctx.db.insert("orders", {
      vendorId: vendor._id,
      supplierId: args.supplierId,
      items: args.items,
      totalCost: args.totalCost,
      status: "pending",
      orderType: "individual",
      deliveryAddress: args.deliveryAddress,
      estimatedDelivery: args.estimatedDelivery,
      actualDelivery: undefined,
      paymentStatus: "pending",
      paymentMethod: args.paymentMethod,
      notes: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Mark request as fulfilled
    await ctx.db.patch(args.requestId, {
      status: "fulfilled",
    });

    return orderId;
  },
}); 