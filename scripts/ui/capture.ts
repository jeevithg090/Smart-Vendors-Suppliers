/**
 * Captures README screenshots from the running app with seeded demo data.
 *
 *   npm run build && npx vite preview --port 4173 &
 *   npx tsx scripts/ui/capture.ts [outDir]
 */
import { mkdirSync } from 'node:fs';
import { chromium, type Page } from 'playwright';
import { attachBackend, createSeededBackend } from './mockBackend';
import { SESSIONS, openSupplierTab, openVendorTab } from './routes';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const OUT = process.argv[2] ?? 'docs/screenshots';
mkdirSync(OUT, { recursive: true });

type Shot = {
  name: string;
  width: number;
  height: number;
  role?: 'vendor' | 'supplier';
  path?: string;
  fullPage?: boolean;
  prepare?: (page: Page) => Promise<void>;
};

const shots: Shot[] = [
  { name: 'home-desktop', width: 1280, height: 800 },
  { name: 'home-mobile', width: 375, height: 812 },
  { name: 'home-tablet', width: 768, height: 1024 },
  {
    name: 'signup-mobile',
    width: 375,
    height: 812,
    path: '/auth',
    prepare: async (page) => {
      await page
        .getByRole('button', { name: /vendor/i })
        .first()
        .click();
      await page.getByRole('button', { name: /sign up/i }).click();
    },
  },
  { name: 'auth-role-desktop', width: 1280, height: 800, path: '/auth' },
  { name: 'vendor-dashboard', width: 1280, height: 900, role: 'vendor' },
  { name: 'vendor-dashboard-mobile', width: 375, height: 812, role: 'vendor' },
  {
    name: 'vendor-suppliers',
    width: 1280,
    height: 900,
    role: 'vendor',
    prepare: (p) => openVendorTab(p, 'Find Suppliers'),
  },
  {
    name: 'vendor-group-orders',
    width: 1280,
    height: 900,
    role: 'vendor',
    prepare: (p) => openVendorTab(p, 'Join Group Orders'),
  },
  {
    name: 'vendor-analytics',
    width: 1280,
    height: 900,
    fullPage: true,
    role: 'vendor',
    prepare: (p) => openVendorTab(p, 'View Analytics'),
  },
  {
    name: 'vendor-recipes',
    width: 1280,
    height: 900,
    role: 'vendor',
    prepare: (p) => openVendorTab(p, 'Recipe Costing Calculator'),
  },
  { name: 'supplier-dashboard', width: 1280, height: 900, role: 'supplier' },
  {
    name: 'supplier-products',
    width: 1280,
    height: 900,
    role: 'supplier',
    prepare: (p) => openSupplierTab(p, 'My Products'),
  },
  {
    name: 'supplier-analytics',
    width: 1280,
    height: 900,
    fullPage: true,
    role: 'supplier',
    prepare: (p) => openSupplierTab(p, 'Business Analytics'),
  },
  {
    name: 'supplier-products-tablet',
    width: 768,
    height: 1024,
    role: 'supplier',
    prepare: (p) => openSupplierTab(p, 'My Products'),
  },
  { name: 'not-found', width: 1280, height: 720, path: '/no-such-page' },
];

const only = process.env.ONLY?.split(',');
const t = await createSeededBackend();
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
for (const shot of shots.filter((s) => !only || only.includes(s.name))) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await attachBackend(page, t);
  if (shot.role)
    await page.addInitScript(
      (u) => localStorage.setItem('auth_user', JSON.stringify(u)),
      SESSIONS[shot.role],
    );
  await page.goto(BASE + (shot.path ?? (shot.role ? `/${shot.role}/dashboard` : '/')));
  await page.waitForTimeout(2000);
  await shot.prepare?.(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  // Let charts finish their entry animations
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: shot.fullPage ?? false });
  console.log('saved', shot.name);
  await context.close();
}
await browser.close();
