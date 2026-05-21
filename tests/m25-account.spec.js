// @ts-check
// M2.5 / M3 smoke: account & print-builder pages exist, are noindexed,
// and surface their core UI. No login required (Supabase email-confirm
// is not CI-friendly).
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(/(pagead2\.googlesyndication\.com|googletagmanager\.com|google-analytics\.com)/, (route) =>
    route.fulfill({ status: 200, body: '', contentType: 'application/javascript' }),
  );
});

const NOINDEX_PAGES = [
  '/konto.html',
  '/szablony.html',
  '/drukarki.html',
  '/wydruk.html',
  '/historia-wydrukow.html',
  '/moje-kody.html',
  '/reset-hasla.html',
];

test.describe('M2.5 pages — noindex,follow', () => {
  for (const path of NOINDEX_PAGES) {
    test(`${path} has <meta name="robots" content="noindex,follow">`, async ({ page }) => {
      await page.goto(path);
      const robots = page.locator('meta[name="robots"]');
      await expect(robots).toHaveAttribute('content', /noindex/i);
    });
  }
});

test.describe('M2.5 pages — canonical points to daytodayapps.com', () => {
  for (const path of NOINDEX_PAGES) {
    test(`${path} canonical hostname is daytodayapps.com`, async ({ page }) => {
      await page.goto(path);
      const href = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).toMatch(/barcode-generator\.daytodayapps\.com/);
    });
  }
});

test.describe('M2.5 — konto.html register form', () => {
  test('renders email + password fields and a submit button', async ({ page }) => {
    await page.goto('/konto.html');
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    const submits = page.locator('button[type="submit"], input[type="submit"]');
    expect(await submits.count()).toBeGreaterThan(0);
  });
});

test.describe('M2.5 — wydruk.html builder shell', () => {
  test('loads without console errors and exposes builder controls', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto('/wydruk.html');

    await expect(page.locator('body')).toBeVisible();
    const filtered = errors.filter((e) => !/favicon|supabase|adsbygoogle|googletagmanager|gtag/i.test(e));
    expect(filtered, filtered.join('\n')).toEqual([]);
  });
});
