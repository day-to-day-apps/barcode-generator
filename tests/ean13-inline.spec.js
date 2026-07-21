// @ts-check
import { test, expect } from '@playwright/test';

const ROUTES = ['/ean-13/', '/pl/ean-13/', '/de/ean-13/', '/fr/ean-13/', '/es/ean-13/', '/it/ean-13/', '/pt/ean-13/', '/nl/ean-13/', '/cs/ean-13/', '/uk/ean-13/'];

test.describe('Inline EAN-13 generator', () => {
  for (const route of ROUTES) {
    test(`${route} exposes a working localized tool`, async ({ page }) => {
      await page.goto(route);
      const tool = page.locator('#ean13-tool');
      await expect(tool).toBeVisible();
      await expect(page.locator('h1')).toHaveCount(1);

      const input = tool.locator('input[name="ean13"]');
      await input.fill('400638133393');
      await tool.locator('button[type="submit"]').click();
      await expect(tool.locator('#ean13-inline-status')).toContainText('4006381333931');
      await expect(tool.locator('#ean13-inline-barcode rect, #ean13-inline-barcode path')).not.toHaveCount(0);
      await expect(tool.locator('[data-download="svg"]')).toBeVisible();
      await expect(tool.locator('[data-advanced-link]')).toHaveAttribute('href', /value=4006381333931/);

      await input.fill('4006381333932');
      await tool.locator('button[type="submit"]').click();
      await expect(input).toHaveAttribute('aria-invalid', 'true');
      await expect(tool.locator('.ean13-tool__status--error')).not.toBeEmpty();
    });
  }

  test('mobile layout does not overflow and keeps the tool before reference content', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/es/ean-13/');
    await expect(page.locator('#ean13-tool')).toBeVisible();
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasOverflow).toBe(false);
    const order = await page.locator('main > *').evaluateAll((nodes) => nodes.map((node) => node.id || node.className));
    expect(order.indexOf('ean13-tool')).toBeLessThan(order.findIndex((item) => String(item).includes('landing__sample')));
  });

  for (const [route, title] of [
    ['/es/ean-13/', 'Generador EAN-13 Online Gratis | Crear y Descargar'],
    ['/cs/ean-13/', 'Generátor EAN-13 online zdarma | Vytvořit a stáhnout'],
    ['/it/', 'Generatore Codici a Barre Online Gratis | EAN e UPC'],
  ]) {
    test(`${route} keeps search and social metadata aligned`, async ({ page }) => {
      await page.goto(route);
      expect(await page.title()).toBe(title);
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', title);
      await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', title);
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', description);
      await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute('content', description);
    });
  }
});
