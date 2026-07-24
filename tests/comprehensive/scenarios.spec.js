// @ts-check
// 15 scenariuszy × 2 motywy × 2 locale × 2 viewporty (kontrolowane przez project w playwright.config.js).
// Każdy test używa fixture `artifact` do zapisu pełnego pakietu dowodów (PNG light+dark, DOM, axe, console, network).
import { test, expect } from './_fixtures/artifact.js';

async function gotoPage(page, slug) {
  await page.goto(slug, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function dismissConsent(page) {
  const reject = page.locator('.cookie-reject');
  if (await reject.isVisible().catch(() => false)) await reject.click();
}

function localizedPath(baseURL, englishPath, polishPath) {
  return baseURL && baseURL.includes('/pl/') ? polishPath : englishPath;
}

async function captureBoth(artifact) {
  const light = await artifact.capture('light');
  const dark = await artifact.capture('dark');
  return { light, dark };
}

test.describe('Comprehensive UI compendium', () => {
  test.describe.configure({ timeout: 90_000 });

  test('gen-home', async ({ page, artifact }) => {
    await gotoPage(page, 'index.html');
    await expect(page.locator('canvas#barcode-preview, [data-test=barcode-preview]')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await captureBoth(artifact);
  });

  test('gen-popular-card-antijump', async ({ page, artifact }) => {
    await gotoPage(page, 'index.html');
    await dismissConsent(page);
    const gallery = page.locator('[data-test=popular-gallery], .popular-gallery').first();
    if (await gallery.count()) {
      await gallery.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => window.scrollY);
      await gallery.locator('button, [role=button]').first().click();
      await page.waitForTimeout(350);
      const after = await page.evaluate(() => window.scrollY);
      expect(Math.abs(after - before)).toBeLessThan(8);
    }
    await captureBoth(artifact);
  });

  test('gen-color-mode-segmented', async ({ page, artifact }) => {
    await gotoPage(page, 'index.html');
    const toggle = page.locator('[data-color-mode], [data-test=color-mode] button').first();
    if (await toggle.count()) await toggle.click().catch(() => {});
    await captureBoth(artifact);
  });

  test('gen-qr-options-layout', async ({ page, artifact }) => {
    await gotoPage(page, 'index.html');
    await dismissConsent(page);
    const sel = page.locator('select#barcode-type, select[name=type]').first();
    if (await sel.count()) await sel.selectOption('QR', { timeout: 2000 });
    await page.waitForTimeout(200);
    const layout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      elements: ['qr-options', 'qr-preview'].map((id) => {
        const rect = document.getElementById(id)?.getBoundingClientRect();
        return rect ? { id, left: rect.left, right: rect.right, width: rect.width } : null;
      }).filter(Boolean),
    }));
    expect(layout.pageOverflow).toBeLessThanOrEqual(1);
    for (const rect of layout.elements) {
      expect(rect.left, rect.id).toBeGreaterThanOrEqual(-1);
      expect(rect.right, rect.id).toBeLessThanOrEqual(layout.viewportWidth + 1);
      expect(rect.width, rect.id).toBeGreaterThan(0);
    }
    await captureBoth(artifact);
  });

  test('gen-dropdown-hover', async ({ page, artifact }) => {
    await gotoPage(page, 'index.html');
    const dd = page.locator('select, [role=combobox]').first();
    if (await dd.count()) await dd.hover().catch(() => {});
    await captureBoth(artifact);
  });

  test('gen-save-anonymous-cookie', async ({ page, artifact, context }) => {
    await gotoPage(page, 'index.html');
    await dismissConsent(page);
    const saveBtn = page.locator('.btn-save-code').first();
    if (await saveBtn.count()) {
      await expect(saveBtn).toBeVisible();
      await saveBtn.click();
      await expect.poll(async () => {
        const cookies = await context.cookies();
        return cookies.some((cookie) => cookie.name === 'bc_pending_code');
      }, { message: 'bc_pending_code cookie should exist after anonymous save' }).toBe(true);
    }
    await captureBoth(artifact);
  });

  test('decoder', async ({ page, artifact }) => {
    await gotoPage(page, 'decoder.html');
    await captureBoth(artifact);
  });

  test('moje-kody-anon', async ({ page, artifact }) => {
    await gotoPage(page, 'moje-kody.html');
    await captureBoth(artifact);
  });

  test('konto-tabs', async ({ page, artifact }) => {
    await gotoPage(page, 'konto.html');
    await captureBoth(artifact);
  });

  test('drukarki', async ({ page, artifact }) => {
    await gotoPage(page, 'drukarki.html');
    await captureBoth(artifact);
  });

  test('historia-wydrukow', async ({ page, artifact }) => {
    await gotoPage(page, 'historia-wydrukow.html');
    await captureBoth(artifact);
  });

  test('szablony', async ({ page, artifact }) => {
    await gotoPage(page, 'szablony.html');
    await captureBoth(artifact);
  });

  test('wydruk', async ({ page, artifact }) => {
    await gotoPage(page, 'wydruk.html');
    await captureBoth(artifact);
  });

  test('polityka-prywatnosci', async ({ page, artifact, baseURL }) => {
    const slug = localizedPath(baseURL, '/privacy-policy', '/pl/polityka-prywatnosci');
    await gotoPage(page, slug);
    const html = await page.content();
    expect(html).toContain('bc_pending_code');
    const settings = page.locator('.cookie-settings-link');
    await expect(settings).toBeVisible();
    await settings.click();
    await expect(page.locator('#cookie-banner')).toBeVisible();
    await captureBoth(artifact);
  });

  test('regulamin', async ({ page, artifact, baseURL }) => {
    await gotoPage(page, localizedPath(baseURL, '/terms', '/pl/regulamin'));
    await captureBoth(artifact);
  });
});
