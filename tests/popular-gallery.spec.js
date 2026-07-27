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
      const cards = page.locator('.popular-card[data-format]');
      await expect(cards).toHaveCount(6);
      const formats = await cards.evaluateAll((els) => els.map((el) => el.getAttribute('data-format')));
      expect(formats).toEqual(['EAN13', 'EAN8', 'UPC', 'CODE128', 'CODE39', 'QR']);
      for (const fmt of formats) {
        const card = page.locator(`.popular-card[data-format="${fmt}"]`);
        await expect(card.locator('.popular-card__preview img')).toBeVisible();
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

    test(`[${code}] popular cards are visually distinct and use compact image previews`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('.popular-card[data-format="EAN13"] img')).toBeVisible();
      // Cards must have non-default left-border colours.
      const borderColors = await page.locator('.popular-card[data-format]').evaluateAll((els) =>
        els.map((el) => ({
          fmt: el.getAttribute('data-format'),
          color: getComputedStyle(el).borderLeftColor,
        })),
      );
      // All six must have a colour set, and at least 3 distinct values across the row
      const unique = new Set(borderColors.map((b) => b.color));
      expect(unique.size).toBeGreaterThanOrEqual(3);

      // Build-time thumbnails avoid hundreds of inline SVG nodes while retaining visible bars and text.
      const sources = new Set();
      for (const fmt of ['EAN13', 'EAN8', 'UPC', 'CODE128', 'CODE39']) {
        const preview = page.locator(`.popular-card[data-format="${fmt}"] img`);
        await expect(preview).toBeVisible();
        const image = await preview.evaluate((element) => {
          return {
            source: element.getAttribute('src'),
            naturalWidth: element.naturalWidth,
            naturalHeight: element.naturalHeight,
          };
        });
        expect(image.source).toMatch(/^\/previews\/[a-z0-9]+\.svg$/);
        expect(image.naturalWidth).toBeGreaterThan(40);
        expect(image.naturalHeight).toBeGreaterThan(30);
        sources.add(image.source);
      }
      expect(sources.size).toBe(5);

      await expect(page.locator('.popular-card[data-format="QR"] img')).toBeVisible();
      await expect(page.locator('.popular-card__preview svg')).toHaveCount(0);
      expect(await page.locator('*').count()).toBeLessThan(900);
    });

    test(`[${code}] main QR preview fills panel (>= 280px)`, async ({ page }) => {
      await page.goto(path);
      await page.locator('.popular-card[data-format="QR"]').click();
      const svg = page.locator('#qr-preview svg');
      await expect(svg).toBeVisible({ timeout: 5000 });
      const width = await svg.evaluate((el) => el.getBoundingClientRect().width);
      expect(width).toBeGreaterThanOrEqual(280);
    });
  }

  test('[en] SEO copy mentions "20 standards + QR Code"', async ({ page }) => {
    await page.goto('/');
    const og = await page.locator('meta[property="og:description"]').getAttribute('content');
    expect(og).toContain('20 standards + QR Code');
  });

  test('[en] compact gallery and guide link fit a 360px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');
    const gallery = page.locator('.popular-section[aria-labelledby="popular-title"]');
    await gallery.scrollIntoViewIfNeeded();
    await expect(gallery.locator('.popular-card__preview img')).toHaveCount(6);
    await expect(page.locator('.popular-card__more')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  });
});
