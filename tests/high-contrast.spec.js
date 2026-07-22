// @ts-check
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('system high-contrast preference is applied without a stored override', async ({ page }) => {
  await page.addInitScript(() => {
    const nativeMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query) => query === '(prefers-contrast: more)'
      ? { matches: true, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return true; } }
      : nativeMatchMedia(query);
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
  const colors = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return { text: style.getPropertyValue('--text').trim(), surface: style.getPropertyValue('--surface').trim(), background: getComputedStyle(document.body).backgroundImage };
  });
  expect(colors).toEqual({ text: '#000000', surface: '#ffffff', background: 'none' });
});

test('account appearance setting persists all three contrast modes', async ({ page }) => {
  await page.goto('/konto');
  const setting = page.locator('[data-appearance-settings]');
  await expect(setting).toBeVisible();
  await expect(setting.locator('[data-contrast-choice="auto"]')).toHaveAttribute('aria-pressed', 'true');

  await setting.locator('[data-contrast-choice="high"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
  await expect(setting.locator('[data-contrast-choice="high"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#login-submit')).toHaveCSS('background-image', 'none');
  await expect(page.locator('.app-nav__cta')).toHaveCSS('background-image', 'none');
  await expect(page.locator('header h1')).toHaveCSS('background-image', 'none');
  expect(await page.evaluate(() => localStorage.getItem('barcode-contrast'))).toBe('high');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
  await page.locator('[data-contrast-choice="normal"]').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-contrast', 'high');
  expect(await page.evaluate(() => localStorage.getItem('barcode-contrast'))).toBe('normal');
});

test('high-contrast generator and account views remain accessible and responsive', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('barcode-contrast', 'high'));
  for (const path of ['/', '/konto']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const results = await new AxeBuilder({ page }).exclude('#cookie-banner').analyze();
    expect(results.violations).toEqual([]);
    if (path === '/konto') {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const positions = await page.evaluate(() => ({
        settingBottom: document.querySelector('[data-appearance-settings]').getBoundingClientRect().bottom,
        bannerTop: document.getElementById('cookie-banner').getBoundingClientRect().top,
      }));
      expect(positions.settingBottom).toBeLessThanOrEqual(positions.bannerTop);
    }
  }
});
