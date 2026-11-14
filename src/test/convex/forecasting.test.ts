import { describe, expect, it } from 'vitest';
import {
  buildFallbackForecast,
  buildForecastPrompt,
  getSeasonalMultiplier,
  normalizeForecast,
  type ForecastInventoryItem,
  type ForecastOrder,
} from '../../../convex/lib/forecasting';

const inventory: ForecastInventoryItem[] = [
  { itemName: 'Onion', category: 'vegetables', currentStock: 100, unit: 'kg', pricePerUnit: 30 },
  { itemName: 'Ghee', category: 'dairy', currentStock: 10, unit: 'kg', pricePerUnit: 600 },
];

const orders: ForecastOrder[] = [
  { items: [{ itemName: 'Red Onion', quantity: 30 }], createdAt: 0, totalCost: 900 },
  { items: [{ itemName: 'onion', quantity: 60 }], createdAt: 0, totalCost: 1800 },
];

describe('getSeasonalMultiplier', () => {
  it('boosts festive staples during Oct-Dec', () => {
    expect(getSeasonalMultiplier('Desi Ghee', 11)).toBe(1.5);
    expect(getSeasonalMultiplier('Garam Masala', 10)).toBe(1.3);
  });

  it('boosts cooling foods in summer and immunity boosters in monsoon', () => {
    expect(getSeasonalMultiplier('Fresh Mint', 4)).toBe(1.4);
    expect(getSeasonalMultiplier('Tomato', 5)).toBe(1.2);
    expect(getSeasonalMultiplier('Ginger', 8)).toBe(1.3);
  });

  it('returns 1 when no seasonal rule applies', () => {
    expect(getSeasonalMultiplier('Rice', 1)).toBe(1);
    expect(getSeasonalMultiplier('Ghee', 2)).toBe(1);
  });
});

describe('buildFallbackForecast', () => {
  it('projects 7-day demand from the 30-day average with seasonal uplift', () => {
    // 90 kg over 30 days = 3/day; 7 days × 3 × 1.2 (May, onion) = 25.2
    const [onion] = buildFallbackForecast(orders, inventory, { fssaiCertified: false }, new Date(2026, 4, 10));
    expect(onion).toMatchObject({ item: 'Onion', predictedQty: 25.2, confidence: 0.6 });
    expect(onion.reason).toContain('2 recent orders');
    expect(onion.reason).toContain('20% seasonal increase');
  });

  it('uses a minimum quantity and low confidence for items without orders', () => {
    const [, ghee] = buildFallbackForecast(orders, inventory, { fssaiCertified: true }, new Date(2026, 0, 1));
    expect(ghee.predictedQty).toBe(1);
    expect(ghee.confidence).toBe(0.3);
    expect(ghee.reason).toBe('Limited historical data available. FSSAI certified supplier may see higher demand.');
  });
});

describe('normalizeForecast', () => {
  it('keeps valid entries and coerces numeric strings', () => {
    expect(
      normalizeForecast([
        { item: ' Onion ', predictedQty: '12.345', confidence: 0.91, reason: 'Festival' },
        { item: 'Ghee', predictedQty: 3, confidence: 4 },
      ]),
    ).toEqual([
      { item: 'Onion', predictedQty: 12.35, confidence: 0.91, reason: 'Festival' },
      { item: 'Ghee', predictedQty: 3, confidence: 1 },
    ]);
  });

  it('drops malformed entries and returns null when nothing is usable', () => {
    expect(normalizeForecast([{ item: '', predictedQty: 1 }, { item: 'X', predictedQty: -1 }, null])).toBeNull();
    expect(normalizeForecast({ item: 'not-an-array' })).toBeNull();
  });
});

describe('buildForecastPrompt', () => {
  it('includes supplier context and the serialized data', () => {
    const prompt = buildForecastPrompt(orders, inventory, {
      businessName: 'Sharma Traders',
      categories: ['vegetables', 'dairy'],
      city: 'Pune',
      state: 'Maharashtra',
      fssaiCertified: true,
    });
    expect(prompt).toContain('Sharma Traders');
    expect(prompt).toContain('Pune, Maharashtra');
    expect(prompt).toContain('"itemName": "Red Onion"');
    expect(prompt).toContain('next 7 days');
  });
});
