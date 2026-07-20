// @ts-check
import { test, expect } from '@playwright/test';

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
