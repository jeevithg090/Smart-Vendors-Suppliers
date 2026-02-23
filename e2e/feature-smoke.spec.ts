import { test, expect, type Page } from '@playwright/test';

async function signUpAsRole(page: Page, role: 'vendor' | 'supplier') {
  const ts = Date.now();
  const email = `smoke.${role}.${ts}@example.com`;
  const password = 'smoke1234';

  await page.goto('/auth');
  await expect(page.getByText('Please choose your role to continue')).toBeVisible();

  const roleButtonName = role === 'vendor' ? /^🏪\s*vendor/i : /^🚚\s*supplier/i;
  await page.getByRole('button', { name: roleButtonName }).click();
  await page.getByRole('button', { name: /don't have an account\? sign up/i }).click();

  await page.getByLabel(/first name/i).fill(role === 'vendor' ? 'Vendor' : 'Supplier');
  await page.getByLabel(/last name/i).fill('Smoke');
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password \*/i).fill(password);
  await page.getByRole('button', { name: /create account/i }).click();

  const destination = role === 'vendor' ? /\/vendor\/dashboard/ : /\/supplier\/dashboard/;

  try {
    await page.waitForURL(destination, { timeout: 25000 });
  } catch {
    // Fallback through login path when signup returns a non-redirect response.
    await page.getByRole('button', { name: /already have an account\? sign in/i }).click();
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await page.waitForURL(destination, { timeout: 25000 });
  }
}

async function dismissOnboardingIfPresent(page: Page) {
  const dismissButton = page.getByRole('button', { name: /dismiss onboarding banner/i });
  if (await dismissButton.count()) {
    await dismissButton.first().click();
  }
}

test.describe('Feature Smoke', () => {
  test.setTimeout(180000);

  test('landing and auth role selection render correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Smart Street/i).first()).toBeVisible();
    await page.getByRole('link', { name: /get started/i }).first().click();
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole('button', { name: /^🏪\s*vendor/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^🚚\s*supplier/i })).toBeVisible();
  });

  test('vendor core feature set works end-to-end', async ({ page }) => {
    await signUpAsRole(page, 'vendor');
    await expect(page.getByRole('heading', { name: /vendor dashboard/i })).toBeVisible({ timeout: 30000 });
    await dismissOnboardingIfPresent(page);

    // Supplier discovery
    await page.getByRole('button', { name: /find suppliers/i }).first().click();
    await expect(page.getByRole('heading', { name: /^find suppliers$/i })).toBeVisible();
    await page.getByRole('button', { name: /filters/i }).click();
    await expect(page.getByText(/min trust score/i)).toBeVisible();

    const addToCompare = page.getByRole('button', { name: /add to compare/i });
    const compareCount = await addToCompare.count();
    if (compareCount >= 2) {
      await addToCompare.nth(0).click();
      await addToCompare.nth(1).click();
      await page.getByRole('button', { name: /compare 2 suppliers/i }).click();
      await expect(page.getByRole('heading', { name: /supplier comparison/i })).toBeVisible();

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: /export csv/i }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('supplier-comparison');
    } else {
      await expect(page.getByText(/supplier/i).first()).toBeVisible();
    }

    await page.getByRole('button', { name: /back to dashboard/i }).click();
    await expect(page.getByRole('heading', { name: /vendor dashboard/i })).toBeVisible();

    // Workflow
    await page.getByRole('button', { name: /go to smart workflow/i }).click();
    await expect(page.getByRole('heading', { name: /vendor sourcing workflow/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /quick order/i })).toBeVisible();
    await page.getByRole('button', { name: /back to dashboard/i }).click();

    // Group orders
    await page.getByRole('button', { name: /join group orders/i }).first().click();
    await expect(page.getByRole('heading', { name: /^group orders$/i })).toBeVisible();
    await page.getByRole('button', { name: /back to dashboard/i }).click();

    // Orders
    await page.getByRole('button', { name: /place and track orders/i }).click();
    await expect(page.getByRole('heading', { name: /order management/i })).toBeVisible();
    await page.getByRole('button', { name: /back to dashboard/i }).click();

    // Recipe costing
    await page.getByRole('button', { name: /recipe costing calculator/i }).click();
    await expect(page.getByRole('heading', { name: /recipe costing calculator/i })).toBeVisible();
    await page.getByRole('button', { name: /back to dashboard/i }).click();

    // Negotiation hub
    await page.getByRole('button', { name: /supplier negotiations/i }).click();
    await expect(page.getByRole('heading', { name: /supplier negotiation hub/i })).toBeVisible();
    await page.getByRole('button', { name: /start new negotiation/i }).click();
    await expect(page.getByRole('heading', { name: /start new negotiation/i })).toBeVisible();
    await page.getByRole('button', { name: /^cancel$/i }).click();
    await page.getByRole('button', { name: /back to dashboard/i }).click();

    // Market intelligence
    await page.getByRole('button', { name: /market intelligence/i }).click();
    await expect(page.getByRole('heading', { name: /market intelligence/i })).toBeVisible();
    await page.getByRole('button', { name: /back to dashboard/i }).click();

    // Financial analytics
    await page.getByRole('button', { name: /view analytics/i }).click();
    await expect(page.getByRole('heading', { name: /financial analytics/i })).toBeVisible();
    await page.getByRole('button', { name: /back to dashboard/i }).click();

    // Smart planner
    await page.getByRole('button', { name: /smart procurement planner/i }).click();
    await expect(page.getByRole('heading', { name: /smart procurement planner/i })).toBeVisible();
  });

  test('supplier feature set works end-to-end', async ({ page }) => {
    await signUpAsRole(page, 'supplier');

    // Complete profile if first-time supplier setup is shown
    const setupHeading = page.getByRole('heading', { name: /complete your supplier profile/i });
    if (await setupHeading.count()) {
      await page.getByLabel(/business name/i).fill('Smoke Supplier Pvt Ltd');
      await page.getByLabel(/owner name/i).fill('Smoke Owner');
      await page.getByLabel(/^phone/i).fill('9999999999');
      await page.getByLabel(/^city/i).fill('Mumbai');
      await page.getByLabel(/^address/i).fill('123 Market Street');
      await page.getByLabel(/^state/i).fill('Maharashtra');
      await page.getByLabel(/^pincode/i).fill('400001');
      await page.getByRole('button', { name: /create supplier profile/i }).click();
    }

    await expect(page.getByRole('navigation', { name: /supplier dashboard navigation/i })).toBeVisible({ timeout: 30000 });
    await dismissOnboardingIfPresent(page);

    // Products + add product flow
    await page.getByRole('button', { name: /my products/i }).click();
    await expect(page.getByRole('heading', { name: /my product catalog/i })).toBeVisible();
    await page.getByRole('button', { name: /add new product/i }).first().click();
    await expect(page.getByRole('heading', { name: /add new product/i })).toBeVisible();
    await page.getByLabel(/product name/i).fill('Smoke Tomatoes');
    await page.getByLabel(/^category/i).selectOption('Vegetables');
    await page.getByLabel(/current stock/i).fill('100');
    await page.getByLabel(/^unit/i).selectOption('kg');
    await page.getByLabel(/price per unit/i).fill('42');
    await page.getByLabel(/minimum order/i).fill('5');
    await page.getByLabel(/quality grade/i).selectOption('good');
    await page.getByRole('button', { name: /^add product$/i }).click();
    await expect(page.getByText(/smoke tomatoes/i)).toBeVisible();

    // Order management
    await page.getByRole('button', { name: /order management/i }).click();
    await expect(page.getByRole('heading', { name: /order management/i })).toBeVisible();

    // Feature tabs
    await page.getByRole('button', { name: /smart pricing/i }).click();
    await expect(page.getByRole('heading', { name: /smart pricing engine/i })).toBeVisible();

    await page.getByRole('button', { name: /automation/i }).click();
    await expect(page.getByRole('heading', { name: /inventory automation/i })).toBeVisible();

    await page.getByRole('button', { name: /quality control/i }).click();
    await expect(page.getByRole('heading', { name: /quality assurance/i })).toBeVisible();

    await page.getByRole('button', { name: /loyalty program/i }).click();
    await expect(page.getByRole('heading', { name: /vendor loyalty program/i })).toBeVisible();

    await page.getByRole('button', { name: /business analytics/i }).click();
    await expect(page.getByRole('heading', { name: /business analytics/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /supplier analytics/i })).toBeVisible();

    await page.getByRole('button', { name: /store profile/i }).click();
    await expect(page.getByRole('heading', { name: /store profile/i })).toBeVisible();
    await page.getByRole('button', { name: /edit profile/i }).click();
    await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible();
  });
});
