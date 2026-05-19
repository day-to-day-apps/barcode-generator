# Master Plan — Public Launch `barcode-generator.daytodayapps.com`

> Trackable, persistent checklist. Tick items as they complete.
> Source of truth: this file. Update on each commit.
> Last updated: 2026-05-19

## Status legend
- [ ] not started
- [-] in progress
- [x] done
- [!] blocked — needs user action (instructions inline)

---

## Track A — UX Dashboard polish (DO FIRST)

Goal: logged-in account panel must feel finished before we point the world at it.

### A1. Baseline E2E test of dashboard
- [x] login → save code (CODE128) → list shows it
- [x] bugfix: `.code-rename-form` / `.code-tags-form` respect `[hidden]`
- [x] defensive global `[hidden] { display: none !important }` in `styles.css` (commit `f2d6818`)
- [ ] re-test all 5 protected pages: konto, moje-kody, szablony, drukarki, historia-wydrukow
- [ ] test wydruk.html PDF flow with one template + one printer

### A2. Identify remaining UX gaps
- [ ] take Chrome DevTools screenshot of `/konto.html` after login (current state)
- [ ] inventory missing pieces:
  - [ ] KPI bar (codes used X/10, templates Y/5, printers Z/5, jobs N/20)?
  - [ ] active-state on nav (`aria-current="page"`)?
  - [ ] empty-state CTAs (e.g. "no saved codes yet → save your first")?
  - [ ] quick-action buttons (new code, new job)?
- [ ] decision gate: which gaps are launch-blockers vs nice-to-have?

### A3. Implement chosen UX fixes
- [x] write `dashboard-stats.js` using existing `db-codes.js`/`db-templates.js`/`db-printers.js`/`db-jobs.js` `count*` helpers
- [x] add `.dashboard-tile-kpi` CSS block in `styles.css` (warn/full state colors + dark theme)
- [-] aria-current/active-state nav — deferred (not launch-blocker)
- [-] empty-state CTAs — deferred (not launch-blocker)
- [x] i18n keys reused from existing `account` namespace (`codesUsed/templatesUsed/printersUsed/jobsUsed` + dashboard tile keys)
- [x] **full-sync regenerate** 9 locale `konto.html` from root template (older stubs were structurally divergent — magic-link only). Path rewrites only; text content stays EN, i18n.js translates at runtime via `data-i18n`.

### A4. Test pass
- [x] `npx playwright test tests/m25-account.spec.js tests/a11y.spec.js tests/smoke.spec.js tests/seo.spec.js --project=chromium` → **57/0/0** green
- [x] all 10 `konto.html` BOM-free (first bytes `3C 21 44`)
- [x] no a11y regressions

### A5. Commit Track A
- [-] `feat(account): regenerate 9 locale konto.html with full dashboard + KPI tiles` (in progress this turn)

---

## Track B — Go-live (AFTER Track A green)

### B1. Hostname migration (workers.dev → daytodayapps.com)
Scope: ~150 occurrences across `*.html`, `sitemap.xml`, `robots.txt`, possibly `app.js`.
- [ ] PowerShell bulk-replace with `-Encoding UTF8NoBOM` guard (NOT default `Set-Content`!)
  - source: `barcode-generator.daytodayapps-contact.workers.dev`
  - target: `barcode-generator.daytodayapps.com`
- [ ] BOM/mojibake guard: verify no `EF BB BF` introduced (`[System.IO.File]::ReadAllBytes()` byte check on `<!DOCTYPE`)
- [ ] verify: `Select-String -Pattern 'workers\.dev' -Path *.html, */*.html, *.xml, *.txt, *.js` returns ZERO
- [ ] update `sitemap.xml` `<lastmod>`
- [ ] commit: `feat(launch): point canonical/hreflang/og/jsonld to daytodayapps.com`

### B2. Cache-bust
- [ ] bump `?v=` query string on `styles.css`, `i18n.js`, `app.js`, `analytics.js`, `nav-enhance.js` across all HTML

### B3. Tracking IDs

**B3.1. GA4 Measurement ID** — currently `analytics.js:8` is empty `''`.
- [!] **USER STEP REQUIRED** (see [Manual Step 1](#manual-step-1-ga4-property))
- [ ] paste `G-XXXXXXXXXX` into `analytics.js` `GA4_MEASUREMENT_ID`

**B3.2. AdSense slot IDs** — currently `analytics.js:107-114` has placeholders `0000000001-6`.
- [!] **USER STEP REQUIRED** (see [Manual Step 2](#manual-step-2-adsense-units))
- [ ] paste 6 real slot IDs into `AD_SLOTS` map

### B4. Security headers
- [ ] add CSP to `_headers` (`script-src` must include Googla AdSense/GA domains)
- [ ] add HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- [ ] test that AdSense + GA still load after CSP

### B5. Commit + push pre-launch batch
- [ ] commit B1+B2+B3+B4
- [ ] `git push origin main` → triggers CF Pages deploy
- [ ] verify deploy succeeded on `.workers.dev` (still primary URL at this moment)

### B6. Cloudflare Pages custom domain
- [!] **USER STEP REQUIRED** (see [Manual Step 3](#manual-step-3-cloudflare-custom-domain))
- [ ] wait for SSL provisioning (1-5 min)
- [ ] verify `https://barcode-generator.daytodayapps.com` returns 200

### B7. Workers.dev → custom domain 301
- [ ] add Cloudflare Page Rule OR Worker route: `*.workers.dev/* → 301 → daytodayapps.com/*`
- [ ] verify `curl -I .workers.dev` returns `301 Location: ...daytodayapps.com`

### B8. Supabase Auth redirect URLs
- [!] **USER STEP REQUIRED** (see [Manual Step 4](#manual-step-4-supabase-auth-urls))

### B9. Google Search Console
- [!] **USER STEP REQUIRED** (see [Manual Step 5](#manual-step-5-search-console))

### B10. AdSense site approval
- [!] **USER STEP REQUIRED** (see [Manual Step 6](#manual-step-6-adsense-approval))

### B11. Post-launch smoke
- [ ] hit all 5 protected pages on prod domain — login, save code, save template, save printer, generate job, view history
- [ ] verify GA4 Realtime sees the hit
- [ ] verify AdSense `ads.txt` reachable at `https://barcode-generator.daytodayapps.com/ads.txt`
- [ ] verify `robots.txt` + `sitemap.xml` reachable
- [ ] delete test account `igor.gerc.gercu@gmail.com` from Supabase (after final test)

---

## Manual steps (user-blocked) — detailed instructions

### Manual Step 1: GA4 property

**Why**: bez GA4 brak danych po launchu, AdSense optymalizacja słabsza, brak feedbacku o traffiku.

1. Otwórz https://analytics.google.com/
2. **Admin** (koło zębate, lewy dolny róg) → **Create** → **Property**
3. Property name: `Barcode Generator` · timezone: `Warsaw` · currency: `PLN`
4. Industry: `Internet & Telecom`, Size: `Small`
5. Business objectives: `Examine user behavior`, `Generate leads`
6. **Create stream** → **Web** · URL: `https://barcode-generator.daytodayapps.com` · Stream name: `Production`
7. Skopiuj **Measurement ID** (format `G-XXXXXXXXXX`) i wklej tutaj jako odpowiedź.

### Manual Step 2: AdSense units

**Why**: bez slot IDs reklamy się nie renderują nawet po approval'u.

1. https://www.google.com/adsense/ → Twoje konto (Pub ID `ca-pub-2527047257613855`)
2. **Ads** → **By ad unit** → **Create new ad unit** → **Display ads**
3. Utwórz **6 jednostek** o nazwach (dokładnie tak):
   - `sidebar-left` (responsive, vertical/auto)
   - `sidebar-right` (responsive, vertical/auto)
   - `top-banner` (responsive, horizontal)
   - `mid-content` (rectangle 300×250)
   - `content-2` (rectangle 300×250)
   - `sticky-bottom` (responsive, horizontal)
4. Dla każdej skopiuj **data-ad-slot** (10-cyfrowa liczba) — wyślij listę 6 wartości jako odpowiedź.
5. **Alternatywa szybsza**: zostawić auto-ads ON i pominąć ten krok — wtedy pomiń też B3.2 (powiedz mi).

### Manual Step 3: Cloudflare Custom Domain

1. https://dash.cloudflare.com/ → **Workers & Pages** → projekt `barcode-generator` (lub jak nazwany)
2. **Custom domains** → **Set up a custom domain**
3. Wpisz: `barcode-generator.daytodayapps.com`
4. Cloudflare wykryje że domena jest w Twoim koncie i sam doda CNAME — **Activate**.
5. Czekaj 1-5 min na "Active" (SSL provisioning).
6. Otwórz `https://barcode-generator.daytodayapps.com` w przeglądarce — powinna być Twoja strona.
7. Powiedz mi gdy działa.

### Manual Step 4: Supabase Auth URLs

**Why**: bez tego linki w mailach potwierdzających i reset hasła wracają na workers.dev, użytkownik dostaje 404 / loopback.

1. https://supabase.com/dashboard/project/aoqxznukwbdgrggxloou/auth/url-configuration
2. **Site URL**: `https://barcode-generator.daytodayapps.com`
3. **Redirect URLs** — **Add URL** dla każdego z 20:

   ```
   https://barcode-generator.daytodayapps.com/konto.html
   https://barcode-generator.daytodayapps.com/reset-hasla.html
   https://barcode-generator.daytodayapps.com/pl/konto.html
   https://barcode-generator.daytodayapps.com/pl/reset-hasla.html
   https://barcode-generator.daytodayapps.com/de/konto.html
   https://barcode-generator.daytodayapps.com/de/reset-hasla.html
   https://barcode-generator.daytodayapps.com/fr/konto.html
   https://barcode-generator.daytodayapps.com/fr/reset-hasla.html
   https://barcode-generator.daytodayapps.com/es/konto.html
   https://barcode-generator.daytodayapps.com/es/reset-hasla.html
   https://barcode-generator.daytodayapps.com/it/konto.html
   https://barcode-generator.daytodayapps.com/it/reset-hasla.html
   https://barcode-generator.daytodayapps.com/pt/konto.html
   https://barcode-generator.daytodayapps.com/pt/reset-hasla.html
   https://barcode-generator.daytodayapps.com/nl/konto.html
   https://barcode-generator.daytodayapps.com/nl/reset-hasla.html
   https://barcode-generator.daytodayapps.com/cs/konto.html
   https://barcode-generator.daytodayapps.com/cs/reset-hasla.html
   https://barcode-generator.daytodayapps.com/uk/konto.html
   https://barcode-generator.daytodayapps.com/uk/reset-hasla.html
   ```

4. **Save**. Powiedz mi gdy gotowe.

### Manual Step 5: Search Console

1. https://search.google.com/search-console
2. **Add property** → **Domain** → `daytodayapps.com` (verify via DNS TXT — Cloudflare doda automatycznie jeśli tu trzymasz domenę)
3. Po weryfikacji → **Sitemaps** → submit `https://barcode-generator.daytodayapps.com/sitemap.xml`
4. **URL Inspection** → wklej `https://barcode-generator.daytodayapps.com/` → **Request Indexing** (powtórz dla `/pl/`, `/en/` (root), `/decoder.html`)
5. Powiedz mi gdy zrobione.

### Manual Step 6: AdSense Site Approval

1. https://www.google.com/adsense/ → **Sites** → **Add site**
2. URL: `barcode-generator.daytodayapps.com`
3. **Request review** — Google sprawdzi 1-14 dni czy strona spełnia polityki.
4. W międzyczasie reklamy mogą nie wyświetlać się na nowej domenie — to normalne.

---

## Risk register
- ⚠️ Encoding: każdy PowerShell pass na HTML MUSI używać `[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))` — domyślny `Set-Content -Encoding UTF8` w PS 5.1 dodaje BOM.
- ⚠️ CSP: zbyt restrykcyjne wyłączy AdSense; testować po deployu.
- ⚠️ Workers.dev redirect: bez tego Google widzi duplikaty contentu na 2 domenach.
- ⚠️ Cache-busting: jeśli nie zbiję wersji `?v=`, użytkownicy z cache zobaczą stare canonical → indeks workers.dev.

## Files I expect to NOT touch (per copilot-instructions.md)
- nie zmieniam stacku na framework
- nie dodaję npm bez prośby (tests/playwright już jest)
- nie usuwam `_headers`, `_redirects`, `robots.txt`, `sitemap.xml` — tylko edytuję
