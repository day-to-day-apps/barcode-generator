// @ts-check
import { test, expect } from '@playwright/test';
import { onRequestGet } from '../functions/c/[slug].js';

test('saved-code sharing exposes a safe preview link only for public codes', async ({ request }) => {
  const response = await request.get('/moje-kody.html');
  expect(response.ok()).toBeTruthy();
  const html = await response.text();

  expect(html).toContain('class="btn-action btn-open-link"');
  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).toContain('open.hidden = !canShare');
  expect(html).toContain("open.href = canShare ? shareUrl(r.share_slug) : '#'");
});

test('open-link label is translated in every supported language', async ({ request }) => {
  const response = await request.get('/i18n.js');
  expect(response.ok()).toBeTruthy();
  const source = await response.text();

  expect(source.match(/\bopenLink\s*:/g)).toHaveLength(10);
});

test('shared code route uses the common visual shell and full product navigation', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify([{
    share_slug: 'Abcdef123456',
    name: 'Warehouse label',
    code_type: 'CODE128',
    value: 'TEST-123',
  }]), { status: 200, headers: { 'Content-Type': 'application/json' } });

  try {
    const response = await onRequestGet({
      params: { slug: 'Abcdef123456' },
      env: {
        SITE_ORIGIN: 'https://barcode-generator.daytodayapps.com',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
      },
    });
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('class="site-header"');
    expect(html).toContain('href="/site-shell.css"');
    expect(html).toContain('class="shared-card"');
    for (const route of ['/', '/decoder', '/bulk-barcode-generator', '/gs1-barcode-generator', '/2d-barcode-generator', '/konto']) {
      expect(html).toContain(`href="https://barcode-generator.daytodayapps.com${route}`);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
