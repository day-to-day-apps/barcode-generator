// @ts-check
// Phase 4 E2E agent — automated UX journey for konto.html redesign.
// Each step writes a screenshot to _devshots/phase4/NN-name.png so the
// developer can review the visual trail.
//
// Run:
//   npx playwright test tests/phase4-agent.spec.js --project=chromium --workers=1 --reporter=list
//
// Override credentials with env vars if needed:
//   $env:PHASE4_EMAIL = 'someone@example.com'
//   $env:PHASE4_PASSWORD = '...'
//
// Credentials must be supplied through environment variables. Never add a
// fallback password to this file.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const SHOTS_DIR = path.join('_devshots', 'phase4');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const EMAIL = process.env.PHASE4_EMAIL;
const PASSWORD = process.env.PHASE4_PASSWORD;
const HAS_CREDENTIALS = Boolean(EMAIL && PASSWORD);

let stepCounter = 0;
async function shot(page, name) {
  stepCounter += 1;
  const id = String(stepCounter).padStart(2, '0');
  const file = path.join(SHOTS_DIR, `${id}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  // eslint-disable-next-line no-console
  console.log(`  shot: ${file}`);
}

test.describe.configure({ mode: 'serial' });

test.describe('Phase 4 — konto.html E2E journey', () => {
  test.skip(!HAS_CREDENTIALS, 'requires PHASE4_EMAIL and PHASE4_PASSWORD environment variables');

  test.beforeEach(async ({ context }) => {
    await context.route(
      /(pagead2\.googlesyndication\.com|googletagmanager\.com|google-analytics\.com|googleads\.g\.doubleclick\.net|adservice\.google\.com)/,
      (route) => route.fulfill({ status: 200, body: '', contentType: 'application/javascript' }),
    );
  });

  test('full journey: signed-out → toggles → sign-in → dashboard → nav → sign-out', async ({ page }) => {
    test.setTimeout(180_000);
    const consoleErrors = [];
    const badResponses = [];
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message} | stack: ${(err.stack || '').split('\n').slice(0, 3).join(' >> ')}`));
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(`console.error: ${msg.text()}`); });
    page.on('response', (res) => {
      const s = res.status();
      if (s >= 400 && !/favicon|pagead2|googletag|google-analytics|doubleclick|adservice/i.test(res.url())) {
        badResponses.push(`${s} ${res.url()}`);
      }
    });

    await test.step('1. Open konto.html (signed-out)', async () => {
      await page.goto('/konto.html');
      await expect(page.locator('#signed-out')).toBeVisible();
      await expect(page.locator('#signed-in')).toBeHidden();
      await expect(page.locator('#login-form')).toBeVisible();
      await shot(page, 'signed-out-initial');
    });

    await test.step('2. Login password toggle: show → hide', async () => {
      const input = page.locator('#login-password');
      const toggle = page.locator('.password-toggle[data-target="login-password"]');
      await input.fill('hello-world-12345');
      await expect(input).toHaveAttribute('type', 'password');
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await shot(page, 'login-password-masked');

      await toggle.click();
      await expect(input).toHaveAttribute('type', 'text');
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await expect(toggle.locator('.eye-open')).toBeHidden();
      await expect(toggle.locator('.eye-closed')).toBeVisible();
      await shot(page, 'login-password-revealed');

      await toggle.click();
      await expect(input).toHaveAttribute('type', 'password');
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await expect(toggle.locator('.eye-open')).toBeVisible();
      await expect(toggle.locator('.eye-closed')).toBeHidden();
      await shot(page, 'login-password-remasked');

      await input.fill('');
    });

    await test.step('3. Switch to Register tab — toggles on both password fields', async () => {
      await page.locator('#tab-register').click();
      await expect(page.locator('#panel-register')).toBeVisible();
      await expect(page.locator('#panel-login')).toBeHidden();
      await shot(page, 'register-tab-open');

      const pwd = page.locator('#register-password');
      const confirm = page.locator('#register-password-confirm');
      const togglePwd = page.locator('.password-toggle[data-target="register-password"]');
      const toggleConfirm = page.locator('.password-toggle[data-target="register-password-confirm"]');

      await pwd.fill('SuperSecret123');
      await confirm.fill('SuperSecret123');
      await togglePwd.click();
      await expect(pwd).toHaveAttribute('type', 'text');
      await expect(confirm).toHaveAttribute('type', 'password');
      await shot(page, 'register-pwd-revealed-confirm-masked');

      await toggleConfirm.click();
      await expect(confirm).toHaveAttribute('type', 'text');
      await shot(page, 'register-both-revealed');

      await togglePwd.click();
      await toggleConfirm.click();
      await expect(pwd).toHaveAttribute('type', 'password');
      await expect(confirm).toHaveAttribute('type', 'password');
    });

    await test.step('4. Register mismatch validation (no real signup)', async () => {
      await page.locator('#register-email').fill('mismatch-test@example.com');
      await page.locator('#register-password').fill('PasswordOne123');
      await page.locator('#register-password-confirm').fill('DifferentTwo456');
      await page.locator('#register-terms').check();
      await page.locator('#register-submit').click();
      const status = page.locator('#email-status');
      await expect(status).toHaveClass(/form-error/);
      await expect(status).not.toHaveText('');
      await shot(page, 'register-mismatch-error');
    });

    await test.step('5. Switch to Reset tab', async () => {
      await page.locator('#tab-reset').click();
      await expect(page.locator('#panel-reset')).toBeVisible();
      await expect(page.locator('#reset-email')).toBeVisible();
      await shot(page, 'reset-tab-open');
    });

    await test.step('6. Back to Sign-in tab → real Supabase login', async () => {
      await page.locator('#tab-login').click();
      await expect(page.locator('#panel-login')).toBeVisible();
      await page.locator('#login-email').fill(EMAIL);
      await page.locator('#login-password').fill(PASSWORD);
      await shot(page, 'login-form-filled');

      await page.locator('#login-submit').click();
      await expect(page.locator('#signed-in')).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('#signed-out')).toBeHidden();
    });

    await test.step('7. Dashboard renders with email + 4 tiles', async () => {
      await expect(page.locator('#user-email')).toHaveText(EMAIL);
      const tiles = page.locator('.dashboard-tile');
      await expect(tiles).toHaveCount(4);
      await expect(tiles.nth(0)).toHaveAttribute('href', 'moje-kody.html');
      await expect(tiles.nth(1)).toHaveAttribute('href', 'szablony.html');
      await expect(tiles.nth(2)).toHaveAttribute('href', 'drukarki.html');
      await expect(tiles.nth(3)).toHaveAttribute('href', 'historia-wydrukow.html');
      await expect(page.locator('#signout-btn')).toBeVisible();
      await shot(page, 'dashboard-desktop');

      await page.setViewportSize({ width: 390, height: 844 });
      await shot(page, 'dashboard-mobile');
      await page.setViewportSize({ width: 1280, height: 800 });
    });

    await test.step('8. Tile navigation — each tile loads its target (still authenticated)', async () => {
      const targets = [
        { href: 'moje-kody.html', shot: 'nav-moje-kody' },
        { href: 'szablony.html', shot: 'nav-szablony' },
        { href: 'drukarki.html', shot: 'nav-drukarki' },
        { href: 'historia-wydrukow.html', shot: 'nav-historia' },
      ];
      for (const t of targets) {
        await page.goto('/konto.html');
        await expect(page.locator('#signed-in')).toBeVisible({ timeout: 10_000 });
        await page.locator(`.dashboard-tile[href="${t.href}"]`).click();
        await page.waitForURL(new RegExp(t.href.replace('.', '\\.') + '$'));
        await page.waitForLoadState('networkidle').catch(() => {});
        await shot(page, t.shot);
      }
    });

    await test.step('9. wydruk.html?id=… prefill smoke (if a job exists)', async () => {
      await page.goto('/historia-wydrukow.html');
      await page.waitForLoadState('networkidle').catch(() => {});
      await shot(page, 'historia-list');
      const editLink = page.locator('a[href^="wydruk.html?id="]').first();
      const has = await editLink.count();
      if (has > 0) {
        const href = await editLink.getAttribute('href');
        await editLink.click();
        await page.waitForURL(/wydruk\.html\?id=/);
        await page.waitForLoadState('networkidle').catch(() => {});
        await shot(page, 'wydruk-prefilled');
        const nameField = page.locator('#job-name, input[name="name"]').first();
        if (await nameField.count()) {
          const v = await nameField.inputValue();
          expect(v.length).toBeGreaterThan(0);
        }
        console.log(`  prefill source: ${href}`);
      } else {
        console.log('  no existing print jobs — skipping prefill check');
      }
    });

    await test.step('10. Sign out cleanly', async () => {
      await page.goto('/konto.html');
      await expect(page.locator('#signed-in')).toBeVisible({ timeout: 10_000 });
      await page.locator('#signout-btn').click();
      await expect(page.locator('#signed-out')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('#signed-in')).toBeHidden();
      await shot(page, 'after-signout');
    });

    await test.step('11. Console health check', async () => {
      const real = consoleErrors.filter((e) => !/favicon|adsbygoogle|gtag|analytics|Failed to load resource/i.test(e));
      if (real.length) {
        console.log('  console errors:\n   - ' + real.join('\n   - '));
      }
      if (badResponses.length) {
        console.log('  bad responses:\n   - ' + badResponses.join('\n   - '));
      }
      expect(real.length, `Console errors:\n${real.join('\n')}`).toBeLessThan(5);
    });
  });

  test('i18n switch — EN locale renders password aria-label', async ({ page }) => {
    await page.goto('/konto.html?lang=en');
    const toggle = page.locator('.password-toggle[data-target="login-password"]').first();
    await page.waitForFunction(() => {
      const btn = document.querySelector('.password-toggle[data-target="login-password"]');
      return btn && /show|hide/i.test(btn.getAttribute('aria-label') || '');
    }, null, { timeout: 5000 }).catch(() => {});
    const label = await toggle.getAttribute('aria-label');
    expect(label).toMatch(/show password/i);
    await shot(page, 'i18n-en-signed-out');
  });
});
