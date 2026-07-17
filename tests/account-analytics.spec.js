// @ts-check
import { test, expect } from '@playwright/test';

const PRIVATE_PAGES = [
  '/konto.html',
  '/moje-kody.html',
  '/szablony.html',
  '/drukarki.html',
  '/wydruk.html',
  '/historia-wydrukow.html',
  '/reset-hasla.html',
];

test('every account workflow loads consent-aware analytics', async ({ request }) => {
  for (const path of PRIVATE_PAGES) {
    const html = await (await request.get(path)).text();
    expect(html, path).toMatch(/<script[^>]+src="(?:\.\.\/)?analytics\.js\?v=[a-f0-9]+"[^>]*><\/script>/);
  }
});

test('account events contain no barcode values or user identifiers', async ({ request }) => {
  const responses = await Promise.all([
    request.get('/moje-kody.html'),
    request.get('/szablony.html'),
    request.get('/drukarki.html'),
    request.get('/historia-wydrukow.html'),
    request.get('/reset-password-page.js'),
  ]);
  const source = (await Promise.all(responses.map((response) => response.text()))).join('\n');
  for (const event of [
    'catalog_print_job_started',
    'template_duplicated',
    'printer_profile_saved',
    'print_job_reopened',
    'password_reset_completed',
  ]) expect(source).toContain(`'${event}'`);

  const eventCalls = [...source.matchAll(/trackBarcode\?\.\([^\n]+/g)].map((match) => match[0]).join('\n');
  expect(eventCalls).not.toMatch(/email|user_id|barcode_value|share_slug/);
});
