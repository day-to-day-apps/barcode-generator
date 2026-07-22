// @ts-check
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.setTimeout(90_000);

const LANGS = [
  { code: 'en', path: '/' },
  { code: 'pl', path: '/pl/' },
  { code: 'de', path: '/de/' },
  { code: 'fr', path: '/fr/' },
  { code: 'es', path: '/es/' },
  { code: 'it', path: '/it/' },
  { code: 'pt', path: '/pt/' },
  { code: 'nl', path: '/nl/' },
  { code: 'cs', path: '/cs/' },
  { code: 'uk', path: '/uk/' },
];

const PUBLIC_TOOLS = ['/decoder', '/pl/decoder', '/ean-13/', '/es/ean-13/', '/cs/ean-13/', '/code-128/', '/pl/upc-a/', '/de/code-39/', '/gs1-barcode-generator', '/pl/generator-kodow-gs1', '/2d-barcode-generator', '/pl/generator-kodow-2d'];

test.beforeEach(async ({ page }) => {
  await page.route(/(pagead2\.googlesyndication\.com|googletagmanager\.com|google-analytics\.com)/, (route) =>
    route.fulfill({ status: 200, body: '', contentType: 'application/javascript' }),
  );
});

test.describe('Accessibility - public tools', () => {
  for (const path of PUBLIC_TOOLS) {
    test(`${path} has no critical or serious axe violations`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const blocking = results.violations.filter((violation) =>
        violation.impact === 'critical' || violation.impact === 'serious');
      expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
    });
  }
});

test.describe('Accessibility - per language index page', () => {
  for (const { code, path } of LANGS) {
    test(`[${code}] no critical or serious axe violations`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );

      const summary = blocking
        .map((v) => `${v.id} (${v.impact}) — ${v.nodes.length} node(s): ${v.help}`)
        .join('\n');

      expect(blocking, summary).toEqual([]);
    });
  }
});

test.describe('Accessibility - dark theme', () => {
  for (const path of ['/', '/decoder']) {
    test(`${path} has no axe violations in dark theme`, async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('barcode-theme', 'dark'));
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(results.violations, results.violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
    });
  }
});

test('format page footer does not reduce accessible text contrast with opacity', async ({ page }) => {
  await page.goto('/es/ean-13/');
  await expect(page.locator('footer')).toHaveCSS('opacity', '1');
});
