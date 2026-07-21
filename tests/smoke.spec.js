// @ts-check
import { test, expect } from '@playwright/test';

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

function attachConsoleGuard(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  return errors;
}

test.beforeEach(async ({ page }) => {
  await page.route(/(pagead2\.googlesyndication\.com|googletagmanager\.com|google-analytics\.com)/, (route) =>
    route.fulfill({ status: 200, body: '', contentType: 'application/javascript' }),
  );
});

test.describe('Index page - per language', () => {
  test.setTimeout(90_000);

  for (const { code, path } of LANGS) {
    test(`[${code}] index.html loads cleanly`, async ({ page }) => {
      const errors = attachConsoleGuard(page);

      await test.step('navigate', async () => {
        await page.goto(path);
      });

      await test.step('html lang matches folder', async () => {
        const htmlLang = await page.locator('html').getAttribute('lang');
        expect(htmlLang).toBe(code);
      });

      await test.step('language dropdown lists 10 entries', async () => {
        const items = page.locator('#lang-dropdown a, #lang-dropdown button');
        await expect(items).toHaveCount(10);
      });

      await test.step('theme toggle flips data-theme on <html>', async () => {
        const html = page.locator('html');
        const before = await html.getAttribute('data-theme');
        await page.locator('#theme-toggle').click();
        const after = await html.getAttribute('data-theme');
        expect(after).not.toBe(before);
        expect(['light', 'dark']).toContain(after);
      });

      await test.step('all JSON-LD blocks parse and inLanguage is a single string', async () => {
        const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
        expect(blocks.length).toBeGreaterThan(0);
        for (const raw of blocks) {
          let parsed;
          expect(() => { parsed = JSON.parse(raw); }).not.toThrow();
          const visit = (node) => {
            if (!node || typeof node !== 'object') return;
            if ('inLanguage' in node) {
              expect(typeof node.inLanguage).toBe('string');
              expect(node.inLanguage).toBe(code);
            }
            for (const v of Object.values(node)) {
              if (Array.isArray(v)) v.forEach(visit);
              else if (v && typeof v === 'object') visit(v);
            }
          };
          visit(parsed);
        }
      });

      await test.step('canonical and hreflang tags present', async () => {
        await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
        const hreflangCount = await page.locator('link[rel="alternate"][hreflang]').count();
        expect(hreflangCount).toBeGreaterThanOrEqual(10);
        await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
      });

      await test.step('barcode SVG renders for default Code128 input', async () => {
        await page.locator('#barcode-type').selectOption('CODE128');
        await page.locator('#barcode-text').fill('Smoke-2026');
        const svg = page.locator('#barcode-svg');
        await expect(svg).toBeVisible();
        await expect.poll(async () => (await svg.locator('rect, path').count())).toBeGreaterThan(0);
      });

      await test.step('no console errors collected', () => {
        const filtered = errors.filter(
          (e) => !/favicon|adsbygoogle|googletagmanager|gtag/i.test(e),
        );
        expect(filtered, filtered.join('\n')).toEqual([]);
      });
    });
  }
});

test.describe('Decoder page - per language', () => {
  for (const { code, path } of LANGS) {
    test(`[${code}] decoder.html has exactly one #camera-modal`, async ({ page }) => {
      const errors = attachConsoleGuard(page);

      await page.goto(`${path}decoder.html`);

      await test.step('html lang matches folder', async () => {
        expect(await page.locator('html').getAttribute('lang')).toBe(code);
      });

      await test.step('exactly one camera-modal in DOM', async () => {
        await expect(page.locator('#camera-modal')).toHaveCount(1);
      });

      await test.step('modal has canonical structure', async () => {
        const modal = page.locator('#camera-modal');
        await expect(modal.locator('.camera-header')).toHaveCount(1);
        await expect(modal.locator('.camera-stage')).toHaveCount(1);
        await expect(modal.locator('.camera-side')).toHaveCount(1);
        await expect(modal.locator('.camera-hint')).toHaveCount(1);
        await expect(modal.locator('video')).toHaveCount(1);
      });

      await test.step('language dropdown lists 10 entries', async () => {
        const items = page.locator('#lang-dropdown a, #lang-dropdown button');
        await expect(items).toHaveCount(10);
      });

      await test.step('no console errors collected', () => {
        const filtered = errors.filter(
          (e) => !/favicon|adsbygoogle|googletagmanager|gtag/i.test(e),
        );
        expect(filtered, filtered.join('\n')).toEqual([]);
      });
    });
  }
});

test.describe('Static asset health', () => {
  test('robots.txt and sitemap.xml are reachable', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.ok()).toBeTruthy();
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.ok()).toBeTruthy();
    const sitemapBody = await sitemap.text();
    expect(sitemapBody).toContain('<urlset');
  });
});
