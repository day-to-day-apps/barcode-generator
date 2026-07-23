// @ts-check
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SDK_URL = /cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\/\+esm/;

test('dashboard ignores delayed data from a previous account session', async ({ page }) => {
  await page.route(SDK_URL, (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    headers: { 'access-control-allow-origin': '*' },
    body: `
      let listener = null;
      let activeSession = {
        access_token: 'session-a',
        user: { id: '00000000-0000-4000-8000-00000000000a', email: 'account-a@example.com' }
      };
      const wait = (value, delay) => new Promise((resolve) => setTimeout(() => resolve(value), delay));
      const snapshot = () => activeSession?.user?.id?.endsWith('a') ? 'a' : 'b';

      export function createClient() {
        window.__emitAccountSession = (session) => {
          activeSession = session;
          listener?.(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
        };
        return {
          auth: {
            getSession: async () => ({ data: { session: activeSession }, error: null }),
            onAuthStateChange(callback) {
              listener = callback;
              window.__accountListenerReady = true;
              return { data: { subscription: { unsubscribe() {} } } };
            },
            signOut: async () => ({ error: null })
          },
          from(table) {
            return {
              select(_columns, options) {
                const account = snapshot();
                if (options?.head) {
                  const count = account === 'a' ? 9 : 0;
                  return wait({ count, error: null }, account === 'a' ? 250 : 5);
                }
                const data = table === 'saved_codes' && account === 'a'
                  ? [{
                      id: 'code-a',
                      name: 'Private product from account A',
                      value: 'ACCOUNT-A-SECRET',
                      code_type: 'CODE128',
                      created_at: '2026-07-01T00:00:00Z',
                      updated_at: '2026-07-01T00:00:00Z'
                    }]
                  : [];
                const query = {
                  order() { return query; },
                  then(resolve, reject) {
                    return wait({ data, error: null }, account === 'a' ? 250 : 5).then(resolve, reject);
                  }
                };
                return query;
              }
            };
          }
        };
      }
    `,
  }));

  await page.goto('/konto');
  await expect.poll(() => page.evaluate(() =>
    typeof window.__emitAccountSession === 'function' && window.__accountListenerReady)).toBe(true);

  await page.evaluate(() => window.__emitAccountSession({
    access_token: 'session-b',
    user: { id: '00000000-0000-4000-8000-00000000000b', email: 'account-b@example.com' },
  }));

  await expect(page.locator('#user-email')).toHaveText('account-b@example.com');
  await expect(page.locator('#recent-codes')).toContainText('You have no saved codes yet.');
  await expect(page.locator('#recent-codes')).not.toContainText('Private product from account A');
  await expect(page.locator('[data-tile-kpi="codes"]')).toContainText('0');

  await page.waitForTimeout(350);
  await expect(page.locator('#user-email')).toHaveText('account-b@example.com');
  await expect(page.locator('#recent-codes')).not.toContainText('Private product from account A');
  await expect(page.locator('[data-tile-kpi="codes"]')).toContainText('0');

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  const results = await new AxeBuilder({ page })
    .include('#signed-in')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = results.violations.filter((violation) =>
    violation.impact === 'critical' || violation.impact === 'serious');
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);

  await page.evaluate(() => window.__emitAccountSession(null));
  await expect(page.locator('#signed-out')).toBeVisible();
  await expect(page.locator('#signed-in')).toBeHidden();
  await expect(page.locator('#recent-codes')).toContainText('You have no saved codes yet.');
  await expect(page.locator('[data-tile-kpi="codes"]')).toBeHidden();
});

test('dashboard counters ignore results after the session becomes stale', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    document.body.innerHTML = `
      <span data-tile-kpi="codes" hidden></span>
      <span data-tile-kpi="templates" hidden></span>
      <span data-tile-kpi="printers" hidden></span>
      <span data-tile-kpi="jobs" hidden></span>
    `;
    const { loadDashboardStats } = await import('/dashboard-stats.js');
    let current = true;
    const delayedCount = () => new Promise((resolve) =>
      setTimeout(() => resolve({ count: 7, error: null }), 30));
    const pending = loadDashboardStats({
      helpers: {
        countCodes: delayedCount,
        countTemplates: delayedCount,
        countPrinters: delayedCount,
        countJobs: delayedCount,
      },
      limits: {
        FREE_CODES_LIMIT: 10,
        FREE_TEMPLATES_LIMIT: 5,
        FREE_PRINTERS_LIMIT: 5,
        FREE_JOBS_LIMIT: 20,
      },
      i18n: {},
      isCurrent: () => current,
    });
    current = false;
    await pending;
    return Array.from(document.querySelectorAll('[data-tile-kpi]')).map((element) => ({
      hidden: element.hidden,
      text: element.textContent,
    }));
  });

  expect(result).toEqual([
    { hidden: true, text: '' },
    { hidden: true, text: '' },
    { hidden: true, text: '' },
    { hidden: true, text: '' },
  ]);
});
