import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  MIN_PASSWORD_LENGTH,
  hashPassword,
  isValidEmail,
  normalizeEmail,
  verifyPassword,
} from "./lib/password";

type Role = "vendor" | "supplier";

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  profileId: string;
}

// Generic message so login responses don't reveal which part was wrong.
const INVALID_CREDENTIALS = "Invalid email or password";

// Simple health-check query used by the client to confirm connectivity
export const testConnection = query({
  args: {},
  handler: async () => {
    return { status: "connected", timestamp: Date.now(), message: "Hello from Convex!" };
  },
});

export const authenticateUser = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    role: v.union(v.literal("vendor"), v.literal("supplier")),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    isSignup: v.boolean(),
  },
  handler: async (ctx, args): Promise<{ success: true; user: AuthUser }> => {
    const email = normalizeEmail(args.email);
    if (!isValidEmail(email)) {
      throw new Error("Please enter a valid email address");
    }
    if (!args.password) {
      throw new Error(INVALID_CREDENTIALS);
    }
    return args.isSignup
      ? handleSignup(ctx, { ...args, email })
      : handleLogin(ctx, { ...args, email, rawEmail: args.email.trim() });
  },
});

function splitName(ownerName: string | undefined) {
  const parts = (ownerName ?? "").trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

function toAuthUser(profile: Doc<"vendors"> | Doc<"suppliers">, role: Role): AuthUser {
  return {
    id: profile.userId,
    email: profile.email,
    ...splitName(profile.ownerName),
    role,
    profileId: profile._id,
  };
}

async function findProfiles(ctx: QueryCtx, emails: string[]) {
  for (const email of new Set(emails)) {
    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .first();
    const supplier = await ctx.db
      .query("suppliers")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .first();
    if (vendor || supplier) return { vendor, supplier };
  }
  return { vendor: null, supplier: null };
}

async function storeCredential(ctx: MutationCtx, email: string, password: string) {
  const { hash, salt, iterations } = await hashPassword(password);
  const now = Date.now();
  await ctx.db.insert("credentials", {
    email,
    passwordHash: hash,
    salt,
    iterations,
    createdAt: now,
    updatedAt: now,
  });
}

async function handleSignup(
  ctx: MutationCtx,
  args: { email: string; password: string; role: Role; firstName?: string; lastName?: string },
): Promise<{ success: true; user: AuthUser }> {
  if (args.password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const { vendor, supplier } = await findProfiles(ctx, [args.email]);
  const existingCredential = await ctx.db
    .query("credentials")
    .withIndex("by_email", (q) => q.eq("email", args.email))
    .first();
  if (vendor || supplier || existingCredential) {
    throw new Error("An account with this email already exists. Please log in instead.");
  }

  const ownerName = `${args.firstName ?? ""} ${args.lastName ?? ""}`.trim();
  const now = Date.now();
  const location = {
    address: "",
    city: "",
    state: "",
    pincode: "",
    coordinates: { lat: 0, lng: 0 },
  };

  await storeCredential(ctx, args.email, args.password);

  if (args.role === "vendor") {
    const vendorId = await ctx.db.insert("vendors", {
      userId: args.email,
      businessName: `${args.firstName || "New"} Vendor`,
      ownerName,
      email: args.email,
      phone: "",
      location,
      businessType: "",
      isVerified: false,
      trustScore: 0,
      preferences: {
        maxDeliveryDistance: 10,
        preferredCategories: [],
        budgetRange: { min: 0, max: 10000 },
        qualityPreference: "medium",
        deliveryTimePreference: "flexible",
      },
      createdAt: now,
      updatedAt: now,
    });
    const created = await ctx.db.get(vendorId);
    return { success: true, user: toAuthUser(created!, "vendor") };
  }

  const supplierId = await ctx.db.insert("suppliers", {
    userId: args.email,
    businessName: `${args.firstName || "New"} Supplier`,
    ownerName,
    email: args.email,
    phone: "",
    location,
    categories: [],
    fssaiCertified: false,
    isVerified: false,
    trustScore: 0,
    businessHours: {
      open: "09:00",
      close: "18:00",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    },
    deliveryRadius: 5,
    minimumOrder: 100,
    createdAt: now,
    updatedAt: now,
  });
  const created = await ctx.db.get(supplierId);
  return { success: true, user: toAuthUser(created!, "supplier") };
}

async function handleLogin(
  ctx: MutationCtx,
  args: { email: string; rawEmail: string; password: string; role: Role },
): Promise<{ success: true; user: AuthUser }> {
  const { vendor, supplier } = await findProfiles(ctx, [args.email, args.rawEmail]);
  const profile = args.role === "vendor" ? vendor : supplier;

  if (!profile) {
    if (vendor || supplier) {
      const other = vendor ? "Vendor" : "Supplier";
      throw new Error(`This email is registered as a ${other.toLowerCase()}. Please select '${other}' to log in.`);
    }
    throw new Error(INVALID_CREDENTIALS);
  }

  const credential = await ctx.db
    .query("credentials")
    .withIndex("by_email", (q) => q.eq("email", args.email))
    .first();

  if (credential) {
    const ok = await verifyPassword(args.password, {
      hash: credential.passwordHash,
      salt: credential.salt,
      iterations: credential.iterations,
    });
    if (!ok) throw new Error(INVALID_CREDENTIALS);
  } else {
    // Accounts created before passwords were stored have no credential yet.
    // The first successful login sets their password.
    if (args.password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Please choose a password of at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    await storeCredential(ctx, args.email, args.password);
  }

  return { success: true, user: toAuthUser(profile, args.role) };
}

// Get user profile by email
export const getUserProfile = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const { vendor, supplier } = await findProfiles(ctx, [normalizeEmail(args.email), args.email]);
    const user = vendor || supplier;
    if (!user) return null;
    return { ...user, role: vendor ? "vendor" : "supplier" };
  },
});
