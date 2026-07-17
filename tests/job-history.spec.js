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
