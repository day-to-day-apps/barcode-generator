// @ts-check
import { test, expect } from '@playwright/test';

const PAYLOAD = 'D2D-2D-TEST-2026';

async function decodeCanvas(page) {
  return page.evaluate(() => {
    const source = new window.ZXing.HTMLCanvasElementLuminanceSource(document.querySelector('#two-d-preview'));
    const bitmap = new window.ZXing.BinaryBitmap(new window.ZXing.HybridBinarizer(source));
    const result = new window.ZXing.MultiFormatReader().decode(bitmap);
    const formatValue = result.getBarcodeFormat();
    const format = Object.keys(window.ZXing.BarcodeFormat)
      .find((key) => window.ZXing.BarcodeFormat[key] === formatValue);
    return { text: result.getText(), format };
  });
}

test.describe('2D barcode generator', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/(googletagmanager\.com|google-analytics\.com)/, (route) =>
      route.fulfill({ status: 200, body: '', contentType: 'application/javascript' }));
    await page.addInitScript(() => localStorage.setItem('barcode-cookie-consent', 'rejected'));
    await page.goto('/2d-barcode-generator');
    await page.addScriptTag({ url: '/vendor/zxing.min.js' });
  });

  test('generates and decodes Data Matrix, PDF417 and Aztec', async ({ page }) => {
    await page.locator('#two-d-payload').fill(PAYLOAD);
    const cases = [
      { radio: 'Data Matrix', format: 'DATA_MATRIX' },
      { radio: 'PDF417', format: 'PDF_417' },
      { radio: 'Aztec', format: 'AZTEC' },
    ];

    for (const item of cases) {
      await page.getByRole('radio', { name: item.radio, exact: true }).check();
      const expectedBcid = item.radio === 'Data Matrix' ? 'datamatrix' : item.radio === 'PDF417' ? 'pdf417' : 'azteccode';
      await expect(page.locator('#two-d-preview')).toHaveAttribute('data-format', expectedBcid);
      await expect(page.locator('#two-d-metrics')).toContainText(`${new TextEncoder().encode(PAYLOAD).length} bytes`);
      await expect(page.locator('#two-d-status')).toHaveText('The barcode is ready to download.');
      const pixels = await page.locator('#two-d-preview').evaluate((canvas) => {
        const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let dark = 0;
        for (let index = 0; index < data.length; index += 4) {
          if (data[index] < 80 && data[index + 1] < 80 && data[index + 2] < 80 && data[index + 3] > 0) dark += 1;
        }
        return { dark, width: canvas.width, height: canvas.height };
      });
      expect(pixels.dark, item.radio).toBeGreaterThan(100);
      expect(pixels.width, item.radio).toBeGreaterThan(40);
      expect(pixels.height, item.radio).toBeGreaterThan(40);
      const decoded = await decodeCanvas(page);
      expect(decoded.text, item.radio).toBe(PAYLOAD);
      expect(decoded.format, item.radio).toBe(item.format);
    }
  });

  test('validates empty input and exports SVG and PNG', async ({ page }) => {
    await page.locator('#two-d-payload').fill('');
    await expect(page.locator('#two-d-status')).toHaveText('Enter data to encode.');
    await expect(page.locator('#download-two-d-svg')).toBeDisabled();

    await page.locator('#two-d-payload').fill('Export-2026');
    await expect(page.locator('#download-two-d-svg')).toBeEnabled();
    await page.evaluate(() => {
      window.__twoDDownloads = [];
      const nativeClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function click() {
        if (this.download) window.__twoDDownloads.push(this.download);
        return nativeClick.call(this);
      };
    });
    await page.locator('#download-two-d-svg').click();
    await expect.poll(() => page.evaluate(() => window.__twoDDownloads)).toHaveLength(1);
    await page.locator('#download-two-d-png').click();
    await expect.poll(() => page.evaluate(() => window.__twoDDownloads)).toHaveLength(2);
    const filenames = await page.evaluate(() => window.__twoDDownloads);
    expect(filenames[0]).toMatch(/^datamatrix-\d+\.svg$/);
    expect(filenames[1]).toMatch(/^datamatrix-\d+\.png$/);
  });

  test('updates format-specific settings without console errors', async ({ page }) => {
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.getByRole('radio', { name: 'PDF417', exact: true }).check();
    await expect(page.locator('[data-format-options="pdf417"]')).toBeVisible();
    await page.locator('#pdf-columns').fill('6');
    await expect(page.locator('#two-d-status')).toHaveText('The barcode is ready to download.');
    await page.getByRole('radio', { name: 'Aztec', exact: true }).check();
    await page.locator('#aztec-format').selectOption('compact');
    await expect(page.locator('#two-d-status')).toHaveText('The barcode is ready to download.');
    expect(errors).toEqual([]);
  });

  test('publishes a complete account payload and preserves it through sign-in', async ({ page }) => {
    const moduleErrors = [];
    page.on('pageerror', (error) => moduleErrors.push(error.message));
    const statePromise = page.evaluate(() => new Promise((resolve) => {
      const handler = (event) => {
        if (!event.detail?.valid) return;
        window.removeEventListener('barcode:save-state', handler);
        resolve(event.detail);
      };
      window.addEventListener('barcode:save-state', handler);
    }));
    await page.locator('#two-d-payload').fill('ACCOUNT-DATAMATRIX-2026');
    const state = await statePromise;
    expect(state).toMatchObject({
      valid: true,
      payload: {
        code_type: 'DATAMATRIX',
        value: 'ACCOUNT-DATAMATRIX-2026',
        tags: ['2d'],
        settings: { generator: '2d', bcid: 'datamatrix' },
      },
    });
    const save = page.locator('[data-account-save]');
    await expect(save).toBeEnabled();
    expect(moduleErrors).toEqual([]);
    await expect(save).toHaveText('Sign in to save');
    await save.click();
    await expect(page).toHaveURL(/\/konto\?returnTo=%2F2d-barcode-generator#login$/);
    expect(moduleErrors).toEqual([]);
    const pending = await page.evaluate(() => JSON.parse(sessionStorage.getItem('bg.pending.specialized-code')));
    expect(pending.payload).toMatchObject({ code_type: 'DATAMATRIX', value: 'ACCOUNT-DATAMATRIX-2026' });
    expect(pending.path).toBe('/2d-barcode-generator');
  });

  test('saves the generated 2D payload for an authenticated account', async ({ page }) => {
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\/\+esm/, (route) => route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      headers: { 'access-control-allow-origin': '*' },
      body: `export function createClient(){return {
        auth:{getSession:async()=>({data:{session:JSON.parse(localStorage.getItem('bg.auth'))},error:null})},
        from(){const chain={
          select(_columns,options){if(options?.head)return Promise.resolve({count:0,error:null});return chain},
          insert(payload){window.__savedSpecializedPayload=payload;return chain},
          single:async()=>({data:{id:'saved-test-id'},error:null})
        };return chain}
      }}`,
    }));
    await page.addInitScript(() => localStorage.setItem('bg.auth', JSON.stringify({
      access_token: 'test-token', user: { id: '00000000-0000-4000-8000-000000000001', email: 'test@example.com' },
    })));
    await page.goto('/2d-barcode-generator');
    await page.locator('#two-d-payload').fill('SAVED-ACCOUNT-2D');
    const save = page.locator('[data-account-save]');
    await expect(save).toHaveText('Save to account');
    await expect(save).toBeEnabled();
    await save.click();
    await expect.poll(() => page.evaluate(() => window.__savedSpecializedPayload?.value || '')).toBe('SAVED-ACCOUNT-2D');
    await expect(page.locator('[data-account-save-feedback]')).toHaveText('Barcode saved to your account.');
    const payload = await page.evaluate(() => window.__savedSpecializedPayload);
    expect(payload).toMatchObject({
      user_id: '00000000-0000-4000-8000-000000000001',
      code_type: 'DATAMATRIX', value: 'SAVED-ACCOUNT-2D', tags: ['2d'],
      settings: { generator: '2d', bcid: 'datamatrix' },
    });
  });

  test('Polish and English routes expose final SEO signals', async ({ page }) => {
    for (const path of ['/2d-barcode-generator', '/pl/generator-kodow-2d']) {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://barcode-generator.daytodayapps.com${path}`);
      const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(schemas.length, path).toBeGreaterThan(0);
      for (const schema of schemas) expect(() => JSON.parse(schema), path).not.toThrow();
    }
  });

  test('mobile layout keeps controls and preview inside the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/pl/generator-kodow-2d');
    await expect(page.locator('#two-d-advanced')).not.toHaveAttribute('open', '');
    const geometry = await page.evaluate(() => {
      const controls = [...document.querySelectorAll('#two-d-form input, #two-d-form select, #two-d-form textarea, .two-d-actions button')];
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        outside: controls.filter((control) => {
          const rect = control.getBoundingClientRect();
          return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1;
        }).length,
      };
    });
    expect(geometry).toEqual({ overflow: 0, outside: 0 });
    await expect(page.locator('#two-d-preview')).toBeVisible();
  });

  test('decoder loads ZXing from the first-party production bundle', async ({ page }) => {
    await page.goto('/decoder');
    await expect.poll(() => page.evaluate(() => typeof window.ZXing)).toBe('object');
    const sources = await page.locator('script[src]').evaluateAll((scripts) => scripts.map((script) => script.src));
    expect(sources.some((source) => source.endsWith('/vendor/zxing.min.js'))).toBe(true);
    expect(sources.some((source) => source.includes('cdn.jsdelivr.net') && source.includes('@zxing'))).toBe(false);
  });
});

test('saved-code catalog renders a Data Matrix preview with the local library', async ({ page }) => {
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\/\+esm/, (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    headers: { 'access-control-allow-origin': '*' },
    body: `export function createClient(){return {
      auth:{
        getSession:async()=>({data:{session:JSON.parse(localStorage.getItem('bg.auth'))},error:null}),
        onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
      },
      from(){const chain={
        select(){return chain},
        order:async()=>({data:[{id:'00000000-0000-4000-8000-000000000002',code_type:'DATAMATRIX',value:'CATALOG-DM-2026',name:'Part label',tags:['2d'],settings:{generator:'2d',bcid:'datamatrix'},is_public:false,share_slug:null,created_at:'2026-07-20T10:00:00Z',updated_at:'2026-07-20T10:00:00Z'}],error:null})
      };return chain}
    }}`,
  }));
  await page.addInitScript(() => localStorage.setItem('bg.auth', JSON.stringify({
    access_token: 'test-token', user: { id: '00000000-0000-4000-8000-000000000001', email: 'test@example.com' },
  })));
  await page.goto('/moje-kody');
  await expect(page.locator('.code-row')).toHaveCount(1);
  await expect(page.locator('.code-name')).toHaveText('Part label');
  await expect(page.locator('.code-preview svg path')).not.toHaveCount(0);
  const sources = await page.locator('script[src]').evaluateAll((scripts) => scripts.map((script) => script.src));
  expect(sources.some((source) => source.endsWith('/vendor/bwip-js-min.js'))).toBe(true);
  expect(sources.some((source) => source.includes('cdn.jsdelivr.net') && source.includes('jsbarcode'))).toBe(false);
});
