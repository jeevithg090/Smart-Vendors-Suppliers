#!/usr/bin/env node

import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const convexUrl =
  process.env.CONVEX_URL ||
  process.env.VITE_CONVEX_URL ||
  "https://notable-skunk-507.convex.cloud";

const client = new ConvexHttpClient(convexUrl);
if (process.env.CONVEX_DEPLOY_KEY) {
  client.setAdminAuth(process.env.CONVEX_DEPLOY_KEY);
}

const timestamp = Date.now();
const vendorEmail = `api.vendor.${timestamp}@example.com`;
const supplierEmail = `api.supplier.${timestamp}@example.com`;
const password = "test1234";

const steps = [];
let failed = false;

function pass(step, detail) {
  steps.push({ step, status: "PASS", detail });
}

function fail(step, error) {
  failed = true;
  const message = error instanceof Error ? error.message : String(error);
  steps.push({ step, status: "FAIL", detail: message });
}

async function run(step, fn, options = {}) {
  if (options.skipIf) {
    steps.push({ step, status: "SKIP", detail: options.skipIf });
    return undefined;
  }
  try {
    const value = await fn();
    pass(step, options.format ? options.format(value) : "ok");
    return value;
  } catch (error) {
    fail(step, error);
    return undefined;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log(`Running API smoke checks against ${convexUrl}`);

  const testConnection = await run("auth:testConnection", () =>
    client.query(anyApi.auth.testConnection, {})
  );
  assert(testConnection?.status === "connected", "Expected connected status");

  await run("auth:helloWorld", async () => {
    const response = await client.query(anyApi.auth.helloWorld, {});
    assert(
      response?.message?.toLowerCase().includes("hello"),
      "Unexpected helloWorld response"
    );
    return response;
  });

  await run("auth:signup vendor", async () => {
    const response = await client.mutation(anyApi.auth.authenticateUser, {
      email: vendorEmail,
      password,
      role: "vendor",
      firstName: "Api",
      lastName: "Vendor",
      isSignup: true,
    });
    assert(response?.success === true, "Vendor signup failed");
    return response;
  });

  await run("auth:signup supplier", async () => {
    const response = await client.mutation(anyApi.auth.authenticateUser, {
      email: supplierEmail,
      password,
      role: "supplier",
      firstName: "Api",
      lastName: "Supplier",
      isSignup: true,
    });
    assert(response?.success === true, "Supplier signup failed");
    return response;
  });

  await run("auth:login vendor", async () => {
    const response = await client.mutation(anyApi.auth.authenticateUser, {
      email: vendorEmail,
      password,
      role: "vendor",
      isSignup: false,
    });
    assert(response?.success === true, "Vendor login failed");
    return response;
  });

  const vendor = await run("vendors:getByUserId", async () => {
    const response = await client.query(anyApi.vendors.getByUserId, {
      userId: vendorEmail,
    });
    assert(response?._id, "Vendor profile not found");
    return response;
  }, {
    format: (value) => String(value?._id || "missing"),
  });

  const supplier = await run("suppliers:getByUserId", async () => {
    const response = await client.query(anyApi.suppliers.getByUserId, {
      userId: supplierEmail,
    });
    assert(response?._id, "Supplier profile not found");
    return response;
  }, {
    format: (value) => String(value?._id || "missing"),
  });

  await run(
    "suppliers:update profile",
    async () => {
      const response = await client.mutation(anyApi.suppliers.update, {
        id: supplier._id,
        businessName: "API Supplier Store",
        categories: ["Vegetables", "Spices"],
        deliveryRadius: 20,
        minimumOrder: 100,
      });
      assert(response === null || response === undefined, "Unexpected patch return");
      return response;
    },
    { skipIf: !supplier?._id ? "Supplier not available" : undefined }
  );

  const inventoryItemId = await run(
    "inventory:addInventoryItem",
    async () => {
      const id = await client.mutation(anyApi.inventory.addInventoryItem, {
        supplierId: supplier._id,
        itemName: "API Tomatoes",
        category: "Vegetables",
        currentStock: 120,
        unit: "kg",
        pricePerUnit: 50,
        minimumOrder: 2,
        quality: "good",
      });
      assert(typeof id === "string", "Inventory insert failed");
      return id;
    },
    {
      skipIf: !supplier?._id ? "Supplier not available" : undefined,
      format: (value) => String(value),
    }
  );

  await run(
    "suppliers:searchSuppliers",
    async () => {
      const results = await client.query(anyApi.suppliers.searchSuppliers, {
        searchTerm: "API Supplier",
        sortBy: "name",
        limit: 10,
      });
      assert(Array.isArray(results), "Expected array");
      return { count: results.length };
    },
    {
      format: (value) => `${value.count} results`,
    }
  );

  await run(
    "inventory:getAvailableInventory",
    async () => {
      const results = await client.query(anyApi.inventory.getAvailableInventory, {
        supplierId: supplier._id,
      });
      assert(Array.isArray(results), "Expected array");
      assert(
        results.some((item) => item.itemName === "API Tomatoes"),
        "Added inventory item not found in available inventory"
      );
      return { count: results.length };
    },
    {
      skipIf: !supplier?._id ? "Supplier not available" : undefined,
      format: (value) => `${value.count} items`,
    }
  );

  const orderId = await run(
    "orders:createOrder",
    async () => {
      const id = await client.mutation(anyApi.orders.createOrder, {
        vendorId: vendor._id,
        supplierId: supplier._id,
        items: [
          {
            itemName: "API Tomatoes",
            quantity: 3,
            unit: "kg",
            pricePerUnit: 50,
            totalPrice: 150,
          },
        ],
        deliveryAddress: "123 API Street, Mumbai",
        paymentMethod: "cash_on_delivery",
        notes: "API smoke order",
      });
      assert(typeof id === "string", "Order creation failed");
      return id;
    },
    {
      skipIf:
        !vendor?._id || !supplier?._id || !inventoryItemId
          ? "Vendor/supplier/inventory prerequisite missing"
          : undefined,
      format: (value) => String(value),
    }
  );

  await run(
    "orders:getVendorOrders",
    async () => {
      const orders = await client.query(anyApi.orders.getVendorOrders, {
        vendorId: vendor._id,
      });
      assert(Array.isArray(orders), "Expected array");
      assert(orders.some((order) => order._id === orderId), "Created order missing");
      return { count: orders.length };
    },
    {
      skipIf: !vendor?._id || !orderId ? "Order prerequisites missing" : undefined,
      format: (value) => `${value.count} orders`,
    }
  );

  await run(
    "orders:updateOrderStatus",
    async () => {
      const id = await client.mutation(anyApi.orders.updateOrderStatus, {
        orderId,
        status: "confirmed",
      });
      assert(id === orderId, "Unexpected order id on status update");
      return id;
    },
    {
      skipIf: !orderId ? "Order prerequisite missing" : undefined,
      format: (value) => String(value),
    }
  );

  await run(
    "orderTracking:addTrackingInfo",
    async () => {
      const id = await client.mutation(anyApi.orderTracking.addTrackingInfo, {
        orderId,
        trackingData: {
          trackingNumber: `TRK-${timestamp}`,
          carrier: "API Logistics",
          estimatedDelivery: Date.now() + 24 * 60 * 60 * 1000,
          isThirdParty: false,
          notes: "Dispatched from warehouse",
        },
      });
      assert(id === orderId, "Tracking insert did not return order id");
      return id;
    },
    {
      skipIf: !orderId ? "Order prerequisite missing" : undefined,
      format: (value) => String(value),
    }
  );

  await run(
    "orderTracking:updateTrackingStatus",
    async () => {
      const id = await client.mutation(anyApi.orderTracking.updateTrackingStatus, {
        orderId,
        trackingNumber: `TRK-${timestamp}`,
        status: "out_for_delivery",
        location: "Mumbai Hub",
      });
      assert(id === orderId, "Tracking status update did not return order id");
      return id;
    },
    {
      skipIf: !orderId ? "Order prerequisite missing" : undefined,
      format: (value) => String(value),
    }
  );

  await run(
    "orderTracking:getOrderTracking",
    async () => {
      const tracking = await client.query(anyApi.orderTracking.getOrderTracking, {
        orderId,
      });
      assert(tracking?.order?._id === orderId, "Tracking payload missing order");
      assert(Array.isArray(tracking?.timeline), "Tracking timeline missing");
      return { timeline: tracking.timeline.length };
    },
    {
      skipIf: !orderId ? "Order prerequisite missing" : undefined,
      format: (value) => `${value.timeline} timeline events`,
    }
  );

  const alert = await run(
    "priceAlerts:createPriceAlert",
    async () => {
      const response = await client.mutation(anyApi.priceAlerts.createPriceAlert, {
        vendorId: vendor._id,
        itemName: "API Tomatoes",
        targetPrice: 55,
        supplierId: supplier._id,
      });
      assert(response?._id, "Price alert not created");
      return response;
    },
    {
      skipIf: !vendor?._id || !supplier?._id ? "Vendor/supplier missing" : undefined,
      format: (value) => String(value?._id || "missing"),
    }
  );

  await run(
    "priceAlerts:getTriggeredAlerts",
    async () => {
      const alerts = await client.query(anyApi.priceAlerts.getTriggeredAlerts, {
        vendorId: vendor._id,
      });
      assert(Array.isArray(alerts), "Expected array");
      assert(alerts.some((item) => item._id === alert._id), "Created alert not triggered");
      return { count: alerts.length };
    },
    {
      skipIf: !vendor?._id || !alert?._id ? "Price alert prerequisite missing" : undefined,
      format: (value) => `${value.count} alerts`,
    }
  );

  await run(
    "notifications:create + unreadCount",
    async () => {
      await client.mutation(anyApi.notifications.createNotification, {
        userEmail: vendorEmail,
        userType: "vendor",
        type: "system",
        title: "API Smoke Notification",
        message: "Notification flow validated",
        priority: "high",
      });

      const unread = await client.query(anyApi.notifications.getUnreadCount, {
        userEmail: vendorEmail,
      });
      assert(typeof unread === "number" && unread >= 1, "Unread count did not increase");
      return { unread };
    },
    {
      skipIf: !vendor?._id ? "Vendor missing" : undefined,
      format: (value) => `${value.unread} unread`,
    }
  );

  const requestId = await run(
    "requests:createDemandRequest",
    async () => {
      const id = await client.mutation(anyApi.requests.createDemandRequest, {
        vendorId: vendor._id,
        itemName: "API Potatoes",
        quantity: 25,
        unit: "kg",
        priceMin: 20,
        priceMax: 35,
        urgency: "medium",
        location: "Mumbai",
        notes: "API demand request",
      });
      assert(typeof id === "string", "Demand request not created");
      return id;
    },
    {
      skipIf: !vendor?._id ? "Vendor missing" : undefined,
      format: (value) => String(value),
    }
  );

  await run(
    "requests:getSimilarRequests",
    async () => {
      const requests = await client.query(anyApi.requests.getSimilarRequests, {
        item: "potato",
        location: "mumbai",
        limit: 5,
      });
      assert(Array.isArray(requests), "Expected array");
      return { count: requests.length };
    },
    {
      format: (value) => `${value.count} requests`,
    }
  );

  await run(
    "requests:respond + close",
    async () => {
      const responded = await client.mutation(anyApi.requests.respondToRequest, {
        userEmail: supplierEmail,
        requestId,
        quote: 30,
        message: "Can fulfill tomorrow",
      });
      assert(responded === true, "Supplier response failed");

      const closed = await client.mutation(anyApi.requests.closeRequest, {
        userEmail: vendorEmail,
        requestId,
      });
      assert(closed === true, "Close request failed");
      return { responded, closed };
    },
    {
      skipIf: !requestId ? "Request prerequisite missing" : undefined,
      format: () => "response + close successful",
    }
  );

  await run(
    "recommendations:generate + list",
    async () => {
      await client.mutation(anyApi.recommendations.generateRecommendations, {
        vendorId: vendor._id,
        refreshExisting: true,
      });
      const recs = await client.query(anyApi.recommendations.getRecommendations, {
        vendorId: vendor._id,
        limit: 5,
      });
      assert(Array.isArray(recs), "Expected recommendations array");
      return { count: recs.length };
    },
    {
      skipIf: !vendor?._id ? "Vendor missing" : undefined,
      format: (value) => `${value.count} recommendations`,
    }
  );

  await run(
    "analytics:getMarketInsights",
    async () => {
      const insights = await client.query(anyApi.analytics.getMarketInsights, {});
      assert(Array.isArray(insights?.insights), "Market insights payload invalid");
      return { count: insights.insights.length };
    },
    {
      format: (value) => `${value.count} insights`,
    }
  );

  await run(
    "analytics:getMarketPricingData",
    async () => {
      const market = await client.query(anyApi.analytics.getMarketPricingData, {
        supplierId: supplier._id,
      });
      assert(Array.isArray(market?.priceRecommendations), "Market pricing payload invalid");
      return { count: market.priceRecommendations.length };
    },
    {
      skipIf: !supplier?._id ? "Supplier missing" : undefined,
      format: (value) => `${value.count} pricing recommendations`,
    }
  );

  const groupOrderId = await run(
    "groupOrders:createGroupOrder",
    async () => {
      const id = await client.mutation(anyApi.groupOrders.createGroupOrder, {
        initiatorId: vendor._id,
        itemName: "API Tomatoes",
        category: "Vegetables",
        targetQuantity: 25,
        pricePerUnit: 48,
        supplierId: supplier._id,
        location: "Mumbai",
        expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000,
      });
      assert(typeof id === "string", "Group order create failed");
      return id;
    },
    {
      skipIf: !vendor?._id || !supplier?._id ? "Vendor/supplier missing" : undefined,
      format: (value) => String(value),
    }
  );

  await run(
    "groupOrders:joinGroupOrder",
    async () => {
      const response = await client.mutation(anyApi.groupOrders.joinGroupOrder, {
        groupOrderId,
        vendorId: vendor._id,
        quantity: 5,
      });
      assert(response?.success === true, "Join group order failed");
      return response;
    },
    {
      skipIf: !groupOrderId || !vendor?._id ? "Group order prerequisite missing" : undefined,
      format: (value) => `new quantity ${value.newQuantity}`,
    }
  );

  await run(
    "groupOrders:getGroupOrdersByVendor",
    async () => {
      const orders = await client.query(anyApi.groupOrders.getGroupOrdersByVendor, {
        vendorId: vendor._id,
      });
      assert(Array.isArray(orders), "Expected array");
      assert(orders.some((order) => order._id === groupOrderId), "Created group order missing");
      return { count: orders.length };
    },
    {
      skipIf: !vendor?._id || !groupOrderId ? "Group order prerequisite missing" : undefined,
      format: (value) => `${value.count} group orders`,
    }
  );

  const summary = {
    total: steps.length,
    passed: steps.filter((step) => step.status === "PASS").length,
    failed: steps.filter((step) => step.status === "FAIL").length,
    skipped: steps.filter((step) => step.status === "SKIP").length,
  };

  console.log("\nAPI smoke check summary");
  console.table(steps);
  console.log(summary);

  if (failed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal API smoke failure:", error);
  process.exit(1);
});
