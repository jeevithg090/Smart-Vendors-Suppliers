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
        userId: "supplier1@example.com",
        businessName: "Fresh Vegetables Hub",
        ownerName: "Rajesh Kumar",
        email: "supplier1@example.com",
        phone: "+91 98765 43210",
        location: {
          address: "123 Market Street, Andheri West",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400058",
          coordinates: { lat: 19.1136, lng: 72.8697 }
        },
        categories: ["Vegetables", "Fruits", "Herbs"],
        fssaiCertified: true,
        fssaiLicense: "12345678901234",
        isVerified: true,
        trustScore: 4.5,
        businessHours: {
          open: "06:00",
          close: "20:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        },
        deliveryRadius: 15,
        minimumOrder: 500,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        userId: "supplier2@example.com",
        businessName: "Spice Palace Wholesale",
        ownerName: "Priya Sharma",
        email: "supplier2@example.com",
        phone: "+91 98765 43211",
        location: {
          address: "456 Spice Market, Chandni Chowk",
          city: "Delhi",
          state: "Delhi",
          pincode: "110006",
          coordinates: { lat: 28.6562, lng: 77.2410 }
        },
        categories: ["Spices", "Condiments", "Oil & Ghee"],
        fssaiCertified: true,
        fssaiLicense: "12345678901235",
        isVerified: true,
        trustScore: 4.2,
        businessHours: {
          open: "08:00",
          close: "19:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        },
        deliveryRadius: 20,
        minimumOrder: 1000,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        userId: "supplier3@example.com",
        businessName: "Grain Master Supplies",
        ownerName: "Suresh Patel",
        email: "supplier3@example.com",
        phone: "+91 98765 43212",
        location: {
          address: "789 Grain Market, Koramangala",
          city: "Bangalore",
          state: "Karnataka",
          pincode: "560034",
          coordinates: { lat: 12.9279, lng: 77.6271 }
        },
        categories: ["Grains & Cereals", "Pulses", "Rice"],
        fssaiCertified: true,
        fssaiLicense: "12345678901236",
        isVerified: true,
        trustScore: 4.7,
        businessHours: {
          open: "07:00",
          close: "18:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        },
        deliveryRadius: 25,
        minimumOrder: 2000,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        userId: "supplier4@example.com",
        businessName: "Dairy Fresh Direct",
        ownerName: "Meera Reddy",
        email: "supplier4@example.com",
        phone: "+91 98765 43213",
        location: {
          address: "321 Dairy Colony, T. Nagar",
          city: "Chennai",
          state: "Tamil Nadu",
          pincode: "600017",
          coordinates: { lat: 13.0389, lng: 80.2619 }
        },
        categories: ["Dairy Products", "Milk", "Cheese"],
        fssaiCertified: true,
        fssaiLicense: "12345678901237",
        isVerified: true,
        trustScore: 4.3,
        businessHours: {
          open: "05:00",
          close: "21:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        },
        deliveryRadius: 12,
        minimumOrder: 300,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        userId: "supplier5@example.com",
        businessName: "Mumbai Meat & Poultry",
        ownerName: "Ahmed Khan",
        email: "supplier5@example.com",
        phone: "+91 98765 43214",
        location: {
          address: "654 Meat Market, Bandra East",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400051",
          coordinates: { lat: 19.0596, lng: 72.8656 }
        },
        categories: ["Meat & Poultry", "Seafood", "Eggs"],
        fssaiCertified: true,
        fssaiLicense: "12345678901238",
        isVerified: true,
        trustScore: 4.1,
        businessHours: {
          open: "06:00",
          close: "22:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        },
        deliveryRadius: 18,
        minimumOrder: 800,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        userId: "supplier6@example.com",
        businessName: "Packaging Pro Solutions",
        ownerName: "Vikram Singh",
        email: "supplier6@example.com",
        phone: "+91 98765 43215",
        location: {
          address: "987 Industrial Area, Sector 18",
          city: "Pune",
          state: "Maharashtra",
          pincode: "411018",
          coordinates: { lat: 18.5679, lng: 73.9143 }
        },
        categories: ["Packaging Materials", "Containers", "Disposables"],
        fssaiCertified: false,
        isVerified: true,
        trustScore: 3.9,
        businessHours: {
          open: "09:00",
          close: "18:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        },
        deliveryRadius: 30,
        minimumOrder: 1500,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        userId: "supplier7@example.com",
        businessName: "Kolkata Fish Market",
        ownerName: "Ravi Ghosh",
        email: "supplier7@example.com",
        phone: "+91 98765 43216",
        location: {
          address: "147 Fish Market, Howrah",
          city: "Kolkata",
          state: "West Bengal",
          pincode: "711101",
          coordinates: { lat: 22.5958, lng: 88.2636 }
        },
        categories: ["Seafood", "Fish", "Prawns"],
        fssaiCertified: true,
        fssaiLicense: "12345678901239",
        isVerified: true,
        trustScore: 4.4,
        businessHours: {
          open: "04:00",
          close: "16:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        },
        deliveryRadius: 22,
        minimumOrder: 600,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        userId: "supplier8@example.com",
        businessName: "Hyderabad Snacks Central",
        ownerName: "Lakshmi Devi",
        email: "supplier8@example.com",
        phone: "+91 98765 43217",
        location: {
          address: "258 Snacks Street, Secunderabad",
          city: "Hyderabad",
          state: "Telangana",
          pincode: "500003",
          coordinates: { lat: 17.4399, lng: 78.4983 }
        },
        categories: ["Snacks & Beverages", "Ready-to-eat", "Namkeen"],
        fssaiCertified: true,
        fssaiLicense: "12345678901240",
        isVerified: true,
        trustScore: 4.0,
        businessHours: {
          open: "08:00",
          close: "20:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        },
        deliveryRadius: 16,
        minimumOrder: 400,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    const supplierIds = [];
    for (const supplier of sampleSuppliers) {
      const id = await ctx.db.insert("suppliers", supplier);
      supplierIds.push(id);
    }

    // Create sample inventory for each supplier
    const sampleInventoryItems = [
      // Fresh Vegetables Hub
      { supplierId: supplierIds[0], items: [
        { itemName: "Onions", category: "Vegetables", currentStock: 500, unit: "kg", pricePerUnit: 25, minimumOrder: 10, quality: "Grade A" },
        { itemName: "Tomatoes", category: "Vegetables", currentStock: 300, unit: "kg", pricePerUnit: 35, minimumOrder: 5, quality: "Grade A" },
        { itemName: "Potatoes", category: "Vegetables", currentStock: 800, unit: "kg", pricePerUnit: 20, minimumOrder: 20, quality: "Grade A" },
        { itemName: "Carrots", category: "Vegetables", currentStock: 200, unit: "kg", pricePerUnit: 40, minimumOrder: 5, quality: "Grade A" },
        { itemName: "Green Chilies", category: "Vegetables", currentStock: 50, unit: "kg", pricePerUnit: 80, minimumOrder: 2, quality: "Grade A" }
      ]},
      // Spice Palace Wholesale
      { supplierId: supplierIds[1], items: [
        { itemName: "Turmeric Powder", category: "Spices", currentStock: 100, unit: "kg", pricePerUnit: 180, minimumOrder: 5, quality: "Premium" },
        { itemName: "Red Chili Powder", category: "Spices", currentStock: 150, unit: "kg", pricePerUnit: 220, minimumOrder: 5, quality: "Premium" },
        { itemName: "Cumin Seeds", category: "Spices", currentStock: 80, unit: "kg", pricePerUnit: 450, minimumOrder: 2, quality: "Premium" },
        { itemName: "Mustard Oil", category: "Oil & Ghee", currentStock: 200, unit: "liter", pricePerUnit: 120, minimumOrder: 10, quality: "Pure" },
        { itemName: "Garam Masala", category: "Spices", currentStock: 60, unit: "kg", pricePerUnit: 380, minimumOrder: 2, quality: "Premium" }
      ]},
      // Grain Master Supplies
      { supplierId: supplierIds[2], items: [
        { itemName: "Basmati Rice", category: "Grains & Cereals", currentStock: 1000, unit: "kg", pricePerUnit: 85, minimumOrder: 50, quality: "Premium" },
        { itemName: "Wheat Flour", category: "Grains & Cereals", currentStock: 800, unit: "kg", pricePerUnit: 35, minimumOrder: 25, quality: "Grade A" },
        { itemName: "Toor Dal", category: "Pulses", currentStock: 300, unit: "kg", pricePerUnit: 120, minimumOrder: 10, quality: "Grade A" },
        { itemName: "Moong Dal", category: "Pulses", currentStock: 250, unit: "kg", pricePerUnit: 110, minimumOrder: 10, quality: "Grade A" },
        { itemName: "Chana Dal", category: "Pulses", currentStock: 200, unit: "kg", pricePerUnit: 90, minimumOrder: 10, quality: "Grade A" }
      ]},
      // Dairy Fresh Direct
      { supplierId: supplierIds[3], items: [
        { itemName: "Fresh Milk", category: "Dairy Products", currentStock: 500, unit: "liter", pricePerUnit: 45, minimumOrder: 20, quality: "Grade A" },
        { itemName: "Paneer", category: "Dairy Products", currentStock: 100, unit: "kg", pricePerUnit: 280, minimumOrder: 5, quality: "Fresh" },
        { itemName: "Curd", category: "Dairy Products", currentStock: 200, unit: "kg", pricePerUnit: 60, minimumOrder: 10, quality: "Fresh" },
        { itemName: "Butter", category: "Dairy Products", currentStock: 80, unit: "kg", pricePerUnit: 320, minimumOrder: 2, quality: "Premium" },
        { itemName: "Cheese Slices", category: "Dairy Products", currentStock: 150, unit: "pack", pricePerUnit: 180, minimumOrder: 5, quality: "Premium" }
      ]},
      // Mumbai Meat & Poultry
      { supplierId: supplierIds[4], items: [
        { itemName: "Chicken Breast", category: "Meat & Poultry", currentStock: 200, unit: "kg", pricePerUnit: 180, minimumOrder: 5, quality: "Fresh" },
        { itemName: "Mutton", category: "Meat & Poultry", currentStock: 100, unit: "kg", pricePerUnit: 450, minimumOrder: 2, quality: "Fresh" },
        { itemName: "Fish Fillet", category: "Seafood", currentStock: 150, unit: "kg", pricePerUnit: 220, minimumOrder: 3, quality: "Fresh" },
        { itemName: "Prawns", category: "Seafood", currentStock: 80, unit: "kg", pricePerUnit: 380, minimumOrder: 2, quality: "Fresh" },
        { itemName: "Eggs", category: "Eggs", currentStock: 1000, unit: "pieces", pricePerUnit: 6, minimumOrder: 50, quality: "Grade A" }
      ]},
      // Packaging Pro Solutions
      { supplierId: supplierIds[5], items: [
        { itemName: "Food Containers", category: "Packaging Materials", currentStock: 2000, unit: "pieces", pricePerUnit: 8, minimumOrder: 100, quality: "Food Grade" },
        { itemName: "Paper Bags", category: "Packaging Materials", currentStock: 5000, unit: "pieces", pricePerUnit: 2, minimumOrder: 500, quality: "Eco-friendly" },
        { itemName: "Aluminum Foil", category: "Packaging Materials", currentStock: 200, unit: "roll", pricePerUnit: 150, minimumOrder: 10, quality: "Food Grade" },
        { itemName: "Plastic Cups", category: "Disposables", currentStock: 3000, unit: "pieces", pricePerUnit: 3, minimumOrder: 200, quality: "Food Grade" },
        { itemName: "Napkins", category: "Disposables", currentStock: 1000, unit: "pack", pricePerUnit: 25, minimumOrder: 20, quality: "Premium" }
      ]},
      // Kolkata Fish Market
      { supplierId: supplierIds[6], items: [
        { itemName: "Hilsa Fish", category: "Seafood", currentStock: 100, unit: "kg", pricePerUnit: 800, minimumOrder: 2, quality: "Fresh" },
        { itemName: "Rohu Fish", category: "Fish", currentStock: 200, unit: "kg", pricePerUnit: 180, minimumOrder: 5, quality: "Fresh" },
        { itemName: "Katla Fish", category: "Fish", currentStock: 150, unit: "kg", pricePerUnit: 160, minimumOrder: 5, quality: "Fresh" },
        { itemName: "Tiger Prawns", category: "Prawns", currentStock: 80, unit: "kg", pricePerUnit: 450, minimumOrder: 2, quality: "Fresh" },
        { itemName: "Crab", category: "Seafood", currentStock: 60, unit: "kg", pricePerUnit: 350, minimumOrder: 2, quality: "Fresh" }
      ]},
      // Hyderabad Snacks Central
      { supplierId: supplierIds[7], items: [
        { itemName: "Mixture", category: "Snacks & Beverages", currentStock: 200, unit: "kg", pricePerUnit: 180, minimumOrder: 5, quality: "Fresh" },
        { itemName: "Samosa", category: "Ready-to-eat", currentStock: 500, unit: "pieces", pricePerUnit: 8, minimumOrder: 50, quality: "Fresh" },
        { itemName: "Bhujia", category: "Namkeen", currentStock: 150, unit: "kg", pricePerUnit: 220, minimumOrder: 5, quality: "Fresh" },
        { itemName: "Chakli", category: "Namkeen", currentStock: 100, unit: "kg", pricePerUnit: 200, minimumOrder: 3, quality: "Fresh" },
        { itemName: "Soft Drinks", category: "Snacks & Beverages", currentStock: 300, unit: "bottles", pricePerUnit: 25, minimumOrder: 24, quality: "Branded" }
      ]}
    ];

    // Insert inventory items
    for (const supplierInventory of sampleInventoryItems) {
      for (const item of supplierInventory.items) {
        await ctx.db.insert("inventory", {
          supplierId: supplierInventory.supplierId,
          itemName: item.itemName,
          category: item.category,
          currentStock: item.currentStock,
          unit: item.unit,
          pricePerUnit: item.pricePerUnit,
          minimumOrder: item.minimumOrder,
          quality: item.quality,
          lastUpdated: Date.now(),
          isAvailable: item.currentStock > 0
        });
      }
    }

    return { 
      message: "Sample suppliers and inventory created successfully", 
      suppliersCount: supplierIds.length,
      inventoryCount: sampleInventoryItems.reduce((sum, s) => sum + s.items.length, 0)
    };
  },
});