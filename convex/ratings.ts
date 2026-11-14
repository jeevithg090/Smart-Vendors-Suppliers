import { mutation, query, type MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { calculateTrustScore } from './lib/trustScore';

// Add a new rating
export const addRating = mutation({
  args: {
    vendorId: v.id('vendors'),
    supplierId: v.id('suppliers'),
    orderId: v.id('orders'),
    rating: v.number(), // 1-5 scale
    review: v.optional(v.string()),
    categories: v.object({
      quality: v.number(),
      delivery: v.number(),
      communication: v.number(),
      pricing: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Check if rating already exists for this order
    const existingRating = await ctx.db
      .query('ratings')
      .withIndex('by_order', (q) => q.eq('orderId', args.orderId))
      .first();

    if (existingRating) {
      throw new Error('Rating already exists for this order');
    }

    // Insert the rating
    const ratingId = await ctx.db.insert('ratings', {
      vendorId: args.vendorId,
      supplierId: args.supplierId,
      orderId: args.orderId,
      rating: args.rating,
      review: args.review,
      categories: args.categories,
      createdAt: Date.now(),
    });

    // Update supplier's trust score
    await updateSupplierTrustScore(ctx, args.supplierId);

    return ratingId;
  },
});

// Compatibility alias used by rating UI.
export const submitRating = addRating;

// Check whether a vendor can rate a given order.
export const canRateOrder = query({
  args: {
    vendorId: v.id('vendors'),
    orderId: v.id('orders'),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return { canRate: false, reason: 'Order not found' };
    }

    if (order.vendorId !== args.vendorId) {
      return { canRate: false, reason: 'You can only rate your own orders' };
    }

    if (order.status !== 'delivered') {
      return { canRate: false, reason: 'Order must be delivered before rating' };
    }

    const existingRating = await ctx.db
      .query('ratings')
      .withIndex('by_order', (q) => q.eq('orderId', args.orderId))
      .first();

    if (existingRating) {
      return { canRate: false, reason: 'This order has already been rated' };
    }

    return { canRate: true, reason: 'You can rate this order' };
  },
});

// Get ratings for a supplier
export const getSupplierRatings = query({
  args: {
    supplierId: v.id('suppliers'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query('ratings')
      .withIndex('by_supplier', (q) => q.eq('supplierId', args.supplierId))
      .order('desc')
      .take(args.limit || 20);

    // Get vendor details for each rating
    const ratingsWithVendors = await Promise.all(
      ratings.map(async (rating) => {
        const vendor = await ctx.db.get(rating.vendorId);
        return {
          ...rating,
          vendor: vendor
            ? {
                businessName: vendor.businessName,
                ownerName: vendor.ownerName,
              }
            : null,
        };
      }),
    );

    return ratingsWithVendors;
  },
});

// Get rating statistics for a supplier
export const getSupplierRatingStats = query({
  args: { supplierId: v.id('suppliers') },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query('ratings')
      .withIndex('by_supplier', (q) => q.eq('supplierId', args.supplierId))
      .collect();

    if (ratings.length === 0) {
      return {
        totalRatings: 0,
        averageRating: 0,
        categoryAverages: {
          quality: 0,
          delivery: 0,
          communication: 0,
          pricing: 0,
        },
        ratingDistribution: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        },
      };
    }

    const totalRatings = ratings.length;
    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;

    const categoryAverages = {
      quality: ratings.reduce((sum, r) => sum + r.categories.quality, 0) / totalRatings,
      delivery: ratings.reduce((sum, r) => sum + r.categories.delivery, 0) / totalRatings,
      communication: ratings.reduce((sum, r) => sum + r.categories.communication, 0) / totalRatings,
      pricing: ratings.reduce((sum, r) => sum + r.categories.pricing, 0) / totalRatings,
    };

    const ratingDistribution = ratings.reduce(
      (acc, r) => {
        const roundedRating = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
        acc[roundedRating] = (acc[roundedRating] || 0) + 1;
        return acc;
      },
      { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    );

    return {
      totalRatings,
      averageRating,
      categoryAverages,
      ratingDistribution,
    };
  },
});

// Get trust score breakdown for a supplier
export const getTrustScoreBreakdown = query({
  args: { supplierId: v.id('suppliers') },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    const ratings = await ctx.db
      .query('ratings')
      .withIndex('by_supplier', (q) => q.eq('supplierId', args.supplierId))
      .collect();

    const orders = await ctx.db
      .query('orders')
      .withIndex('by_supplier', (q) => q.eq('supplierId', args.supplierId))
      .collect();

    return calculateTrustScore({
      ratings,
      orders,
      fssaiCertified: supplier.fssaiCertified,
      isVerified: supplier.isVerified,
    });
  },
});

// Recalculate and persist a supplier's trust score
async function updateSupplierTrustScore(ctx: MutationCtx, supplierId: Id<'suppliers'>) {
  const supplier = await ctx.db.get(supplierId);
  if (!supplier) return;

  const ratings = await ctx.db
    .query('ratings')
    .withIndex('by_supplier', (q) => q.eq('supplierId', supplierId))
    .collect();
  const orders = await ctx.db
    .query('orders')
    .withIndex('by_supplier', (q) => q.eq('supplierId', supplierId))
    .collect();

  const { currentScore } = calculateTrustScore({
    ratings,
    orders,
    fssaiCertified: supplier.fssaiCertified,
    isVerified: supplier.isVerified,
  });

  await ctx.db.patch(supplierId, { trustScore: currentScore, updatedAt: Date.now() });
}

// Get ratings by vendor
export const getVendorRatings = query({
  args: {
    vendorId: v.id('vendors'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query('ratings')
      .withIndex('by_vendor', (q) => q.eq('vendorId', args.vendorId))
      .order('desc')
      .take(args.limit || 20);

    // Get supplier details for each rating
    const ratingsWithSuppliers = await Promise.all(
      ratings.map(async (rating) => {
        const supplier = await ctx.db.get(rating.supplierId);
        return {
          ...rating,
          supplier: supplier
            ? {
                businessName: supplier.businessName,
                ownerName: supplier.ownerName,
              }
            : null,
        };
      }),
    );

    return ratingsWithSuppliers;
  },
});

// Update rating
export const updateRating = mutation({
  args: {
    ratingId: v.id('ratings'),
    rating: v.optional(v.number()),
    review: v.optional(v.string()),
    categories: v.optional(
      v.object({
        quality: v.number(),
        delivery: v.number(),
        communication: v.number(),
        pricing: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { ratingId, ...updates } = args;

    const existingRating = await ctx.db.get(ratingId);
    if (!existingRating) {
      throw new Error('Rating not found');
    }

    await ctx.db.patch(ratingId, updates);

    // Update supplier's trust score
    await updateSupplierTrustScore(ctx, existingRating.supplierId);

    return ratingId;
  },
});

// Delete rating
export const deleteRating = mutation({
  args: { ratingId: v.id('ratings') },
  handler: async (ctx, args) => {
    const rating = await ctx.db.get(args.ratingId);
    if (!rating) {
      throw new Error('Rating not found');
    }

    await ctx.db.delete(args.ratingId);

    // Update supplier's trust score
    await updateSupplierTrustScore(ctx, rating.supplierId);

    return args.ratingId;
  },
});
