import { test, expect } from '@playwright/test';

test.describe('decoder to generator flow', () => {
  test('generator restores a decoded EAN-13 value from a deep link', async ({ page }) => {
    await page.goto('/?type=ean13&value=5901234123457');

    await expect(page.locator('#barcode-type')).toHaveValue('EAN13');
    await expect(page.locator('#barcode-text')).toHaveValue('5901234123457');
    await expect(page.locator('#barcode-svg')).not.toBeEmpty();
  });

  test('localized deep link keeps the selected language', async ({ page }) => {
    await page.goto('/pl/?type=code128&value=MAGAZYN-2026');

    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
    await expect(page.locator('#barcode-type')).toHaveValue('CODE128');
    await expect(page.locator('#barcode-text')).toHaveValue('MAGAZYN-2026');
  });

  test('decoder exposes a translated, initially hidden generator action', async ({ page }) => {
    await page.goto('/pl/decoder');

    const action = page.locator('#open-generator-btn');
    await expect(action).toHaveText(/Otwórz w generatorze/);
    await expect(action).toBeHidden();
  });

  test('decoded image links to a prefilled localized generator', async ({ page }) => {
    await page.goto('/pl/decoder');
    await page.waitForFunction(() => window.JsBarcode);
    const dataUrl = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      window.JsBarcode(canvas, '5901234123457', { format: 'EAN13', width: 3, height: 120, margin: 24 });
      return canvas.toDataURL('image/png');
    });

    await page.locator('#file-input').setInputFiles({
      name: 'ean13.png',
      mimeType: 'image/png',
      buffer: Buffer.from(dataUrl.split(',')[1], 'base64'),
    });

    await expect(page.locator('#result-value')).toHaveText('5901234123457');
    await expect(page.locator('#open-generator-btn')).toHaveAttribute(
      'href',
      '/pl/?type=ean13&value=5901234123457',
    );
  });
});
