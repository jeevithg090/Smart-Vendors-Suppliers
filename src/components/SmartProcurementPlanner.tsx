import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

type Strategy = 'cost' | 'balanced' | 'reliability';

interface SmartProcurementPlannerProps {
  vendorId: Id<'vendors'>;
  vendorCity: string;
  preferredCategories: string[];
  initialBudget?: number;
}

interface PlannerLine {
  itemName: string;
  category: string;
  supplierId: Id<'suppliers'>;
  supplierName: string;
  unit: string;
  pricePerUnit: number;
  trustScore: number;
  stock: number;
  quantity: number;
  estimatedCost: number;
  score: number;
  risk: 'low' | 'medium' | 'high';
  savingsVsMarket: number;
}

const STRATEGY_LABELS: Record<Strategy, string> = {
  cost: 'Cost First',
  balanced: 'Balanced',
  reliability: 'Reliability First',
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getRiskLevel(trustScore: number, stock: number, minimumOrder: number): PlannerLine['risk'] {
  if (trustScore < 3 || stock <= minimumOrder) return 'high';
  if (trustScore < 4 || stock <= minimumOrder * 2) return 'medium';
  return 'low';
}

export default function SmartProcurementPlanner({
  vendorId,
  vendorCity,
  preferredCategories,
  initialBudget = 25000,
}: SmartProcurementPlannerProps) {
  const [weeklyBudget, setWeeklyBudget] = useState(initialBudget);
  const [dailyOrders, setDailyOrders] = useState(120);
  const [strategy, setStrategy] = useState<Strategy>('balanced');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    preferredCategories.length > 0 ? preferredCategories : ['Vegetables', 'Grains', 'Spices']
  );

  const inventory = useQuery(api.inventory.getAvailableInventory, {});
  const suppliers = useQuery(api.suppliers.listAllSuppliers, {});
  const resolvedInventory = inventory ?? [];
  const resolvedSuppliers = suppliers ?? [];
  const isLoadingLiveData = inventory === undefined || suppliers === undefined;

  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    (resolvedInventory || []).forEach((item) => categories.add(item.category));
    return Array.from(categories).sort();
  }, [resolvedInventory]);

  const supplierById = useMemo(() => {
    const map = new Map<Id<'suppliers'>, (typeof suppliers extends Array<infer T> ? T : never)>();
    (resolvedSuppliers || []).forEach((supplier) => map.set(supplier._id, supplier));
    return map;
  }, [resolvedSuppliers]);

  const planning = useMemo(() => {
    if (!resolvedInventory || !resolvedSuppliers || resolvedInventory.length === 0) {
      return {
        lines: [] as PlannerLine[],
        projectedSpend: 0,
        projectedSavings: 0,
        supplierCount: 0,
        highRiskCount: 0,
      };
    }

    const filtered = resolvedInventory.filter((item) => {
      if (!item.isAvailable || item.currentStock <= 0) return false;
      if (selectedCategories.length === 0) return true;
      return selectedCategories.includes(item.category);
    });

    const groupedByItem = new Map<string, typeof filtered>();
    filtered.forEach((item) => {
      const key = item.itemName.toLowerCase();
      if (!groupedByItem.has(key)) groupedByItem.set(key, []);
      groupedByItem.get(key)!.push(item);
    });

    const candidateLines: PlannerLine[] = [];
    const budgetPressure = clamp(weeklyBudget / Math.max(1000, dailyOrders * 7 * 35), 0.5, 1.5);

    for (const group of groupedByItem.values()) {
      const prices = group.map((item) => item.pricePerUnit);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((sum, value) => sum + value, 0) / prices.length;

      let bestItem = group[0];
      let bestScore = -1;

      for (const item of group) {
        const supplier = supplierById.get(item.supplierId);
        if (!supplier) continue;

        const priceScore =
          maxPrice === minPrice ? 1 : 1 - (item.pricePerUnit - minPrice) / (maxPrice - minPrice);
        const trustScore = clamp((supplier.trustScore || 0) / 5, 0, 1);
        const cityScore =
          supplier.location.city.toLowerCase() === vendorCity.toLowerCase() ? 1 : 0.65;

        const weights =
          strategy === 'cost'
            ? { price: 0.6, trust: 0.25, city: 0.15 }
            : strategy === 'reliability'
              ? { price: 0.2, trust: 0.6, city: 0.2 }
              : { price: 0.4, trust: 0.4, city: 0.2 };

        const score =
          priceScore * weights.price +
          trustScore * weights.trust +
          cityScore * weights.city;

        if (score > bestScore) {
          bestScore = score;
          bestItem = item;
        }
      }

      const supplier = supplierById.get(bestItem.supplierId);
      if (!supplier) continue;

      const baseWeeklyUnits = Math.max(
        bestItem.minimumOrder,
        Math.round((dailyOrders * 7 * budgetPressure) / Math.max(6, groupedByItem.size))
      );
      const quantity = Math.max(1, Math.min(baseWeeklyUnits, bestItem.currentStock));
      const estimatedCost = quantity * bestItem.pricePerUnit;
      const savingsVsMarket = Math.max(0, (avgPrice - bestItem.pricePerUnit) * quantity);

      candidateLines.push({
        itemName: bestItem.itemName,
        category: bestItem.category,
        supplierId: bestItem.supplierId,
        supplierName: supplier.businessName,
        unit: bestItem.unit,
        pricePerUnit: bestItem.pricePerUnit,
        trustScore: supplier.trustScore,
        stock: bestItem.currentStock,
        quantity,
        estimatedCost,
        score: bestScore,
        risk: getRiskLevel(supplier.trustScore, bestItem.currentStock, bestItem.minimumOrder),
        savingsVsMarket,
      });
    }

    const ranked = candidateLines.sort((a, b) => b.score - a.score).slice(0, 12);
    const totalUncappedSpend = ranked.reduce((sum, line) => sum + line.estimatedCost, 0);
    const capFactor = totalUncappedSpend > 0 ? Math.min(1, weeklyBudget / totalUncappedSpend) : 1;

    const lines = ranked.map((line) => {
      const cappedQuantity = Math.max(1, Math.floor(line.quantity * capFactor));
      const estimatedCost = cappedQuantity * line.pricePerUnit;
      return {
        ...line,
        quantity: cappedQuantity,
        estimatedCost,
        savingsVsMarket:
          line.quantity > 0 ? (line.savingsVsMarket / line.quantity) * cappedQuantity : 0,
      };
    });

    const projectedSpend = lines.reduce((sum, line) => sum + line.estimatedCost, 0);
    const projectedSavings = lines.reduce((sum, line) => sum + line.savingsVsMarket, 0);
    const supplierCount = new Set(lines.map((line) => line.supplierId)).size;
    const highRiskCount = lines.filter((line) => line.risk === 'high').length;

    return {
      lines,
      projectedSpend,
      projectedSavings,
      supplierCount,
      highRiskCount,
    };
  }, [dailyOrders, resolvedInventory, resolvedSuppliers, selectedCategories, strategy, supplierById, vendorCity, weeklyBudget]);

  const exportPlan = () => {
    const payload = {
      vendorId,
      generatedAt: new Date().toISOString(),
      weeklyBudget,
      dailyOrders,
      strategy,
      categories: selectedCategories,
      plan: planning.lines,
      summary: {
        projectedSpend: planning.projectedSpend,
        projectedSavings: planning.projectedSavings,
        supplierCount: planning.supplierCount,
        highRiskCount: planning.highRiskCount,
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `procurement-plan-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Smart Procurement Planner</h2>
            <p className="text-orange-100 mt-1">
              Build a weekly sourcing plan using budget, trust score, and supplier coverage.
            </p>
          </div>
          <button
            onClick={exportPlan}
            className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-md text-sm font-medium"
          >
            Export Plan
          </button>
        </div>
      </div>

      {isLoadingLiveData && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-4 py-3 text-sm">
          Loading live supplier and inventory data. You can still configure a draft plan now.
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Weekly Budget (INR)</label>
            <input
              type="number"
              min={1000}
              step={500}
              value={weeklyBudget}
              onChange={(event) => setWeeklyBudget(clamp(Number(event.target.value) || 1000, 1000, 500000))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Expected Orders / Day</label>
            <input
              type="number"
              min={20}
              max={2000}
              step={10}
              value={dailyOrders}
              onChange={(event) => setDailyOrders(clamp(Number(event.target.value) || 20, 20, 2000))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Optimization Strategy</label>
            <div className="grid grid-cols-3 gap-2">
              {(['cost', 'balanced', 'reliability'] as Strategy[]).map((option) => (
                <button
                  key={option}
                  onClick={() => setStrategy(option)}
                  className={`px-2 py-2 rounded-md text-xs font-medium border ${
                    strategy === option
                      ? 'bg-orange-100 border-orange-400 text-orange-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {STRATEGY_LABELS[option]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-2">Categories in plan</p>
          <div className="flex flex-wrap gap-2">
            {availableCategories.map((category) => {
              const active = selectedCategories.includes(category);
              return (
                <button
                  key={category}
                  onClick={() =>
                    setSelectedCategories((prev) =>
                      active ? prev.filter((entry) => entry !== category) : [...prev, category]
                    )
                  }
                  className={`px-3 py-1 rounded-full text-xs border ${
                    active
                      ? 'bg-orange-100 text-orange-700 border-orange-300'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600">Projected Spend</div>
          <div className="text-2xl font-bold text-gray-900">₹{Math.round(planning.projectedSpend).toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600">Estimated Savings</div>
          <div className="text-2xl font-bold text-green-600">₹{Math.round(planning.projectedSavings).toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600">Supplier Mix</div>
          <div className="text-2xl font-bold text-blue-600">{planning.supplierCount}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600">High-Risk Lines</div>
          <div className="text-2xl font-bold text-red-600">{planning.highRiskCount}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-800">Recommended Weekly Purchase Plan</h3>
        </div>

        {planning.lines.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            No matched inventory found for selected categories.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="px-6 py-3">Item</th>
                  <th className="px-6 py-3">Supplier</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Qty</th>
                  <th className="px-6 py-3">Cost</th>
                  <th className="px-6 py-3">Trust</th>
                  <th className="px-6 py-3">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {planning.lines.map((line) => (
                  <tr key={`${line.supplierId}_${line.itemName}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{line.itemName}</div>
                      <div className="text-xs text-gray-500">{line.category}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{line.supplierName}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">₹{line.pricePerUnit}/{line.unit}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{line.quantity} {line.unit}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">₹{Math.round(line.estimatedCost).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{line.trustScore.toFixed(1)}/5</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        line.risk === 'low'
                          ? 'bg-green-100 text-green-700'
                          : line.risk === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-700'
                      }`}>
                        {line.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
