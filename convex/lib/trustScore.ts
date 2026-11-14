/**
 * Supplier trust score (0-5) shared by the breakdown query and the
 * score recalculation that runs after every rating change.
 */

export const BASE_TRUST_SCORE = 2.0;
export const MAX_TRUST_SCORE = 5.0;
const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export interface TrustScoreInputs {
  ratings: Array<{ rating: number }>;
  orders: Array<{
    status: string;
    createdAt: number;
    estimatedDelivery: number;
    actualDelivery?: number;
  }>;
  fssaiCertified: boolean;
  isVerified: boolean;
}

export interface TrustScoreResult {
  currentScore: number;
  factors: {
    baseScore: number;
    ratingScore: number;
    volumeBonus: number;
    consistencyBonus: number;
    certificationBonus: number;
    verificationBonus: number;
  };
  breakdown: {
    totalOrders: number;
    completedOrders: number;
    totalRatings: number;
    averageRating: number;
    onTimeDeliveryRate: number;
  };
}

export function calculateTrustScore(input: TrustScoreInputs, now: number = Date.now()): TrustScoreResult {
  const averageRating =
    input.ratings.length > 0 ? input.ratings.reduce((sum, r) => sum + r.rating, 0) / input.ratings.length : 0;

  // Ratings contribute up to 2.0 (5 stars × 0.4)
  const ratingScore = averageRating * 0.4;

  // Completed orders add 0.05 each, capped at 1.0
  const completedOrders = input.orders.filter((o) => o.status === 'delivered').length;
  const volumeBonus = Math.min(completedOrders * 0.05, 1.0);

  // On-time delivery rate over the last 30 days contributes up to 0.8
  const recentOrders = input.orders.filter((o) => o.createdAt > now - RECENT_WINDOW_MS);
  const onTimeDeliveries = recentOrders.filter(
    (o) => o.actualDelivery !== undefined && o.actualDelivery <= o.estimatedDelivery,
  ).length;
  const onTimeRate = recentOrders.length > 0 ? onTimeDeliveries / recentOrders.length : 0;
  const consistencyBonus = onTimeRate * 0.8;

  const certificationBonus = input.fssaiCertified ? 0.5 : 0;
  const verificationBonus = input.isVerified ? 0.3 : 0;

  const currentScore = Math.min(
    BASE_TRUST_SCORE + ratingScore + volumeBonus + consistencyBonus + certificationBonus + verificationBonus,
    MAX_TRUST_SCORE,
  );

  return {
    currentScore,
    factors: {
      baseScore: BASE_TRUST_SCORE,
      ratingScore,
      volumeBonus,
      consistencyBonus,
      certificationBonus,
      verificationBonus,
    },
    breakdown: {
      totalOrders: input.orders.length,
      completedOrders,
      totalRatings: input.ratings.length,
      averageRating,
      onTimeDeliveryRate: onTimeRate * 100,
    },
  };
}
