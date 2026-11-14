import type { QueryCtx } from "../_generated/server";

export interface ManualIdentity {
  subject: string;
  issuer: "manual-auth";
  role: "vendor" | "supplier";
  profileId: string;
}

/**
 * Resolves the vendor/supplier profile registered under `email`.
 * Works from both queries and mutations (MutationCtx extends QueryCtx's db).
 */
export async function getIdentityByEmail(
  ctx: Pick<QueryCtx, "db">,
  email: string,
): Promise<ManualIdentity | null> {
  const vendor = await ctx.db
    .query("vendors")
    .withIndex("by_user", (q) => q.eq("userId", email))
    .first();
  if (vendor) {
    return { subject: email, issuer: "manual-auth", role: "vendor", profileId: vendor._id };
  }
  const supplier = await ctx.db
    .query("suppliers")
    .withIndex("by_user", (q) => q.eq("userId", email))
    .first();
  if (supplier) {
    return { subject: email, issuer: "manual-auth", role: "supplier", profileId: supplier._id };
  }
  return null;
}
