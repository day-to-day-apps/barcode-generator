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

test('signed-in users can search saved codes and choose label quantities', async ({ page }) => {
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\/\+esm/, (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    headers: { 'access-control-allow-origin': '*' },
    body: `export function createClient(){return {
      auth:{getSession:async()=>({data:{session:JSON.parse(localStorage.getItem('bg.auth'))},error:null})},
      from(table){const chain={select(){return chain},order:async()=>({data:table==='saved_codes'?[
        {id:'00000000-0000-4000-8000-000000000011',code_type:'CODE128',value:'BIN-A-14',name:'Warehouse bin',tags:['warehouse'],settings:{product:{description:'Zone A rack',price:'12.50 PLN',copies:4}}},
        {id:'00000000-0000-4000-8000-000000000012',code_type:'EAN13',value:'5901234123457',name:'Retail tea',tags:['shop'],settings:{}},
        {id:'00000000-0000-4000-8000-000000000013',code_type:'QR',value:'https://example.com',name:'Legacy QR',tags:[],settings:{}},
        {id:'00000000-0000-4000-8000-000000000014',code_type:'DATAMATRIX',value:'PART-DM-14',name:'Machine part',tags:['production'],settings:{bcid:'datamatrix'}}
      ]:[],error:null})};return chain}
    }}`,
  }));
  await page.addInitScript(() => {
    localStorage.setItem('bg.auth', JSON.stringify({ access_token: 'test-token', user: { id: '00000000-0000-4000-8000-000000000001' } }));
    localStorage.setItem('barcode_consent_v2', JSON.stringify({ analytics: false, ads: false }));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/bulk-barcode-generator');
  await expect(page.locator('#import-saved')).toBeVisible();
  await page.locator('#import-saved').click();
  const dialog = page.locator('#saved-codes-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.bulk-saved-item')).toHaveCount(4);
  await expect(dialog.locator('input[type=checkbox]:disabled')).toHaveCount(1);
  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, viewport: document.documentElement.clientWidth, overflow: element.scrollWidth - element.clientWidth };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
  expect(geometry.overflow).toBe(0);
  const accessibility = await new AxeBuilder({ page }).include('#saved-codes-dialog').analyze();
  expect(accessibility.violations.filter((item) => ['critical', 'serious'].includes(item.impact || ''))).toEqual([]);

  await dialog.locator('#saved-codes-select-all').check();
  await dialog.locator('.bulk-saved-copies input:not(:disabled)').evaluateAll((inputs) => inputs.forEach((input) => {
    input.value = '1000'; input.dispatchEvent(new Event('input', { bubbles: true }));
  }));
  await expect(dialog.locator('#saved-codes-summary')).toContainText('Reduce the selection');
  await expect(dialog.locator('#saved-codes-add')).toBeDisabled();
  await dialog.locator('#saved-codes-select-all').uncheck();

  await dialog.locator('#saved-codes-search').fill('warehouse');
  await expect(dialog.locator('.bulk-saved-item')).toHaveCount(1);
  await dialog.locator('.bulk-saved-choice input').check();
  await expect(dialog.locator('.bulk-saved-copies input')).toHaveValue('4');
  await dialog.locator('.bulk-saved-copies input').fill('3');
  await expect(dialog.locator('#saved-codes-summary')).toContainText('1 codes · 3 labels');
  await expect(dialog.locator('#saved-codes-add')).toBeEnabled();
  await dialog.locator('#saved-codes-add').click();

  await expect(dialog).toBeHidden();
  await expect(page.locator('#bulk-rows tr')).toHaveCount(1);
  await expect(page.locator('#bulk-rows [data-field=value]')).toHaveValue('BIN-A-14');
  await expect(page.locator('#bulk-rows [data-field=copies]')).toHaveValue('3');
  await expect(page.locator('#bulk-rows [data-field=description]')).toHaveValue('Zone A rack');
  await expect(page.locator('#bulk-rows [data-field=price]')).toHaveValue('12.50 PLN');
  await expect(page.locator('#bulk-status')).toHaveText('Imported saved barcodes: 1.');
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
