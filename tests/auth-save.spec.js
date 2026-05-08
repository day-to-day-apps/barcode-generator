// @ts-check
import { test, expect } from '@playwright/test';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_vnawJTY8NEl7tuUoDKJ83Q_QFcOh_Se';

const HAS_CREDS = Boolean(SUPABASE_URL && SERVICE_ROLE);

test.describe('Auth + saved codes (RLS, trigger-enforced limit)', () => {
  test.skip(!HAS_CREDS, 'requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars');

  /** @type {(url: string, key: string, opts?: any) => any} */
  let createClient;
  test.beforeAll(async () => {
    ({ createClient } = await import('@supabase/supabase-js'));
  });

  test.beforeEach(async ({ page }) => {
    await page.route(/(pagead2\.googlesyndication\.com|googletagmanager\.com|google-analytics\.com)/, (route) =>
      route.fulfill({ status: 200, body: '', contentType: 'application/javascript' }),
    );
  });

  test('save flow + RLS isolation between two users', async ({ page, context }) => {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const stamp = Date.now();
    const emailA = `e2e-a-${stamp}@test.local`;
    const emailB = `e2e-b-${stamp}@test.local`;
    const password = `Pwd-${stamp}-A!`;

    const { data: userA, error: errA } = await admin.auth.admin.createUser({
      email: emailA, password, email_confirm: true,
    });
    expect(errA).toBeNull();
    const { data: userB, error: errB } = await admin.auth.admin.createUser({
      email: emailB, password, email_confirm: true,
    });
    expect(errB).toBeNull();

    try {
      const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
      const storageKey = `sb-${projectRef}-auth-token`;

      async function injectSession(email) {
        const userClient = createClient(SUPABASE_URL, ANON_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data, error } = await userClient.auth.signInWithPassword({ email, password });
        expect(error).toBeNull();
        const session = data.session;
        expect(session).toBeTruthy();

        await page.addInitScript(({ key, value }) => {
          window.localStorage.setItem(key, value);
        }, { key: storageKey, value: JSON.stringify(session) });
      }

      await injectSession(emailA);
      await page.goto('/');
      await page.evaluate(() => document.documentElement.lang = 'en');

      await test.step('user A saves a Code128 barcode', async () => {
        const typeSelect = page.locator('#barcodeType');
        if (await typeSelect.count()) await typeSelect.selectOption('CODE128');
        await page.locator('#barcodeValue').fill('E2E-TEST-A');
        const generate = page.getByRole('button', { name: /generate|generuj/i });
        if (await generate.count()) await generate.first().click();
        const saveBtn = page.locator('#save-code-btn');
        await expect(saveBtn).toBeVisible({ timeout: 5000 });
        await saveBtn.click();
        await expect(saveBtn).toHaveText(/saved|zapisano|gespeichert|enregistré|guardado|salvato|salvo|opgeslagen|uloženo|збережено/i, { timeout: 5000 });
      });

      await test.step('user A sees their code on /moje-kody.html', async () => {
        await page.goto('/moje-kody.html');
        await expect(page.locator('.code-row')).toHaveCount(1, { timeout: 5000 });
      });

      await context.clearCookies();
      await page.evaluate((k) => window.localStorage.removeItem(k), storageKey);
      await injectSession(emailB);

      await test.step('user B sees empty list (RLS isolation)', async () => {
        await page.goto('/moje-kody.html');
        await expect(page.locator('#empty')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('.code-row')).toHaveCount(0);
      });
    } finally {
      if (userA?.user?.id) await admin.auth.admin.deleteUser(userA.user.id);
      if (userB?.user?.id) await admin.auth.admin.deleteUser(userB.user.id);
    }
  });
});
