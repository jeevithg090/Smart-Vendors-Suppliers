import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createSampleSuppliers = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if suppliers already exist
    const existingSuppliers = await ctx.db.query("suppliers").collect();
    if (existingSuppliers.length > 0) {
      return { message: "Sample suppliers already exist", count: existingSuppliers.length };
    }

    const sampleSuppliers = [
      {
        userId: "supplier_001",
        businessName: "Green Valley Farms",
        ownerName: "Rajesh Kumar",
        email: "rajesh@greenvalley.com",
        phone: "+91 98765 43210",
        location: {
          address: "123 Farm Road, Green Valley",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400001",
          coordinates: { lat: 19.0760, lng: 72.8777 }
        },
        categories: ["Vegetables", "Fruits", "Organic Produce"],
        fssaiCertified: true,
        fssaiLicense: "12345678901234",
        businessHours: {
          open: "06:00",
          close: "20:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        },
        deliveryRadius: 25,
        minimumOrder: 1000,
        priceRange: { min: 10, max: 500 },
        isVerified: true,
        trustScore: 4.5,
        totalOrders: 150,
        description: "Premium quality vegetables and fruits directly from our organic farms"
      },
      {
        userId: "supplier_002",
        businessName: "Metro Spice Trading",
        ownerName: "Priya Sharma",
        email: "priya@metrospice.com",
        phone: "+91 98765 43211",
        location: {
          address: "456 Spice Market Street",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400002",
          coordinates: { lat: 19.0760, lng: 72.8777 }
        },
        categories: ["Spices & Condiments", "Grains & Cereals", "Dry Fruits"],
        fssaiCertified: true,
        fssaiLicense: "12345678901235",
        businessHours: {
          open: "08:00",
          close: "18:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        },
        deliveryRadius: 30,
        minimumOrder: 2000,
        priceRange: { min: 50, max: 1000 },
        isVerified: true,
        trustScore: 4.3,
        totalOrders: 200,
        description: "Authentic spices and grains sourced from the best regions across India"
      },
      {
        userId: "supplier_003",
        businessName: "Fresh Dairy Co-op",
        ownerName: "Amit Patel",
        email: "amit@freshdairy.com",
        phone: "+91 98765 43212",
        location: {
          address: "789 Dairy Lane",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400003",
          coordinates: { lat: 19.0760, lng: 72.8777 }
        },
        categories: ["Dairy Products", "Eggs", "Beverages"],
        fssaiCertified: true,
        fssaiLicense: "12345678901236",
        businessHours: {
          open: "05:00",
          close: "22:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        },
        deliveryRadius: 20,
        minimumOrder: 500,
        priceRange: { min: 15, max: 300 },
        isVerified: true,
        trustScore: 4.7,
        totalOrders: 300,
        description: "Fresh dairy products delivered daily from our certified dairy farms"
      },
      {
        userId: "supplier_004",
        businessName: "Ocean Fresh Seafood",
        ownerName: "Rahul Nair",
        email: "rahul@oceanfresh.com",
        phone: "+91 98765 43213",
        location: {
          address: "321 Harbor View",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400004",
          coordinates: { lat: 19.0760, lng: 72.8777 }
        },
        categories: ["Seafood", "Fish", "Frozen Foods"],
        fssaiCertified: true,
        fssaiLicense: "12345678901237",
        businessHours: {
          open: "04:00",
          close: "16:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        },
        deliveryRadius: 35,
        minimumOrder: 1500,
        priceRange: { min: 100, max: 2000 },
        isVerified: true,
        trustScore: 4.4,
        totalOrders: 120,
        description: "Fresh catch seafood delivered daily from Mumbai's premier fishing harbor"
      },
      {
        userId: "supplier_005",
        businessName: "Grain Masters Wholesale",
        ownerName: "Sunita Agarwal",
        email: "sunita@grainmasters.com",
        phone: "+91 98765 43214",
        location: {
          address: "555 Wholesale Market",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400005",
          coordinates: { lat: 19.0760, lng: 72.8777 }
        },
        categories: ["Grains & Cereals", "Pulses", "Rice", "Wheat"],
        fssaiCertified: true,
        fssaiLicense: "12345678901238",
        businessHours: {
          open: "07:00",
          close: "19:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        },
        deliveryRadius: 40,
        minimumOrder: 5000,
        priceRange: { min: 30, max: 800 },
        isVerified: true,
        trustScore: 4.2,
        totalOrders: 180,
        description: "Bulk grains and cereals at wholesale prices for restaurants and food businesses"
      }
    ];

    const results = [];
    for (const supplier of sampleSuppliers) {
      const supplierId = await ctx.db.insert("suppliers", {
        ...supplier,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      results.push(supplierId);
    }

    return { message: "Sample suppliers created successfully", count: results.length, ids: results };
  },
});
