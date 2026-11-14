import { expect, test, type Page } from './fixtures';

function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1000)}@example.com`;
}

async function selectRole(page: Page, role: 'vendor' | 'supplier') {
  await page.goto('/auth');
  await expect(page.getByText(/please choose your role to continue/i)).toBeVisible();
  const roleName = role === 'vendor' ? /^🏪\s*vendor/i : /^🚚\s*supplier/i;
  await page.getByRole('button', { name: roleName }).click();
}

async function signUp(page: Page, role: 'vendor' | 'supplier', email: string, password: string) {
  await selectRole(page, role);
  await page.getByRole('button', { name: /don't have an account\? sign up/i }).click();
  await page.getByLabel(/first name/i).fill(role === 'vendor' ? 'Vendor' : 'Supplier');
  await page.getByLabel(/last name/i).fill('E2E');
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password \*/i).fill(password);
  await page.getByRole('button', { name: /create account/i }).click();
}

test.describe('Error Handling E2E', () => {
  test.setTimeout(180000);

  test('redirects unauthenticated users away from protected routes', async ({ page }) => {
    await page.goto('/vendor/dashboard');
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByText(/please choose your role to continue/i)).toBeVisible();
  });

  test('shows signup validation errors and recovers with valid input', async ({ page }) => {
    await selectRole(page, 'vendor');
    await page.getByRole('button', { name: /don't have an account\? sign up/i }).click();

    await page.getByLabel(/first name/i).fill('Vendor');
    await page.getByLabel(/email address/i).fill(uniqueEmail('validation.vendor'));
    await page.getByLabel(/^password \*/i).fill('123');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible();

    await page.getByLabel(/^password \*/i).fill('valid1234');
    await page.getByRole('button', { name: /create account/i }).click();
    await page.waitForURL(/\/vendor\/dashboard/, { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /vendor dashboard/i })).toBeVisible();
  });

  test('shows offline indicator and recovers when connection returns', async ({ page, context }) => {
    await page.goto('/');
    // The connection badge only appears when the connection is degraded
    await expect(page.locator('[data-testid="connection-status"]')).toBeHidden();

    await context.setOffline(true);
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="connection-status"]')).toContainText(/offline/i);

    await context.setOffline(false);
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeHidden({ timeout: 15000 });
  });

  test('keeps auth flow responsive when backend is unreachable', async ({ page }) => {
    await page.route('**/*.convex.cloud/**', (route) => route.abort('failed'));

    await selectRole(page, 'vendor');
    await page.locator('#email').fill(uniqueEmail('offline.vendor'));
    await page.locator('#password').fill('local1234');
    await page.getByRole('button', { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 20000 });
  });

  test('does not authenticate when role credentials are invalid', async ({ page }) => {
    const email = uniqueEmail('wrong-role');
    const password = 'secure1234';

    await signUp(page, 'supplier', email, password);
    await page.waitForURL(/\/supplier\/dashboard/, { timeout: 30000 });

    await page
      .getByRole('button', { name: /logout/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/auth/);

    await selectRole(page, 'vendor');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole('alert')).toContainText(/registered as a supplier/i);
  });
});
