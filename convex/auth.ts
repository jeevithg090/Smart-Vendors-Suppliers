import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Simple test query to check if Convex is working
export const testConnection = query({
  args: {},
  handler: async () => {
    return { status: "connected", timestamp: Date.now(), message: "Hello from Convex!" };
  },
});

// Simple hello world query
export const helloWorld = query({
  args: {},
  handler: async () => {
    return { message: "Hello World from the backend!" };
  },
});



// Manual authentication functions
export const authenticateUser = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    role: v.string(), // "vendor" or "supplier"
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    isSignup: v.boolean()
  },
  handler: async (ctx, args) => {
    // In a real app, you would hash the password and check against stored credentials
    // For demo purposes, we'll use simple validation
    if (!args.email || args.password.length < 4) {
      throw new Error("Invalid credentials");
    }

    // Check if user exists (for login) or create new user (for signup)
    let user;
    
    if (args.isSignup) {
      // Check if user already exists
      const existingUser = await ctx.db
        .query("vendors")
        .withIndex("by_user", (q) => q.eq("userId", args.email))
        .first();
      
      if (!existingUser) {
        const existingSupplier = await ctx.db
          .query("suppliers")
          .withIndex("by_user", (q) => q.eq("userId", args.email))
          .first();
        
        if (existingSupplier) {
          throw new Error("User already exists");
        }
      } else {
        throw new Error("User already exists");
      }

      // Create new user profile
      const userData = {
        userId: args.email,
        businessName: `${args.firstName || 'New'} ${args.role}`,
        ownerName: `${args.firstName || ''} ${args.lastName || ''}`.trim(),
        email: args.email,
        phone: "",
        location: {
          address: "",
          city: "",
          state: "",
          pincode: "",
          coordinates: { lat: 0, lng: 0 }
        },
        businessType: "",
        isVerified: false,
        trustScore: 0,
        preferences: {
          maxDeliveryDistance: 10,
          preferredCategories: [],
          budgetRange: { min: 0, max: 10000 },
          qualityPreference: "medium",
          deliveryTimePreference: "flexible"
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      if (args.role === "vendor") {
        const vendorId = await ctx.db.insert("vendors", userData);
        user = { ...userData, _id: vendorId, role: "vendor" };
      } else {
        const supplierData = {
          ...userData,
          categories: [],
          fssaiCertified: false,
          businessHours: {
            open: "09:00",
            close: "18:00",
            days: ["monday", "tuesday", "wednesday", "thursday", "friday"]
          },
          deliveryRadius: 5,
          minimumOrder: 100
        };
        const supplierId = await ctx.db.insert("suppliers", supplierData);
        user = { ...supplierData, _id: supplierId, role: "supplier" };
      }
    } else {
      // Login - find existing user
      let vendor = await ctx.db
        .query("vendors")
        .withIndex("by_user", (q) => q.eq("userId", args.email))
        .first();
      
      let supplier = await ctx.db
        .query("suppliers")
        .withIndex("by_user", (q) => q.eq("userId", args.email))
        .first();

      if (!vendor && !supplier) {
        throw new Error("User not found");
      }

      user = vendor ? { ...vendor, role: "vendor" } : { ...supplier, role: "supplier" };
    }

    return {
      success: true,
      user: {
        id: user.userId,
        email: user.email,
        firstName: user.ownerName?.split(' ')[0] || '',
        lastName: user.ownerName?.split(' ').slice(1).join(' ') || '',
        role: user.role,
        profileId: user._id
      }
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
