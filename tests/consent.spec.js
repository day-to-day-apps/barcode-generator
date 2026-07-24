// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Consent banner', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('barcode-cookie-consent'));
  });

  test('is fully styled and operable on the bulk tool', async ({ page }) => {
    await page.goto('/bulk-barcode-generator');
    const banner = page.locator('#cookie-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute('role', 'dialog');
    await expect(banner).toHaveAttribute('aria-describedby', 'cookie-consent-description');

    const styles = await banner.evaluate((node) => {
      const computed = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return { position: computed.position, radius: computed.borderRadius, width: rect.width };
    });
    expect(styles.position).toBe('fixed');
    expect(parseFloat(styles.radius)).toBeGreaterThanOrEqual(8);
    expect(styles.width).toBeLessThanOrEqual(760);

    await page.locator('.cookie-reject').click();
    await expect(banner).toBeHidden();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('barcode-cookie-consent'))).toBe('rejected');

    await page.locator('.cookie-settings-link').click();
    await expect(banner).toBeVisible();
    await expect(page.locator('.cookie-accept')).toBeFocused();
  });

  test('keeps both choices inside a narrow mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/pl/generator-kodow-z-csv');
    const banner = page.locator('#cookie-banner');
    await expect(banner).toContainText('Ta strona używa plików cookie');

    for (const selector of ['.cookie-accept', '.cookie-reject']) {
      const box = await page.locator(selector).boundingBox();
      expect(box).not.toBeNull();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(360);
      expect(box.y + box.height).toBeLessThanOrEqual(640);
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  for (const [path, label, message] of [
    ['/privacy-policy', 'Privacy choices', 'This site uses cookies'],
    ['/pl/polityka-prywatnosci', 'Ustawienia prywatności', 'Ta strona używa plików cookie'],
  ]) {
    test(`${path} reopens consent choices without clearing browser data`, async ({ page }) => {
      await page.goto(path);
      await page.locator('.cookie-reject').click();
      await expect(page.locator('#cookie-banner')).toBeHidden();

      const settings = page.getByRole('button', { name: label });
      await expect(settings).toBeVisible();
      await settings.click();

      await expect(page.locator('#cookie-banner')).toBeVisible();
      await expect(page.locator('#cookie-consent-description')).toContainText(message);
      await expect(page.locator('.cookie-accept')).toBeFocused();
    });
  }
});
