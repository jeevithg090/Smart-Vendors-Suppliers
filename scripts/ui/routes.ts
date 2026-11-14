import type { Page } from 'playwright';

// Demo sessions for the profiles created by convex/sampleData.ts
export const SESSIONS = {
  vendor: {
    id: 'sample_vendor_1',
    email: 'ravi@streetdelights.com',
    firstName: 'Ravi',
    lastName: 'Sharma',
    role: 'vendor',
  },
  supplier: {
    id: 'sample_user_1',
    email: 'rajesh@freshveggies.com',
    firstName: 'Rajesh',
    lastName: 'Kumar',
    role: 'supplier',
  },
} as const;

// Accessible names of the vendor dashboard quick-action cards
export const VENDOR_TABS = [
  'Overview',
  'Go to Smart Workflow',
  'Find Suppliers',
  'Join Group Orders',
  'Place and Track Orders',
  'Recipe Costing Calculator',
  'Supplier Negotiations',
  'Market Intelligence',
  'View Analytics',
  'Smart Procurement Planner',
  'Growth and Operations Hub',
] as const;

export const SUPPLIER_TABS = [
  'Dashboard',
  'My Products',
  'Order Management',
  'Smart Pricing',
  'Automation',
  'Quality Control',
  'Loyalty Program',
  'Business Analytics',
  'Store Profile',
] as const;

export async function openVendorTab(page: Page, tab: string) {
  const back = page.getByRole('button', { name: /back to dashboard/i }).first();
  if (await back.isVisible().catch(() => false)) await back.click();
  if (tab === 'Overview') return;
  await page.getByRole('button', { name: tab, exact: true }).first().click({ timeout: 5000 });
}

export async function openSupplierTab(page: Page, tab: string) {
  await page
    .getByRole('navigation', { name: /supplier dashboard navigation/i })
    .getByRole('button', { name: new RegExp(tab, 'i') })
    .first()
    .click({ timeout: 5000 });
}
