import { expect, test, type Page } from "@playwright/test";

function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1000)}@example.com`;
}

async function selectRole(page: Page, role: "vendor" | "supplier") {
  await page.goto("/auth");
  await expect(page.getByText(/please choose your role to continue/i)).toBeVisible();
  const roleName = role === "vendor" ? /^🏪\s*vendor/i : /^🚚\s*supplier/i;
  await page.getByRole("button", { name: roleName }).click();
}

async function signUp(page: Page, role: "vendor" | "supplier", email: string, password: string) {
  await selectRole(page, role);
  await page.getByRole("button", { name: /don't have an account\? sign up/i }).click();
  await page.getByLabel(/first name/i).fill(role === "vendor" ? "Vendor" : "Supplier");
  await page.getByLabel(/last name/i).fill("Comprehensive");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password \*/i).fill(password);
  await page.getByRole("button", { name: /create account/i }).click();
}

test.describe("Comprehensive Error Handling E2E", () => {
  test.setTimeout(180000);

  test("keeps user in auth flow after duplicate signup attempt", async ({ page }) => {
    const email = uniqueEmail("duplicate.vendor");
    const password = "secure1234";

    await signUp(page, "vendor", email, password);
    await page.waitForURL(/\/vendor\/dashboard/, { timeout: 30000 });
    await page.getByRole("button", { name: /logout/i }).first().click();
    await expect(page).toHaveURL(/\/auth/);

    await signUp(page, "vendor", email, password);
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByText(/please choose your role to continue/i)).toBeVisible();
  });

  test("redirects role-mismatched dashboard access to the correct dashboard", async ({ page }) => {
    await signUp(page, "vendor", uniqueEmail("routeguard.vendor"), "secure1234");
    await page.waitForURL(/\/vendor\/dashboard/, { timeout: 30000 });

    await page.goto("/supplier/dashboard");
    await expect(page).toHaveURL(/\/vendor\/dashboard/);
    await expect(page.getByRole("heading", { name: /vendor dashboard/i })).toBeVisible();
  });

  test("completes supplier onboarding form without breaking navigation", async ({ page }) => {
    await signUp(page, "supplier", uniqueEmail("setup.supplier"), "secure1234");
    await page.waitForURL(/\/supplier\/dashboard/, { timeout: 30000 });

    const setupHeading = page.getByRole("heading", { name: /complete your supplier profile/i });
    if (await setupHeading.count()) {
      await page.getByLabel(/business name/i).fill("Comprehensive Supplier");
      await page.getByLabel(/owner name/i).fill("Supplier Owner");
      await page.getByLabel(/^phone/i).fill("9999999999");
      await page.getByLabel(/^city/i).fill("Mumbai");
      await page.getByLabel(/^address/i).fill("123 Supplier Road");
      await page.getByLabel(/^state/i).fill("Maharashtra");
      await page.getByLabel(/^pincode/i).fill("400001");
      await page.getByRole("button", { name: /create supplier profile/i }).click();
    }

    await expect(
      page.getByRole("navigation", { name: /supplier dashboard navigation/i })
    ).toBeVisible({ timeout: 30000 });
  });

  test("handles unknown routes and recovers to authenticated home flow", async ({ page }) => {
    await signUp(page, "vendor", uniqueEmail("unknown.vendor"), "secure1234");
    await page.waitForURL(/\/vendor\/dashboard/, { timeout: 30000 });

    await page.goto("/this-route-does-not-exist");
    await expect(page).toHaveURL(/\/vendor\/dashboard/);
  });

  test("keeps dashboard usable after offline/online transitions", async ({ page, context }) => {
    await signUp(page, "vendor", uniqueEmail("offline.vendor"), "secure1234");
    await page.waitForURL(/\/vendor\/dashboard/, { timeout: 30000 });
    await expect(page.getByRole("heading", { name: /vendor dashboard/i })).toBeVisible();

    await context.setOffline(true);
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="connection-status"]')).toContainText(/offline/i);

    await context.setOffline(false);
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeHidden({ timeout: 15000 });
    await page.getByRole("button", { name: /find suppliers/i }).first().click();
    await expect(page.getByRole("heading", { name: /^find suppliers$/i })).toBeVisible();
  });
});
