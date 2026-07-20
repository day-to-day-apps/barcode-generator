// @ts-check
import { test, expect } from '@playwright/test';

test.describe('GS1 validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/gs1-barcode-generator');
  });

  test('calculates and validates GTIN check digits', async ({ page }) => {
    const result = await page.evaluate(() => ({
      digit: window.GS1Tools.calculateCheckDigit('590123412345'),
      normalized: window.GS1Tools.normalizeGtin('590123412345', 13),
      invalidError: (() => {
        try {
          window.GS1Tools.normalizeGtin('5901234123458', 13);
          return '';
        } catch (error) {
          return error.message;
        }
      })(),
    }));
    expect(result.digit).toBe('7');
    expect(result.normalized).toMatchObject({
      value: '5901234123457',
      corrected: true,
    });
    expect(result.invalidError).toBe('invalid_check_digit');
  });

  test('builds SSCC and GS1-128 element strings', async ({ page }) => {
    const result = await page.evaluate(() => {
      const tools = window.GS1Tools;
      const ssccBody = '12345678901234567';
      return {
        fnc1: tools.FNC1,
        sscc: tools.buildSscc(ssccBody),
        ssccCheckDigit: tools.calculateCheckDigit(ssccBody),
        gs1128: tools.buildGs1128({
          gtin: '5901234123457',
          expiry: '2027-12-31',
          batch: 'LOT-2026',
          serial: '0001',
        }),
      };
    });
    expect(result.sscc.hri).toBe(`(00)12345678901234567${result.ssccCheckDigit}`);
    expect(result.gs1128.hri).toBe('(01)05901234123457(17)271231(10)LOT-2026(21)0001');
    expect(result.gs1128.encoded).toBe(`01059012341234571727123110LOT-2026${result.fnc1}210001`);
  });

  test('rejects unsupported GS1 characters', async ({ page }) => {
    const message = await page.evaluate(() => {
      try {
        window.GS1Tools.buildGs1128({ gtin: '5901234123457', batch: 'LOT 2026' });
        return '';
      } catch (error) {
        return error.message;
      }
    });
    expect(message).toMatch(/character/i);
  });
});

test.describe('GS1 public tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/(googletagmanager\.com|google-analytics\.com)/, (route) =>
      route.fulfill({ status: 200, body: '', contentType: 'application/javascript' }));
  });

  test('renders all modes and exports SVG', async ({ page }) => {
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto('/gs1-barcode-generator');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://barcode-generator.daytodayapps.com/gs1-barcode-generator');
    await expect(page.locator('#gs1-preview rect')).not.toHaveCount(0);

    await page.getByRole('radio', { name: 'SSCC' }).check();
    await expect(page.locator('#gs1-hri')).toContainText('(00)');

    await page.getByRole('radio', { name: 'GS1-128' }).check();
    await page.locator('#gs1-expiry').fill('2027-12-31');
    await page.locator('#gs1-batch').fill('LOT-2026');
    await page.locator('#gs1-serial').fill('0001');
    await expect(page.locator('#gs1-hri')).toHaveText('(01)05901234123457(17)271231(10)LOT-2026(21)0001');
    await expect(page.locator('#gs1-encoded')).toContainText('<FNC1>');

    const download = page.waitForEvent('download');
    await page.locator('#download-svg').click();
    expect((await download).suggestedFilename()).toMatch(/^gs1-gs1-128-\d+\.svg$/);
    expect(errors).toEqual([]);
  });

  test('Polish route is canonical and mobile layout does not overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/pl/generator-kodow-gs1');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
    await expect(page.locator('h1')).toHaveText(/Generator kodów GS1/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://barcode-generator.daytodayapps.com/pl/generator-kodow-gs1');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.locator('#gs1-preview rect')).not.toHaveCount(0);
  });
});
