/**
 * UI audit: visits every page/tab at phone, tablet and desktop widths against
 * the in-memory backend and reports horizontal overflow, runtime errors and
 * axe-core WCAG 2.x A/AA violations.
 *
 *   npm run build && npx vite preview --port 4173 &
 *   npx tsx scripts/ui/audit.ts
 */
import AxeBuilder from '@axe-core/playwright';
import { chromium, type Page } from 'playwright';
import { attachBackend, createSeededBackend } from './mockBackend';
import { SESSIONS, SUPPLIER_TABS, VENDOR_TABS, openSupplierTab, openVendorTab } from './routes';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const VIEWPORTS = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
];
const onlyAxe = process.argv.includes('--axe-desktop-only');
const details = process.argv.includes('--details');
const detailLines: string[] = [];

const t = await createSeededBackend();
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const contrastPairs = new Map<string, number>();
const axeTotals = new Map<string, { impact: string; count: number; pages: Set<string>; sample: string }>();

async function check(page: Page, label: string, viewport: string, issues: string[]) {
  await page.waitForTimeout(700);
  const overflow = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth <= width + 1) return [];
    return [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.right > width + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed';
      })
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
  });
  if (overflow.length) issues.push(`[${viewport}] ${label}: horizontal overflow → ${overflow.join(' | ')}`);
  if (onlyAxe && viewport !== 'desktop') return;
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  for (const v of results.violations) {
    const entry = axeTotals.get(v.id) ?? { impact: v.impact ?? '', count: 0, pages: new Set(), sample: '' };
    entry.count += v.nodes.length;
    entry.pages.add(label);
    if (details && v.id !== 'color-contrast') {
      for (const n of v.nodes)
        detailLines.push(`${v.id} @ ${label}: ${n.target.join(' ')} ${n.html.slice(0, 140)}`);
    }
    if (details && v.id === 'color-contrast') {
      for (const n of v.nodes)
        detailLines.push(
          `contrast @ ${label}: ${n.html.slice(0, 110)} :: ${(n.failureSummary ?? '').split('\n')[1]?.slice(0, 90)}`,
        );
    }
    if (v.id === 'color-contrast') {
      for (const n of v.nodes) {
        const m = /contrast of ([\d.]+) \(foreground color: (#\w+), background color: (#\w+)/.exec(
          n.failureSummary ?? '',
        );
        if (m)
          contrastPairs.set(
            `${m[2]} on ${m[3]} (${m[1]})`,
            (contrastPairs.get(`${m[2]} on ${m[3]} (${m[1]})`) ?? 0) + 1,
          );
      }
    }
    entry.sample ||=
      v.nodes[0]?.target.join(' ') + ' :: ' + (v.nodes[0]?.failureSummary ?? '').split('\n')[1];
    axeTotals.set(v.id, entry);
  }
}

const issues: string[] = [];
for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  page.on('pageerror', (e) => issues.push(`[${vp.name}] pageerror: ${e.message}`));
  await attachBackend(page, t, (l) => issues.push(`[${vp.name}] backend: ${l}`));

  for (const path of ['/', '/auth', '/does-not-exist']) {
    await page.goto(BASE + path);
    await check(page, path, vp.name, issues);
  }
  await page.goto(BASE + '/auth');
  await page
    .getByRole('button', { name: /vendor/i })
    .first()
    .click();
  await page.getByRole('button', { name: /sign up/i }).click();
  await check(page, 'signup', vp.name, issues);

  for (const role of ['vendor', 'supplier'] as const) {
    await page.evaluate((u) => localStorage.setItem('auth_user', JSON.stringify(u)), SESSIONS[role]);
    await page.goto(`${BASE}/${role}/dashboard`);
    await page.waitForTimeout(1500);
    const tabs = role === 'vendor' ? VENDOR_TABS : SUPPLIER_TABS;
    for (const tab of tabs) {
      try {
        if (role === 'vendor') await openVendorTab(page, tab);
        else await openSupplierTab(page, tab);
        await check(page, `${role}:${tab}`, vp.name, issues);
      } catch (error) {
        issues.push(
          `[${vp.name}] ${role}:${tab}: could not open (${(error as Error).message.split('\n')[0]})`,
        );
      }
    }
    await page.evaluate(() => localStorage.removeItem('auth_user'));
  }
  await context.close();
}
await browser.close();

console.log('\n== Layout / runtime issues ==');
console.log(issues.length ? [...new Set(issues)].join('\n') : 'none');
console.log('\n== axe WCAG A/AA violations ==');
for (const [id, v] of [...axeTotals].sort((a, b) => b[1].count - a[1].count)) {
  console.log(
    `${id} (${v.impact}) nodes=${v.count} pages=${[...v.pages].slice(0, 6).join(',')}\n   e.g. ${v.sample}`,
  );
}
console.log('\n== contrast failures by colour pair ==');
for (const [pair, n] of [...contrastPairs].sort((a, b) => b[1] - a[1]).slice(0, 25))
  console.log(`${n}\t${pair}`);
if (details) console.log('\n== details ==\n' + [...new Set(detailLines)].join('\n'));
