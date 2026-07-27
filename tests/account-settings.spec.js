// @ts-check
import { test, expect } from '@playwright/test';

const SDK_URL = /cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\/\+esm/;

test.beforeEach(async ({ page }) => {
  await page.route(SDK_URL, (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    headers: { 'access-control-allow-origin': '*' },
    body: `
      const session = {
        access_token: 'settings-session',
        user: { id: '00000000-0000-4000-8000-000000000654', email: 'current@example.com' }
      };
      globalThis.__accountUpdates = [];
      export function createClient() {
        return {
          auth: {
            getSession: async () => ({ data: { session }, error: null }),
            onAuthStateChange() {
              return { data: { subscription: { unsubscribe() {} } } };
            },
            signOut: async () => ({ error: null }),
            async updateUser(payload) {
              globalThis.__accountUpdates.push(payload);
              await new Promise((resolve) => setTimeout(resolve, 100));
              return { error: null };
            },
            resend: async () => ({ error: null })
          },
          from() {
            const chain = {
              select(_columns, options) {
                if (options?.head) return Promise.resolve({ count: 0, error: null });
                return chain;
              },
              order() { return chain; },
              then(resolve, reject) {
                return Promise.resolve({ data: [], error: null }).then(resolve, reject);
              }
            };
            return chain;
          }
        };
      }
    `,
  }));
});

test('account settings expose the current email and prevent a redundant update', async ({ page }) => {
  await page.goto('/konto');
  await expect(page.locator('#signed-in')).toBeVisible();
  await expect(page.locator('#account-current-email')).toHaveText('current@example.com');
  await expect(page.locator('#account-new-email')).toHaveValue('current@example.com');

  await page.locator('#account-email-submit').click();
  await expect(page.locator('#account-settings-status')).toContainText('already');
  expect(await page.evaluate(() => globalThis.__accountUpdates)).toEqual([]);
});

test('email and password updates expose busy and successful states', async ({ page }) => {
  await page.goto('/konto');
  await expect(page.locator('#signed-in')).toBeVisible();

  await page.locator('#account-new-email').fill('next@example.com');
  await page.locator('#account-email-submit').click();
  await expect(page.locator('#account-email-submit')).toBeDisabled();
  await expect(page.locator('#account-email-submit')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('#account-settings-status')).toContainText('Confirm the change');

  await page.locator('#account-new-password').fill('Stronger123!');
  await page.locator('#account-password-submit').click();
  await expect(page.locator('#account-password-submit')).toBeDisabled();
  await expect(page.locator('#account-settings-status')).toHaveText('Password updated.');
  await expect(page.locator('#account-new-password')).toHaveValue('');
  expect(await page.evaluate(() => globalThis.__accountUpdates)).toEqual([
    { email: 'next@example.com' },
    { password: 'Stronger123!' },
  ]);
});
