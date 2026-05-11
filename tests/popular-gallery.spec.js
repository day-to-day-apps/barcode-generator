// @ts-check
import { test, expect } from '@playwright/test';

const LANGS = [
  { code: 'en', path: '/' },
  { code: 'pl', path: '/pl/' },
  { code: 'de', path: '/de/' },
];

test.beforeEach(async ({ page }) => {
  await page.route(/(pagead2\.googlesyndication\.com|googletagmanager\.com|google-analytics\.com)/, (route) =>
    route.fulfill({ status: 200, body: '', contentType: 'application/javascript' }),
  );
});

test.describe('Popular Gallery + More-formats + QR options', () => {
  for (const { code, path } of LANGS) {
    test(`[${code}] renders 6 popular cards`, async ({ page }) => {
      await page.goto(path);
      const cards = page.locator('.popular-card');
      await expect(cards).toHaveCount(6);
      const formats = await cards.evaluateAll((els) => els.map((el) => el.getAttribute('data-format')));
      expect(formats).toEqual(['EAN13', 'UPC', 'CODE128', 'CODE39', 'ITF14', 'QR']);
    });

    test(`[${code}] clicking a popular card selects format and updates aria-pressed`, async ({ page }) => {
      await page.goto(path);
      const card = page.locator('.popular-card[data-format="EAN13"]');
      await card.click();
      await expect(card).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#barcode-type')).toHaveValue('EAN13');
    });

    test(`[${code}] extended formats are hidden by default and revealed by toggle`, async ({ page }) => {
      await page.goto(path);
      const extended = page.locator('#barcode-type option.format-extended');
      const totalExtended = await extended.count();
      expect(totalExtended).toBeGreaterThan(0);
      const hiddenBefore = await extended.evaluateAll((els) => els.every((el) => el.hidden === true));
      expect(hiddenBefore).toBe(true);

      const btnMore = page.locator('#btn-more-formats');
      await expect(btnMore).toHaveAttribute('aria-expanded', 'false');
      await btnMore.click();
      await expect(btnMore).toHaveAttribute('aria-expanded', 'true');
      const hiddenAfter = await extended.evaluateAll((els) => els.every((el) => el.hidden === false));
      expect(hiddenAfter).toBe(true);
    });

    test(`[${code}] selecting QR shows qr-options and renders qr-preview`, async ({ page }) => {
      await page.goto(path);
      await page.locator('.popular-card[data-format="QR"]').click();
      await expect(page.locator('#qr-options')).toBeVisible();
      await expect(page.locator('#qr-ecc')).toBeVisible();
      const qrPreview = page.locator('#qr-preview');
      await expect(qrPreview).toHaveClass(/active/);
      await expect(qrPreview.locator('canvas, svg').first()).toBeVisible({ timeout: 5000 });
    });
  }

  test('[en] SEO copy mentions "20 standards + QR Code"', async ({ page }) => {
    await page.goto('/');
    const og = await page.locator('meta[property="og:description"]').getAttribute('content');
    expect(og).toContain('20 standards + QR Code');
  });
});
