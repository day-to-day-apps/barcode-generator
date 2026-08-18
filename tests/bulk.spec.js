// @ts-check
import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
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
  test.setTimeout(120_000);
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

test('imports the first non-empty Excel worksheet without external requests', async ({ page }) => {
  await page.route('https://cdn.sheetjs.com/**', (route) => route.abort());
  await page.goto('/bulk-barcode-generator');

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), 'Read me');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['value', 'type', 'name', 'description', 'price', 'copies'],
    ['0012345678905', 'EAN13', 'Coffee', 'Whole beans', '24.90', 2],
    ['BOX-XL', 'CODE128', 'Storage box', '', '', 1],
  ]), 'Products');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

  await page.locator('#csv-file').setInputFiles({
    name: 'products.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
  });

  await expect(page.locator('#bulk-rows tr')).toHaveCount(2);
  await expect(page.locator('#bulk-rows [data-field=value]').first()).toHaveValue('0012345678905');
  await expect(page.locator('#bulk-rows [data-field=name]').last()).toHaveValue('Storage box');
  await expect(page.locator('#bulk-summary')).toContainText('3 labels');
  await expect(page.locator('#bulk-status')).toContainText('Worksheet: Products.');
});

test('parses a large Excel workbook in a worker without blocking the UI thread', async ({ page }) => {
  await page.goto('/bulk-barcode-generator');
  const warmWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(warmWorkbook, XLSX.utils.aoa_to_sheet([['value'], ['WARM-UP']]), 'Warmup');
  const largeWorkbook = XLSX.utils.book_new();
  const largeRows = Array.from({ length: 450 }, (_, row) => (
    Array.from({ length: 180 }, (_, column) => `R${row}C${column}`)
  ));
  XLSX.utils.book_append_sheet(largeWorkbook, XLSX.utils.aoa_to_sheet(largeRows), 'Large');

  const result = await page.evaluate(async ({ warm, large }) => {
    const OriginalWorker = window.Worker;
    let workerCount = 0;
    window.Worker = class extends OriginalWorker {
      constructor(...args) {
        workerCount++;
        super(...args);
      }
    };
    const { parseDataFile } = await import('/csv-import.js');
    const file = (bytes, name) => new File([Uint8Array.from(atob(bytes), (char) => char.charCodeAt(0))], name, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await parseDataFile(file(warm, 'warm.xlsx'));

    let uiTicks = 0;
    const timer = setInterval(() => { uiTicks++; }, 1);
    const parsed = await parseDataFile(file(large, 'large.xlsx'), { maxRows: 500, timeoutMs: 15000 });
    clearInterval(timer);
    return { uiTicks, workerCount, rows: parsed.rows.length, sheetName: parsed.sheetName };
  }, {
    warm: XLSX.write(warmWorkbook, { bookType: 'xlsx', type: 'base64' }),
    large: XLSX.write(largeWorkbook, { bookType: 'xlsx', type: 'base64' }),
  });

  expect(result).toMatchObject({ workerCount: 2, rows: 450, sheetName: 'Large' });
  expect(result.uiTicks).toBeGreaterThan(0);
});

test('enforces the Excel cell limit and supports timeout and cancellation', async ({ page }) => {
  await page.goto('/bulk-barcode-generator');
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['value', 'type', 'name'],
    ['SKU-1', 'CODE128', 'Product'],
  ]), 'Products');
  const workbookBase64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });

  const limited = await page.evaluate(async (base64) => {
    const { parseDataFile } = await import('/csv-import.js');
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    try {
      await parseDataFile(new File([bytes], 'limited.xlsx'), { maxCells: 4 });
      return null;
    } catch (error) {
      return { name: error.name, message: error.message };
    }
  }, workbookBase64);
  expect(limited).toEqual({ name: 'Error', message: 'workbook_invalid' });

  await page.route('**/xlsx-worker.js*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.continue();
  });
  const interrupted = await page.evaluate(async (base64) => {
    const { parseDataFile } = await import('/csv-import.js');
    const makeFile = () => new File([
      Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)),
    ], 'interrupted.xlsx');
    const timeout = await parseDataFile(makeFile(), { timeoutMs: 20 })
      .then(() => null, (error) => ({ name: error.name, message: error.message }));
    const controller = new AbortController();
    const cancelledPromise = parseDataFile(makeFile(), { signal: controller.signal, timeoutMs: 1000 })
      .then(() => null, (error) => ({ name: error.name }));
    controller.abort();
    return { timeout, cancelled: await cancelledPromise };
  }, workbookBase64);

  expect(interrupted.timeout).toEqual({ name: 'TimeoutError', message: 'workbook_invalid' });
  expect(interrupted.cancelled).toEqual({ name: 'AbortError' });
});

test('rejects a damaged Excel workbook without replacing current rows', async ({ page }) => {
  await page.goto('/pl/generator-kodow-z-csv');
  await page.locator('#bulk-rows [data-field=value]').fill('ZACHOWAJ-001');
  await page.locator('#csv-file').setInputFiles({
    name: 'uszkodzony.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('not an Excel workbook'),
  });

  await expect(page.locator('#bulk-status')).toHaveText('Nie udało się odczytać skoroszytu Excel.');
  await expect(page.locator('#bulk-status')).toHaveClass(/is-error/);
  await expect(page.locator('#bulk-rows tr')).toHaveCount(1);
  await expect(page.locator('#bulk-rows [data-field=value]')).toHaveValue('ZACHOWAJ-001');
});

test('preserves Unicode product labels in PDF exports', async ({ page }) => {
  await page.goto('/pl/generator-kodow-z-csv');
  const row = page.locator('#bulk-rows tr').first();
  const productName = '\u017b\u00f3\u0142ta \u0141\u00f3d\u017a \u2013 \u0107ma';
  const price = '12,50 z\u0142';
  await row.locator('[data-field=value]').fill('POLSKA-001');
  await row.locator('[data-field=name]').fill(productName);
  await row.locator('[data-field=price]').fill(price);

  const pdfEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PDF', exact: true }).click();
  const bytes = new Uint8Array(await downloadBuffer(await pdfEvent));
  const loadingTask = getDocument({ data: bytes, disableWorker: true });
  const pdf = await loadingTask.promise;
  const content = await (await pdf.getPage(1)).getTextContent();
  const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
  await loadingTask.destroy();

  expect(text).toContain(productName);
  expect(text).toContain(price);
  expect(text).not.toContain('?');
});

test('detects tab-separated CSV without counting delimiters inside quoted fields', async ({ page }) => {
  await page.goto('/bulk-barcode-generator');
  const csv = '\uFEFFvalue\ttype\tdescription\nSKU-001\tCODE128\t"Blue, large, boxed, 20; cm | fragile"';
  await page.locator('#csv-file').setInputFiles({
    name: 'quoted-products.tsv.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });

  await expect(page.locator('#bulk-rows tr')).toHaveCount(1);
  await expect(page.locator('#bulk-rows [data-field=value]')).toHaveValue('SKU-001');
  await expect(page.locator('#bulk-rows [data-field=code_type]')).toHaveValue('CODE128');
  await expect(page.locator('#bulk-rows [data-field=description]')).toHaveValue('Blue, large, boxed, 20; cm | fragile');
  await expect(page.locator('#bulk-status')).toContainText('1 label');
});

test('maps headerless CSV in the documented table column order', async ({ page }) => {
  await page.goto('/bulk-barcode-generator');
  await page.locator('#has-header').uncheck();
  const csv = 'SKU-002,CODE128,Storage box,"Blue, reinforced",12.50 PLN,3';
  await page.locator('#csv-file').setInputFiles({
    name: 'headerless-products.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });

  await expect(page.locator('#bulk-rows tr')).toHaveCount(1);
  await expect(page.locator('#bulk-rows [data-field=value]')).toHaveValue('SKU-002');
  await expect(page.locator('#bulk-rows [data-field=code_type]')).toHaveValue('CODE128');
  await expect(page.locator('#bulk-rows [data-field=name]')).toHaveValue('Storage box');
  await expect(page.locator('#bulk-rows [data-field=description]')).toHaveValue('Blue, reinforced');
  await expect(page.locator('#bulk-rows [data-field=price]')).toHaveValue('12.50 PLN');
  await expect(page.locator('#bulk-rows [data-field=copies]')).toHaveValue('3');
  await expect(page.locator('#bulk-summary')).toContainText('3 labels');
});

test('accepts 50 guest records and rejects 51 without truncating the current batch', async ({ page }) => {
  await page.goto('/bulk-barcode-generator');
  const makeCsv = (count) => [
    'value,type,name,description,price,copies',
    ...Array.from({ length: count }, (_, index) => `SKU-${String(index + 1).padStart(3, '0')},CODE128,Product ${index + 1},Box,,1`),
  ].join('\n');

  await page.locator('#csv-file').setInputFiles({
    name: 'fifty.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(makeCsv(50), 'utf8'),
  });
  await expect(page.locator('#bulk-rows tr')).toHaveCount(50);
  await expect(page.locator('#bulk-rows [data-field=value]').first()).toHaveValue('SKU-001');
  await expect(page.locator('#bulk-rows [data-field=value]').last()).toHaveValue('SKU-050');

  await page.locator('#csv-file').setInputFiles({
    name: 'fifty-one.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(makeCsv(51), 'utf8'),
  });
  await expect(page.locator('#bulk-status')).toHaveText('This file contains 51 data records. This mode allows up to 50.');
  await expect(page.locator('#bulk-status')).toHaveClass(/is-error/);
  await expect(page.locator('#bulk-rows tr')).toHaveCount(50);
  await expect(page.locator('#bulk-rows [data-field=value]').last()).toHaveValue('SKU-050');

  await page.goto('/pl/generator-kodow-z-csv');
  await page.locator('#csv-file').setInputFiles({
    name: 'piecdziesiat-jeden.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(makeCsv(51), 'utf8'),
  });
  await expect(page.locator('#bulk-status')).toHaveText('Plik zawiera 51 rekordów danych. Ten tryb pozwala na maksymalnie 50.');
});

test('shows the requested label count live instead of silently capping the summary', async ({ page }) => {
  await page.goto('/bulk-barcode-generator');
  await page.locator('#bulk-rows [data-field=value]').fill('LABEL-LIMIT');
  await page.locator('#bulk-rows [data-field=copies]').fill('201');
  await expect(page.locator('#bulk-summary')).toContainText('201 labels · limit 200');
  await expect(page.locator('#bulk-summary')).toHaveClass(/is-error/);

  await page.locator('#bulk-rows [data-field=copies]').fill('200');
  await expect(page.locator('#bulk-summary')).toContainText('200 labels');
  await expect(page.locator('#bulk-summary')).not.toHaveClass(/is-error/);
});

test('cancels a ZIP export while the archive is being compressed', async ({ page }) => {
  await page.route('**/vendor/jszip.min.js', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `window.JSZip = class {
      file() {}
      async generateAsync(options, onUpdate) {
        for (let percent = 0; percent <= 100; percent += 5) {
          await new Promise((resolve) => setTimeout(resolve, 75));
          onUpdate({ percent });
        }
        return new Uint8Array([1, 2, 3]);
      }
    };`,
  }));
  const downloads = [];
  page.on('download', (download) => downloads.push(download.suggestedFilename()));

  await page.goto('/bulk-barcode-generator');
  await page.locator('#bulk-rows [data-field=value]').fill('CANCEL-ZIP');
  await page.locator('[data-export="zip-svg"]').click();
  await expect(page.locator('#progress-label')).toContainText('Compressing');
  await page.locator('#cancel-export').click();

  await expect(page.locator('#bulk-status')).toHaveText('Generation cancelled.');
  await expect(page.locator('#cancel-export')).toBeHidden();
  await expect(page.locator('.bulk-progress')).not.toHaveClass(/is-active/);
  await expect(page.locator('#progress-label')).toHaveText('');
  await page.waitForTimeout(300);
  expect(downloads).toEqual([]);
});

test('downloads localized CSV templates with BOM and documented columns', async ({ page }) => {
  await page.goto('/bulk-barcode-generator');
  const englishDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV template' }).click();
  const english = await englishDownload;
  expect(english.suggestedFilename()).toBe('barcode-template.csv');
  const englishText = (await downloadBuffer(english)).toString('utf8');
  expect(englishText.startsWith('\uFEFF')).toBe(true);
  expect(englishText).toContain('"value","type","name","description","price","copies"');
  expect(englishText).toContain('"590123412345","EAN13","Green tea"');
  await expect(page.locator('#bulk-status')).toHaveText('The CSV template has been downloaded.');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pl/generator-kodow-z-csv');
  const mobileGeometry = await page.locator('.bulk-toolbar').evaluate((element) => ({
    documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    buttonWidth: element.querySelector('#download-csv-template')?.getBoundingClientRect().width || 0,
  }));
  expect(mobileGeometry.documentOverflow).toBe(0);
  expect(mobileGeometry.buttonWidth).toBeGreaterThan(120);
  const polishDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Pobierz wzór CSV' }).click();
  const polish = await polishDownload;
  expect(polish.suggestedFilename()).toBe('wzor-kodow-kreskowych.csv');
  const polishText = (await downloadBuffer(polish)).toString('utf8');
  expect(polishText.startsWith('\uFEFF')).toBe(true);
  expect(polishText).toContain('"value";"type";"name";"description";"price";"copies"');
  expect(polishText).toContain('"Herbata zielona"');
  await expect(page.locator('#bulk-status')).toHaveText('Wzór CSV został pobrany.');
});

test('rejects malformed CSV without replacing the current rows', async ({ page }) => {
  await page.goto('/bulk-barcode-generator');
  await page.locator('#bulk-rows [data-field=value]').fill('KEEP-ME');
  await page.locator('#csv-file').setInputFiles({
    name: 'malformed.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('value,type\n"BROKEN,CODE128', 'utf8'),
  });

  await expect(page.locator('#bulk-status')).toHaveText('The CSV file contains an unterminated quoted field.');
  await expect(page.locator('#bulk-status')).toHaveClass(/is-error/);
  await expect(page.locator('#bulk-rows tr')).toHaveCount(1);
  await expect(page.locator('#bulk-rows [data-field=value]')).toHaveValue('KEEP-ME');

  await page.goto('/pl/generator-kodow-z-csv');
  await page.locator('#csv-file').setInputFiles({
    name: 'uszkodzony.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('value,type\n"BROKEN,CODE128', 'utf8'),
  });
  await expect(page.locator('#bulk-status')).toHaveText('Plik CSV zawiera niedomknięte pole w cudzysłowie.');
});

test('exports the documented L7163, 5163 and 100 x 50 mm formats at physical size', async ({ page }) => {
  await page.goto('/bulk-barcode-generator');
  await page.locator('#bulk-rows [data-field=value]').fill('BOX-100');
  const cases = [
    ['avery-l7163-a4', 210, 297],
    ['avery-5163-letter', 215.9, 279.4],
    ['thermal-100x50', 100, 50],
  ];
  for (const [preset, widthMm, heightMm] of cases) {
    await page.locator('#page-preset').selectOption(preset);
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PDF', exact: true }).click();
    const pdf = await PDFDocument.load(await downloadBuffer(await downloadEvent));
    const size = pdf.getPage(0).getSize();
    expect(size.width, preset).toBeCloseTo(widthMm * 72 / 25.4, 1);
    expect(size.height, preset).toBeCloseTo(heightMm * 72 / 25.4, 1);
  }
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
  await page.route(/\/vendor\/supabase\.min\.js/, (route) => route.fulfill({
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
