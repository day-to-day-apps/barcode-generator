// @ts-check
import { test, expect } from '@playwright/test';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_vnawJTY8NEl7tuUoDKJ83Q_QFcOh_Se';
const HAS_CREDS = Boolean(SUPABASE_URL && SERVICE_ROLE);

test.describe('Bulk generator account integration', () => {
  test.skip(!HAS_CREDS, 'requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars');

  /** @type {(url: string, key: string, opts?: any) => any} */
  let createClient;
  test.beforeAll(async () => {
    ({ createClient } = await import('@supabase/supabase-js'));
  });

  test('imports saved codes, saves a job and immediately reloads it as a copy', async ({ page }) => {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const stamp = Date.now();
    const email = `e2e-bulk-${stamp}@test.local`;
    const password = `Pwd-${stamp}-Bulk!`;
    const jobName = `Warehouse labels ${stamp}`;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(createError).toBeNull();
    const userId = created?.user?.id;
    expect(userId).toBeTruthy();

    try {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: signedIn, error: signInError } = await userClient.auth.signInWithPassword({ email, password });
      expect(signInError).toBeNull();
      expect(signedIn.session).toBeTruthy();

      const { error: insertError } = await userClient.from('saved_codes').insert([
        { user_id: userId, code_type: 'CODE128', value: `BIN-${stamp}`, name: 'Bin location', settings: {} },
        { user_id: userId, code_type: 'EAN13', value: '5901234123457', name: 'Retail item', settings: {} },
      ]);
      expect(insertError).toBeNull();

      await page.addInitScript(({ value }) => {
        window.localStorage.setItem('bg.auth', value);
      }, { value: JSON.stringify(signedIn.session) });

      await page.goto('/moje-kody.html');
      const catalogRow = page.locator('#codes-list .code-row').filter({ hasText: `BIN-${stamp}` });
      await expect(catalogRow).toBeVisible();
      await catalogRow.locator('.row-checkbox').check();
      await expect(page.locator('#btn-create-job')).toBeEnabled();
      await page.locator('#btn-create-job').click();
      await expect(page).toHaveURL(/\/bulk-barcode-generator\?codes=/);
      await expect(page.locator('#bulk-rows tr')).toHaveCount(1);
      await expect(page.locator('#bulk-rows [data-field="value"]')).toHaveValue(`BIN-${stamp}`);
      await expect(page.locator('#bulk-status')).toHaveText('Imported saved barcodes: 1.');

      await page.locator('#clear-rows').click();
      await page.goto('/bulk-barcode-generator');
      await expect(page.locator('#account-mode')).toContainText('Signed in', { timeout: 10_000 });

      await page.locator('#import-saved').click();
      await expect(page.locator('#saved-codes-dialog')).toBeVisible();
      await page.locator('#saved-codes-select-all').check();
      await page.locator('#saved-codes-add').click();
      await expect(page.locator('#bulk-rows tr')).toHaveCount(2);
      await expect(page.locator('#bulk-status')).toHaveText('Imported saved barcodes: 2.');

      await page.locator('#job-name').fill(jobName);
      await page.locator('#page-preset').selectOption('avery-l7163-a4');
      await page.locator('#save-job').click();
      await expect(page.locator('#bulk-status')).toHaveText('Print job and label format saved.', { timeout: 10_000 });
      await expect(page.locator('#saved-job-select')).toHaveValue(/.+/);
      await expect(page.locator('#saved-job-select option:checked')).toHaveText(jobName);

      const { data: jobs, error: jobsError } = await userClient
        .from('print_jobs')
        .select('id, name, notes, print_job_items(value, code_type, position)')
        .eq('user_id', userId)
        .single();
      expect(jobsError).toBeNull();
      expect(jobs.name).toBe(jobName);
      expect(jobs.notes).toBe('barcode-bulk:v1:{"preset":"avery-l7163-a4"}');
      expect(jobs.print_job_items).toHaveLength(2);

      await page.goto('/historia-wydrukow.html');
      const historyRow = page.locator('#jobs-list .code-row').filter({ hasText: jobName });
      await expect(historyRow).toBeVisible();
      await expect(historyRow.locator('.template-meta')).toContainText('2 items');
      await expect(historyRow.locator('.template-meta')).toContainText('2 labels');
      await expect(historyRow.locator('.btn-copy')).toHaveAttribute('href', `/bulk-barcode-generator?job=${jobs.id}`);

      await historyRow.locator('.btn-copy').click();
      await expect(page).toHaveURL(new RegExp(`/bulk-barcode-generator\\?job=${jobs.id}$`));
      await expect(page.locator('#bulk-rows tr')).toHaveCount(2);
      await expect(page.locator('#job-name')).toHaveValue(`${jobName} - copy`);
      await expect(page.locator('#page-preset')).toHaveValue('avery-l7163-a4');

      await page.locator('#clear-rows').click();
      await expect(page.locator('#bulk-rows tr')).toHaveCount(0);
      await page.locator('#page-preset').selectOption('thermal-100x150');
      await page.locator('#load-job').click();
      await expect(page.locator('#bulk-rows tr')).toHaveCount(2);
      await expect(page.locator('#job-name')).toHaveValue(`${jobName} - copy`);
      await expect(page.locator('#page-preset')).toHaveValue('avery-l7163-a4');
      await expect(page.locator('#bulk-status')).toHaveText('Job and label format loaded as a copy.');
    } finally {
      if (userId) await admin.auth.admin.deleteUser(userId);
    }
  });
});
