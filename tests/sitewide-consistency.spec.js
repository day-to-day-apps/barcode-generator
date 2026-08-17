// @ts-check
import { test, expect } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { runInNewContext } from 'node:vm';

const LOCALES = ['en', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'cs', 'uk'];
const FORMATS = ['ean-13', 'code-128', 'upc-a', 'code-39', 'itf-14', 'codabar'];

async function htmlFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(target));
    else if (entry.name.endsWith('.html')) files.push(target);
  }
  return files;
}

function jsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1]));
}

test('all built HTML is free from broken encoding', async () => {
  const files = await htmlFiles('dist');
  expect(files.length).toBeGreaterThan(150);
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    expect(html, file).not.toMatch(/â(?:€|€™|€œ|€)|Â(?: | )|�/u);
  }
});

test('all localized format pages publish complete and accurate metadata', async () => {
  for (const locale of LOCALES) {
    for (const format of FORMATS) {
      const file = path.join('dist', ...(locale === 'en' ? [] : [locale]), format, 'index.html');
      const html = await readFile(file, 'utf8');
      const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1] || '';
      expect(description.length, `${locale}/${format} description`).toBeGreaterThan(70);
      expect(description, `${locale}/${format} clipped description`).not.toMatch(/\.{3}$/);
      expect(html, `${locale}/${format} author`).toContain('<meta name="author" content="Day to Day Apps">');

      const structured = jsonLd(html);
      const howTo = structured.find((item) => item['@type'] === 'HowTo');
      expect(howTo?.step, `${locale}/${format} HowTo`).toHaveLength(4);
      expect(howTo.step.map((step) => step.position)).toEqual([1, 2, 3, 4]);

      if (['upc-a', 'itf-14', 'codabar'].includes(format)) {
        expect(html, `${locale}/${format} generic character claim`).not.toMatch(/support alphanumeric characters|obsługuje znaki alfanumeryczne/i);
        expect(html, `${locale}/${format} generic shipping claim`).not.toMatch(/widely used in shipping|powszechnie stosowany w wysyłce/i);
        const faq = structured.find((item) => item['@type'] === 'FAQPage');
        expect(faq?.mainEntity?.[0]?.acceptedAnswer?.text, `${locale}/${format} character answer`).toBeTruthy();
        expect(faq?.mainEntity?.[1]?.acceptedAnswer?.text, `${locale}/${format} purpose answer`).toBe(description);
      }
    }
  }
});

test('localized landing pages ship translated fallback UI before JavaScript', async () => {
  const context = { window: {} };
  runInNewContext(await readFile('i18n.js', 'utf8'), context);
  for (const locale of LOCALES.filter((item) => item !== 'en')) {
    const html = await readFile(path.join('dist', locale, 'index.html'), 'utf8');
    const translations = context.window.BARCODE_I18N[locale];
    for (const match of html.matchAll(/<([a-z][\w-]*)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>([^<]*)<\/\1>/gi)) {
      const [, , key, text] = match;
      if (translations[key] != null) {
        expect(text, `${locale} data-i18n=${key}`).toBe(translations[key]
          .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'));
      }
    }
    expect(html, `${locale} site controls`).not.toContain('aria-label="Site controls"');
  }
});

test('representative mobile pages do not overflow or expose undersized primary controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const cases = [
    ['/', ['#lang-toggle', '#barcode-type', '#barcode-text']],
    ['/reset-hasla', ['#new-password', '#new-password-confirm', '#reset-password-submit']],
    ['/kalibracja-druku', ['.calibration > .btn-primary']],
    ['/2d-barcode-generator', ['.two-d-advanced > summary']],
    ['/pl/drukowanie-etykiet-avery', ['.task-faq summary']],
    ['/fr/decoder', ['.decoder-faq summary']],
  ];
  for (const [url, selectors] of cases) {
    await page.goto(url);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), { message: `${url} horizontal overflow` }).toBe(true);
    for (const selector of selectors) {
      const target = page.locator(selector).first();
      await expect(target, `${url} ${selector}`).toBeVisible();
      const box = await target.boundingBox();
      expect(box?.height || 0, `${url} ${selector} height`).toBeGreaterThanOrEqual(40);
    }
    const brokenImages = await page.locator('img').evaluateAll((images) => images
      .filter((image) => image.hasAttribute('src') && image.complete && image.naturalWidth === 0)
      .map((image) => image.getAttribute('src')));
    expect(brokenImages, `${url} broken images`).toEqual([]);
  }
});

test('specialist desktop navigation exposes practical click targets', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const url of ['/bulk-barcode-generator', '/gs1-barcode-generator', '/2d-barcode-generator', '/avery-label-printing']) {
    await page.goto(url);
    const links = page.locator('.bulk-header nav a');
    await expect(links.first(), url).toBeVisible();
    for (const box of await links.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().toJSON()))) {
      expect(box.height, `${url} nav target`).toBeGreaterThanOrEqual(40);
    }
  }
});
