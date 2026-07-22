// @ts-check
import { test, expect } from '@playwright/test';

const SDK_URL = /cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\/\+esm/;

test('Ctrl+S keeps an anonymous barcode pending and opens registration', async ({ page }) => {
  await page.goto('/');
  const save = page.locator('.btn-save-code');
  await expect(save).toHaveAttribute('aria-keyshortcuts', 'Control+S Meta+S');
  await page.locator('#barcode-text').fill('SHORTCUT-GUEST-2026');

  await page.keyboard.press('Control+s');

  await expect(page).toHaveURL(/\/konto#register$/);
  const pending = await page.context().cookies();
  const cookie = pending.find((entry) => entry.name === 'bc_pending_code');
  expect(cookie).toBeTruthy();
  expect(JSON.parse(decodeURIComponent(cookie?.value || '')).value).toBe('SHORTCUT-GUEST-2026');
});

test('Ctrl+S saves the current barcode for an authenticated user', async ({ page }) => {
  await page.route(SDK_URL, (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    headers: { 'access-control-allow-origin': '*' },
    body: `export function createClient(){return {
      auth:{
        getSession:async()=>({data:{session:JSON.parse(localStorage.getItem('bg.auth'))},error:null}),
        onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},
        signOut:async()=>({error:null})
      },
      from(){return {
        select(_columns,options){return options?.head
          ? Promise.resolve({count:0,error:null})
          : Promise.resolve({data:[],error:null})},
        insert(payload){window.__shortcutSavedPayload=payload;return Promise.resolve({error:null})}
      }}
    }}`,
  }));
  await page.addInitScript(() => localStorage.setItem('bg.auth', JSON.stringify({
    access_token: 'shortcut-test-token',
    user: { id: '00000000-0000-4000-8000-000000000099', email: 'shortcut@example.com' },
  })));
  await page.goto('/');
  await expect(page.locator('.auth-user')).toBeVisible();
  await page.locator('#barcode-text').fill('SHORTCUT-SIGNED-IN-2026');

  await page.keyboard.press('Control+s');

  await expect.poll(() => page.evaluate(() => window.__shortcutSavedPayload?.value || ''))
    .toBe('SHORTCUT-SIGNED-IN-2026');
  await expect(page.locator('.btn-save-label')).toHaveText('Saved');
  const payload = await page.evaluate(() => window.__shortcutSavedPayload);
  expect(payload).toMatchObject({
    user_id: '00000000-0000-4000-8000-000000000099',
    code_type: 'CODE128',
    value: 'SHORTCUT-SIGNED-IN-2026',
  });
});

test('modified or repeated shortcuts do not trigger a save', async ({ page }) => {
  await page.goto('/');
  await page.locator('#barcode-text').fill('DO-NOT-SAVE');

  const result = await page.evaluate(() => {
    const shifted = new KeyboardEvent('keydown', {
      key: 's', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true,
    });
    const repeated = new KeyboardEvent('keydown', {
      key: 's', ctrlKey: true, repeat: true, bubbles: true, cancelable: true,
    });
    return {
      shiftedAllowed: document.dispatchEvent(shifted),
      repeatedAllowed: document.dispatchEvent(repeated),
      pending: document.cookie.includes('bc_pending_code='),
    };
  });

  expect(result).toEqual({ shiftedAllowed: true, repeatedAllowed: true, pending: false });
  await expect(page).toHaveURL(/\/$/);
});
