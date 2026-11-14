// @vitest-environment edge-runtime
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { api } from '../../../convex/_generated/api';
import schema from '../../../convex/schema';
import { modules } from './setup';

const signup = (
  overrides: Partial<{ email: string; password: string; role: 'vendor' | 'supplier' }> = {},
) => ({
  email: 'Asha@Example.com',
  password: 'masala-chai-42',
  role: 'vendor' as const,
  firstName: 'Asha',
  lastName: 'Rao',
  isSignup: true,
  ...overrides,
});

describe('auth.authenticateUser', () => {
  it('signs up a vendor, stores only a password hash and normalises the email', async () => {
    const t = convexTest(schema, modules);
    const result = await t.mutation(api.auth.authenticateUser, signup());

    expect(result.user).toMatchObject({ email: 'asha@example.com', role: 'vendor', firstName: 'Asha' });

    const credentials = await t.run((ctx) => ctx.db.query('credentials').collect());
    expect(credentials).toHaveLength(1);
    expect(credentials[0].email).toBe('asha@example.com');
    expect(credentials[0].passwordHash).not.toContain('masala');
  });

  it('logs in with the right password and rejects a wrong one', async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.auth.authenticateUser, signup());

    const ok = await t.mutation(api.auth.authenticateUser, { ...signup(), isSignup: false });
    expect(ok.user.role).toBe('vendor');

    await expect(
      t.mutation(api.auth.authenticateUser, { ...signup({ password: 'wrong-password' }), isSignup: false }),
    ).rejects.toThrow(/invalid email or password/i);
  });

  it('rejects duplicate accounts, short passwords and invalid emails', async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.auth.authenticateUser, signup());

    await expect(t.mutation(api.auth.authenticateUser, signup({ role: 'supplier' }))).rejects.toThrow(
      /already exists/i,
    );
    await expect(
      t.mutation(api.auth.authenticateUser, signup({ email: 'new@example.com', password: 'short' })),
    ).rejects.toThrow(/at least 8 characters/i);
    await expect(t.mutation(api.auth.authenticateUser, signup({ email: 'not-an-email' }))).rejects.toThrow(
      /valid email/i,
    );
  });

  it('points users to the right role on login', async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.auth.authenticateUser, signup({ role: 'supplier' }));

    await expect(
      t.mutation(api.auth.authenticateUser, { ...signup({ role: 'vendor' }), isSignup: false }),
    ).rejects.toThrow(/registered as a supplier/i);
  });

  it('lets a pre-existing account without a credential set its password on first login', async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert('vendors', {
        userId: 'legacy@example.com',
        businessName: 'Legacy Chaat',
        ownerName: 'Old Timer',
        email: 'legacy@example.com',
        phone: '',
        location: { address: '', city: 'Pune', state: 'MH', pincode: '', coordinates: { lat: 0, lng: 0 } },
        businessType: 'chaat',
        isVerified: false,
        trustScore: 0,
        preferences: {
          maxDeliveryDistance: 10,
          preferredCategories: [],
          budgetRange: { min: 0, max: 1000 },
          qualityPreference: 'medium',
          deliveryTimePreference: 'flexible',
        },
        createdAt: 0,
        updatedAt: 0,
      }),
    );

    const login = {
      email: 'legacy@example.com',
      password: 'first-password',
      role: 'vendor' as const,
      isSignup: false,
    };
    await t.mutation(api.auth.authenticateUser, login);
    // The first password is now locked in
    await expect(
      t.mutation(api.auth.authenticateUser, { ...login, password: 'other-password' }),
    ).rejects.toThrow(/invalid email or password/i);
  });
});
