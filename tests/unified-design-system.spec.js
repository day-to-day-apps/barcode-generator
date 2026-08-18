import { test, expect } from '@playwright/test';

const ROUTES = [
  '/', '/pl/', '/decoder', '/pl/decoder', '/qr-code/', '/pl/ean-13/',
  '/bulk-barcode-generator', '/pl/generator-kodow-z-csv',
  '/gs1-barcode-generator', '/pl/generator-kodow-gs1',
  '/2d-barcode-generator', '/pl/generator-kodow-2d',
  '/konto', '/pl/konto', '/privacy-policy', '/guides/gtin-ean-upc',
];

test.describe('shared site shell', () => {
  for (const route of ROUTES) {
    test(`${route} uses the unified header`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('.site-header')).toHaveCount(1);
      await expect(page.locator('.site-brand')).toBeVisible();
      await expect(page.locator('.site-nav__link')).toHaveCount(6);
      await expect(page.locator('#lang-toggle')).toBeVisible();
      await expect(page.locator('#theme-toggle')).toBeVisible();
      await expect(page.locator('[id="lang-toggle"]')).toHaveCount(1);
      const legacyHidden = await page.locator('header.bulk-header, header.format-page-header, .topbar, nav.decoder-nav').evaluateAll((elements) => (
        elements.every((element) => getComputedStyle(element).display === 'none')
      ));
      expect(legacyHidden).toBe(true);
    });
  }

  test('primary navigation is present in static HTML', async ({ request }) => {
    for (const route of ['/', '/decoder', '/2d-barcode-generator', '/konto']) {
      const html = await (await request.get(route)).text();
      expect(html, route).toContain('<header class="site-header">');
      expect(html, route).toMatch(/<body[^>]*class="[^"]*site-shell-ready/);
    }
  });

  test('decoder links directly to every current generator mode', async ({ page }) => {
    await page.goto('/pl/decoder');
    await expect(page.locator('.site-nav a[href="/pl/generator-kodow-z-csv"]')).toBeVisible();
    await expect(page.locator('.site-nav a[href="/pl/generator-kodow-gs1"]')).toBeVisible();
    await expect(page.locator('.site-nav a[href="/pl/generator-kodow-2d"]')).toBeVisible();
  });

  test('language and theme controls respond without delayed app bundles', async ({ page }) => {
    for (const route of ['/', '/decoder', '/2d-barcode-generator']) {
      await page.goto(route);
      await page.locator('#lang-toggle').click();
      await expect(page.locator('#lang-dropdown')).toBeVisible();
      const before = await page.locator('html').getAttribute('data-theme');
      await page.locator('#theme-toggle').click();
      await expect(page.locator('html')).not.toHaveAttribute('data-theme', before || 'light');
    }
  });

  test('format pages expose one language selector only', async ({ page }) => {
    for (const route of ['/ean-13/', '/qr-code/', '/pl/code-128/']) {
      await page.goto(route);
      await expect(page.locator('.lang-switch')).toHaveCount(1);
      await expect(page.locator('.landing__lang, .format-page-header')).toHaveCount(0);
    }
  });

  test('popular QR tile has the same geometry as barcode tiles', async ({ page }) => {
    await page.goto('/');
    const boxes = await page.locator('.popular-card').evaluateAll((cards) => cards.map((card) => {
      const box = card.getBoundingClientRect();
      return { width: Math.round(box.width), height: Math.round(box.height) };
    }));
    expect(new Set(boxes.map(({ height }) => height)).size).toBe(1);
    expect(Math.max(...boxes.map(({ width }) => width)) - Math.min(...boxes.map(({ width }) => width))).toBeLessThanOrEqual(1);
  });

  test('mobile header and tools do not overflow horizontally', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    for (const route of ['/', '/decoder', '/2d-barcode-generator', '/konto']) {
      await page.goto(route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, route).toBeLessThanOrEqual(1);
    }
  });
});
