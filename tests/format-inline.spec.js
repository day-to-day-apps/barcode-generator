// @ts-check
import { test, expect } from '@playwright/test';

const LANGS = ['', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'cs', 'uk'];
const FORMATS = [
  { slug: 'code-128', type: 'code128' },
  { slug: 'upc-a', type: 'upc' },
  { slug: 'code-39', type: 'code39' },
  { slug: 'itf-14', type: 'itf14' },
  { slug: 'codabar', type: 'codabar' },
];

for (const { slug, type } of FORMATS) {
  test.describe(`${slug} inline generator`, () => {
    for (const lang of LANGS) {
      const route = `/${lang ? `${lang}/` : ''}${slug}/`;
      test(`${route} renders a working localized tool`, async ({ page }) => {
        await page.goto(route);
        const tool = page.locator('#format-tool');
        await expect(tool).toBeVisible();
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('.format-page-header')).toBeVisible();
        await expect(page.locator('.format-page-header__publisher')).toHaveAttribute('href', 'https://daytodayapps.com/');
        await expect(page.locator('.format-page-header__nav a')).toHaveCount(3);
        await expect(page.locator('.landing__cta')).toHaveAttribute('href', '#format-tool');
        await expect(tool.locator('#format-inline-barcode rect, #format-inline-barcode path')).not.toHaveCount(0);
        await expect(tool.locator('.format-tool__status--success')).not.toBeEmpty();
        await expect(tool.locator('[data-advanced-link]')).toHaveAttribute('href', new RegExp(`type=${type}.*value=`));
      });
    }
  });
}

test.describe('Format-specific validation', () => {
  const cases = [
    { route: '/code-128/', input: 'SHIP/2026-001', output: 'SHIP/2026-001' },
    { route: '/upc-a/', input: '03600029145', output: '036000291452' },
    { route: '/code-39/', input: 'part-2026', output: 'PART-2026' },
    { route: '/itf-14/', input: '1001234500001', output: '10012345000017' },
    { route: '/codabar/', input: '123456', output: 'A123456A' },
  ];

  for (const { route, input, output } of cases) {
    test(`${route} normalizes and validates its own standard`, async ({ page }) => {
      await page.goto(route);
      const tool = page.locator('#format-tool');
      const value = tool.locator('#format-inline-value');
      await value.fill(input);
      await tool.locator('button[type="submit"]').click();
      expect(await value.getAttribute('aria-invalid')).toBeNull();
      await expect(tool.locator('#format-inline-status')).toContainText(output);
      await expect(tool.locator('[data-download="svg"]')).toBeVisible();
    });
  }

  test('invalid check digit exposes a localized error and clears the preview', async ({ page }) => {
    await page.goto('/pl/upc-a/');
    const tool = page.locator('#format-tool');
    const value = tool.locator('#format-inline-value');
    await value.fill('036000291453');
    await tool.locator('button[type="submit"]').click();
    await expect(value).toHaveAttribute('aria-invalid', 'true');
    await expect(tool.locator('.format-tool__status--error')).toContainText('2');
    await expect(tool.locator('#format-inline-barcode rect, #format-inline-barcode path')).toHaveCount(0);
  });

  test('narrow mobile layout does not overflow', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/de/code-128/');
    await expect(page.locator('#format-tool')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
});
