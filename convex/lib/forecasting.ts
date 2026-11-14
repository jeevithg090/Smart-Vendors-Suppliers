/**
 * Pure helpers for supplier inventory demand forecasting.
 *
 * These functions contain no Convex or network dependencies so they can be
 * unit-tested directly and reused by both the manual and scheduled forecast.
 */

export const FORECAST_LOOKBACK_DAYS = 30;
export const FORECAST_HORIZON_DAYS = 7;

export interface OrderLine {
  itemName: string;
  quantity: number;
}

export interface ForecastOrder {
  items: OrderLine[];
  createdAt: number;
  totalCost: number;
}

export interface ForecastInventoryItem {
  itemName: string;
  category: string;
  currentStock: number;
  unit: string;
  pricePerUnit: number;
}

export interface ForecastSupplierContext {
  businessName: string;
  categories: string[];
  city: string;
  state: string;
  fssaiCertified: boolean;
}

export interface ForecastEntry {
  item: string;
  predictedQty: number;
  confidence: number;
  reason?: string;
}

const round2 = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Seasonal demand multiplier for the Indian market.
 * @param month calendar month, 1-12
 */
export function getSeasonalMultiplier(itemName: string, month: number): number {
  const item = itemName.toLowerCase();
  const has = (...words: string[]) => words.some((w) => item.includes(w));

  // Festival season (Oct-Dec): Diwali sweets and festive cooking
  if (month >= 10 && month <= 12) {
    if (has("sugar", "ghee", "dry fruits")) return 1.5;
    if (has("spices", "masala")) return 1.3;
  }
  // Summer (Mar-Jun): cooling foods and summer vegetables
  if (month >= 3 && month <= 6) {
    if (has("coconut", "curd", "mint")) return 1.4;
    if (has("onion", "tomato")) return 1.2;
  }
  // Monsoon (Jun-Sep): immunity boosters
  if (month >= 6 && month <= 9) {
    if (has("ginger", "garlic", "turmeric")) return 1.3;
  }
  return 1.0;
}

/**
 * Deterministic forecast based on recent order history and seasonality.
 * Used when no AI provider is configured or every model fails.
 */
export function buildFallbackForecast(
  orders: ForecastOrder[],
  inventory: ForecastInventoryItem[],
  supplier: Pick<ForecastSupplierContext, "fssaiCertified">,
  now: Date = new Date(),
): ForecastEntry[] {
  const month = now.getMonth() + 1;

  return inventory.map((item) => {
    const name = item.itemName.toLowerCase();
    const matchingLines = orders
      .map((order) => order.items.find((line) => line.itemName.toLowerCase().includes(name)))
      .filter((line): line is OrderLine => line !== undefined);

    const totalQty = matchingLines.reduce((sum, line) => sum + (line.quantity || 0), 0);
    const avgDailyDemand = matchingLines.length > 0 ? totalQty / FORECAST_LOOKBACK_DAYS : 0;
    const multiplier = getSeasonalMultiplier(item.itemName, month);
    const predictedQty = Math.max(avgDailyDemand * FORECAST_HORIZON_DAYS * multiplier, 1);
    const confidence = matchingLines.length > 0 ? 0.6 : 0.3;

    let reason =
      matchingLines.length > 0
        ? `Based on ${matchingLines.length} recent orders averaging ${avgDailyDemand.toFixed(2)} units/day`
        : "Limited historical data available";
    if (matchingLines.length > 0 && multiplier > 1) {
      reason += ` with ${Math.round((multiplier - 1) * 100)}% seasonal increase`;
    }
    if (supplier.fssaiCertified) {
      reason += ". FSSAI certified supplier may see higher demand.";
    }

    return {
      item: item.itemName,
      predictedQty: round2(predictedQty),
      confidence: round2(confidence),
      reason,
    };
  });
}

/**
 * Validates and normalises an AI-produced forecast. Returns `null` when the
 * payload does not contain at least one usable entry so the caller can fall
 * back to another model or the deterministic forecast.
 */
export function normalizeForecast(raw: unknown): ForecastEntry[] | null {
  if (!Array.isArray(raw)) return null;
  const entries: ForecastEntry[] = [];
  for (const candidate of raw) {
    if (!candidate || typeof candidate !== "object") continue;
    const record = candidate as Record<string, unknown>;
    const item = typeof record.item === "string" ? record.item.trim() : "";
    const qty = Number(record.predictedQty);
    const confidence = Number(record.confidence);
    if (!item || !Number.isFinite(qty) || qty < 0) continue;
    entries.push({
      item,
      predictedQty: round2(qty),
      confidence: round2(clamp(Number.isFinite(confidence) ? confidence : 0.5, 0, 1)),
      ...(typeof record.reason === "string" ? { reason: record.reason } : {}),
    });
  }
  return entries.length > 0 ? entries : null;
}

export function buildForecastPrompt(
  orders: ForecastOrder[],
  inventory: ForecastInventoryItem[],
  supplier: ForecastSupplierContext,
  now: Date = new Date(),
): string {
  return `Analyze this order and inventory data for inventory forecasting in the Indian market:

Order History (Last ${FORECAST_LOOKBACK_DAYS} days):
${JSON.stringify(orders, null, 2)}

Current Inventory:
${JSON.stringify(inventory, null, 2)}

Business Context:
- Supplier: ${supplier.businessName}
- Categories: ${supplier.categories.join(", ")}
- Location: ${supplier.city}, ${supplier.state}
- FSSAI Certified: ${supplier.fssaiCertified}

Indian Market Context to Consider:
1. Festivals & Seasons: Diwali, Holi, Raksha Bandhan, Navratri, Eid, Christmas, Makar Sankranti, Pongal, Onam, etc.
2. Weather Patterns: Monsoon (June-September), Summer (March-June), Winter (November-February)
3. Street Food Demand: higher during festivals, weekends and tourist seasons
4. Regional Preferences: states have varying food preferences and festivals
5. FSSAI Compliance: certified suppliers often see higher demand during festivals
6. Local Events: weddings, fairs, temple festivals, school/college events

Current Date: ${now.toLocaleDateString("en-IN")}

Predict demand for the next ${FORECAST_HORIZON_DAYS} days for each inventory item, considering
historical order patterns, upcoming festivals, weather, current stock, regional
preferences and FSSAI certification.

Respond with only a JSON array:
[{
  "item": "item name",
  "predictedQty": number,
  "confidence": number between 0 and 1,
  "reason": "brief explanation considering Indian market factors"
}]`;
}
