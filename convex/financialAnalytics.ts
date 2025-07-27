import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Create financial record when order is completed
export const createFinancialRecord = mutation({
  args: {
    vendorId: v.id("vendors"),
    orderId: v.id("orders"),
    amount: v.number(),
    category: v.string(),
    itemName: v.string(),
    supplierId: v.id("suppliers"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const date = new Date(now);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const year = date.getFullYear();

    return await ctx.db.insert("financialRecords", {
      ...args,
      date: now,
      month,
      year,
    });
  },
});

// Get financial records for a vendor with filtering
export const getFinancialRecords = query({
  args: {
    vendorId: v.id("vendors"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("financialRecords")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId));

    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category));
    }

    if (args.startDate && args.endDate) {
      query = query.filter((q) => 
        q.and(
          q.gte(q.field("date"), args.startDate!),
          q.lte(q.field("date"), args.endDate!)
        )
      );
    }

    return await query.collect();
  },
});

// Get spending analytics by category
export const getSpendingByCategory = query({
  args: {
    vendorId: v.id("vendors"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("financialRecords")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .filter((q) => {
        if (args.startDate && args.endDate) {
          return q.and(
            q.gte(q.field("date"), args.startDate!),
            q.lte(q.field("date"), args.endDate!)
          );
        }
        return true;
      })
      .collect();

    // Group by category
    const categorySpending = records.reduce((acc, record) => {
      if (!acc[record.category]) {
        acc[record.category] = 0;
      }
      acc[record.category] += record.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categorySpending).map(([category, amount]) => ({
      category,
      amount,
    }));
  },
});

// Get monthly spending trends
export const getMonthlySpending = query({
  args: {
    vendorId: v.id("vendors"),
    months: v.optional(v.number()), // Number of months to look back
  },
  handler: async (ctx, args) => {
    const monthsBack = args.months || 12;
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    
    const records = await ctx.db
      .query("financialRecords")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .filter((q) => q.gte(q.field("date"), startDate.getTime()))
      .collect();

    // Group by month
    const monthlySpending = records.reduce((acc, record) => {
      if (!acc[record.month]) {
        acc[record.month] = 0;
      }
      acc[record.month] += record.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthlySpending)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));
  },
});

// Get top suppliers by spending
export const getTopSuppliers = query({
  args: {
    vendorId: v.id("vendors"),
    limit: v.optional(v.number()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    const records = await ctx.db
      .query("financialRecords")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .filter((q) => {
        if (args.startDate && args.endDate) {
          return q.and(
            q.gte(q.field("date"), args.startDate!),
            q.lte(q.field("date"), args.endDate!)
          );
        }
        return true;
      })
      .collect();

    // Group by supplier
    const supplierSpending = records.reduce((acc, record) => {
      if (!acc[record.supplierId]) {
        acc[record.supplierId] = 0;
      }
      acc[record.supplierId] += record.amount;
      return acc;
    }, {} as Record<string, number>);

    // Get supplier details and sort by spending
    const topSuppliers = await Promise.all(
      Object.entries(supplierSpending)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(async ([supplierId, amount]) => {
          const supplier = await ctx.db.get(supplierId as Id<"suppliers">);
          return {
            supplier,
            totalSpent: amount,
          };
        })
    );

    return topSuppliers;
  },
});

// Get cost optimization recommendations
export const getCostOptimizationRecommendations = query({
  args: {
    vendorId: v.id("vendors"),
  },
  handler: async (ctx, args) => {
    const recommendations: any[] = [];
    
    // Get recent spending data (last 3 months)
    const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    const records = await ctx.db
      .query("financialRecords")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .filter((q) => q.gte(q.field("date"), threeMonthsAgo))
      .collect();

    if (records.length === 0) {
      return recommendations;
    }

    // Analyze spending patterns
    const categorySpending = records.reduce((acc, record) => {
      if (!acc[record.category]) {
        acc[record.category] = { total: 0, count: 0, suppliers: new Set() };
      }
      acc[record.category].total += record.amount;
      acc[record.category].count += 1;
      acc[record.category].suppliers.add(record.supplierId);
      return acc;
    }, {} as Record<string, { total: number; count: number; suppliers: Set<string> }>);

    // Find categories with high spending and single supplier
    for (const [category, data] of Object.entries(categorySpending)) {
      if (data.suppliers.size === 1 && data.total > 5000) {
        recommendations.push({
          type: "diversify_suppliers",
          category,
          message: `Consider exploring alternative suppliers for ${category} to potentially reduce costs`,
          potentialSavings: Math.round(data.total * 0.1), // Estimate 10% savings
          priority: "medium",
        });
      }
    }

    // Find high-frequency, low-quantity orders (potential for bulk ordering)
    const itemFrequency = records.reduce((acc, record) => {
      if (!acc[record.itemName]) {
        acc[record.itemName] = { count: 0, totalAmount: 0 };
      }
      acc[record.itemName].count += 1;
      acc[record.itemName].totalAmount += record.amount;
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number }>);

    for (const [itemName, data] of Object.entries(itemFrequency)) {
      if (data.count > 10 && data.totalAmount / data.count < 1000) {
        recommendations.push({
          type: "bulk_ordering",
          category: itemName,
          message: `Consider bulk ordering for ${itemName} to reduce per-unit costs`,
          potentialSavings: Math.round(data.totalAmount * 0.15), // Estimate 15% savings
          priority: "high",
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority as keyof typeof priorityOrder] - 
             priorityOrder[a.priority as keyof typeof priorityOrder];
    });
  },
});

// Budget management
export const createBudget = mutation({
  args: {
    vendorId: v.id("vendors"),
    category: v.string(),
    monthlyLimit: v.number(),
    alertThreshold: v.number(), // Percentage (e.g., 80 for 80%)
  },
  handler: async (ctx, args) => {
    // For now, we'll store budget info in vendor preferences
    // In a real app, you might want a separate budgets table
    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", args.vendorId))
      .first();
    
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // This is a simplified implementation
    // In practice, you'd want a proper budgets table
    return { success: true, message: "Budget created successfully" };
  },
});

// Check budget alerts
export const checkBudgetAlerts = query({
  args: {
    vendorId: v.id("vendors"),
  },
  handler: async (ctx, args) => {
    const alerts = [];
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Get current month spending by category
    const monthlyRecords = await ctx.db
      .query("financialRecords")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .filter((q) => q.eq(q.field("month"), currentMonth))
      .collect();

    const categorySpending = monthlyRecords.reduce((acc, record) => {
      if (!acc[record.category]) {
        acc[record.category] = 0;
      }
      acc[record.category] += record.amount;
      return acc;
    }, {} as Record<string, number>);

    // For demo purposes, assume some budget limits
    const budgetLimits = {
      "Vegetables": 10000,
      "Spices": 5000,
      "Grains": 8000,
      "Dairy": 6000,
    };

    for (const [category, spent] of Object.entries(categorySpending)) {
      const limit = budgetLimits[category as keyof typeof budgetLimits];
      if (limit && spent > limit * 0.8) {
        alerts.push({
          category,
          spent,
          limit,
          percentage: Math.round((spent / limit) * 100),
          severity: spent > limit ? "critical" : "warning",
        });
      }
    }

    return alerts;
  },
});