import { test, expect } from '@playwright/test';

async function installServiceWorker(page) {
  await page.goto('/pl/');
  await page.evaluate(() => window.__registerBarcodePwa());
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) throw new Error('Service worker did not activate');
  });
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) {
    await page.reload();
  }
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
}

test.describe('PWA and offline tools', () => {
  test('manifest exposes an installable standalone application', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#4f46e5');

    const response = await request.get('/manifest.webmanifest');
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('application/manifest+json');
    const manifest = await response.json();
    expect(manifest).toMatchObject({ id: '/', scope: '/', display: 'standalone' });
    expect(manifest.icons).toContainEqual(expect.objectContaining({ sizes: '192x192', type: 'image/png' }));
    expect(manifest.icons).toContainEqual(expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }));
    for (const icon of ['/pwa-icon-192.png', '/pwa-icon-512.png']) {
      const iconResponse = await request.get(icon);
      expect(iconResponse.ok()).toBeTruthy();
      expect(iconResponse.headers()['content-type']).toContain('image/png');
      expect((await iconResponse.body()).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    }
  });

  test('generator, decoder and bulk tool work after the network is disconnected', async ({ page, context }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await installServiceWorker(page);

    await context.setOffline(true);
    await page.goto('/pl/?type=code128&value=OFFLINE-2026');
    await expect(page.locator('#barcode-type')).toHaveValue('CODE128');
    await expect(page.locator('#barcode-text')).toHaveValue('OFFLINE-2026');
    await expect(page.locator('#barcode-svg')).not.toBeEmpty();

    await page.goto('/decoder');
    await expect(page.locator('#drop-area')).toBeVisible();
    await expect.poll(() => page.evaluate(() => ({
      zxing: Boolean(window.ZXing),
      jsBarcode: Boolean(window.JsBarcode),
      qr: typeof window.qrcode === 'function',
    }))).toEqual({ zxing: true, jsBarcode: true, qr: true });

    await page.goto('/bulk-barcode-generator');
    await expect(page.locator('#csv-file')).toBeAttached();
    expect(pageErrors).toEqual([]);
  });

  test('precache excludes private account routes', async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('stale-cache-seeded')) {
        sessionStorage.setItem('stale-cache-seeded', '1');
        window.__staleCacheReady = caches.open('barcode-tools-stale');
      }
    });
    await installServiceWorker(page);
    await page.evaluate(() => window.__staleCacheReady || Promise.resolve());
    await page.goto('/konto');
    const cachedPaths = await page.evaluate(async () => {
      const names = await caches.keys();
      const pwa = names.find((name) => name.startsWith('barcode-tools-'));
      if (!pwa) return [];
      const entries = await (await caches.open(pwa)).keys();
      return entries.map((request) => new URL(request.url).pathname);
    });

    expect(cachedPaths).toContain('/pl/');
    expect(cachedPaths).toContain('/decoder');
    for (const privateRoute of ['/konto', '/moje-kody', '/szablony', '/drukarki', '/wydruk', '/historia-wydrukow']) {
      expect(cachedPaths).not.toContain(privateRoute);
      expect(cachedPaths).not.toContain(`${privateRoute}.html`);
    }
    await expect.poll(() => page.evaluate(async () => !(await caches.keys()).includes('barcode-tools-stale'))).toBe(true);
  });

  test('barcode engines are served from the first-party origin', async ({ page }) => {
    const engineRequests = [];
    const supabaseSdkRequests = [];
    page.on('request', (request) => {
      if (/jsbarcode|qrcode-generator|qrious/i.test(request.url())) engineRequests.push(request.url());
      if (/cdn\.jsdelivr\.net\/npm\/@supabase/i.test(request.url())) supabaseSdkRequests.push(request.url());
    });
    await page.goto('/');
    await page.waitForTimeout(2000);
    await page.goto('/decoder');

    expect(engineRequests.length).toBeGreaterThan(0);
    expect(engineRequests.every((url) => new URL(url).origin === 'http://127.0.0.1:8765')).toBe(true);
    expect(supabaseSdkRequests).toEqual([]);
  });
});
