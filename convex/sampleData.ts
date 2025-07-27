import { mutation } from "./_generated/server";
import { query } from "./_generated/server";

// Sample data for testing supplier search functionality
export const addSampleSuppliers = mutation({
  args: {},
  handler: async (ctx) => {
    const sampleSuppliers = [
      {
        userId: "sample_user_1",
        businessName: "Fresh Vegetables Mumbai",
        ownerName: "Rajesh Kumar",
        email: "rajesh@freshveggies.com",
        phone: "+91 9876543210",
        location: {
          address: "Shop 15, Crawford Market",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400001",
          coordinates: { lat: 18.9667, lng: 72.8333 }
        },
        categories: ["Vegetables", "Fruits", "Spices & Condiments"],
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
        userId: "sample_user_2",
        businessName: "Spice Palace Delhi",
        ownerName: "Amit Sharma",
        email: "amit@spicepalace.com",
        phone: "+91 9876543211",
        location: {
          address: "Khari Baoli, Old Delhi",
          city: "Delhi",
          state: "Delhi",
          pincode: "110006",
          coordinates: { lat: 28.6562, lng: 77.2410 }
        },
        categories: ["Spices & Condiments", "Oil & Ghee", "Grains & Cereals"],
        fssaiCertified: true,
        fssaiLicense: "12345678901235",
        isVerified: true,
        trustScore: 4.2,
        businessHours: {
          open: "08:00",
          close: "19:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        },
        deliveryRadius: 25,
        minimumOrder: 1000,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        userId: "sample_user_3",
        businessName: "Bangalore Dairy Co-op",
        ownerName: "Suresh Reddy",
        email: "suresh@bangaloredairy.com",
        phone: "+91 9876543212",
        location: {
          address: "KR Market, Bangalore",
          city: "Bangalore",
          state: "Karnataka",
          pincode: "560002",
          coordinates: { lat: 12.9716, lng: 77.5946 }
        },
        categories: ["Dairy Products", "Vegetables", "Fruits"],
        fssaiCertified: true,
        fssaiLicense: "12345678901236",
        isVerified: true,
        trustScore: 4.7,
        businessHours: {
          open: "05:00",
          close: "21:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        },
        deliveryRadius: 20,
        minimumOrder: 300,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        userId: "sample_user_4",
        businessName: "Chennai Seafood Hub",
        ownerName: "Murugan Pillai",
        email: "murugan@seafoodhub.com",
        phone: "+91 9876543213",
        location: {
          address: "Kasimedu Fish Market",
          city: "Chennai",
          state: "Tamil Nadu",
          pincode: "600013",
          coordinates: { lat: 13.0827, lng: 80.2707 }
        },
        categories: ["Seafood", "Meat & Poultry"],
        fssaiCertified: false,
        isVerified: false,
        trustScore: 3.8,
        businessHours: {
          open: "04:00",
          close: "12:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        },
        deliveryRadius: 12,
        minimumOrder: 800,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        userId: "sample_user_5",
        businessName: "Mumbai Grains & More",
        ownerName: "Priya Patel",
        email: "priya@mumbaigrains.com",
        phone: "+91 9876543214",
        location: {
          address: "Dadar Market, Mumbai",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400014",
          coordinates: { lat: 19.0176, lng: 72.8562 }
        },
        categories: ["Grains & Cereals", "Oil & Ghee", "Packaging Materials"],
        fssaiCertified: true,
        fssaiLicense: "12345678901237",
        isVerified: true,
        trustScore: 4.1,
        businessHours: {
          open: "07:00",
          close: "18:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        },
        deliveryRadius: 18,
        minimumOrder: 600,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    // Insert sample suppliers
    const supplierIds = [];
    for (const supplier of sampleSuppliers) {
      const id = await ctx.db.insert("suppliers", supplier);
      supplierIds.push(id);
    }

    // Add sample inventory for each supplier
    const sampleInventory = [
      // Fresh Vegetables Mumbai
      {
        supplierId: supplierIds[0],
        itemName: "Tomatoes",
        category: "Vegetables",
        currentStock: 500,
        unit: "kg",
        pricePerUnit: 25,
        minimumOrder: 10,
        quality: "Grade A",
        lastUpdated: Date.now(),
        isAvailable: true
      },
      {
        supplierId: supplierIds[0],
        itemName: "Onions",
        category: "Vegetables",
        currentStock: 800,
        unit: "kg",
        pricePerUnit: 20,
        minimumOrder: 15,
        quality: "Grade A",
        lastUpdated: Date.now(),
        isAvailable: true
      },
      {
        supplierId: supplierIds[0],
        itemName: "Potatoes",
        category: "Vegetables",
        currentStock: 1000,
        unit: "kg",
        pricePerUnit: 18,
        minimumOrder: 20,
        quality: "Grade A",
        lastUpdated: Date.now(),
        isAvailable: true
      },
      // Spice Palace Delhi
      {
        supplierId: supplierIds[1],
        itemName: "Turmeric Powder",
        category: "Spices & Condiments",
        currentStock: 200,
        unit: "kg",
        pricePerUnit: 180,
        minimumOrder: 5,
        quality: "Premium",
        lastUpdated: Date.now(),
        isAvailable: true
      },
      {
        supplierId: supplierIds[1],
        itemName: "Red Chili Powder",
        category: "Spices & Condiments",
        currentStock: 150,
        unit: "kg",
        pricePerUnit: 220,
        minimumOrder: 5,
        quality: "Premium",
        lastUpdated: Date.now(),
        isAvailable: true
      },
      // Bangalore Dairy Co-op
      {
        supplierId: supplierIds[2],
        itemName: "Fresh Milk",
        category: "Dairy Products",
        currentStock: 500,
        unit: "liters",
        pricePerUnit: 45,
        minimumOrder: 20,
        quality: "Grade A",
        expiryDate: Date.now() + (2 * 24 * 60 * 60 * 1000), // 2 days from now
        lastUpdated: Date.now(),
        isAvailable: true
      },
      {
        supplierId: supplierIds[2],
        itemName: "Paneer",
        category: "Dairy Products",
        currentStock: 50,
        unit: "kg",
        pricePerUnit: 280,
        minimumOrder: 2,
        quality: "Fresh",
        expiryDate: Date.now() + (3 * 24 * 60 * 60 * 1000), // 3 days from now
        lastUpdated: Date.now(),
        isAvailable: true
      }
    ];

    // Insert sample inventory
    for (const item of sampleInventory) {
      await ctx.db.insert("inventory", item);
    }

    // Note: Price alerts will be added when vendors are created

    return {
      suppliersCreated: supplierIds.length,
      inventoryItemsCreated: sampleInventory.length,
      supplierIds
    };
  },
});

// Add sample vendor data for testing recommendations
export const addSampleVendor = mutation({
  args: {},
  handler: async (ctx) => {
    const sampleVendor = {
      userId: "sample_vendor_1",
      businessName: "Mumbai Street Delights",
      ownerName: "Ravi Sharma",
      email: "ravi@streetdelights.com",
      phone: "+91 9876543220",
      location: {
        address: "Linking Road, Bandra",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400050",
        coordinates: { lat: 19.0544, lng: 72.8347 }
      },
      businessType: "Street Food Vendor",
      fssaiLicense: "11223344556677",
      isVerified: true,
      trustScore: 3.8,
      preferences: {
        maxDeliveryDistance: 20,
        preferredCategories: ["Vegetables", "Spices & Condiments", "Oil & Ghee"],
        budgetRange: {
          min: 100,
          max: 5000
        },
        qualityPreference: "Grade A",
        deliveryTimePreference: "Same Day"
      },
      // --- Workflow Progress Fields ---
      currentWorkflowStep: 'discover',
      lastActivity: Date.now(),
      discoveryCompleted: true,
      recommendationsViewed: false,
      groupOrderParticipated: false,
      firstOrderPlaced: false,
      inventoryTracked: false,
      priceAlertsSet: false,
      financialAnalyticsViewed: false,
      communicationUsed: false,
      // --- End Workflow Progress Fields ---
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const vendorId = await ctx.db.insert("vendors", sampleVendor);

    // Add some sample order history for the vendor
    const suppliers = await ctx.db.query("suppliers").collect();
    const mumbaiSuppliers = suppliers.filter(s => s.location.city === "Mumbai");

    if (mumbaiSuppliers.length > 0) {
      const sampleOrders = [
        {
          vendorId,
          supplierId: mumbaiSuppliers[0]._id,
          items: [
            {
              itemName: "Tomatoes",
              quantity: 20,
              unit: "kg",
              pricePerUnit: 25,
              totalPrice: 500
            },
            {
              itemName: "Onions",
              quantity: 15,
              unit: "kg",
              pricePerUnit: 20,
              totalPrice: 300
            }
          ],
          totalCost: 800,
          status: "delivered",
          orderType: "individual",
          deliveryAddress: "Linking Road, Bandra, Mumbai",
          estimatedDelivery: Date.now() - (2 * 24 * 60 * 60 * 1000),
          actualDelivery: Date.now() - (2 * 24 * 60 * 60 * 1000),
          paymentStatus: "paid",
          paymentMethod: "cash",
          createdAt: Date.now() - (3 * 24 * 60 * 60 * 1000),
          updatedAt: Date.now() - (2 * 24 * 60 * 60 * 1000)
        },
        {
          vendorId,
          supplierId: mumbaiSuppliers[0]._id,
          items: [
            {
              itemName: "Potatoes",
              quantity: 25,
              unit: "kg",
              pricePerUnit: 18,
              totalPrice: 450
            }
          ],
          totalCost: 450,
          status: "delivered",
          orderType: "individual",
          deliveryAddress: "Linking Road, Bandra, Mumbai",
          estimatedDelivery: Date.now() - (5 * 24 * 60 * 60 * 1000),
          actualDelivery: Date.now() - (5 * 24 * 60 * 60 * 1000),
          paymentStatus: "paid",
          paymentMethod: "cash",
          createdAt: Date.now() - (6 * 24 * 60 * 60 * 1000),
          updatedAt: Date.now() - (5 * 24 * 60 * 60 * 1000)
        }
      ];

      const orderIds = [];
      for (const order of sampleOrders) {
        const orderId = await ctx.db.insert("orders", order);
        orderIds.push(orderId);
      }

      // Add sample ratings
      const sampleRatings = [
        {
          vendorId,
          supplierId: mumbaiSuppliers[0]._id,
          orderId: orderIds[0],
          rating: 4,
          review: "Good quality vegetables, timely delivery",
          categories: {
            quality: 4,
            delivery: 4,
            communication: 4,
            pricing: 4
          },
          createdAt: Date.now() - (2 * 24 * 60 * 60 * 1000)
        },
        {
          vendorId,
          supplierId: mumbaiSuppliers[0]._id,
          orderId: orderIds[1],
          rating: 5,
          review: "Excellent potatoes, very fresh",
          categories: {
            quality: 5,
            delivery: 5,
            communication: 4,
            pricing: 5
          },
          createdAt: Date.now() - (5 * 24 * 60 * 60 * 1000)
        }
      ];

      for (const rating of sampleRatings) {
        await ctx.db.insert("ratings", rating);
      }

      return {
        vendorId,
        ordersCreated: orderIds.length,
        ratingsCreated: sampleRatings.length
      };
    }

    return { vendorId };
  },
});

// Add sample group orders for testing
export const addSampleGroupOrders = mutation({
  args: {},
  handler: async (ctx) => {
    // Get existing vendors and suppliers
    const vendors = await ctx.db.query("vendors").collect();
    const suppliers = await ctx.db.query("suppliers").collect();
    
    const mumbaiVendors = vendors.filter(v => v.location.city === "Mumbai");
    const mumbaiSuppliers = suppliers.filter(s => s.location.city === "Mumbai");
    
    if (mumbaiVendors.length === 0 || mumbaiSuppliers.length === 0) {
      throw new Error("Need vendors and suppliers in Mumbai to create sample group orders");
    }

    const now = Date.now();
    
    const sampleGroupOrders = [
      {
        initiatorId: mumbaiVendors[0]._id,
        itemName: "Tomatoes",
        category: "Vegetables",
        targetQuantity: 100,
        currentQuantity: 45,
        pricePerUnit: 22, // Bulk discount from regular 25
        participants: [
          {
            vendorId: mumbaiVendors[0]._id,
            quantity: 25,
            joinedAt: now - (2 * 60 * 60 * 1000) // 2 hours ago
          },
          ...(mumbaiVendors.length > 1 ? [{
            vendorId: mumbaiVendors[1]._id,
            quantity: 20,
            joinedAt: now - (1 * 60 * 60 * 1000) // 1 hour ago
          }] : [])
        ],
        supplierId: mumbaiSuppliers[0]._id,
        status: "open",
        location: "Mumbai",
        expiresAt: now + (18 * 60 * 60 * 1000), // 18 hours from now
        createdAt: now - (3 * 60 * 60 * 1000) // 3 hours ago
      },
      {
        initiatorId: mumbaiVendors[0]._id,
        itemName: "Onions",
        category: "Vegetables",
        targetQuantity: 80,
        currentQuantity: 80,
        pricePerUnit: 18, // Bulk discount from regular 20
        participants: [
          {
            vendorId: mumbaiVendors[0]._id,
            quantity: 30,
            joinedAt: now - (6 * 60 * 60 * 1000) // 6 hours ago
          },
          ...(mumbaiVendors.length > 1 ? [{
            vendorId: mumbaiVendors[1]._id,
            quantity: 25,
            joinedAt: now - (4 * 60 * 60 * 1000) // 4 hours ago
          }] : []),
          ...(mumbaiVendors.length > 2 ? [{
            vendorId: mumbaiVendors[2]._id,
            quantity: 25,
            joinedAt: now - (2 * 60 * 60 * 1000) // 2 hours ago
          }] : [])
        ],
        supplierId: mumbaiSuppliers[0]._id,
        status: "locked",
        location: "Mumbai",
        expiresAt: now + (12 * 60 * 60 * 1000), // 12 hours from now
        createdAt: now - (8 * 60 * 60 * 1000) // 8 hours ago
      },
      {
        initiatorId: mumbaiVendors.length > 1 ? mumbaiVendors[1]._id : mumbaiVendors[0]._id,
        itemName: "Potatoes",
        category: "Vegetables",
        targetQuantity: 150,
        currentQuantity: 35,
        pricePerUnit: 16, // Bulk discount from regular 18
        participants: [
          {
            vendorId: mumbaiVendors.length > 1 ? mumbaiVendors[1]._id : mumbaiVendors[0]._id,
            quantity: 35,
            joinedAt: now - (1 * 60 * 60 * 1000) // 1 hour ago
          }
        ],
        supplierId: mumbaiSuppliers[0]._id,
        status: "open",
        location: "Mumbai",
        expiresAt: now + (36 * 60 * 60 * 1000), // 36 hours from now
        createdAt: now - (2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        initiatorId: mumbaiVendors[0]._id,
        itemName: "Cooking Oil",
        category: "Oil & Ghee",
        targetQuantity: 50,
        currentQuantity: 50,
        pricePerUnit: 95, // Bulk discount
        participants: [
          {
            vendorId: mumbaiVendors[0]._id,
            quantity: 20,
            joinedAt: now - (24 * 60 * 60 * 1000) // 1 day ago
          },
          ...(mumbaiVendors.length > 1 ? [{
            vendorId: mumbaiVendors[1]._id,
            quantity: 15,
            joinedAt: now - (20 * 60 * 60 * 1000) // 20 hours ago
          }] : []),
          ...(mumbaiVendors.length > 2 ? [{
            vendorId: mumbaiVendors[2]._id,
            quantity: 15,
            joinedAt: now - (18 * 60 * 60 * 1000) // 18 hours ago
          }] : [])
        ],
        supplierId: mumbaiSuppliers.length > 1 ? mumbaiSuppliers[1]._id : mumbaiSuppliers[0]._id,
        status: "completed",
        location: "Mumbai",
        expiresAt: now - (2 * 60 * 60 * 1000), // Expired 2 hours ago
        createdAt: now - (26 * 60 * 60 * 1000) // 26 hours ago
      }
    ];

    const groupOrderIds = [];
    for (const groupOrder of sampleGroupOrders) {
      const id = await ctx.db.insert("groupOrders", groupOrder);
      groupOrderIds.push(id);
    }

    return {
      groupOrdersCreated: groupOrderIds.length,
      groupOrderIds
    };
  },
});

// Clean up sample data
export const cleanupSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete sample vendors
    const vendors = await ctx.db.query("vendors").collect();
    const sampleVendors = vendors.filter(v => v.userId.startsWith("sample_vendor_"));
    
    for (const vendor of sampleVendors) {
      // Delete orders first
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_vendor", (q) => q.eq("vendorId", vendor._id))
        .collect();
      
      for (const order of orders) {
        await ctx.db.delete(order._id);
      }

      // Delete ratings
      const ratings = await ctx.db
        .query("ratings")
        .withIndex("by_vendor", (q) => q.eq("vendorId", vendor._id))
        .collect();
      
      for (const rating of ratings) {
        await ctx.db.delete(rating._id);
      }

      // Delete recommendations
      const recommendations = await ctx.db
        .query("recommendations")
        .withIndex("by_vendor", (q) => q.eq("vendorId", vendor._id))
        .collect();
      
      for (const rec of recommendations) {
        await ctx.db.delete(rec._id);
      }

      // Delete vendor
      await ctx.db.delete(vendor._id);
    }

    // Delete sample group orders
    const groupOrders = await ctx.db.query("groupOrders").collect();
    let groupOrdersDeleted = 0;
    
    for (const groupOrder of groupOrders) {
      // Check if any participant is a sample vendor
      const hasSampleParticipant = groupOrder.participants.some(p => 
        sampleVendors.some(v => v._id === p.vendorId)
      );
      
      if (hasSampleParticipant || sampleVendors.some(v => v._id === groupOrder.initiatorId)) {
        await ctx.db.delete(groupOrder._id);
        groupOrdersDeleted++;
      }
    }

    // Delete sample suppliers
    const suppliers = await ctx.db.query("suppliers").collect();
    const sampleSuppliers = suppliers.filter(s => s.userId.startsWith("sample_user_"));
    
    for (const supplier of sampleSuppliers) {
      // Delete inventory first
      const inventory = await ctx.db
        .query("inventory")
        .withIndex("by_supplier", (q) => q.eq("supplierId", supplier._id))
        .collect();
      
      for (const item of inventory) {
        await ctx.db.delete(item._id);
      }
      
      // Delete supplier
      await ctx.db.delete(supplier._id);
    }

    // Delete price alerts for sample vendors
    let priceAlertsDeleted = 0;
    for (const vendor of sampleVendors) {
      const alerts = await ctx.db
        .query("priceAlerts")
        .withIndex("by_vendor", (q) => q.eq("vendorId", vendor._id))
        .collect();
      
      for (const alert of alerts) {
        await ctx.db.delete(alert._id);
        priceAlertsDeleted++;
      }
    }

    return {
      vendorsDeleted: sampleVendors.length,
      suppliersDeleted: sampleSuppliers.length,
      groupOrdersDeleted,
      priceAlertsDeleted
    };
  },
});

// Add sample ratings for testing the rating system
export const addSampleRatings = mutation({
  args: {},
  handler: async (ctx) => {
    // Get existing vendors, suppliers, and orders
    const vendors = await ctx.db.query("vendors").collect();
    const suppliers = await ctx.db.query("suppliers").collect();
    const orders = await ctx.db.query("orders").collect();
    
    if (vendors.length === 0 || suppliers.length === 0 || orders.length === 0) {
      throw new Error("Need vendors, suppliers, and orders to create sample ratings");
    }

    const deliveredOrders = orders.filter(order => order.status === "delivered");
    
    if (deliveredOrders.length === 0) {
      throw new Error("Need delivered orders to create sample ratings");
    }

    const sampleRatings = [];
    
    // Create ratings for delivered orders
    for (let i = 0; i < Math.min(deliveredOrders.length, 10); i++) {
      const order = deliveredOrders[i];
      
      // Check if rating already exists
      const existingRating = await ctx.db
        .query("ratings")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .first();
      
      if (existingRating) continue;
      
      // Generate realistic rating data
      const baseRating = 3 + Math.random() * 2; // 3-5 range
      const rating = Math.round(baseRating * 10) / 10;
      
      const qualityRating = Math.max(1, Math.min(5, rating + (Math.random() - 0.5)));
      const deliveryRating = Math.max(1, Math.min(5, rating + (Math.random() - 0.5)));
      const communicationRating = Math.max(1, Math.min(5, rating + (Math.random() - 0.5)));
      const pricingRating = Math.max(1, Math.min(5, rating + (Math.random() - 0.5)));
      
      const reviews = [
        "Great quality products, will order again!",
        "Good service, timely delivery.",
        "Fresh vegetables, satisfied with the purchase.",
        "Excellent supplier, highly recommended.",
        "Good quality but delivery was slightly delayed.",
        "Fair pricing and good communication.",
        "Very professional service.",
        "Products were as expected, good experience.",
        "Quick delivery and fresh items.",
        "Reliable supplier, consistent quality."
      ];
      
      const ratingData = {
        vendorId: order.vendorId,
        supplierId: order.supplierId,
        orderId: order._id,
        rating: Math.round(rating * 10) / 10,
        review: Math.random() > 0.3 ? reviews[Math.floor(Math.random() * reviews.length)] : undefined,
        categories: {
          quality: Math.round(qualityRating * 10) / 10,
          delivery: Math.round(deliveryRating * 10) / 10,
          communication: Math.round(communicationRating * 10) / 10,
          pricing: Math.round(pricingRating * 10) / 10
        },
        createdAt: order.actualDelivery || order.updatedAt
      };
      
      sampleRatings.push(ratingData);
    }
    
    // Insert sample ratings
    const ratingIds = [];
    for (const rating of sampleRatings) {
      const id = await ctx.db.insert("ratings", rating);
      ratingIds.push(id);
    }
    
    // Update supplier trust scores after adding ratings
    const uniqueSupplierIds = [...new Set(sampleRatings.map(r => r.supplierId))];
    for (const supplierId of uniqueSupplierIds) {
      // This would normally be done by the rating submission mutation
      // but we'll update trust scores manually for sample data
      const supplierRatings = await ctx.db
        .query("ratings")
        .withIndex("by_supplier", (q) => q.eq("supplierId", supplierId))
        .collect();
      
      if (supplierRatings.length > 0) {
        const avgRating = supplierRatings.reduce((sum, r) => sum + r.rating, 0) / supplierRatings.length;
        const trustScore = Math.min(5, Math.max(1, avgRating + 0.2)); // Slight bonus for having ratings
        
        await ctx.db.patch(supplierId, {
          trustScore: Math.round(trustScore * 10) / 10,
          updatedAt: Date.now()
        });
      }
    }
    
    return {
      ratingsCreated: ratingIds.length,
      suppliersUpdated: uniqueSupplierIds.length
    };
  },
});

// Add sample financial records for testing financial analytics
export const addSampleFinancialRecords = mutation({
  args: {},
  handler: async (ctx) => {
    // Get existing vendors and suppliers
    const vendors = await ctx.db.query("vendors").collect();
    const suppliers = await ctx.db.query("suppliers").collect();
    
    if (vendors.length === 0 || suppliers.length === 0) {
      throw new Error("Need vendors and suppliers to create sample financial records");
    }

    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    
    const categories = ["Vegetables", "Fruits", "Spices", "Grains", "Dairy", "Oil", "Meat"];
    const items = {
      "Vegetables": ["Tomatoes", "Onions", "Potatoes", "Carrots", "Cabbage"],
      "Fruits": ["Apples", "Bananas", "Oranges", "Mangoes", "Grapes"],
      "Spices": ["Turmeric", "Red Chili", "Coriander", "Cumin", "Garam Masala"],
      "Grains": ["Rice", "Wheat", "Dal", "Chickpeas", "Lentils"],
      "Dairy": ["Milk", "Paneer", "Curd", "Butter", "Cheese"],
      "Oil": ["Cooking Oil", "Mustard Oil", "Coconut Oil", "Ghee"],
      "Meat": ["Chicken", "Mutton", "Fish", "Prawns"]
    };

    const sampleFinancialRecords = [];
    
    // Create financial records for the last 6 months for each vendor
    for (const vendor of vendors.slice(0, 3)) { // Limit to first 3 vendors
      for (let monthsBack = 0; monthsBack < 6; monthsBack++) {
        const monthStart = now - (monthsBack * oneMonth);
        const recordsPerMonth = 8 + Math.floor(Math.random() * 12); // 8-20 records per month
        
        for (let i = 0; i < recordsPerMonth; i++) {
          const recordDate = monthStart - Math.floor(Math.random() * oneMonth);
          const date = new Date(recordDate);
          const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const year = date.getFullYear();
          
          const category = categories[Math.floor(Math.random() * categories.length)];
          const itemList = items[category as keyof typeof items];
          const itemName = itemList[Math.floor(Math.random() * itemList.length)];
          
          // Generate realistic amounts based on category
          let baseAmount = 0;
          switch (category) {
            case "Vegetables":
            case "Fruits":
              baseAmount = 200 + Math.random() * 800; // 200-1000
              break;
            case "Spices":
              baseAmount = 500 + Math.random() * 1500; // 500-2000
              break;
            case "Grains":
              baseAmount = 800 + Math.random() * 2200; // 800-3000
              break;
            case "Dairy":
              baseAmount = 300 + Math.random() * 700; // 300-1000
              break;
            case "Oil":
              baseAmount = 400 + Math.random() * 1100; // 400-1500
              break;
            case "Meat":
              baseAmount = 600 + Math.random() * 1400; // 600-2000
              break;
          }
          
          const amount = Math.round(baseAmount);
          const supplierId = suppliers[Math.floor(Math.random() * suppliers.length)]._id;
          
          // Create a mock order ID (in real scenario, this would be from actual orders)
          const mockOrderId = `order_${vendor._id}_${recordDate}`;
          
          sampleFinancialRecords.push({
            vendorId: vendor._id,
            orderId: mockOrderId as any, // This would be a real order ID in production
            amount,
            category,
            itemName,
            supplierId,
            date: recordDate,
            month,
            year
          });
        }
      }
    }
    
    // Insert sample financial records
    const recordIds = [];
    for (const record of sampleFinancialRecords) {
      try {
        // For demo purposes, we'll create mock orders first
        const orderId = await ctx.db.insert("orders", {
          vendorId: record.vendorId,
          supplierId: record.supplierId,
          items: [{
            itemName: record.itemName,
            quantity: Math.floor(record.amount / 50), // Estimate quantity
            unit: "kg",
            pricePerUnit: 50,
            totalPrice: record.amount
          }],
          totalCost: record.amount,
          status: "delivered",
          orderType: "individual",
          deliveryAddress: "Sample Address",
          estimatedDelivery: record.date,
          actualDelivery: record.date,
          paymentStatus: "paid",
          paymentMethod: "cash",
          createdAt: record.date - (2 * 60 * 60 * 1000), // 2 hours before delivery
          updatedAt: record.date
        });
        
        // Now create the financial record with the real order ID
        const financialRecordId = await ctx.db.insert("financialRecords", {
          ...record,
          orderId
        });
        
        recordIds.push(financialRecordId);
      } catch (error) {
        console.error("Error creating sample financial record:", error);
      }
    }
    
    return {
      financialRecordsCreated: recordIds.length,
      vendorsProcessed: Math.min(vendors.length, 3),
      monthsOfData: 6
    };
  },
});

// Query to get sample workflow state and data for the sample vendor
export const getSampleWorkflowState = query({
  args: {},
  handler: async (ctx) => {
    // Find the sample vendor
    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", "sample_vendor_1"))
      .first();
    if (!vendor) return { error: "Sample vendor not found" };

    // Get sample suppliers
    const suppliers = await ctx.db.query("suppliers").collect();
    // Get sample recommendations (if any)
    const recommendations = await ctx.db
      .query("recommendations")
      .withIndex("by_vendor", (q) => q.eq("vendorId", vendor._id))
      .collect();
    // Get sample group orders
    const groupOrders = await ctx.db
      .query("groupOrders")
      .withIndex("by_initiator", (q) => q.eq("initiatorId", vendor._id))
      .collect();
    // Get sample orders
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_vendor", (q) => q.eq("vendorId", vendor._id))
      .collect();
    // Get sample inventory (from all suppliers)
    const inventory = await ctx.db.query("inventory").collect();
    // Get sample price alerts
    const priceAlerts = await ctx.db
      .query("priceAlerts")
      .withIndex("by_vendor", (q) => q.eq("vendorId", vendor._id))
      .collect();
    // Get sample financial analytics
    const financialRecords = await ctx.db
      .query("financialRecords")
      .withIndex("by_vendor", (q) => q.eq("vendorId", vendor._id))
      .collect();
    // Get sample messages
    const messages = await ctx.db
      .query("messages")
      .filter((q) => q.or(
        q.eq(q.field("senderId"), vendor.userId),
        q.eq(q.field("receiverId"), vendor.userId)
      ))
      .collect();

    return {
      workflowProgress: {
        currentWorkflowStep: vendor.currentWorkflowStep,
        lastActivity: vendor.lastActivity,
        discoveryCompleted: vendor.discoveryCompleted,
        recommendationsViewed: vendor.recommendationsViewed,
        groupOrderParticipated: vendor.groupOrderParticipated,
        firstOrderPlaced: vendor.firstOrderPlaced,
        inventoryTracked: vendor.inventoryTracked,
        priceAlertsSet: vendor.priceAlertsSet,
        financialAnalyticsViewed: vendor.financialAnalyticsViewed,
        communicationUsed: vendor.communicationUsed
      },
      suppliers,
      recommendations,
      groupOrders,
      orders,
      inventory,
      priceAlerts,
      financialRecords,
      messages
    };
  }
});