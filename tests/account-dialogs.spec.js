// @ts-check
import { test, expect } from '@playwright/test';

const ACCOUNT_PAGES = [
  '/moje-kody.html',
  '/szablony.html',
  '/drukarki.html',
  '/wydruk.html',
  '/historia-wydrukow.html',
];

test('account workflows do not use blocking browser dialogs', async ({ request }) => {
  for (const path of ACCOUNT_PAGES) {
    const html = await (await request.get(path)).text();
    expect(html, path).not.toMatch(/\b(?:confirm|alert|prompt)\s*\(/);
  }
});

test('shared confirmation dialog resolves keyboard-accessible actions', async ({ page }) => {
  await page.goto('/konto.html');
  await page.evaluate(async () => {
    const { confirmAction } = await import('/account-dialogs.js');
    window.__dialogResult = null;
    confirmAction({
      title: 'Delete template',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    }).then((result) => { window.__dialogResult = result; });
  });

  const dialog = page.locator('dialog[open]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-labelledby', /account-dialog-title-/);
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__dialogResult)).toBe(true);
});

test('manual copy fallback exposes a selected read-only value', async ({ page }) => {
  await page.goto('/konto.html');
  await page.evaluate(async () => {
    const { showTextValue } = await import('/account-dialogs.js');
    showTextValue({
      title: 'Copy link',
      message: 'Copy this link manually.',
      value: 'https://example.test/c/example',
      closeLabel: 'Close',
    });
  });
  const input = page.locator('dialog[open] input[readonly]');
  await expect(input).toHaveValue('https://example.test/c/example');
  await expect(input).toBeFocused();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
});
