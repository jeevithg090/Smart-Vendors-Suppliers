import { describe, expect, it } from 'vitest';
import { calculateTrustScore } from '../../../convex/lib/trustScore';

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

describe('calculateTrustScore', () => {
  it('starts new suppliers at the base score', () => {
    const result = calculateTrustScore(
      { ratings: [], orders: [], fssaiCertified: false, isVerified: false },
      NOW,
    );
    expect(result.currentScore).toBe(2);
    expect(result.breakdown).toMatchObject({ totalOrders: 0, averageRating: 0, onTimeDeliveryRate: 0 });
  });

  it('combines ratings, volume, punctuality and certification bonuses', () => {
    const result = calculateTrustScore(
      {
        ratings: [{ rating: 4 }, { rating: 5 }],
        orders: [
          { status: 'delivered', createdAt: NOW - DAY, estimatedDelivery: NOW, actualDelivery: NOW - 1 },
          { status: 'delivered', createdAt: NOW - DAY, estimatedDelivery: NOW, actualDelivery: NOW + 1 },
          { status: 'pending', createdAt: NOW - 60 * DAY, estimatedDelivery: NOW },
        ],
        fssaiCertified: true,
        isVerified: false,
      },
      NOW,
    );
    expect(result.factors.ratingScore).toBeCloseTo(1.8);
    expect(result.factors.volumeBonus).toBeCloseTo(0.1);
    // 1 of 2 recent orders on time
    expect(result.factors.consistencyBonus).toBeCloseTo(0.4);
    expect(result.factors.certificationBonus).toBe(0.5);
    expect(result.currentScore).toBeCloseTo(2 + 1.8 + 0.1 + 0.4 + 0.5);
    expect(result.breakdown.onTimeDeliveryRate).toBe(50);
  });

  it('caps the score at 5', () => {
    const orders = Array.from({ length: 40 }, () => ({
      status: 'delivered',
      createdAt: NOW - DAY,
      estimatedDelivery: NOW,
      actualDelivery: NOW - 1,
    }));
    const result = calculateTrustScore(
      { ratings: [{ rating: 5 }], orders, fssaiCertified: true, isVerified: true },
      NOW,
    );
    expect(result.currentScore).toBe(5);
  });
});
