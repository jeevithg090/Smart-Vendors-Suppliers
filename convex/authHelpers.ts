import { query } from "./_generated/server";
import { v } from "convex/values";
import { getIdentityByEmail } from "./lib/identity";

// Resolve the manual-auth identity for an email (exposed for the client)
export const getUserIdentity = query({
  args: { email: v.string() },
  handler: async (ctx, args) => getIdentityByEmail(ctx, args.email),
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