// @vitest-environment edge-runtime
import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, internal } from '../../../convex/_generated/api';
import schema from '../../../convex/schema';
import { seedMarketplace } from './fixtures';
import { modules } from './setup';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('inventory forecasting action', () => {
  it('builds and stores the deterministic forecast when no AI key is configured', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    const t = convexTest(schema, modules);
    const { supplierId } = await seedMarketplace(t);

    const forecasts = await t.action(api.suppliers.generateForecastForSupplier, { supplierId });

    expect(forecasts).toHaveLength(1);
    expect(forecasts[0]).toMatchObject({ item: 'Onion', confidence: 0.6 });
    expect(forecasts[0].predictedQty).toBeGreaterThan(1);
    const stored = await t.query(api.suppliers.getSupplierForecasts, { supplierId });
    expect(stored).toEqual(forecasts);
  });

  it('uses the AI forecast when OpenRouter returns valid JSON', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          choices: [
            {
              message: {
                content: '[{"item":"Onion","predictedQty":42,"confidence":0.85,"reason":"Diwali"}]',
              },
            },
          ],
        }),
      ),
    );
    const t = convexTest(schema, modules);
    const { supplierId } = await seedMarketplace(t);

    const [forecast] = await t.action(api.suppliers.generateForecastForSupplier, { supplierId });
    expect(forecast).toMatchObject({ item: 'Onion', predictedQty: 42, confidence: 0.85, reason: 'Diwali' });
  });

  it('refuses to forecast without order history', async () => {
    const t = convexTest(schema, modules);
    const { supplierId, orderId } = await seedMarketplace(t);
    await t.run((ctx) => ctx.db.delete(orderId));
    await expect(t.action(api.suppliers.generateForecastForSupplier, { supplierId })).rejects.toThrow(
      /insufficient data/i,
    );
  });

  it('runs the scheduled forecast for every eligible supplier', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    const t = convexTest(schema, modules);
    const { supplierId } = await seedMarketplace(t);
    await t.action(internal.suppliers.generateInventoryForecast, {});
    const supplier = await t.run((ctx) => ctx.db.get(supplierId));
    expect(supplier?.forecasts?.[0].item).toBe('Onion');
    expect(supplier?.lastForecastUpdate).toBeTypeOf('number');
  });
});

describe('FSSAI verification action', () => {
  it('records a rejection with a clear reason when OCR is not configured', async () => {
    vi.stubEnv('OCR_SPACE_API_KEY', '');
    const t = convexTest(schema, modules);
    const { supplierId } = await seedMarketplace(t);

    const result = await t.action(api.fssaiVerification.verifyFSSAICertificate, {
      supplierId,
      imageUrl: 'https://example.com/certificate.jpg',
    });

    expect(result).toMatchObject({ success: false, status: 'rejected' });
    const status = await t.query(api.fssaiVerification.getFSSAIVerificationStatus, { supplierId });
    expect(status?.status).toBe('rejected');
    expect(status?.error).toMatch(/OCR_SPACE_API_KEY/);
  });

  it('verifies a matching certificate end to end', async () => {
    vi.stubEnv('OCR_SPACE_API_KEY', 'ocr-key');
    vi.stubEnv('OPENROUTER_API_KEY', 'llm-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('ocr.space')
          ? Response.json({
              ParsedResults: [{ ParsedText: 'FSSAI Licence 12345678901234 Sharma Fresh Produce' }],
            })
          : Response.json({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      licenseNumber: '12345678901234',
                      businessName: 'Sharma Fresh Produce',
                      ownerName: 'Ravi Sharma',
                      address: 'Pune',
                      validityDate: '2099-12-31',
                      category: 'Retail',
                      confidence: 0.92,
                    }),
                  },
                },
              ],
            }),
      ),
    );
    const t = convexTest(schema, modules);
    const { supplierId } = await seedMarketplace(t);

    const result = await t.action(api.fssaiVerification.verifyFSSAICertificate, {
      supplierId,
      imageUrl: 'https://example.com/certificate.jpg',
    });

    expect(result).toMatchObject({ success: true, status: 'verified' });
    const supplier = await t.run((ctx) => ctx.db.get(supplierId));
    expect(supplier).toMatchObject({
      fssaiCertified: true,
      isVerified: true,
      fssaiLicense: '12345678901234',
    });
  });
});

describe('ratings and trust score', () => {
  it('recalculates the supplier trust score after a rating', async () => {
    const t = convexTest(schema, modules);
    const { supplierId, vendorId, orderId } = await seedMarketplace(t);

    await t.mutation(api.ratings.addRating, {
      vendorId,
      supplierId,
      orderId,
      rating: 5,
      categories: { quality: 5, delivery: 5, communication: 5, pricing: 4 },
    });

    const breakdown = await t.query(api.ratings.getTrustScoreBreakdown, { supplierId });
    // base 2 + rating 2 + 1 delivered order 0.05 + on-time 0.8 + FSSAI 0.5
    expect(breakdown.currentScore).toBeCloseTo(5.0);
    const supplier = await t.run((ctx) => ctx.db.get(supplierId));
    expect(supplier?.trustScore).toBeCloseTo(breakdown.currentScore);
  });
});

describe('messaging', () => {
  it('sends and reads a conversation using email-based identity', async () => {
    const t = convexTest(schema, modules);
    await seedMarketplace(t);

    await t.mutation(api.messages.sendMessage, {
      userEmail: 'vendor@example.com',
      receiverId: 'supplier@example.com',
      receiverType: 'supplier',
      content: 'Do you have 50 kg onions for tomorrow?',
      messageType: 'text',
    });

    const conversation = await t.query(api.messages.getConversation, {
      userEmail: 'supplier@example.com',
      otherUserId: 'vendor@example.com',
    });
    expect(conversation.map((m: { content: string }) => m.content)).toEqual([
      'Do you have 50 kg onions for tomorrow?',
    ]);
  });
});
