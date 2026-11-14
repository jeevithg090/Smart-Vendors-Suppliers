import type { TestConvex } from 'convex-test';
import type schema from '../../../convex/schema';

type T = TestConvex<typeof schema>;
const location = (city: string) => ({
  address: '12 Market Road',
  city,
  state: 'Maharashtra',
  pincode: '411001',
  coordinates: { lat: 18.52, lng: 73.85 },
});

export async function seedMarketplace(t: T, now = Date.now()) {
  return t.run(async (ctx) => {
    const supplierId = await ctx.db.insert('suppliers', {
      userId: 'supplier@example.com',
      businessName: 'Sharma Fresh Produce',
      ownerName: 'Ravi Sharma',
      email: 'supplier@example.com',
      phone: '9800000000',
      location: location('Pune'),
      categories: ['vegetables'],
      fssaiCertified: true,
      isVerified: false,
      trustScore: 0,
      businessHours: { open: '06:00', close: '14:00', days: ['monday'] },
      deliveryRadius: 10,
      minimumOrder: 200,
      createdAt: now,
      updatedAt: now,
    });
    const vendorId = await ctx.db.insert('vendors', {
      userId: 'vendor@example.com',
      businessName: 'Asha Chaat Corner',
      ownerName: 'Asha Rao',
      email: 'vendor@example.com',
      phone: '9811111111',
      location: location('Pune'),
      businessType: 'chaat',
      isVerified: false,
      trustScore: 0,
      preferences: {
        maxDeliveryDistance: 10,
        preferredCategories: ['vegetables'],
        budgetRange: { min: 0, max: 5000 },
        qualityPreference: 'medium',
        deliveryTimePreference: 'flexible',
      },
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('inventory', {
      supplierId,
      itemName: 'Onion',
      category: 'vegetables',
      currentStock: 200,
      unit: 'kg',
      pricePerUnit: 30,
      minimumOrder: 5,
      quality: 'premium',
      lastUpdated: now,
      isAvailable: true,
    });
    const orderId = await ctx.db.insert('orders', {
      vendorId,
      supplierId,
      items: [{ itemName: 'Onion', quantity: 60, unit: 'kg', pricePerUnit: 30, totalPrice: 1800 }],
      totalCost: 1800,
      status: 'delivered',
      orderType: 'individual',
      deliveryAddress: '12 Market Road',
      estimatedDelivery: now,
      actualDelivery: now - 1000,
      paymentStatus: 'paid',
      paymentMethod: 'upi',
      createdAt: now - 24 * 60 * 60 * 1000,
      updatedAt: now,
    });
    return { supplierId, vendorId, orderId };
  });
}
