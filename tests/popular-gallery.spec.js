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
      expect(formats).toEqual(['EAN13', 'EAN8', 'UPC', 'CODE128', 'CODE39', 'QR']);
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

    test(`[${code}] popular cards are visually distinct (border accents + displayValue text)`, async ({ page }) => {
      await page.goto(path);
      // Cards must have non-default left-border colour, and each linear card must show <text> (displayValue:true)
      const borderColors = await page.locator('.popular-card').evaluateAll((els) =>
        els.map((el) => ({
          fmt: el.getAttribute('data-format'),
          color: getComputedStyle(el).borderLeftColor,
        })),
      );
      // All six must have a colour set, and at least 3 distinct values across the row
      const unique = new Set(borderColors.map((b) => b.color));
      expect(unique.size).toBeGreaterThanOrEqual(3);
      // Each linear card SVG must contain a <text> node (proves displayValue:true)
      for (const fmt of ['EAN13', 'EAN8', 'UPC', 'CODE128', 'CODE39']) {
        const hasText = await page
          .locator(`.popular-card[data-format="${fmt}"] svg text`)
          .first()
          .count();
        expect(hasText, `${fmt} preview should render <text>`).toBeGreaterThan(0);
      }
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
});
