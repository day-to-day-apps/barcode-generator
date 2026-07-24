// @ts-check
import { test, expect } from '@playwright/test';

const BASE = 'https://barcode-generator.daytodayapps.com';
const LANGS = ['en', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'cs', 'uk'];

test.beforeEach(async ({ page }) => {
  await page.route(/(pagead2\.googlesyndication\.com|googletagmanager\.com|google-analytics\.com)/, (route) =>
    route.fulfill({ status: 200, body: '', contentType: 'application/javascript' }),
  );
});

for (const lang of LANGS) {
  test(`[${lang}] decoder is localized, useful and indexable`, async ({ page }) => {
    const route = lang === 'en' ? '/decoder' : `/${lang}/decoder`;
    await page.goto(route);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${BASE}${route}`);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `${BASE}${route}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index/);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('.decoder-guide')).toHaveCount(1);
    await expect(page.locator('.decoder-guide h2')).toBeVisible();
    await expect(page.locator('.decoder-guide h3')).toHaveCount(5);
    await expect(page.locator('.decoder-format-list dt')).toHaveCount(4);
    await expect(page.locator('.decoder-related a')).toHaveCount(lang === 'en' || lang === 'pl' ? 4 : 3);
    const cameraButton = page.locator('#camera-btn');
    await expect(cameraButton).not.toHaveAttribute('aria-label', /.+/);
    expect((await cameraButton.innerText()).trim().length).toBeGreaterThan(0);

    const title = await page.title();
    const description = await page.locator('meta[name="description"]').getAttribute('content') ?? '';
    expect(title.length).toBeGreaterThanOrEqual(35);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(description.length).toBeGreaterThanOrEqual(100);
    expect(description.length).toBeLessThanOrEqual(160);

    const toolBox = await page.locator('#drop-area').boundingBox();
    const guideBox = await page.locator('.decoder-guide').boundingBox();
    expect(toolBox).not.toBeNull();
    expect(guideBox).not.toBeNull();
    expect(guideBox.y).toBeGreaterThan(toolBox.y + toolBox.height);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test('English decoder keeps the scanner in the first viewport on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/decoder');
  await expect(page.locator('#camera-btn')).toBeVisible();
  const upload = await page.locator('#drop-area').boundingBox();
  expect(upload?.y).toBeLessThan(844);
});

test('Localized decoder controls do not overlap the mobile heading', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pl/decoder');
  const language = await page.locator('#lang-toggle').boundingBox();
  const heading = await page.locator('h1').boundingBox();
  expect(language).not.toBeNull();
  expect(heading).not.toBeNull();
  expect(heading.y).toBeGreaterThanOrEqual(language.y + language.height + 8);
});

test('Italian decoder answers search-intent questions with matching structured data', async ({ page }) => {
  await page.goto('/it/decoder');
  await expect(page.locator('.decoder-faq')).toHaveCount(1);
  await expect(page.locator('.decoder-faq details')).toHaveCount(4);

  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const data = blocks.map(JSON.parse);
  const faq = data.find((item) => item['@type'] === 'FAQPage');
  expect(faq?.mainEntity).toHaveLength(4);
  expect(JSON.stringify(faq)).toContain('leggere un codice a barre da una foto');
});
