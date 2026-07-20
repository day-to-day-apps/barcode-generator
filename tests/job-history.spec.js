// @ts-check
import { test, expect } from '@playwright/test';

test('print history provides job reuse and an accessible delete dialog', async ({ request }) => {
  const html = await (await request.get('/historia-wydrukow.html')).text();
  expect(html).toContain('class="code-row job-row"');
  expect(html).toContain('class="btn-action btn-copy"');
  expect(html).toContain('id="delete-job-dialog"');
  expect(html).toContain('aria-labelledby="delete-job-title"');
  expect(html).toContain("showModal()");
  expect(html).not.toMatch(/\bconfirm\s*\(/);
  expect(html).not.toMatch(/\balert\s*\(/);
});

test('bulk generator automatically opens a requested saved job', async ({ request }) => {
  const source = await (await request.get('/bulk.js')).text();
  expect(source).toContain("new URLSearchParams(location.search).get('job')");
  expect(source).toContain('await loadPreviousJob()');
});

test('saved-code catalog can open selected products in the bulk generator', async ({ request }) => {
  const catalog = await (await request.get('/moje-kody.html')).text();
  const bulk = await (await request.get('/bulk.js')).text();
  expect(catalog).toContain('id="btn-create-job"');
  expect(catalog).toContain("url.searchParams.set('codes', ids.join(','))");
  expect(bulk).toContain("new URLSearchParams(location.search).get('codes')");
  expect(bulk).toContain("addSavedCodes((data || []).filter((code) => requested.has(code.id)))");
});

test('bulk generator exposes an accessible saved-code picker', async ({ request }) => {
  const html = await (await request.get('/bulk-barcode-generator')).text();
  const source = await (await request.get('/bulk.js')).text();
  expect(html).toContain('id="saved-codes-dialog"');
  expect(html).toContain('aria-labelledby="saved-codes-title"');
  expect(html).toContain('id="saved-codes-search"');
  expect(html).toContain('id="saved-codes-select-all"');
  expect(source).toContain('showModal()');
  expect(source).toContain("selection = 'catalog'");
});
