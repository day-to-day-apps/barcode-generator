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
        access_token: 'responsive-session',
        user: { id: '00000000-0000-4000-8000-000000000321', email: 'responsive@example.com' }
      };
      export function createClient() {
        return {
          auth: {
            getSession: async () => ({ data: { session }, error: null }),
            onAuthStateChange() {
              return { data: { subscription: { unsubscribe() {} } } };
            },
            signOut: async () => ({ error: null }),
            updateUser: async () => ({ error: null }),
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

test('account settings use the full dashboard width on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/konto');
  await expect(page.locator('#signed-in')).toBeVisible();
  const layout = await page.locator('#settings').evaluate((settings) => {
    const parent = settings.parentElement;
    return {
      open: settings.hasAttribute('open'),
      width: settings.getBoundingClientRect().width,
      parentWidth: parent?.getBoundingClientRect().width || 0,
    };
  });

  expect(layout.open).toBe(true);
  expect(layout.width).toBeGreaterThan(layout.parentWidth * 0.9);
  await expect(page.locator('#account-new-email')).toBeVisible();
});

test('account settings start collapsed on mobile and remain keyboard-operable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/konto');
  await expect(page.locator('#signed-in')).toBeVisible();
  const settings = page.locator('#settings');
  const summary = settings.locator('summary');

  await expect(settings).not.toHaveAttribute('open', '');
  await expect(page.locator('#account-new-email')).not.toBeVisible();
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(settings).toHaveAttribute('open', '');
  await expect(page.locator('#account-new-email')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('settings deep link opens the mobile panel automatically', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/konto#settings');
  await expect(page.locator('#signed-in')).toBeVisible();
  await expect(page.locator('#settings')).toHaveAttribute('open', '');
  await expect(page.locator('#account-new-password')).toBeVisible();
});
