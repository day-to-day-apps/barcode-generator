// @ts-check
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE = 'https://barcode-generator.daytodayapps.com';
const GUIDES = [
  {
    path: '/guides/gtin-ean-upc',
    lang: 'en',
    alternateLang: 'pl',
    alternate: `${BASE}/pl/poradniki/gtin-ean-upc`,
    h1: 'GTIN, EAN and UPC: what is the difference?',
  },
  {
    path: '/pl/poradniki/gtin-ean-upc',
    lang: 'pl',
    alternateLang: 'en',
    alternate: `${BASE}/guides/gtin-ean-upc`,
    h1: 'GTIN, EAN i UPC: czym się różnią?',
  },
];

for (const guide of GUIDES) {
  test(`${guide.lang} GTIN guide is indexable, useful and accessible`, async ({ page, request }) => {
    const response = await request.get(guide.path, { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    await page.goto(guide.path);

    await expect(page.locator('html')).toHaveAttribute('lang', guide.lang);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: guide.h1 })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${BASE}${guide.path}`);
    await expect(page.locator(`link[rel="alternate"][hreflang="${guide.alternateLang}"][href="${guide.alternate}"]`)).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
    await expect(page.locator('.guide-table tbody tr')).toHaveCount(4);
    await expect(page.locator('.guide-faq details')).toHaveCount(4);
    await expect(page.locator('.guide-sources a[href^="https://"]')).toHaveCount(3);

    const title = await page.title();
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(title.length).toBeLessThanOrEqual(60);
    expect(description?.length).toBeGreaterThanOrEqual(120);
    expect(description?.length).toBeLessThanOrEqual(160);
    const visibleText = await page.locator('#guide-content').innerText();
    expect(visibleText.length).toBeGreaterThan(1800);

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const data = blocks.map(JSON.parse);
    const serialized = JSON.stringify(data);
    for (const type of ['Article', 'TechArticle', 'BreadcrumbList', 'FAQPage']) expect(serialized).toContain(type);

    const results = await new AxeBuilder({ page }).exclude('#cookie-banner').analyze();
    expect(results.violations).toEqual([]);
  });
}

test('core retail tools link back to the guide', async ({ request }) => {
  const pages = [
    ['/ean-13/', '/guides/gtin-ean-upc'],
    ['/upc-a/', '/guides/gtin-ean-upc'],
    ['/gs1-barcode-generator', '/guides/gtin-ean-upc'],
    ['/pl/ean-13/', '/pl/poradniki/gtin-ean-upc'],
    ['/pl/upc-a/', '/pl/poradniki/gtin-ean-upc'],
    ['/pl/generator-kodow-gs1', '/pl/poradniki/gtin-ean-upc'],
  ];
  for (const [page, guide] of pages) {
    const html = await (await request.get(page)).text();
    expect(html, page).toContain(`href="${guide}"`);
  }
});
