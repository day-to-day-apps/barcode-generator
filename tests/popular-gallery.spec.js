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
      for (const fmt of formats) {
        const card = page.locator(`.popular-card[data-format="${fmt}"]`);
        await expect(card.locator('.popular-card__preview').locator('svg, canvas').first()).toBeVisible();
      }
    });

    test(`[${code}] clicking a popular card selects format and updates aria-pressed`, async ({ page }) => {
      await page.goto(path);
      const card = page.locator('.popular-card[data-format="EAN13"]');
      await card.click();
      await expect(card).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#barcode-type')).toHaveValue('EAN13');
    });

    test(`[${code}] select uses two optgroups (popular + more) and no toggle button`, async ({ page }) => {
      await page.goto(path);
      const groups = page.locator('#barcode-type optgroup');
      await expect(groups).toHaveCount(2);
      const popularOpts = page.locator('#barcode-type optgroup:nth-of-type(1) option');
      const moreOpts = page.locator('#barcode-type optgroup:nth-of-type(2) option');
      await expect(popularOpts).toHaveCount(7);
      await expect(moreOpts).toHaveCount(13);
      await expect(page.locator('#btn-more-formats')).toHaveCount(0);
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
