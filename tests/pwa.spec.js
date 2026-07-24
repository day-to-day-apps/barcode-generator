import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
  test('production landing assets stay within the startup size budget', async ({ request }) => {
    const appResponse = await request.get('/app-landing.js');
    const cssResponse = await request.get('/landing.css');
    expect(appResponse.ok()).toBeTruthy();
    expect(cssResponse.ok()).toBeTruthy();
    expect((await appResponse.body()).length).toBeLessThanOrEqual(300_000);
    expect((await cssResponse.body()).length).toBeLessThanOrEqual(65_000);
  });

  test('service worker precache bypasses stale browser HTTP cache', async ({ request }) => {
    const worker = await (await request.get('/service-worker.js')).text();
    expect(worker).toContain("new Request(url, { cache: 'reload' })");
    expect(worker).toContain('cache.put(url.pathname, copy)');
  });

  test('account actions wait for the active language dictionary', async ({ page }) => {
    await page.goto('/pl/');
    await expect(page.locator('.auth-signin-cta')).toHaveText('Załóż konto');
    await expect(page.locator('.auth-signin-link')).toHaveText('Mam już konto');
    await expect(page.locator('.btn-save-code')).toContainText('Zapisz ten kod');
    await expect(page.locator('.auth-controls')).toHaveAttribute('aria-label', 'Menu konta');
  });

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

  test('new PWA version exposes a localized, dismissible update notice', async ({ page }) => {
    await page.goto('/pl/');
    await page.evaluate(() => window.__showBarcodePwaUpdate());

    const notice = page.locator('#pwa-update-notice');
    await expect(notice).toHaveAttribute('role', 'status');
    await expect(notice).toContainText('Nowa wersja jest gotowa.');
    await expect(notice.getByRole('button', { name: 'Odśwież teraz' })).toBeVisible();

    await page.evaluate(() => window.__showBarcodePwaUpdate());
    await expect(page.locator('#pwa-update-notice')).toHaveCount(1);

    const results = await new AxeBuilder({ page })
      .include('#pwa-update-notice')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter((violation) =>
      violation.impact === 'critical' || violation.impact === 'serious');
    expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);

    await notice.getByRole('button', { name: 'Zamknij powiadomienie o aktualizacji' }).click();
    await expect(notice).toHaveCount(0);
  });

  test('PWA update action is translated in every public language', async ({ page }) => {
    test.setTimeout(120_000);
    const languages = [
      ['/', 'Refresh now'],
      ['/pl/', 'Odśwież teraz'],
      ['/de/', 'Jetzt aktualisieren'],
      ['/fr/', 'Actualiser'],
      ['/es/', 'Actualizar ahora'],
      ['/it/', 'Aggiorna ora'],
      ['/pt/', 'Atualizar agora'],
      ['/nl/', 'Nu vernieuwen'],
      ['/cs/', 'Aktualizovat'],
      ['/uk/', 'Оновити зараз'],
    ];
    for (const [path, refreshLabel] of languages) {
      await page.goto(path);
      await page.evaluate(() => window.__showBarcodePwaUpdate());
      await expect(page.locator('#pwa-update-notice').getByRole('button', { name: refreshLabel })).toBeVisible();
    }
  });

  test('controller changes stay quiet on first install and announce later updates', async ({ page }) => {
    await page.goto('/');
    const alreadyControlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));

    await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new Event('controllerchange')));
    await expect(page.locator('#pwa-update-notice')).toHaveCount(alreadyControlled ? 1 : 0);

    if (!alreadyControlled) {
      await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new Event('controllerchange')));
      await expect(page.locator('#pwa-update-notice')).toHaveCount(1);
    }
  });

  test('PWA update notice fits a narrow mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');
    await page.evaluate(() => window.__showBarcodePwaUpdate());

    const geometry = await page.locator('#pwa-update-notice').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        viewportWidth: document.documentElement.clientWidth,
        viewportHeight: document.documentElement.clientHeight,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
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
    await expect(page.locator('.lang-current .flag-img')).toHaveJSProperty('complete', true);

    await page.goto('/decoder');
    await expect(page.locator('#drop-area')).toBeVisible();
    expect(await page.evaluate(() => Boolean(window.ZXing))).toBe(false);
    await page.locator('#file-input').setInputFiles({
      name: 'offline-sample.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
    });
    await expect.poll(() => page.evaluate(() => ({
      zxing: Boolean(window.ZXing),
      jsBarcode: Boolean(window.JsBarcode),
      qr: typeof window.qrcode === 'function',
    }))).toEqual({ zxing: true, jsBarcode: true, qr: true });

    await page.goto('/bulk-barcode-generator');
    await expect(page.locator('#csv-file')).toBeAttached();

    await page.goto('/guides/gtin-ean-upc');
    await expect(page.getByRole('heading', { name: 'GTIN, EAN and UPC: what is the difference?' })).toBeVisible();
    await page.goto('/guides/ean-13-food-products');
    await expect(page.getByRole('heading', { name: 'How to prepare an EAN-13 barcode for a food product' })).toBeVisible();
    await page.goto('/pl/poradniki/darmowy-generator-kodow-dla-firmy');
    await expect(page.getByRole('heading', { name: 'Czy można używać darmowego generatora kodów w firmie?' })).toBeVisible();
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

  test('versioned asset refresh replaces the canonical precache entry', async ({ page }) => {
    await installServiceWorker(page);
    await page.evaluate(async () => {
      const cacheName = (await caches.keys()).find((name) => name.startsWith('barcode-tools-'));
      const cache = await caches.open(cacheName);
      await cache.put('/pwa-register.js', new Response('window.__stalePwaRegister = true;', {
        headers: { 'content-type': 'application/javascript' },
      }));
    });

    await page.reload();
    await expect.poll(() => page.evaluate(async () => {
      const cacheName = (await caches.keys()).find((name) => name.startsWith('barcode-tools-'));
      const response = await (await caches.open(cacheName)).match('/pwa-register.js');
      return (await response.text()).includes('__showBarcodePwaUpdate');
    })).toBe(true);

    await page.reload();
    await expect.poll(() => page.evaluate(() => typeof window.__showBarcodePwaUpdate)).toBe('function');
  });

  test('barcode engines and language flags are served from the first-party origin', async ({ page }) => {
    const engineRequests = [];
    const flagRequests = [];
    const thirdPartyFlagRequests = [];
    const supabaseSdkRequests = [];
    page.on('request', (request) => {
      if (/jsbarcode|qrcode-generator|qrious/i.test(request.url())) engineRequests.push(request.url());
      if (/\/flags\/[a-z]{2}(?:@2x)?\.png/i.test(request.url())) flagRequests.push(request.url());
      if (/flagcdn\.com/i.test(request.url())) thirdPartyFlagRequests.push(request.url());
      if (/cdn\.jsdelivr\.net\/npm\/@supabase/i.test(request.url())) supabaseSdkRequests.push(request.url());
    });
    await page.goto('/');
    await page.waitForTimeout(2000);
    await page.goto('/decoder');

    expect(engineRequests.length).toBeGreaterThan(0);
    expect(engineRequests.every((url) => new URL(url).origin === 'http://127.0.0.1:8765')).toBe(true);
    expect(flagRequests.length).toBeGreaterThan(0);
    expect(flagRequests.every((url) => new URL(url).origin === 'http://127.0.0.1:8765')).toBe(true);
    expect(thirdPartyFlagRequests).toEqual([]);
    expect(supabaseSdkRequests).toEqual([]);
  });
});
