import { query } from "./_generated/server";
import { v } from "convex/values";

// Helper function to get user identity from email (for other functions)
export const getUserIdentity = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", args.email))
      .first();
    
    const supplier = await ctx.db
      .query("suppliers")
      .withIndex("by_user", (q) => q.eq("userId", args.email))
      .first();

    if (!vendor && !supplier) {
      return null;
    }

    return {
      subject: args.email,
      issuer: "manual-auth",
      role: vendor ? "vendor" : "supplier",
      profileId: vendor?._id || supplier?._id
    };
  },
});

// Get user profile by email
export const getUserProfile = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", args.email))
      .first();
    
    const supplier = await ctx.db
      .query("suppliers")
      .withIndex("by_user", (q) => q.eq("userId", args.email))
      .first();

    if (!vendor && !supplier) {
      return null;
    }

    const user = vendor || supplier;
    return {
      ...user,
      role: vendor ? "vendor" : "supplier"
    };
  },
}); 