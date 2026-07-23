// @ts-check
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE = 'https://barcode-generator.daytodayapps.com';
const PAGES = [
  {
    path: '/privacy-policy',
    lang: 'en',
    alternate: '/pl/polityka-prywatnosci',
  },
  {
    path: '/terms',
    lang: 'en',
    alternate: '/pl/regulamin',
  },
  {
    path: '/pl/polityka-prywatnosci',
    lang: 'pl',
    alternate: '/privacy-policy',
  },
  {
    path: '/pl/regulamin',
    lang: 'pl',
    alternate: '/terms',
  },
];

test.beforeEach(async ({ page }) => {
  await page.route(/(fonts\.googleapis\.com|googletagmanager\.com|google-analytics\.com)/, (route) =>
    route.fulfill({ status: 200, body: '', contentType: 'application/javascript' }),
  );
});

for (const item of PAGES) {
  test(`${item.path} is a complete, indexable legal page`, async ({ page, request }) => {
    const response = await page.goto(item.path);
    expect(response?.status()).toBe(200);

    const canonical = `${BASE}${item.path}`;
    await expect(page.locator('html')).toHaveAttribute('lang', item.lang);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
    await expect(page.locator('link[rel="stylesheet"]'))
      .toHaveAttribute('href', /^\/styles\.css\?v=[a-f0-9]{12}$/);
    await expect(page.locator('script[src^="/analytics.js?v="]')).toHaveCount(1);

    const expectedAlternates = {
      en: item.lang === 'en' ? item.path : item.alternate,
      pl: item.lang === 'pl' ? item.path : item.alternate,
      'x-default': item.lang === 'en' ? item.path : item.alternate,
    };
    for (const [lang, path] of Object.entries(expectedAlternates)) {
      await expect(page.locator(`link[rel="alternate"][hreflang="${lang}"]`))
        .toHaveAttribute('href', `${BASE}${path}`);
    }

    const json = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() || '{}');
    expect(json).toMatchObject({
      '@type': 'WebPage',
      url: canonical,
      inLanguage: item.lang,
      publisher: {
        '@type': 'Organization',
        name: 'Day to Day Apps',
      },
    });

    const html = await page.content();
    expect(html).toContain('daytodayapps.contact@gmail.com');
    expect(html).not.toContain('daytodayappscontact@gmail.com');
    for (const asset of ['/styles.css', '/favicon.svg', '/analytics.js']) {
      expect((await request.get(asset)).status(), asset).toBe(200);
    }

    const blocking = (await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()).violations.filter(({ impact }) => impact === 'critical' || impact === 'serious');
    expect(blocking, blocking.map(({ id, help }) => `${id}: ${help}`).join('\n')).toEqual([]);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('legacy Polish legal routes redirect to their language-qualified canonical routes', async () => {
  const redirects = await import('node:fs/promises').then(({ readFile }) => readFile('_redirects', 'utf8'));
  expect(redirects).toMatch(/^\/polityka-prywatnosci\s+\/pl\/polityka-prywatnosci\s+301$/m);
  expect(redirects).toMatch(/^\/polityka-prywatnosci\.html\s+\/pl\/polityka-prywatnosci\s+301$/m);
  expect(redirects).toMatch(/^\/regulamin\s+\/pl\/regulamin\s+301$/m);
  expect(redirects).toMatch(/^\/regulamin\.html\s+\/pl\/regulamin\s+301$/m);
});
