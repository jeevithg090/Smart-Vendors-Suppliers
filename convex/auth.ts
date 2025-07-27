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

// Manual authentication functions - UPDATED 2025-01-26
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
    try {
      console.log("Auth request:", { email: args.email, role: args.role, isSignup: args.isSignup });
      
      // Basic validation
      if (!args.email || args.password.length < 4) {
        throw new Error("Invalid credentials");
      }

      if (args.isSignup) {
        return await handleSignup(ctx, args);
      } else {
        return await handleLogin(ctx, args);
      }
    } catch (error) {
      console.error("Auth error:", error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  },
});

// Separate signup handler
async function handleSignup(ctx: any, args: any) {
  console.log("Processing signup for:", args.role);
  
  if (args.role === "vendor") {
    // Check if vendor already exists
    const existingVendor = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q: any) => q.eq("userId", args.email))
      .first();

    if (existingVendor) {
      throw new Error("A vendor account with this email already exists");
    }

    // Create new vendor
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
    console.log("Vendor created with ID:", vendorId);
    
    return {
      success: true,
      user: {
        id: vendorData.userId,
        email: vendorData.email,
        firstName: vendorData.ownerName?.split(' ')[0] || '',
        lastName: vendorData.ownerName?.split(' ').slice(1).join(' ') || '',
        role: "vendor",
        profileId: vendorId
      }
    };
  } else {
    // Check if supplier already exists
    const existingSupplier = await ctx.db
      .query("suppliers")
      .withIndex("by_user", (q: any) => q.eq("userId", args.email))
      .first();

    if (existingSupplier) {
      throw new Error("A supplier account with this email already exists");
    }

    // Create new supplier
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
    console.log("Supplier created with ID:", supplierId);
    
    return {
      success: true,
      user: {
        id: supplierData.userId,
        email: supplierData.email,
        firstName: supplierData.ownerName?.split(' ')[0] || '',
        lastName: supplierData.ownerName?.split(' ').slice(1).join(' ') || '',
        role: "supplier",
        profileId: supplierId
      }
    };
  }
}

// Separate login handler
async function handleLogin(ctx: any, args: any) {
  console.log("Processing login for:", args.role, "email:", args.email);
  
  try {
    // Query for both vendor and supplier
    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q: any) => q.eq("userId", args.email))
      .first();

    const supplier = await ctx.db
      .query("suppliers")
      .withIndex("by_user", (q: any) => q.eq("userId", args.email))
      .first();

    console.log("Login query results - vendor exists:", !!vendor, "supplier exists:", !!supplier);

    // Check if any account exists
    if (!vendor && !supplier) {
      throw new Error("No account found with this email. Please sign up first.");
    }

    // Check role-specific access
    if (args.role === "vendor") {
      if (!vendor) {
        if (supplier) {
          throw new Error("You have a supplier account with this email. Please select 'Supplier' to log in.");
        } else {
          throw new Error("No vendor account found with this email. Please sign up as a vendor.");
        }
      }
      
      return {
        success: true,
        user: {
          id: vendor.userId,
          email: vendor.email,
          firstName: vendor.ownerName?.split(' ')[0] || '',
          lastName: vendor.ownerName?.split(' ').slice(1).join(' ') || '',
          role: "vendor",
          profileId: vendor._id
        }
      };
    } else { // supplier
      if (!supplier) {
        if (vendor) {
          throw new Error("You have a vendor account with this email. Please select 'Vendor' to log in.");
        } else {
          throw new Error("No supplier account found with this email. Please sign up as a supplier.");
        }
      }
      
      return {
        success: true,
        user: {
          id: supplier.userId,
          email: supplier.email,
          firstName: supplier.ownerName?.split(' ')[0] || '',
          lastName: supplier.ownerName?.split(' ').slice(1).join(' ') || '',
          role: "supplier",
          profileId: supplier._id
        }
      };
    }
  } catch (dbError) {
    console.error("Database error during login:", dbError);
    throw new Error(`Login failed: ${dbError.message}`);
  }
}

// Get user profile by email
export const getUserProfile = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q: any) => q.eq("userId", args.email))
      .first();
    
    const supplier = await ctx.db
      .query("suppliers")
      .withIndex("by_user", (q: any) => q.eq("userId", args.email))
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
