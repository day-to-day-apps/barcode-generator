// @ts-check
import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_ROOT = path.resolve(process.cwd(), 'tests', 'artifacts');

function detectLang(baseURL = '') {
  if (baseURL.includes('/pl/')) return 'pl';
  if (baseURL.includes('/en/')) return 'en';
  return 'unknown';
}

function detectViewport(viewport) {
  if (!viewport) return 'unknown';
  return viewport.width >= 1024 ? 'desktop' : 'mobile';
}

function safeSlug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

export const test = base.extend({
  artifact: async ({ page, baseURL, viewport }, use, testInfo) => {
    const consoleEvents = [];
    const networkErrors = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      consoleEvents.push({
        ts: Date.now(),
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
      });
    });
    page.on('pageerror', (err) => {
      pageErrors.push({ ts: Date.now(), name: err.name, message: err.message, stack: err.stack });
    });
    page.on('response', (resp) => {
      const status = resp.status();
      if (status >= 400) {
        networkErrors.push({
          ts: Date.now(),
          status,
          url: resp.url(),
          method: resp.request().method(),
        });
      }
    });

    const lang = detectLang(baseURL);
    const viewportKind = detectViewport(viewport);
    const scenario = safeSlug(testInfo.title);

    async function capture(theme) {
      const dir = path.join(ARTIFACTS_ROOT, lang, theme, viewportKind, scenario);
      fs.mkdirSync(dir, { recursive: true });

      await page.emulateMedia({ colorScheme: theme === 'dark' ? 'dark' : 'light' });
      await page.evaluate((t) => {
        try { document.documentElement.dataset.theme = t; } catch (_) {}
      }, theme);
      await page.waitForTimeout(150);

      await page.screenshot({ path: path.join(dir, 'full-page.png'), fullPage: true });

      const dom = await page.content();
      fs.writeFileSync(path.join(dir, 'dom.html'), dom, 'utf-8');

      let axeResult = { violations: [], passes: [], inapplicable: [], incomplete: [] };
      try {
        axeResult = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();
      } catch (e) {
        axeResult = { error: String(e), violations: [] };
      }
      fs.writeFileSync(path.join(dir, 'axe.json'), JSON.stringify(axeResult, null, 2), 'utf-8');

      fs.writeFileSync(
        path.join(dir, 'console.jsonl'),
        [...consoleEvents, ...pageErrors.map((e) => ({ ...e, type: 'pageerror' }))]
          .map((e) => JSON.stringify(e)).join('\n'),
        'utf-8',
      );
      fs.writeFileSync(
        path.join(dir, 'network-errors.jsonl'),
        networkErrors.map((e) => JSON.stringify(e)).join('\n'),
        'utf-8',
      );

      const buildVersion = await page.evaluate(() => {
        const link = document.querySelector('link[rel="stylesheet"][href*="styles.css"]');
        const href = link?.getAttribute('href') || '';
        const m = href.match(/[?&]v=([^&]+)/);
        return m ? m[1] : 'unknown';
      }).catch(() => 'unknown');

      const meta = {
        lang,
        theme,
        viewport: viewportKind,
        viewportSize: viewport,
        scenario,
        title: testInfo.title,
        baseURL,
        url: page.url(),
        buildVersion,
        timestamp: new Date().toISOString(),
        axeViolations: axeResult.violations?.length ?? 0,
        consoleErrors: consoleEvents.filter((e) => e.type === 'error').length + pageErrors.length,
        networkErrors: networkErrors.length,
        status: testInfo.status,
      };
      fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');

      return meta;
    }

    await use({ capture, page });
  },
});

export { expect };
