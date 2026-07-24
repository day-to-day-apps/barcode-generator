// @ts-check
import { test, expect } from '@playwright/test';

const CONSENT_KEY = 'barcode-cookie-consent';

test.beforeEach(async ({ page }) => {
  await page.route(/(googletagmanager\.com|google-analytics\.com|googlesyndication\.com)/, (route) =>
    route.fulfill({ status: 200, body: '', contentType: 'application/javascript' }),
  );
});

async function analyticsEvents(page) {
  return page.evaluate(() => (window.dataLayer || [])
    .map((entry) => Array.from(entry))
    .filter((entry) => entry[0] === 'event'));
}

test('analytics-only consent keeps advertising storage denied', async ({ page }) => {
  await page.addInitScript((key) => localStorage.removeItem(key), CONSENT_KEY);
  await page.goto('/');

  const banner = page.locator('#cookie-banner');
  await expect(banner).toContainText('only for aggregate GA4 usage analytics');
  await page.locator('.cookie-accept').click();

  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY))
    .toBe('analytics-accepted');
  await expect(page.locator('#barcode-ga4')).toHaveCount(1);
  await expect(page.locator('#barcode-adsense')).toHaveCount(0);

  const consent = await page.evaluate(() => (window.dataLayer || [])
    .map((entry) => Array.from(entry))
    .find((entry) => entry[0] === 'consent' && entry[1] === 'update'));
  expect(consent?.[2]).toMatchObject({
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
});

test('tool events are not queued before analytics consent', async ({ page }) => {
  await page.addInitScript((key) => localStorage.removeItem(key), CONSENT_KEY);
  await page.goto('/');
  await page.locator('#barcode-text').fill('NO-CONSENT-EVENT');
  await page.locator('#btn-generate').click();

  expect(await analyticsEvents(page)).toEqual([]);
  await expect(page.locator('#barcode-ga4')).toHaveCount(0);
});

test('task discovery reports the destination without barcode data', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, 'analytics-accepted'), CONSENT_KEY);
  await page.goto('/it/');
  await page.evaluate(() => {
    document.addEventListener('click', (event) => {
      if (event.target.closest('.search-intent__card')) event.preventDefault();
    }, true);
  });

  await page.locator('.search-intent__card[href="/it/decoder"]').click();
  const events = await analyticsEvents(page);
  expect(events).toContainEqual([
    'event',
    'select_content',
    expect.objectContaining({
      content_type: 'tool',
      item_id: '/it/decoder',
      source: 'task_discovery',
      language: 'it',
    }),
  ]);
});

test('single generator reports explicit generation and SVG export', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, 'analytics-accepted'), CONSENT_KEY);
  await page.goto('/');
  await page.locator('#barcode-text').fill('MEASURE-FUNNEL-2026');
  await page.locator('#btn-generate').click();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#btn-download-svg').click();
  await downloadPromise;

  const events = await analyticsEvents(page);
  expect(events).toContainEqual([
    'event',
    'generate_barcode',
    expect.objectContaining({ tool: 'single', code_type: 'CODE128', method: 'button', language: 'en' }),
  ]);
  expect(events).toContainEqual([
    'event',
    'export_barcode',
    expect.objectContaining({ tool: 'single', code_type: 'CODE128', file_type: 'svg', language: 'en' }),
  ]);
  expect(JSON.stringify(events)).not.toContain('MEASURE-FUNNEL-2026');
});

test('inline EAN-13 tool reports generation without the GTIN value', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, 'analytics-accepted'), CONSENT_KEY);
  await page.goto('/ean-13/');
  await page.locator('#ean13-inline-value').fill('590123412345');
  await page.locator('.ean13-tool__form button[type="submit"]').click();

  const events = await analyticsEvents(page);
  expect(events).toContainEqual([
    'event',
    'generate_barcode',
    expect.objectContaining({ tool: 'ean13_inline', code_type: 'EAN13', method: 'button', language: 'en' }),
  ]);
  expect(JSON.stringify(events)).not.toContain('5901234123457');
});
