// @ts-check
import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_vnawJTY8NEl7tuUoDKJ83Q_QFcOh_Se';
const HAS_CREDS = Boolean(SUPABASE_URL && SERVICE_ROLE);

test.describe('Account lifecycle against Supabase', () => {
  test.skip(!HAS_CREDS, 'requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars');

  /** @type {(url: string, key: string, opts?: any) => any} */
  let createClient;
  test.beforeAll(async () => {
    ({ createClient } = await import('@supabase/supabase-js'));
  });

  test('dashboard, export, password change and self-service deletion', async ({ page }) => {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const stamp = Date.now();
    const email = `e2e-account-${stamp}@test.local`;
    const oldPassword = `Pwd-${stamp}-Old!`;
    const newPassword = `Pwd-${stamp}-New!`;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: oldPassword,
      email_confirm: true,
    });
    expect(createError).toBeNull();
    const userId = created?.user?.id;
    expect(userId).toBeTruthy();

    let deleted = false;
    try {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: signedIn, error: signInError } = await userClient.auth.signInWithPassword({
        email,
        password: oldPassword,
      });
      expect(signInError).toBeNull();
      expect(signedIn.session).toBeTruthy();

      await page.addInitScript(({ value }) => {
        window.localStorage.setItem('bg.auth', value);
      }, { value: JSON.stringify(signedIn.session) });
      await page.goto('/konto');

      await expect(page.locator('#signed-in')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('#user-email')).toHaveText(email);
      await expect(page.locator('#account-extras')).toBeVisible();
      await expect(page.locator('.quick-actions a[href="/bulk-barcode-generator"]')).toBeVisible();

      await page.goto('/szablony');
      await page.locator('#btn-new').click();
      await page.locator('#t-name').fill('Warehouse A4');
      await page.locator('#template-form button[type="submit"]').click();
      const originalTemplate = page.locator('#templates-list .template-row').filter({ hasText: 'Warehouse A4' });
      await expect(originalTemplate).toBeVisible();
      await originalTemplate.locator('.btn-duplicate').click();
      await expect(page.locator('#templates-list .template-row')).toHaveCount(2);
      await expect(page.locator('#templates-list')).toContainText('Warehouse A4 (copy)');

      const { data: templates, error: templatesError } = await userClient
        .from('label_templates')
        .select('name, config, logo_path, is_default')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      expect(templatesError).toBeNull();
      expect(templates).toHaveLength(2);
      expect(templates[1].config).toEqual(templates[0].config);
      expect(templates[1].logo_path).toBe(templates[0].logo_path);
      expect(templates[1].is_default).toBe(false);

      await page.goto('/konto');
      await expect(page.locator('#signed-in')).toBeVisible({ timeout: 10_000 });

      const downloadPromise = page.waitForEvent('download');
      await page.locator('#export-account').click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exported = JSON.parse(await readFile(downloadPath, 'utf8'));
      expect(exported.user.email).toBe(email);
      expect(exported.codes).toEqual([]);
      expect(exported.templates).toHaveLength(2);
      expect(exported.printers).toEqual([]);
      expect(exported.jobs).toEqual([]);

      await page.locator('#account-new-password').fill(newPassword);
      await page.locator('#account-password-form button[type="submit"]').click();
      await expect(page.locator('#email-status')).toContainText(/updated|changed|zmienione/i);

      const freshClient = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const oldLogin = await freshClient.auth.signInWithPassword({ email, password: oldPassword });
      expect(oldLogin.error).toBeTruthy();
      const newLogin = await freshClient.auth.signInWithPassword({ email, password: newPassword });
      expect(newLogin.error).toBeNull();

      await page.locator('#delete-account').click();
      await expect(page.locator('#delete-account-dialog')).toBeVisible();
      await page.locator('#delete-account-confirmation').fill('DELETE ACCOUNT');
      await page.locator('#delete-account-form button[type="submit"]').click();
      await page.waitForURL('**/', { timeout: 10_000 });

      const lookup = await admin.auth.admin.getUserById(userId);
      expect(lookup.error).toBeTruthy();
      deleted = true;
    } finally {
      if (!deleted && userId) await admin.auth.admin.deleteUser(userId);
    }
  });
});
