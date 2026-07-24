// @ts-check
import { test, expect } from '@playwright/test';

const BASE = 'https://barcode-generator.daytodayapps.com';
const LANGS = [
  { code: 'en', path: '/', canonical: `${BASE}/` },
  { code: 'pl', path: '/pl/', canonical: `${BASE}/pl/` },
  { code: 'de', path: '/de/', canonical: `${BASE}/de/` },
  { code: 'fr', path: '/fr/', canonical: `${BASE}/fr/` },
  { code: 'es', path: '/es/', canonical: `${BASE}/es/` },
  { code: 'it', path: '/it/', canonical: `${BASE}/it/` },
  { code: 'pt', path: '/pt/', canonical: `${BASE}/pt/` },
  { code: 'nl', path: '/nl/', canonical: `${BASE}/nl/` },
  { code: 'cs', path: '/cs/', canonical: `${BASE}/cs/` },
  { code: 'uk', path: '/uk/', canonical: `${BASE}/uk/` },
];

test.beforeEach(async ({ page }) => {
  await page.route(/(pagead2\.googlesyndication\.com|googletagmanager\.com|google-analytics\.com)/, (route) =>
    route.fulfill({ status: 200, body: '', contentType: 'application/javascript' }),
  );
});

test.describe('SEO - per language index page', () => {
  for (const { code, path, canonical } of LANGS) {
    test(`[${code}] canonical, og:url, hreflang and JSON-LD types`, async ({ page }) => {
      await page.goto(path);

      await test.step('homepage links to the localized QR generator', async () => {
        await expect(page.locator(`a[href="${path}qr-code/"]`)).toHaveCount(1);
      });

      await test.step('homepage exposes direct task links', async () => {
        await expect(page.locator('.search-intent')).toHaveCount(1);
        await expect(page.locator('.search-intent__card')).toHaveCount(3);
        const localizedPrefix = code === 'en' ? '/' : path;
        await expect(page.locator(`.search-intent__card[href="${localizedPrefix}decoder"]`)).toHaveCount(1);
        await expect(page.locator(`.search-intent__card[href="${localizedPrefix}ean-13/"]`)).toHaveCount(1);
        await expect(page.locator(`.search-intent__card[href="${localizedPrefix}code-128/"]`)).toHaveCount(1);
      });

      await test.step('canonical href matches expected URL', async () => {
        const href = await page.locator('link[rel="canonical"]').getAttribute('href');
        expect(href).toBe(canonical);
      });

      await test.step('og:url matches canonical', async () => {
        const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
        expect(ogUrl).toBe(canonical);
      });

      await test.step('title and meta description within SEO bounds', async () => {
        const title = (await page.title()).trim();
        expect(title.length, `Title too short on /${code}/`).toBeGreaterThan(10);
        // SEO best practice: title <=60 chars to avoid SERP truncation
        expect(title.length, `Title too long on /${code}/ (${title.length} chars): "${title}"`).toBeLessThanOrEqual(60);
        const desc = (await page.locator('meta[name="description"]').getAttribute('content'))?.trim() ?? '';
        expect(desc.length, `Description too short on /${code}/`).toBeGreaterThan(20);
        // SEO best practice: meta description 50-160 chars
        expect(desc.length, `Description too long on /${code}/ (${desc.length} chars)`).toBeLessThanOrEqual(160);
      });

      await test.step('hreflang covers 10 languages plus x-default', async () => {
        const expected = ['en', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'cs', 'uk', 'x-default'];
        for (const lang of expected) {
          await expect(page.locator(`link[rel="alternate"][hreflang="${lang}"]`)).toHaveCount(1);
        }
      });

      await test.step('JSON-LD includes WebApplication (HowTo/FAQ/Breadcrumb only on languages completed by B2)', async () => {
        const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
        const types = new Set();
        for (const raw of blocks) {
          const parsed = JSON.parse(raw);
          const collect = (node) => {
            if (!node || typeof node !== 'object') return;
            if (typeof node['@type'] === 'string') types.add(node['@type']);
            for (const v of Object.values(node)) {
              if (Array.isArray(v)) v.forEach(collect);
              else if (v && typeof v === 'object') collect(v);
            }
          };
          collect(parsed);
        }
        expect(types.has('WebApplication'), `Missing JSON-LD @type=WebApplication on /${code}/`).toBe(true);
        // B2 ukończone dla wszystkich 10 języków: HowTo + FAQPage + BreadcrumbList obecne wszędzie.
        const completed = ['en', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'cs', 'uk'];
        if (completed.includes(code)) {
          for (const t of ['HowTo', 'FAQPage', 'BreadcrumbList']) {
            expect(types.has(t), `Missing JSON-LD @type=${t} on /${code}/`).toBe(true);
          }
        }
      });
    });
  }
});

const FORMAT_PATHS = ['code-128', 'upc-a', 'code-39', 'itf-14', 'codabar', 'qr-code'];
const ENGLISH_FORMAT_DESCRIPTIONS = [
  'High-density alphanumeric barcode',
  '12-digit retail barcode',
  'Variable-length alphanumeric barcode',
  '14-digit packaging barcode',
  'Simple numeric barcode',
];

test.describe('SEO - localized format descriptions', () => {
  for (const { code, path } of LANGS.filter(({ code }) => code !== 'en')) {
    for (const format of FORMAT_PATHS) test(`[${code}] ${format} metadata is fully localized`, async ({ page }) => {
      await page.goto(`${path}${format}/`);

      const description = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
      expect(description.length).toBeGreaterThan(80);
      expect(description.length).toBeLessThanOrEqual(160);
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', description);
      await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute('content', description);

      const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents();
      const webPage = structuredData.map(JSON.parse).find((item) => item['@type'] === 'WebPage');
      expect(webPage?.inLanguage).toBe(code);
      expect(webPage?.description?.length).toBeGreaterThan(80);

      for (const englishFragment of ENGLISH_FORMAT_DESCRIPTIONS) {
        expect(description).not.toContain(englishFragment);
        expect(webPage?.description).not.toContain(englishFragment);
      }
    });
  }
});

test.describe('SEO - QR generator pages', () => {
  for (const { code, path } of LANGS) test(`[${code}] QR page is complete and indexable`, async ({ page }) => {
    const route = `${path}qr-code/`;
    const canonical = `${BASE}${route}`;
    await page.goto(route);

    await expect(page.locator('html')).toHaveAttribute('lang', code);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
    await expect(page.locator('.landing__faq details')).toHaveCount(3);

    const title = (await page.title()).trim();
    const description = (await page.locator('meta[name="description"]').getAttribute('content'))?.trim() || '';
    expect(title.length).toBeGreaterThan(25);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);

    for (const alternate of [...LANGS.map(({ code: lang }) => lang), 'x-default']) {
      await expect(page.locator(`link[rel="alternate"][hreflang="${alternate}"]`)).toHaveCount(1);
    }

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const structuredData = blocks.map(JSON.parse);
    const serialized = JSON.stringify(structuredData);
    for (const type of ['WebApplication', 'WebPage', 'HowTo', 'FAQPage', 'BreadcrumbList']) {
      expect(serialized).toContain(`"@type":"${type}"`);
    }
  });
});
