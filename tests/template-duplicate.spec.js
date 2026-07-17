// @ts-check
import { test, expect } from '@playwright/test';

test('template library exposes a localized duplicate action', async ({ request }) => {
  const html = await (await request.get('/szablony.html')).text();
  const i18n = await (await request.get('/i18n.js')).text();
  expect(html).toContain('class="btn-action btn-duplicate"');
  expect(html).toContain('data-i18n="duplicateTemplate"');
  expect(html).toContain('is_default: false');
  expect(html).toContain('logo_path: row.logo_path || null');
  expect(i18n.match(/duplicateTemplate:/g)).toHaveLength(10);
  expect(i18n.match(/templateDuplicated:/g)).toHaveLength(10);
});

test('duplicate controls respect the five-template quota', async ({ request }) => {
  const html = await (await request.get('/szablony.html')).text();
  expect(html).toContain("list.querySelectorAll('.btn-duplicate')");
  expect(html).toContain('total >= FREE_TEMPLATES_LIMIT');
  expect(html).toContain("list.querySelectorAll('.code-row').length >= FREE_TEMPLATES_LIMIT");
});
