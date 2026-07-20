// @ts-check
import { test, expect } from '@playwright/test';

const PAYLOAD = 'D2D-2D-TEST-2026';

async function decodeCanvas(page) {
  return page.evaluate(() => {
    const source = new window.ZXing.HTMLCanvasElementLuminanceSource(document.querySelector('#two-d-preview'));
    const bitmap = new window.ZXing.BinaryBitmap(new window.ZXing.HybridBinarizer(source));
    const result = new window.ZXing.MultiFormatReader().decode(bitmap);
    const formatValue = result.getBarcodeFormat();
    const format = Object.keys(window.ZXing.BarcodeFormat)
      .find((key) => window.ZXing.BarcodeFormat[key] === formatValue);
    return { text: result.getText(), format };
  });
}

test.describe('2D barcode generator', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/(googletagmanager\.com|google-analytics\.com)/, (route) =>
      route.fulfill({ status: 200, body: '', contentType: 'application/javascript' }));
    await page.goto('/2d-barcode-generator');
    await page.addScriptTag({ url: '/vendor/zxing.min.js' });
  });

  test('generates and decodes Data Matrix, PDF417 and Aztec', async ({ page }) => {
    await page.locator('#two-d-payload').fill(PAYLOAD);
    const cases = [
      { radio: 'Data Matrix', format: 'DATA_MATRIX' },
      { radio: 'PDF417', format: 'PDF_417' },
      { radio: 'Aztec', format: 'AZTEC' },
    ];

    for (const item of cases) {
      await page.getByRole('radio', { name: item.radio, exact: true }).check();
      const expectedBcid = item.radio === 'Data Matrix' ? 'datamatrix' : item.radio === 'PDF417' ? 'pdf417' : 'azteccode';
      await expect(page.locator('#two-d-preview')).toHaveAttribute('data-format', expectedBcid);
      await expect(page.locator('#two-d-metrics')).toContainText(`${new TextEncoder().encode(PAYLOAD).length} bytes`);
      await expect(page.locator('#two-d-status')).toHaveText('The barcode is ready to download.');
      const pixels = await page.locator('#two-d-preview').evaluate((canvas) => {
        const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let dark = 0;
        for (let index = 0; index < data.length; index += 4) {
          if (data[index] < 80 && data[index + 1] < 80 && data[index + 2] < 80 && data[index + 3] > 0) dark += 1;
        }
        return { dark, width: canvas.width, height: canvas.height };
      });
      expect(pixels.dark, item.radio).toBeGreaterThan(100);
      expect(pixels.width, item.radio).toBeGreaterThan(40);
      expect(pixels.height, item.radio).toBeGreaterThan(40);
      const decoded = await decodeCanvas(page);
      expect(decoded.text, item.radio).toBe(PAYLOAD);
      expect(decoded.format, item.radio).toBe(item.format);
    }
  });

  test('validates empty input and exports SVG and PNG', async ({ page }) => {
    await page.locator('#two-d-payload').fill('');
    await expect(page.locator('#two-d-status')).toHaveText('Enter data to encode.');
    await expect(page.locator('#download-two-d-svg')).toBeDisabled();

    await page.locator('#two-d-payload').fill('Export-2026');
    await expect(page.locator('#download-two-d-svg')).toBeEnabled();
    const svgDownload = page.waitForEvent('download');
    await page.locator('#download-two-d-svg').click();
    expect((await svgDownload).suggestedFilename()).toMatch(/^datamatrix-\d+\.svg$/);
    const pngDownload = page.waitForEvent('download');
    await page.locator('#download-two-d-png').click();
    expect((await pngDownload).suggestedFilename()).toMatch(/^datamatrix-\d+\.png$/);
  });

  test('updates format-specific settings without console errors', async ({ page }) => {
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.getByRole('radio', { name: 'PDF417', exact: true }).check();
    await expect(page.locator('[data-format-options="pdf417"]')).toBeVisible();
    await page.locator('#pdf-columns').fill('6');
    await expect(page.locator('#two-d-status')).toHaveText('The barcode is ready to download.');
    await page.getByRole('radio', { name: 'Aztec', exact: true }).check();
    await page.locator('#aztec-format').selectOption('compact');
    await expect(page.locator('#two-d-status')).toHaveText('The barcode is ready to download.');
    expect(errors).toEqual([]);
  });

  test('Polish and English routes expose final SEO signals', async ({ page }) => {
    for (const path of ['/2d-barcode-generator', '/pl/generator-kodow-2d']) {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://barcode-generator.daytodayapps.com${path}`);
      const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(schemas.length, path).toBeGreaterThan(0);
      for (const schema of schemas) expect(() => JSON.parse(schema), path).not.toThrow();
    }
  });

  test('mobile layout keeps controls and preview inside the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/pl/generator-kodow-2d');
    await expect(page.locator('#two-d-advanced')).not.toHaveAttribute('open', '');
    const geometry = await page.evaluate(() => {
      const controls = [...document.querySelectorAll('#two-d-form input, #two-d-form select, #two-d-form textarea, .two-d-actions button')];
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        outside: controls.filter((control) => {
          const rect = control.getBoundingClientRect();
          return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1;
        }).length,
      };
    });
    expect(geometry).toEqual({ overflow: 0, outside: 0 });
    await expect(page.locator('#two-d-preview')).toBeVisible();
  });

  test('decoder loads ZXing from the first-party production bundle', async ({ page }) => {
    await page.goto('/decoder');
    await expect.poll(() => page.evaluate(() => typeof window.ZXing)).toBe('object');
    const sources = await page.locator('script[src]').evaluateAll((scripts) => scripts.map((script) => script.src));
    expect(sources.some((source) => source.endsWith('/vendor/zxing.min.js'))).toBe(true);
    expect(sources.some((source) => source.includes('cdn.jsdelivr.net') && source.includes('@zxing'))).toBe(false);
  });
});
