import { test as base, expect } from '@playwright/test';

/**
 * With E2E_MOCK_BACKEND=1 every page talks to an in-memory Convex backend that
 * runs the real functions from convex/ (see scripts/screenshots/mockBackend.ts),
 * so the suite can run without a Convex deployment.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    if (process.env.E2E_MOCK_BACKEND === '1') {
      const { attachBackend, createSeededBackend } = await import('../scripts/ui/mockBackend');
      await attachBackend(page, await createSeededBackend());
    }
    await use(page);
  },
});

export { expect };
export type { Page } from '@playwright/test';
