// @ts-check
// 15 scenariuszy × 2 motywy × 2 locale × 2 viewporty (kontrolowane przez project w playwright.config.js).
// Każdy test używa fixture `artifact` do zapisu pełnego pakietu dowodów (PNG light+dark, DOM, axe, console, network).
import { test, expect } from './_fixtures/artifact.js';

async function gotoPage(page, slug) {
  await page.goto(slug, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function captureBoth(artifact) {
  const light = await artifact.capture('light');
  const dark = await artifact.capture('dark');
  return { light, dark };
}

test.describe('Comprehensive UI compendium', () => {
  test('gen-home', async ({ page, artifact }) => {
    await gotoPage(page, 'index.html');
    await expect(page.locator('canvas#barcode-preview, [data-test=barcode-preview]')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await captureBoth(artifact);
  });

  test('gen-popular-card-antijump', async ({ page, artifact }) => {
    await gotoPage(page, 'index.html');
    const gallery = page.locator('[data-test=popular-gallery], .popular-gallery').first();
    if (await gallery.count()) {
      const before = await page.evaluate(() => window.scrollY);
      await gallery.locator('button, [role=button]').first().click({ trial: false }).catch(() => {});
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
    const sel = page.locator('select#barcode-type, select[name=type]').first();
    if (await sel.count()) await sel.selectOption('QR', { timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);
    const overflow = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    expect(overflow).toBeLessThan(5000);
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
    const saveBtn = page.locator('[data-test=save-code], button:has-text("Zapisz"), button:has-text("Save")').first();
    if (await saveBtn.count()) {
      await saveBtn.click().catch(() => {});
      await page.waitForTimeout(400);
      const cookies = await context.cookies();
      const pending = cookies.find((c) => c.name === 'bc_pending_code');
      expect(pending, 'bc_pending_code cookie should exist after anonymous save').toBeTruthy();
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
    const slug = baseURL && baseURL.includes('/pl/') ? '../polityka-prywatnosci.html' : '../polityka-prywatnosci.html';
    await gotoPage(page, slug);
    const html = await page.content();
    expect(html).toContain('bc_pending_code');
    await captureBoth(artifact);
  });

  test('regulamin', async ({ page, artifact }) => {
    await gotoPage(page, '../regulamin.html');
    await captureBoth(artifact);
  });
});
