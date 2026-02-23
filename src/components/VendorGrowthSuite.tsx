import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import RoleOnboardingWizard from './RoleOnboardingWizard';

interface VendorGrowthSuiteProps {
  vendorId: Id<'vendors'>;
  vendorCity: string;
  userId?: string;
}

interface SupplierList {
  id: string;
  name: string;
  supplierIds: string[];
  createdAt: number;
}

interface OrderTemplate {
  id: string;
  name: string;
  supplierId: string;
  items: Array<{
    itemName: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    totalPrice: number;
  }>;
  createdAt: number;
}

const SUBSTITUTION_HINTS: Record<string, string[]> = {
  tomato: ['cherry tomato', 'hybrid tomato', 'local tomato'],
  onion: ['red onion', 'white onion', 'shallot'],
  potato: ['baby potato', 'table potato', 'sweet potato'],
  chili: ['green chili', 'dry chili', 'kashmiri chili'],
  oil: ['sunflower oil', 'mustard oil', 'groundnut oil'],
};

function useLocalStorageState<T>(key: string, fallback: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  });

  const update = (next: T | ((prev: T) => T)) => {
    setState((prev) => {
      const value = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Ignore local storage write failures.
      }
      return value;
    });
  };

  return [state, update] as const;
}

export default function VendorGrowthSuite({ vendorId, vendorCity, userId }: VendorGrowthSuiteProps) {
  const suppliers = useQuery(api.suppliers.searchSuppliers, {
    city: vendorCity,
    sortBy: 'trustScore',
    limit: 50,
  }) as any[] | undefined;
  const vendorOrders = useQuery(api.orders.getVendorOrders, { vendorId, limit: 150 }) as any[] | undefined;
  const inventory = useQuery(api.inventory.getAvailableInventory, {}) as any[] | undefined;
  const financialRecords = useQuery(api.financialAnalytics.getFinancialRecords, { vendorId }) as any[] | undefined;

  const supplierListStorageKey = `saved_supplier_lists_${vendorId}`;
  const templateStorageKey = `repeat_order_templates_${vendorId}`;
  const bulletinStorageKey = `bulletin_dismiss_${vendorId}`;

  const [savedLists, setSavedLists] = useLocalStorageState<SupplierList[]>(supplierListStorageKey, []);
  const [orderTemplates, setOrderTemplates] = useLocalStorageState<OrderTemplate[]>(templateStorageKey, []);
  const [dismissedBulletins, setDismissedBulletins] = useLocalStorageState<string[]>(bulletinStorageKey, []);
  const [newListName, setNewListName] = useState('');
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [substitutionQuery, setSubstitutionQuery] = useState('');
  const [substitutionCategory, setSubstitutionCategory] = useState('');
  const [negotiationPrice, setNegotiationPrice] = useState(100);
  const [negotiationQty, setNegotiationQty] = useState(50);
  const [negotiationBudget, setNegotiationBudget] = useState(5000);

  const cityBulletins = useMemo(() => {
    const region = vendorCity.toLowerCase();
    const defaults = [
      {
        id: `${region}-morning-window`,
        title: `Morning sourcing window for ${vendorCity}`,
        body: 'Prices are usually most stable between 6:30 AM and 9:00 AM for vegetables and leafy items.',
        priority: 'Advisory',
      },
      {
        id: `${region}-fuel-impact`,
        title: 'Transport-cost watch',
        body: 'Keep a 3-5% contingency this week due to route-level fuel variability.',
        priority: 'Risk',
      },
      {
        id: `${region}-festival-demand`,
        title: 'Demand trend bulletin',
        body: 'Snack and spice categories are trending higher ahead of weekend demand.',
        priority: 'Opportunity',
      },
    ];
    return defaults.filter((item) => !dismissedBulletins.includes(item.id));
  }, [dismissedBulletins, vendorCity]);

  const supplierMap = useMemo(() => {
    const map = new Map<string, any>();
    (suppliers || []).forEach((supplier) => {
      map.set(String(supplier._id), supplier);
    });
    return map;
  }, [suppliers]);

  const slaScorecards = useMemo(() => {
    const grouped = new Map<string, any[]>();
    (vendorOrders || []).forEach((order) => {
      const key = String(order.supplierId);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(order);
    });

    return Array.from(grouped.entries()).map(([supplierId, orders]) => {
      const total = orders.length;
      const delivered = orders.filter((order) => order.status === 'delivered').length;
      const cancelled = orders.filter((order) => order.status === 'cancelled').length;
      const active = orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).length;
      const onTime = orders.filter((order) => {
        if (order.status !== 'delivered' || !order.actualDelivery) return false;
        return order.actualDelivery <= order.estimatedDelivery;
      }).length;
      const fulfillmentRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
      const cancelRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
      const onTimeRate = delivered > 0 ? Math.round((onTime / delivered) * 100) : 0;
      const reliabilityScore = Math.max(0, Math.min(100, Math.round(0.5 * fulfillmentRate + 0.4 * onTimeRate - 0.5 * cancelRate)));

      return {
        supplierId,
        supplierName: supplierMap.get(supplierId)?.businessName || `Supplier ${supplierId.slice(-6)}`,
        total,
        delivered,
        active,
        fulfillmentRate,
        cancelRate,
        onTimeRate,
        reliabilityScore,
      };
    }).sort((a, b) => b.reliabilityScore - a.reliabilityScore);
  }, [supplierMap, vendorOrders]);

  const etaAlerts = useMemo(() => {
    const now = Date.now();
    return (vendorOrders || []).filter((order) => !['delivered', 'cancelled'].includes(order.status)).map((order) => {
      const remainingMs = order.estimatedDelivery - now;
      return {
        ...order,
        isDelayed: remainingMs < 0,
        remainingHours: Math.round(remainingMs / (1000 * 60 * 60)),
      };
    }).sort((a, b) => a.remainingHours - b.remainingHours);
  }, [vendorOrders]);

  const substitutions = useMemo(() => {
    const query = substitutionQuery.trim().toLowerCase();
    const items = inventory || [];
    if (!query && !substitutionCategory) return [];

    const hintWords = SUBSTITUTION_HINTS[query] || [];
    const filtered = items.filter((item) => {
      const itemName = String(item.itemName || '').toLowerCase();
      const category = String(item.category || '').toLowerCase();
      const matchByQuery = query
        ? itemName.includes(query) || hintWords.some((hint) => itemName.includes(hint))
        : true;
      const matchByCategory = substitutionCategory
        ? category.includes(substitutionCategory.toLowerCase())
        : true;
      return matchByQuery && matchByCategory;
    });

    return filtered
      .sort((a, b) => (a.pricePerUnit || 0) - (b.pricePerUnit || 0))
      .slice(0, 12);
  }, [inventory, substitutionCategory, substitutionQuery]);

  const negotiationSuggestions = useMemo(() => {
    const base = Number(negotiationPrice) || 0;
    const quantity = Math.max(1, Number(negotiationQty) || 1);
    const budget = Math.max(0, Number(negotiationBudget) || 0);
    const targetByBudget = budget > 0 ? budget / quantity : base;
    const conservative = Math.max(0, Number((base * 0.97).toFixed(2)));
    const balanced = Math.max(0, Number((base * 0.93).toFixed(2)));
    const aggressive = Math.max(0, Number((base * 0.88).toFixed(2)));
    return [
      { label: 'Conservative counter', price: conservative, note: 'Best for reliable suppliers and small batches.' },
      { label: 'Balanced counter', price: Math.min(balanced, targetByBudget), note: 'Balanced rate for repeat monthly orders.' },
      { label: 'Aggressive counter', price: Math.min(aggressive, targetByBudget), note: 'Use when buying in high quantity or group mode.' },
    ];
  }, [negotiationBudget, negotiationPrice, negotiationQty]);

  const toggleSupplierSelection = (supplierId: string) => {
    setSelectedSuppliers((previous) => (
      previous.includes(supplierId)
        ? previous.filter((item) => item !== supplierId)
        : [...previous, supplierId]
    ));
  };

  const createSupplierList = () => {
    const normalizedName = newListName.trim();
    if (!normalizedName || selectedSuppliers.length === 0) return;
    const next: SupplierList = {
      id: `list_${Date.now()}`,
      name: normalizedName,
      supplierIds: selectedSuppliers,
      createdAt: Date.now(),
    };
    setSavedLists((previous) => [next, ...previous]);
    setNewListName('');
    setSelectedSuppliers([]);
  };

  const removeSupplierList = (listId: string) => {
    setSavedLists((previous) => previous.filter((list) => list.id !== listId));
  };

  const saveOrderAsTemplate = (order: any) => {
    const nextTemplate: OrderTemplate = {
      id: `tpl_${Date.now()}`,
      name: `Template ${new Date(order.createdAt).toLocaleDateString()}`,
      supplierId: String(order.supplierId),
      items: order.items || [],
      createdAt: Date.now(),
    };
    setOrderTemplates((previous) => [nextTemplate, ...previous].slice(0, 30));
  };

  const removeTemplate = (templateId: string) => {
    setOrderTemplates((previous) => previous.filter((template) => template.id !== templateId));
  };

  const exportInvoices = () => {
    const rows = [
      ['Date', 'Order ID', 'Supplier', 'Category', 'Amount', 'GST (5%)', 'Grand Total'],
      ...(financialRecords || []).map((record) => {
        const supplierName = supplierMap.get(String(record.supplierId))?.businessName || 'Unknown';
        const gst = Number((record.amount * 0.05).toFixed(2));
        const grandTotal = Number((record.amount + gst).toFixed(2));
        return [
          new Date(record.date).toISOString().slice(0, 10),
          String(record.orderId),
          supplierName,
          record.category,
          Number(record.amount).toFixed(2),
          gst.toFixed(2),
          grandTotal.toFixed(2),
        ];
      }),
    ];

    const csv = rows.map((row) => row.map((item) => `"${String(item).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendor-invoice-gst-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const dismissBulletin = (id: string) => {
    setDismissedBulletins((previous) => Array.from(new Set([...previous, id])));
  };

  return (
    <div className="space-y-6">
      <RoleOnboardingWizard role="vendor" userId={userId} />

      <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <h2 className="text-lg font-semibold text-indigo-900">In-app announcements and market bulletin</h2>
        <p className="text-sm text-indigo-700">City-specific updates for {vendorCity} procurement planning.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {cityBulletins.length === 0 && (
            <div className="rounded-lg bg-white p-3 text-sm text-slate-600">
              No active bulletins. You are up to date.
            </div>
          )}
          {cityBulletins.map((bulletin) => (
            <article key={bulletin.id} className="rounded-lg bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{bulletin.title}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {bulletin.priority}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{bulletin.body}</p>
              <button
                onClick={() => dismissBulletin(bulletin.id)}
                className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                Dismiss
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Saved supplier lists</h2>
        <p className="text-sm text-slate-500">Create reusable supplier sets for daily purchasing.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3">
            <label className="mb-2 block text-xs font-medium text-slate-600">List name</label>
            <input
              value={newListName}
              onChange={(event) => setNewListName(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              placeholder="e.g., Daily Vegetables"
            />
            <div className="mt-3 max-h-44 space-y-2 overflow-y-auto">
              {(suppliers || []).slice(0, 20).map((supplier) => {
                const supplierId = String(supplier._id);
                const selected = selectedSuppliers.includes(supplierId);
                return (
                  <label key={supplierId} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSupplierSelection(supplierId)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{supplier.businessName}</span>
                  </label>
                );
              })}
            </div>
            <button
              onClick={createSupplierList}
              className="mt-3 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Save list
            </button>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <h3 className="text-sm font-semibold text-slate-800">Your lists</h3>
            <div className="mt-2 space-y-2">
              {savedLists.length === 0 && <p className="text-sm text-slate-500">No saved lists yet.</p>}
              {savedLists.map((list) => (
                <div key={list.id} className="rounded-md bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{list.name}</p>
                      <p className="text-xs text-slate-500">{list.supplierIds.length} suppliers</p>
                    </div>
                    <button
                      onClick={() => removeSupplierList(list.id)}
                      className="text-xs font-medium text-rose-600 hover:text-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Repeat order templates</h2>
        <p className="text-sm text-slate-500">Save successful orders and reuse quantities quickly.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3">
            <h3 className="text-sm font-semibold text-slate-800">Recent orders</h3>
            <div className="mt-2 max-h-52 space-y-2 overflow-y-auto">
              {(vendorOrders || []).slice(0, 20).map((order) => (
                <div key={String(order._id)} className="rounded-md bg-slate-50 p-2">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-slate-900">#{String(order._id).slice(-6)}</span>
                    <span className="text-xs text-slate-500">{order.status}</span>
                  </div>
                  <div className="text-xs text-slate-600">{(order.items || []).length} items • Rs {Number(order.totalCost || 0).toFixed(0)}</div>
                  <button
                    onClick={() => saveOrderAsTemplate(order)}
                    className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Save as template
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <h3 className="text-sm font-semibold text-slate-800">Saved templates</h3>
            <div className="mt-2 space-y-2">
              {orderTemplates.length === 0 && <p className="text-sm text-slate-500">No templates yet.</p>}
              {orderTemplates.map((template) => (
                <div key={template.id} className="rounded-md bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{template.name}</p>
                      <p className="text-xs text-slate-500">{template.items.length} line items</p>
                    </div>
                    <button
                      onClick={() => removeTemplate(template.id)}
                      className="text-xs font-medium text-rose-600 hover:text-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Smart substitutions</h2>
        <p className="text-sm text-slate-500">Find alternatives when your preferred ingredient is unavailable.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            value={substitutionQuery}
            onChange={(event) => setSubstitutionQuery(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            placeholder="Item (e.g., tomato)"
          />
          <input
            value={substitutionCategory}
            onChange={(event) => setSubstitutionCategory(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            placeholder="Category (optional)"
          />
          <div className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
            {substitutions.length} substitute options
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {substitutions.map((item) => (
            <div key={String(item._id)} className="rounded-md border border-slate-200 p-3">
              <div className="text-sm font-semibold text-slate-900">{item.itemName}</div>
              <div className="text-xs text-slate-500">{item.category} • Rs {item.pricePerUnit}/{item.unit}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Supplier SLA scorecard</h2>
        <p className="text-sm text-slate-500">Compare reliability using fulfillment, delay, and cancellation rates.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Supplier</th>
                <th className="py-2 pr-3">Reliability</th>
                <th className="py-2 pr-3">Fulfillment</th>
                <th className="py-2 pr-3">On-time</th>
                <th className="py-2 pr-3">Cancel</th>
                <th className="py-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {slaScorecards.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={6}>No orders yet to compute SLA.</td>
                </tr>
              )}
              {slaScorecards.map((row) => (
                <tr key={row.supplierId} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-medium text-slate-900">{row.supplierName}</td>
                  <td className="py-2 pr-3">{row.reliabilityScore}%</td>
                  <td className="py-2 pr-3">{row.fulfillmentRate}%</td>
                  <td className="py-2 pr-3">{row.onTimeRate}%</td>
                  <td className="py-2 pr-3">{row.cancelRate}%</td>
                  <td className="py-2">{row.active}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Delivery ETA and delay alerts</h2>
        <p className="text-sm text-slate-500">Monitor active orders and escalate delayed shipments.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {etaAlerts.length === 0 && (
            <p className="text-sm text-slate-500">No active deliveries.</p>
          )}
          {etaAlerts.map((order) => (
            <div
              key={String(order._id)}
              className={`rounded-md border p-3 ${order.isDelayed ? 'border-rose-300 bg-rose-50' : 'border-emerald-300 bg-emerald-50'}`}
            >
              <div className="text-sm font-semibold text-slate-900">Order #{String(order._id).slice(-6)}</div>
              <div className="text-xs text-slate-600">
                {order.isDelayed
                  ? `Delayed by ${Math.abs(order.remainingHours)}h`
                  : `ETA in ${Math.max(0, order.remainingHours)}h`}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Negotiation assistant</h2>
        <p className="text-sm text-slate-500">Generate data-backed counter-offers before opening supplier negotiations.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-sm text-slate-600">
            Current unit price
            <input
              type="number"
              value={negotiationPrice}
              onChange={(event) => setNegotiationPrice(Number(event.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-600">
            Quantity
            <input
              type="number"
              value={negotiationQty}
              onChange={(event) => setNegotiationQty(Number(event.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-600">
            Budget cap
            <input
              type="number"
              value={negotiationBudget}
              onChange={(event) => setNegotiationBudget(Number(event.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {negotiationSuggestions.map((suggestion) => (
            <div key={suggestion.label} className="rounded-md border border-slate-200 p-3">
              <div className="text-sm font-semibold text-slate-900">{suggestion.label}</div>
              <div className="text-lg font-bold text-indigo-600">Rs {suggestion.price.toFixed(2)}</div>
              <p className="text-xs text-slate-500">{suggestion.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Invoice and GST export</h2>
        <p className="text-sm text-slate-500">
          Export purchase records with computed GST columns for compliance and bookkeeping.
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            {financialRecords?.length || 0} records available for export.
          </div>
          <button
            onClick={exportInvoices}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Download CSV
          </button>
        </div>
      </section>
    </div>
  );
}

