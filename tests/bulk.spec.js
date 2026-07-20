// @ts-check
import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import AxeBuilder from '@axe-core/playwright';

async function downloadBuffer(download) {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

test.beforeEach(async ({ page }) => {
  await page.route(/(googletagmanager|google-analytics|googlesyndication)/, (route) => route.fulfill({ status: 200, body: '' }));
});

test('validates check digits and corrects supported values', async ({ page }) => {
  await page.goto('/bulk-barcode-generator');
  const results = await page.evaluate(async () => {
    const { validateBulkItem } = await import('/bulk-export.js');
    return [validateBulkItem({ value: '590123412345', type: 'EAN13' }), validateBulkItem({ value: 'ABC-123', type: 'CODE39' }), validateBulkItem({ value: '123', type: 'EAN13' })];
  });
  expect(results[0]).toMatchObject({ value: '5901234123457', status: 'corrected', reason: 'check_digit_added' });
  expect(results[1]).toMatchObject({ status: 'valid' });
  expect(results[2]).toMatchObject({ status: 'error', reason: 'invalid_length' });
});

test('imports semicolon CSV and creates a readable PDF and SVG ZIP', async ({ page }) => {
  await page.goto('/bulk-barcode-generator');
  await page.locator('#csv-file').setInputFiles({ name: 'products.csv', mimeType: 'text/csv', buffer: Buffer.from('\uFEFFvalue;type;name;copies\n590123412345;EAN13;Tea;2\nBOX-42;CODE128;Box;1', 'utf8') });
  await expect(page.locator('#bulk-rows tr')).toHaveCount(2);
  await expect(page.locator('#column-mapping')).toBeVisible();
  await expect(page.locator('#bulk-summary')).toContainText('3 labels');
  const pdfEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PDF', exact: true }).click();
  const pdf = await PDFDocument.load(await downloadBuffer(await pdfEvent));
  expect(pdf.getPageCount()).toBe(1);
  expect(pdf.getPage(0).getSize().width).toBeCloseTo(210 * 72 / 25.4, 1);
  const zipEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'SVG ZIP' }).click();
  const zip = await JSZip.loadAsync(await downloadBuffer(await zipEvent));
  expect(Object.keys(zip.files).filter((name) => name.endsWith('.svg'))).toHaveLength(3);
});

test('exports a mixed Data Matrix, PDF417 and Aztec batch', async ({ page }) => {
  await page.goto('/bulk-barcode-generator');
  await page.locator('#bulk-rows tr').first().locator('[data-field=value]').fill('BULK-DM-2026');
  await page.locator('#bulk-rows tr').first().locator('[data-field=code_type]').selectOption('DATAMATRIX');
  for (const [type, value] of [['PDF417', 'BULK-PDF-2026'], ['AZTEC', 'BULK-AZ-2026']]) {
    await page.locator('#add-row').click();
    const row = page.locator('#bulk-rows tr').last();
    await row.locator('[data-field=value]').fill(value);
    await row.locator('[data-field=code_type]').selectOption(type);
  }
  await expect(page.locator('#bulk-summary')).toContainText('3 valid');

  const zipEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'SVG ZIP' }).click();
  const zip = await JSZip.loadAsync(await downloadBuffer(await zipEvent));
  const svgFiles = Object.values(zip.files).filter((file) => file.name.endsWith('.svg'));
  expect(svgFiles).toHaveLength(3);
  const svgs = await Promise.all(svgFiles.map((file) => file.async('string')));
  expect(svgs.every((svg) => svg.startsWith('<svg') && svg.includes('<path'))).toBe(true);

  const pdfEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PDF', exact: true }).click();
  const pdf = await PDFDocument.load(await downloadBuffer(await pdfEvent));
  expect(pdf.getPageCount()).toBe(1);
});

test('PL and EN task pages expose final SEO signals', async ({ page }) => {
  const paths = ['/bulk-barcode-generator', '/pl/generator-kodow-z-csv', '/avery-label-printing', '/pl/drukowanie-etykiet-avery', '/warehouse-barcode-labels', '/pl/etykiety-kreskowe-dla-magazynu', '/thermal-barcode-label-printing', '/pl/druk-kodow-na-drukarce-termicznej'];
  for (const path of paths) {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `https://barcode-generator.daytodayapps.com${path}`);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.length).toBeGreaterThan(0);
    blocks.forEach((block) => expect(() => JSON.parse(block)).not.toThrow());
  }
});

test('bulk tool and task pages have no serious accessibility violations', async ({ page }) => {
  for (const path of ['/bulk-barcode-generator', '/pl/generator-kodow-z-csv', '/avery-label-printing', '/pl/drukowanie-etykiet-avery']) {
    await page.goto(path);
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations.filter((item) => ['critical', 'serious'].includes(item.impact || '')), path).toEqual([]);
  }
});
