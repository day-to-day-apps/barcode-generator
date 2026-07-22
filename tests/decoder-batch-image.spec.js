import { test, expect } from '@playwright/test';

async function multiBarcodeImage(page) {
  await page.waitForFunction(() => window.JsBarcode);
  return page.evaluate(() => {
    const render = (value) => {
      const canvas = document.createElement('canvas');
      window.JsBarcode(canvas, value, {
        format: 'CODE128',
        width: 4,
        height: 100,
        margin: 32,
        displayValue: true,
      });
      return canvas;
    };
    const first = render('ORDER-2026-001');
    const second = render('ORDER-2026-002');
    const output = document.createElement('canvas');
    output.width = Math.max(first.width, second.width) + 80;
    output.height = first.height + second.height + 120;
    const context = output.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, output.width, output.height);
    context.drawImage(first, 40, 30);
    context.drawImage(second, 40, first.height + 90);
    return output.toDataURL('image/png');
  });
}

test.describe('multi-barcode image decoder', () => {
  test('finds all barcodes in one image and keeps processing local', async ({ page }) => {
    const externalRequests = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.hostname !== '127.0.0.1' && ['fetch', 'xhr'].includes(request.resourceType())) {
        externalRequests.push(url.href);
      }
    });

    await page.goto('/decoder');
    const dataUrl = await multiBarcodeImage(page);
    await page.locator('#batch-image-mode').check();
    await page.locator('#file-input').setInputFiles({
      name: 'two-code128-barcodes.png',
      mimeType: 'image/png',
      buffer: Buffer.from(dataUrl.split(',')[1], 'base64'),
    });

    await expect(page.locator('.result-multi-row')).toHaveCount(2);
    await expect(page.locator('#result-value')).toContainText('ORDER-2026-001');
    await expect(page.locator('#result-value')).toContainText('ORDER-2026-002');
    expect(externalRequests).toEqual([]);
  });

  test('is translated and does not overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/pl/decoder');

    await expect(page.locator('label[for="batch-image-mode"]')).toContainText('Znajdź wszystkie kody');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
