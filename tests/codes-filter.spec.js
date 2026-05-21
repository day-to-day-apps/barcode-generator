// @ts-check
// M5 smoke: search + type filter UI exists on /moje-kody.html with i18n labels.
// Deeper functional tests would require a real Supabase session — skipped here.
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(/(pagead2\.googlesyndication\.com|googletagmanager\.com|google-analytics\.com)/, (route) =>
    route.fulfill({ status: 200, body: '', contentType: 'application/javascript' }),
  );
});

test.describe('M5 — /moje-kody.html search & filter UI', () => {
  test('filter bar markup is present in DOM', async ({ page }) => {
    await page.goto('/moje-kody.html');
    await expect(page.locator('#filter-bar')).toHaveCount(1);
    await expect(page.locator('#filter-search')).toHaveCount(1);
    await expect(page.locator('#filter-type')).toHaveCount(1);
    await expect(page.locator('#filter-clear')).toHaveCount(1);
    await expect(page.locator('#filter-count')).toHaveCount(1);
    await expect(page.locator('#no-matches')).toHaveCount(1);
    await expect(page.locator('#filter-search')).toHaveAttribute('type', 'search');
  });

  test('filter labels are translated via i18n', async ({ page }) => {
    await page.goto('/moje-kody.html');
    await expect(page.locator('label[for="filter-search"]')).toHaveText(/Szukaj|Search|Suche|Rechercher|Buscar|Cerca|Pesquisar|Zoeken|Hledat|Пошук/);
    await expect(page.locator('label[for="filter-type"]')).not.toBeEmpty();
    const placeholder = await page.locator('#filter-search').getAttribute('placeholder');
    expect(placeholder && placeholder.length).toBeGreaterThan(0);
  });

  test('filter UI is initially hidden (no codes loaded without auth)', async ({ page }) => {
    await page.goto('/moje-kody.html');
    await expect(page.locator('#filter-bar')).toBeHidden();
    await expect(page.locator('#no-matches')).toBeHidden();
  });

  test('filter logic — search & type filter on injected rows', async ({ page }) => {
    await page.goto('/moje-kody.html');
    const result = await page.evaluate(() => {
      const list = document.getElementById('codes-list');
      const filterBar = document.getElementById('filter-bar');
      const search = /** @type {HTMLInputElement} */ (document.getElementById('filter-search'));
      const select = /** @type {HTMLSelectElement} */ (document.getElementById('filter-type'));
      const clearBtn = /** @type {HTMLButtonElement} */ (document.getElementById('filter-clear'));
      const noMatches = document.getElementById('no-matches');
      if (!list || !filterBar || !search || !select || !clearBtn || !noMatches) return { ok: false };

      const fakeRows = [
        { id: 'a', name: 'Apple bottle', value: '1234', code_type: 'CODE128', tags: ['kitchen'] },
        { id: 'b', name: 'Banana', value: '5678', code_type: 'EAN13', tags: ['fruit'] },
        { id: 'c', name: 'Cherry', value: '9012', code_type: 'CODE128', tags: ['fruit', 'red'] },
      ];
      list.innerHTML = '';
      for (const r of fakeRows) {
        const li = document.createElement('li');
        li.className = 'code-row';
        li.dataset.id = r.id;
        li._row = r;
        list.appendChild(li);
      }
      list.hidden = false;
      filterBar.hidden = false;

      // populate select manually (mirror rebuildTypeOptions output)
      select.innerHTML = '';
      for (const t of ['', 'CODE128', 'EAN13']) {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t || 'All';
        select.appendChild(opt);
      }

      function countVisible() {
        return [...list.querySelectorAll('.code-row')].filter((li) => !li.hidden).length;
      }

      // search by name
      search.value = 'banana';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      const afterSearch = countVisible();

      // clear, then filter by type
      clearBtn.click();
      const afterClear = countVisible();

      select.value = 'CODE128';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      const afterType = countVisible();

      // type with no matches
      search.value = 'zzz-no-match';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      const afterNoMatch = countVisible();
      const noMatchVisible = !noMatches.hidden;

      return { ok: true, afterSearch, afterClear, afterType, afterNoMatch, noMatchVisible };
    });

    expect(result.ok).toBe(true);
    expect(result.afterSearch).toBe(1);
    expect(result.afterClear).toBe(3);
    expect(result.afterType).toBe(2);
    expect(result.afterNoMatch).toBe(0);
    expect(result.noMatchVisible).toBe(true);
  });
});
