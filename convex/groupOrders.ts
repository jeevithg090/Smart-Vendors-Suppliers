import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Create a new group order
export const createGroupOrder = mutation({
  args: {
    initiatorId: v.id("vendors"),
    itemName: v.string(),
    category: v.string(),
    targetQuantity: v.number(),
    pricePerUnit: v.number(),
    supplierId: v.id("suppliers"),
    location: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Validate that the initiator is a valid vendor
    const vendor = await ctx.db.get(args.initiatorId);
    if (!vendor) {
      throw new Error("Invalid vendor ID");
    }

    // Validate that the supplier exists
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) {
      throw new Error("Invalid supplier ID");
    }

    // Check if supplier has the item in inventory
    const inventoryItem = await ctx.db
      .query("inventory")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .filter((q) => q.eq(q.field("itemName"), args.itemName))
      .first();

    if (!inventoryItem || !inventoryItem.isAvailable) {
      throw new Error("Item not available from this supplier");
    }

    // Create the group order
    const groupOrderId = await ctx.db.insert("groupOrders", {
      initiatorId: args.initiatorId,
      itemName: args.itemName,
      category: args.category,
      targetQuantity: args.targetQuantity,
      currentQuantity: 0,
      pricePerUnit: args.pricePerUnit,
      participants: [],
      supplierId: args.supplierId,
      status: "open",
      location: args.location,
      expiresAt: args.expiresAt,
      createdAt: now,
    });

    return groupOrderId;
  },
});

// Join an existing group order
export const joinGroupOrder = mutation({
  args: {
    groupOrderId: v.id("groupOrders"),
    vendorId: v.id("vendors"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get the group order
    const groupOrder = await ctx.db.get(args.groupOrderId);
    if (!groupOrder) {
      throw new Error("Group order not found");
    }

    // Check if group order is still open
    if (groupOrder.status !== "open") {
      throw new Error("Group order is no longer accepting participants");
    }

    // Check if group order has expired
    if (groupOrder.expiresAt < now) {
      throw new Error("Group order has expired");
    }

    // Check if vendor is already a participant
    const existingParticipant = groupOrder.participants.find(
      (p) => p.vendorId === args.vendorId
    );
    if (existingParticipant) {
      throw new Error("Vendor is already participating in this group order");
    }

    // Check if adding this quantity would exceed target
    const newTotalQuantity = groupOrder.currentQuantity + args.quantity;
    if (newTotalQuantity > groupOrder.targetQuantity) {
      throw new Error("Adding this quantity would exceed the target quantity");
    }

    // Add participant and update current quantity
    const updatedParticipants = [
      ...groupOrder.participants,
      {
        vendorId: args.vendorId,
        quantity: args.quantity,
        joinedAt: now,
      },
    ];

    await ctx.db.patch(args.groupOrderId, {
      participants: updatedParticipants,
      currentQuantity: newTotalQuantity,
    });

    // Check if target quantity is reached and lock the order
    if (newTotalQuantity >= groupOrder.targetQuantity) {
      await ctx.db.patch(args.groupOrderId, {
        status: "locked",
      });

      // Create individual orders for all participants
      await createIndividualOrdersFromGroup(ctx, args.groupOrderId);
    }

    return { success: true, newQuantity: newTotalQuantity };
  },
});

// Leave a group order (only if not locked)
export const leaveGroupOrder = mutation({
  args: {
    groupOrderId: v.id("groupOrders"),
    vendorId: v.id("vendors"),
  },
  handler: async (ctx, args) => {
    const groupOrder = await ctx.db.get(args.groupOrderId);
    if (!groupOrder) {
      throw new Error("Group order not found");
    }

    if (groupOrder.status !== "open") {
      throw new Error("Cannot leave a locked or completed group order");
    }

    // Find and remove the participant
    const participantIndex = groupOrder.participants.findIndex(
      (p) => p.vendorId === args.vendorId
    );
    
    if (participantIndex === -1) {
      throw new Error("Vendor is not participating in this group order");
    }

    const participant = groupOrder.participants[participantIndex];
    const updatedParticipants = groupOrder.participants.filter(
      (p) => p.vendorId !== args.vendorId
    );

    await ctx.db.patch(args.groupOrderId, {
      participants: updatedParticipants,
      currentQuantity: groupOrder.currentQuantity - participant.quantity,
    });

    return { success: true };
  },
});

// Cancel a group order (only by initiator)
export const cancelGroupOrder = mutation({
  args: {
    groupOrderId: v.id("groupOrders"),
    vendorId: v.id("vendors"),
  },
  handler: async (ctx, args) => {
    const groupOrder = await ctx.db.get(args.groupOrderId);
    if (!groupOrder) {
      throw new Error("Group order not found");
    }

    if (groupOrder.initiatorId !== args.vendorId) {
      throw new Error("Only the initiator can cancel a group order");
    }

    if (groupOrder.status === "completed") {
      throw new Error("Cannot cancel a completed group order");
    }

    await ctx.db.patch(args.groupOrderId, {
      status: "cancelled",
    });

    return { success: true };
  },
});

// Get group orders by location and status
export const getGroupOrdersByLocation = query({
  args: {
    location: v.string(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("groupOrders")
      .withIndex("by_location", (q) => q.eq("location", args.location));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const groupOrders = await query.collect();

    // Enrich with vendor and supplier information
    const enrichedOrders = await Promise.all(
      groupOrders.map(async (order) => {
        const initiator = await ctx.db.get(order.initiatorId);
        const supplier = await ctx.db.get(order.supplierId);
        
        const participantsWithDetails = await Promise.all(
          order.participants.map(async (participant) => {
            const vendor = await ctx.db.get(participant.vendorId);
            return {
              ...participant,
              vendorName: vendor?.businessName || "Unknown",
            };
          })
        );

        return {
          ...order,
          initiatorName: initiator?.businessName || "Unknown",
          supplierName: supplier?.businessName || "Unknown",
          participantsWithDetails,
        };
      })
    );

    return enrichedOrders;
  },
});

// Get group orders by vendor (initiated or participated)
export const getGroupOrdersByVendor = query({
  args: {
    vendorId: v.id("vendors"),
  },
  handler: async (ctx, args) => {
    // Get orders initiated by vendor
    const initiatedOrders = await ctx.db
      .query("groupOrders")
      .withIndex("by_initiator", (q) => q.eq("initiatorId", args.vendorId))
      .collect();

    // Get orders where vendor is a participant
    const allOrders = await ctx.db.query("groupOrders").collect();
    const participatedOrders = allOrders.filter((order) =>
      order.participants.some((p) => p.vendorId === args.vendorId)
    );

    // Combine and deduplicate
    const allVendorOrders = [...initiatedOrders];
    participatedOrders.forEach((order) => {
      if (!initiatedOrders.find((io) => io._id === order._id)) {
        allVendorOrders.push(order);
      }
    });

    // Enrich with supplier information
    const enrichedOrders = await Promise.all(
      allVendorOrders.map(async (order) => {
        const supplier = await ctx.db.get(order.supplierId);
        return {
          ...order,
          supplierName: supplier?.businessName || "Unknown",
          isInitiator: order.initiatorId === args.vendorId,
          vendorParticipation: order.participants.find(
            (p) => p.vendorId === args.vendorId
          ),
        };
      })
    );

    return enrichedOrders;
  },
});

// Helper function to create individual orders from group order
async function createIndividualOrdersFromGroup(
  ctx: any,
  groupOrderId: Id<"groupOrders">
) {
  const groupOrder = await ctx.db.get(groupOrderId);
  if (!groupOrder) return;

  const now = Date.now();

  // Create individual orders for each participant
  for (const participant of groupOrder.participants) {
    const vendor = await ctx.db.get(participant.vendorId);
    if (!vendor) continue;

    await ctx.db.insert("orders", {
      vendorId: participant.vendorId,
      supplierId: groupOrder.supplierId,
      items: [
        {
          itemName: groupOrder.itemName,
          quantity: participant.quantity,
          unit: "kg", // Default unit, should be from inventory
          pricePerUnit: groupOrder.pricePerUnit,
          totalPrice: participant.quantity * groupOrder.pricePerUnit,
        },
      ],
      totalCost: participant.quantity * groupOrder.pricePerUnit,
      status: "confirmed",
      orderType: "group",
      groupOrderId: groupOrderId,
      deliveryAddress: vendor.location.address,
      estimatedDelivery: now + 24 * 60 * 60 * 1000, // 24 hours from now
      paymentStatus: "pending",
      paymentMethod: "cash_on_delivery",
      createdAt: now,
      updatedAt: now,
    });
  }

  // Update group order status to completed
  await ctx.db.patch(groupOrderId, {
    status: "completed",
  });
}

// Auto-expire group orders (to be called by a scheduled function)
export const expireGroupOrders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    const expiredOrders = await ctx.db
      .query("groupOrders")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const order of expiredOrders) {
      await ctx.db.patch(order._id, {
        status: "cancelled",
      });
    }

    return { expiredCount: expiredOrders.length };
  },
});

// Check and auto-lock orders that have reached target quantity
export const checkAndLockOrders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const openOrders = await ctx.db
      .query("groupOrders")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    let lockedCount = 0;

    for (const order of openOrders) {
      if (order.currentQuantity >= order.targetQuantity) {
        await ctx.db.patch(order._id, {
          status: "locked",
        });

        // Create individual orders for all participants
        await createIndividualOrdersFromGroup(ctx, order._id);
        lockedCount++;
      }
    }

    return { lockedCount };
  },
});

// Get group order statistics
export const getGroupOrderStats = query({
  args: {
    vendorId: v.optional(v.id("vendors")),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const allOrders = args.location 
      ? await ctx.db.query("groupOrders")
          .withIndex("by_location", (q) => q.eq("location", args.location!))
          .collect()
      : await ctx.db.query("groupOrders").collect();


    
    // Filter by vendor if specified
    const orders = args.vendorId 
      ? allOrders.filter(order => 
          order.initiatorId === args.vendorId || 
          order.participants.some(p => p.vendorId === args.vendorId)
        )
      : allOrders;

    const stats = {
      total: orders.length,
      open: orders.filter(o => o.status === 'open').length,
      locked: orders.filter(o => o.status === 'locked').length,
      completed: orders.filter(o => o.status === 'completed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalValue: orders.reduce((sum, order) => sum + (order.currentQuantity * order.pricePerUnit), 0),
      averageParticipants: orders.length > 0 
        ? orders.reduce((sum, order) => sum + order.participants.length, 0) / orders.length 
        : 0,
    };

    return stats;
  },
});