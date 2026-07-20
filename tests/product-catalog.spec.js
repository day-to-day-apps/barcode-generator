// @ts-check
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(/(googletagmanager|google-analytics|googlesyndication)/, (route) => route.fulfill({ status: 200, body: '' }));
});

test('product metadata helpers clamp values and preserve barcode settings', async ({ page }) => {
  await page.goto('/moje-kody');
  const result = await page.evaluate(async () => {
    const { normaliseProductMetadata, withProductMetadata } = await import('/db-codes.js');
    const original = { bcid: 'datamatrix', scale: 3 };
    const settings = withProductMetadata(original, { description: `  ${'A'.repeat(520)}  `, price: ` ${'9'.repeat(70)} `, copies: 5000 });
    const removed = withProductMetadata(settings, { description: '', price: '', copies: 1 });
    return { original, settings, removed, normalised: normaliseProductMetadata({ copies: 0 }) };
  });
  expect(result.original).toEqual({ bcid: 'datamatrix', scale: 3 });
  expect(result.settings).toMatchObject({ bcid: 'datamatrix', scale: 3, product: { copies: 1000 } });
  expect(result.settings.product.description).toHaveLength(500);
  expect(result.settings.product.price).toHaveLength(64);
  expect(result.removed).toEqual({ bcid: 'datamatrix', scale: 3 });
  expect(result.normalised.copies).toBe(1);
});

test('saved-code catalog edits product details without losing renderer settings', async ({ page }) => {
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\/\+esm/, (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    headers: { 'access-control-allow-origin': '*' },
    body: `export function createClient(){return {
      auth:{getSession:async()=>({data:{session:JSON.parse(localStorage.getItem('bg.auth'))},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
      from(){const chain={
        select(){return chain},
        order:async()=>({data:[{id:'00000000-0000-4000-8000-000000000021',code_type:'DATAMATRIX',value:'PART-21',name:'Pump housing',tags:['production'],settings:{bcid:'datamatrix',scale:3},is_public:false,share_slug:null,created_at:'2026-07-20T10:00:00Z',updated_at:'2026-07-20T10:00:00Z'}],error:null}),
        update(payload){window.__productCatalogPatch=payload;return chain},eq(){return chain},single:async()=>({data:{id:'00000000-0000-4000-8000-000000000021'},error:null})
      };return chain}
    }}`,
  }));
  await page.addInitScript(() => {
    localStorage.setItem('bg.auth', JSON.stringify({ access_token: 'test-token', user: { id: '00000000-0000-4000-8000-000000000001' } }));
    localStorage.setItem('barcode_consent_v2', JSON.stringify({ analytics: false, ads: false }));
  });
  await page.goto('/moje-kody');
  const row = page.locator('.code-row');
  await expect(row).toHaveCount(1);
  await row.locator('.btn-edit-product').click();
  await row.locator('.product-description-input').fill('Replacement part, shelf B4');
  await row.locator('.product-price-input').fill('49.90 PLN');
  await row.locator('.product-copies-input').fill('6');
  await row.locator('.btn-product-save').click();
  await expect(row.locator('.code-product-form')).toBeHidden();
  await expect(row.locator('.code-product')).toContainText('49.90 PLN');
  await expect(row.locator('.code-product')).toContainText('Replacement part, shelf B4');
  await expect(row.locator('.code-product')).toContainText('×6');
  const patch = await page.evaluate(() => window.__productCatalogPatch);
  expect(patch.settings).toEqual({ bcid: 'datamatrix', scale: 3, product: { description: 'Replacement part, shelf B4', price: '49.90 PLN', copies: 6 } });
});

test('product controls and print-job action are translated in every account locale', async ({ page }) => {
  await page.goto('/moje-kody');
  const missing = await page.evaluate(() => Object.entries(window.BARCODE_I18N).filter(([, locale]) => {
    const account = locale.account || {};
    return ['productDetails', 'productDescription', 'productPrice', 'productCopies', 'productSaved', 'createPrintJob'].some((key) => !account[key]);
  }).map(([lang]) => lang));
  expect(missing).toEqual([]);
});

test('main generator persists visible label fields with a saved barcode', async ({ request }) => {
  const source = await (await request.get('/auth-ui.js')).text();
  expect(source).toContain("document.getElementById('label-product-name')");
  expect(source).toContain("document.getElementById('label-description')");
  expect(source).toContain("document.getElementById('label-price')");
  expect(source).toContain("document.getElementById('label-copies')");
  expect(source).toContain('name: data.name');
  expect(source).toContain('name: pending.name || null');
});
