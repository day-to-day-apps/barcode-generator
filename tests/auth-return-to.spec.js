// @ts-check
import { test, expect } from '@playwright/test';

const SDK_URL = /\/vendor\/supabase\.min\.js/;

async function mockSignedOutAuth(page) {
  await page.route(SDK_URL, (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    headers: { 'access-control-allow-origin': '*' },
    body: `
      export function createClient() {
        return {
          auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange() {
              return { data: { subscription: { unsubscribe() {} } } };
            },
            signInWithPassword: async () => ({ data: { session: null }, error: null })
          }
        };
      }
    `,
  }));
}

async function submitLogin(page) {
  await page.locator('#login-email').fill('return-test@example.com');
  await page.locator('#login-password').fill('Strong-password-2026');
  await page.locator('#login-form').evaluate((form) => form.requestSubmit());
}

test('returnTo accepts only normalized same-origin paths', async ({ page }) => {
  await page.goto('/konto');
  const results = await page.evaluate(async () => {
    const { resolveSafeReturnTo } = await import('/auth-email-password.js');
    const origin = location.origin;
    return {
      safe: resolveSafeReturnTo('/2d-barcode-generator?source=account#tool', origin),
      protocolRelative: resolveSafeReturnTo('//evil.example/path', origin),
      backslashRelative: resolveSafeReturnTo('/\\evil.example/path', origin),
      tripleSlash: resolveSafeReturnTo('///evil.example/path', origin),
      absolute: resolveSafeReturnTo('https://evil.example/path', origin),
      script: resolveSafeReturnTo('javascript:alert(1)', origin),
      relative: resolveSafeReturnTo('2d-barcode-generator', origin),
    };
  });

  expect(results.safe).toBe('/2d-barcode-generator?source=account#tool');
  expect(Object.values(results).slice(1)).toEqual([null, null, null, null, null, null]);
});

test('login ignores a backslash-based external returnTo', async ({ page }) => {
  await mockSignedOutAuth(page);
  await page.goto('/konto?returnTo=%2F%5Cevil.example%2Fstolen#login');
  await submitLogin(page);

  await expect(page).toHaveURL(/\/konto\?returnTo=/);
  expect(new URL(page.url()).origin).toBe('http://127.0.0.1:8765');
});

test('login follows a valid internal returnTo including query and hash', async ({ page }) => {
  await mockSignedOutAuth(page);
  await page.goto('/konto?returnTo=%2F2d-barcode-generator%3Fsource%3Daccount%23tool#login');
  await submitLogin(page);

  await expect(page).toHaveURL('/2d-barcode-generator?source=account#tool');
});
