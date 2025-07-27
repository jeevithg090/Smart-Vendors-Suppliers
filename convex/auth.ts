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
      // Check if user already exists in the role they're trying to sign up for
      if (args.role === "vendor") {
        const existingVendor = await ctx.db
          .query("vendors")
          .withIndex("by_user", (q) => q.eq("userId", args.email))
          .first();

        if (existingVendor) {
          throw new Error("A vendor account with this email already exists");
        }
      } else {
        const existingSupplier = await ctx.db
          .query("suppliers")
          .withIndex("by_user", (q) => q.eq("userId", args.email))
          .first();

        if (existingSupplier) {
          throw new Error("A supplier account with this email already exists");
        }
      }

      // Create new user profile based on role
      if (args.role === "vendor") {
        const vendorData = {
          userId: args.email,
          businessName: `${args.firstName || 'New'} Vendor`,
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

        const vendorId = await ctx.db.insert("vendors", vendorData);
        user = { ...vendorData, _id: vendorId, role: "vendor" };
      } else {
        // Create supplier data object with only valid supplier fields
        const supplierData = {
          userId: args.email,
          businessName: `${args.firstName || 'New'} Supplier`,
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
          categories: [],
          fssaiCertified: false,
          isVerified: false,
          trustScore: 0,
          businessHours: {
            open: "09:00",
            close: "18:00",
            days: ["monday", "tuesday", "wednesday", "thursday", "friday"]
          },
          deliveryRadius: 5,
          minimumOrder: 100,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        const supplierId = await ctx.db.insert("suppliers", supplierData);
        user = { ...supplierData, _id: supplierId, role: "supplier" };
      }
    } else {
      // Login - find existing user and check if they have the requested role
      const vendor = await ctx.db
        .query("vendors")
        .withIndex("by_user", (q) => q.eq("userId", args.email))
        .first();

      const supplier = await ctx.db
        .query("suppliers")
        .withIndex("by_user", (q) => q.eq("userId", args.email))
        .first();

      // Check if user exists in any table
      if (!vendor && !supplier) {
        throw new Error("No account found with this email. Please sign up first.");
      }

      // Check if user has account for the selected role
      if (args.role === "vendor" && !vendor) {
        if (supplier) {
          throw new Error("You have a supplier account with this email. Please select 'Supplier' to log in, or sign up for a new vendor account.");
        } else {
          throw new Error("No vendor account found with this email. Please sign up as a vendor.");
        }
      }

      if (args.role === "supplier" && !supplier) {
        if (vendor) {
          throw new Error("You have a vendor account with this email. Please select 'Vendor' to log in, or sign up for a new supplier account.");
        } else {
          throw new Error("No supplier account found with this email. Please sign up as a supplier.");
        }
      }

      // Login with the correct role
      if (args.role === "vendor") {
        user = { ...vendor, role: "vendor" };
      } else {
        user = { ...supplier, role: "supplier" };
      }
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
