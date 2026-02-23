import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getNegotiationsByVendor = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("negotiations")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .order("desc")
      .collect();
  },
});

export const createNegotiation = mutation({
  args: {
    vendorId: v.id("vendors"),
    supplierId: v.id("suppliers"),
    itemName: v.string(),
    currentPrice: v.number(),
    requestedPrice: v.number(),
    quantity: v.number(),
    unit: v.string(),
    justification: v.string(),
    vendorNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("negotiations", {
      vendorId: args.vendorId,
      supplierId: args.supplierId,
      itemName: args.itemName,
      currentPrice: args.currentPrice,
      requestedPrice: args.requestedPrice,
      quantity: args.quantity,
      unit: args.unit,
      justification: args.justification,
      status: "pending",
      vendorNote: args.vendorNote,
      createdAt: now,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
      updatedAt: now,
    });
  },
});

export const respondToNegotiation = mutation({
  args: {
    negotiationId: v.id("negotiations"),
    status: v.string(), // "accepted", "rejected", "counter"
    counterOffer: v.optional(v.number()),
    counterMessage: v.optional(v.string()),
    supplierResponse: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updateData: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.counterOffer !== undefined) {
      updateData.counterOffer = args.counterOffer;
    }
    if (args.counterMessage !== undefined) {
      updateData.counterMessage = args.counterMessage;
    }
    if (args.supplierResponse !== undefined) {
      updateData.supplierResponse = args.supplierResponse;
    }

    await ctx.db.patch(args.negotiationId, updateData);
    return await ctx.db.get(args.negotiationId);
  },
});

export const deleteNegotiation = mutation({
  args: { negotiationId: v.id("negotiations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.negotiationId);
  },
});
