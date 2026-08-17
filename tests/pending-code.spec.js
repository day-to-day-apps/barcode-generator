// @ts-check
import { test, expect } from '@playwright/test';

const SDK_URL = /\/vendor\/supabase\.min\.js/;

test('account consumes an anonymous pending barcode exactly once', async ({ page, context }) => {
  await page.route(SDK_URL, (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `
      const session = {access_token:'pending-session',user:{id:'00000000-0000-4000-8000-000000000777',email:'pending@example.com'}};
      const inserted = [];
      window.__pendingInserts = inserted;
      export function createClient() {
        return {
          auth: {
            getSession: async () => ({data:{session},error:null}),
            onAuthStateChange() { return {data:{subscription:{unsubscribe(){}}}}; },
            signOut: async () => ({error:null}),
            updateUser: async () => ({error:null}),
            resend: async () => ({error:null})
          },
          from() {
            return {
              select(_columns, options) {
                if (options?.head) return Promise.resolve({count:inserted.length,error:null});
                return {order:async()=>({data:inserted.map((item,index)=>({...item,id:'saved-'+index,created_at:new Date().toISOString(),updated_at:new Date().toISOString()})),error:null})};
              },
              insert(payload) {
                inserted.push(payload);
                const query = {select(){return query},single:async()=>({data:{...payload,id:'saved-pending'},error:null})};
                return query;
              }
            };
          }
        };
      }
    `,
  }));
  const pending = encodeURIComponent(JSON.stringify({
    code_type: 'CODE128',
    value: 'FIRST-SAVED-CODE-2026',
    name: 'First saved code',
    settings: { 'bar-width': '3', 'line-color': '#112233' },
    ts: Date.now(),
  }));
  await context.addCookies([{ name: 'bc_pending_code', value: pending, url: 'http://127.0.0.1:8765/' }]);

  await page.goto('/konto');
  await expect(page.locator('#signed-in')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__pendingInserts?.length || 0)).toBe(1);
  await expect(page.locator('#recent-codes')).toContainText('First saved code');
  await expect(page.locator('#email-status')).toContainText('saved to your account');
  expect((await context.cookies()).some((cookie) => cookie.name === 'bc_pending_code')).toBe(false);

  await page.reload();
  await expect(page.locator('#signed-in')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__pendingInserts?.length || 0)).toBe(0);
});
