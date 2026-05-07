// @ts-check
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

test.beforeEach(async ({ page }) => {
  await page.route(/(pagead2\.googlesyndication\.com|googletagmanager\.com|google-analytics\.com)/, (route) =>
    route.fulfill({ status: 200, body: '', contentType: 'application/javascript' }),
  );
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
