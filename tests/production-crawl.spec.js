// @ts-check
import { test, expect } from '@playwright/test';

const PROD = 'https://barcode-generator.daytodayapps.com';
const PRIVATE = ['konto', 'moje-kody', 'szablony', 'drukarki', 'wydruk', 'historia-wydrukow', 'reset-hasla'];
const LANGS = ['', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'cs', 'uk'];

test('sitemap contains only 92 direct, indexable canonical URLs', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(urls).toHaveLength(92);
  expect(xml).not.toMatch(/node_modules|playwright|tests\/|supabase\/|konto|wydruk|szablony|drukarki/);
  for (const canonical of urls) {
    const path = new URL(canonical).pathname;
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(200);
    const html = await response.text();
    expect(html.match(/<meta[^>]+name="robots"[^>]+noindex/i), path).toBeNull();
    expect((html.match(/<h1\b/gi) || []).length, path).toBe(1);
    const found = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1];
    expect(found, path).toBe(canonical);
    for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      expect(() => JSON.parse(block[1]), `${path} has invalid JSON-LD`).not.toThrow();
    }
  }
});

test('all localized private routes resolve without redirects or 404s', async ({ request }) => {
  for (const lang of LANGS) {
    for (const page of PRIVATE) {
      const path = `${lang ? `/${lang}` : ''}/${page}`;
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(200);
      expect(await response.text(), path).toMatch(/noindex/i);
    }
  }
});

test('localized navigation links directly to canonical language roots', async ({ request }) => {
  for (const lang of LANGS) {
    const path = lang ? `/${lang}/` : '/';
    const html = await (await request.get(path)).text();
    const indexLinks = [...html.matchAll(/href="((?:[^"]*\/)?index(?:\.html)?(?:[?#][^"]*)?)"/gi)]
      .map((match) => match[1]);
    expect(indexLinks, path).toEqual([]);
  }
});

test('account controls and save action render without an artificial delay', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.auth-controls')).toBeAttached({ timeout: 3000 });
  await expect(page.locator('.btn-save-code')).toBeVisible({ timeout: 3000 });
  const html = await page.content();
  expect(html).not.toContain('setTimeout(()=>import("./auth-ui.js');
});

test('public and account pages have no broken internal links', async ({ request }) => {
  const seeds = ['/', '/pl/', '/decoder', '/pl/decoder', '/gs1-barcode-generator', '/pl/generator-kodow-gs1', '/2d-barcode-generator', '/pl/generator-kodow-2d', '/konto', '/pl/konto', '/de/konto', '/drukarki', '/pl/drukarki'];
  const links = new Set();
  for (const seed of seeds) {
    const html = await (await request.get(seed)).text();
    for (const match of html.matchAll(/href="([^"#]+)"/g)) {
      const url = new URL(match[1], `${PROD}${seed}`);
      if (url.origin === PROD && !url.pathname.startsWith('/cdn-cgi/')) links.add(url.pathname);
    }
  }
  for (const path of links) {
    const response = await request.get(path);
    expect(response.status(), path).toBeLessThan(400);
  }
});

test('transactional email templates use final production URLs', async () => {
  const template = await import('node:fs/promises').then(({ readFile }) =>
    readFile('supabase/email-templates/confirm-signup.pl.html', 'utf8'));
  expect(template).not.toMatch(/barcode-generator\.daytodayapps\.com\/(?:polityka-prywatnosci|regulamin)\.html/);
  expect(template).toContain('https://barcode-generator.daytodayapps.com/pl/polityka-prywatnosci');
  expect(template).toContain('https://barcode-generator.daytodayapps.com/pl/regulamin');
});
