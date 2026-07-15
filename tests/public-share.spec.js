// @ts-check
import { test, expect, request as pwRequest } from '@playwright/test';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_vnawJTY8NEl7tuUoDKJ83Q_QFcOh_Se';
const SHARED_BASE_URL = process.env.SHARED_BASE_URL;

const HAS_CREDS = Boolean(SUPABASE_URL && SERVICE_ROLE);

test.describe('M4 public sharing (toggle + share_slug + SSR /c/:slug)', () => {
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

    test('toggle public assigns slug, copy-link visible, get_shared_code returns row', async ({ page }) => {
        const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        const stamp = Date.now();
        const email = `e2e-share-${stamp}@test.local`;
        const password = `Pwd-${stamp}-S!`;
        const codeValue = `M4-SHARE-${stamp}`;

        const { data: created, error: createErr } = await admin.auth.admin.createUser({
            email, password, email_confirm: true,
        });
        expect(createErr).toBeNull();
        const userId = created?.user?.id;
        expect(userId).toBeTruthy();

        try {
            const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
            const storageKey = 'bg.auth';

            const userClient = createClient(SUPABASE_URL, ANON_KEY, {
                auth: { autoRefreshToken: false, persistSession: false },
            });
            const { data: signIn, error: signErr } = await userClient.auth.signInWithPassword({ email, password });
            expect(signErr).toBeNull();
            const session = signIn.session;
            expect(session).toBeTruthy();

            await page.addInitScript(({ key, value }) => {
                window.localStorage.setItem(key, value);
            }, { key: storageKey, value: JSON.stringify(session) });

            await page.goto('/');
            await page.evaluate(() => document.documentElement.lang = 'en');

            await test.step('save a CODE128 barcode', async () => {
                const typeSelect = page.locator('#barcode-type');
                if (await typeSelect.count()) await typeSelect.selectOption('CODE128');
                await page.locator('#barcode-text').fill(codeValue);
                const generate = page.getByRole('button', { name: /generate|generuj/i });
                if (await generate.count()) await generate.first().click();
                const saveBtn = page.locator('.btn-save-code');
                await expect(saveBtn).toBeVisible({ timeout: 5000 });
                await saveBtn.click();
                await expect(saveBtn).toHaveText(/saved|zapisano/i, { timeout: 5000 });
            });

            await page.goto('/moje-kody.html');
            await expect(page.locator('.code-row')).toHaveCount(1, { timeout: 5000 });

            const row = page.locator('.code-row').first();
            const toggleBtn = row.locator('.btn-toggle-public');
            const copyBtn = row.locator('.btn-copy-link');

            await expect(toggleBtn).toBeVisible();
            await expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
            await expect(copyBtn).toBeHidden();

            await test.step('toggle public', async () => {
                await toggleBtn.click();
                await expect(toggleBtn).toHaveAttribute('aria-pressed', 'true', { timeout: 5000 });
                await expect(copyBtn).toBeVisible();
                await expect(row).toHaveClass(/is-public/);
            });

            const slug = await test.step('fetch slug as the signed-in owner', async () => {
                const { data, error } = await userClient
                    .from('saved_codes')
                    .select('share_slug, is_public')
                    .eq('user_id', userId)
                    .single();
                expect(error).toBeNull();
                expect(data?.is_public).toBe(true);
                expect(data?.share_slug).toMatch(/^[A-Za-z0-9]{12}$/);
                return data.share_slug;
            });

            await test.step('get_shared_code RPC returns whitelisted row', async () => {
                const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
                    auth: { autoRefreshToken: false, persistSession: false },
                });
                const { data, error } = await anonClient.rpc('get_shared_code', { p_slug: slug });
                expect(error).toBeNull();
                const rec = Array.isArray(data) ? data[0] : data;
                expect(rec?.share_slug).toBe(slug);
                expect(rec?.code_type).toBe('CODE128');
                expect(rec?.value).toBe(codeValue);
            });

            await test.step('get_shared_code RPC returns nothing for unknown slug', async () => {
                const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
                    auth: { autoRefreshToken: false, persistSession: false },
                });
                const { data, error } = await anonClient.rpc('get_shared_code', { p_slug: 'nope000000ab' });
                expect(error).toBeNull();
                const rec = Array.isArray(data) ? data[0] : data;
                expect(rec).toBeFalsy();
            });

            await test.step('toggle private hides copy-link and revokes public access', async () => {
                await toggleBtn.click();
                await expect(toggleBtn).toHaveAttribute('aria-pressed', 'false', { timeout: 5000 });
                await expect(copyBtn).toBeHidden();
                const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
                    auth: { autoRefreshToken: false, persistSession: false },
                });
                const { data } = await anonClient.rpc('get_shared_code', { p_slug: slug });
                const rec = Array.isArray(data) ? data[0] : data;
                expect(rec).toBeFalsy();
            });

            if (SHARED_BASE_URL) await test.step('SSR /c/:slug page', async () => {
                await toggleBtn.click();
                await expect(toggleBtn).toHaveAttribute('aria-pressed', 'true', { timeout: 5000 });
                const api = await pwRequest.newContext();
                const res = await api.get(`${SHARED_BASE_URL}/c/${slug}`);
                expect(res.status()).toBe(200);
                const html = await res.text();
                expect(html).toContain('CODE128');
                expect(html).toContain(codeValue);
                expect(res.headers()['x-robots-tag']).toMatch(/noindex/);
                await api.dispose();
            });
        } finally {
            if (userId) await admin.auth.admin.deleteUser(userId);
        }
    });
});
