# AGENTS.md — mapa nawigacyjna dla AI

> Cel: jeden plik, który pozwala agentowi w 30 sekund znaleźć dowolny fragment kodu bez wielokrotnego grep/read.
> Aktualizuj przy każdej większej zmianie struktury (nowy plik JS, nowa sekcja CSS, nowy locale).

---

## Aktualny status (sprint)

- **HEAD = `origin/main` = `0b69ec9`** (w sync, nic nieopublikowanego).
- **Ostatnie commity:**
  - `0b69ec9` redirect: force canonical domain via Cloudflare Bulk Redirects
  - `b75a631` fix(i18n): UTF-8 we flagach i strzałkach (recovery z mojibake)
  - `314f2bd` fix(ui): UTF-8 HTML + naprawa tiling strzałki w `<select>` (dark/focus)
  - `0d8499c` fix(lang): pozycjonowanie dropdownu języków + bump styles.css cache
  - `1b0535e` test: M5 codes filter UI smoke + functional
  - `846b8bf` feat(ui): M5 search/filter on `/moje-kody.html` (10 langs)
  - `59c31dd` test: M4 public share e2e
  - `22131d5` feat(pages-fn): M4 SSR `/c/[slug]` shared code preview
  - `af5161e` feat(ui): M4 public sharing toggle + copy link (10 langs)
  - `00a0017` feat(db): M4 public sharing — `is_public` + `share_slug` + `get_shared_code` RPC
  - `cb51c40` feat(db): drop dead `subscriptions` table and `subscription_status` enum
- **Wykonane w tej sesji (po `b32a501`):** A3 (drop subscriptions), M4 (public sharing end-to-end), M5 (search/filter), lang dropdown + UTF-8 recovery, canonical domain enforcement.
- **Aktywny plan rozwoju:** [ROADMAP.md](ROADMAP.md). Następne otwarte: D2 SEO content per typ kodu (5 typów × 10 lokali), E (Lighthouse CI ≥95, PWA opcjonalnie), osobna `/qr/` strona razem z D2. Stripe/Pro = SKIPPED (decyzja MVP, monetyzacja przez AdSense).

---

## TL;DR — co to za projekt

Komercyjny generator kodów kreskowych (Cloudflare Pages, vanilla JS, 10 języków).
Stack: HTML5 + ES modules + CSS3. Backend: Supabase (auth + Postgres + RLS). Bez bundlera, bez frameworka.
Powiązane repo: <https://github.com/day-to-day-apps/barcode-generator> (branch `main`, auto-deploy).
Druga wersja w workspace: `Generator kodów kreskowych/` (firmowa, 3 języki, bez SEO/ads) — **nie mieszać**.

---

## Drzewo plików (root = `wersja zarobkowa/`)

### HTML — strony publiczne
| Plik | Rola | Locale subdirs |
|---|---|---|
| [index.html](index.html) | Główny generator + popular gallery + FAQ/HowTo | tak |
| [decoder.html](decoder.html) | Skaner kamerą + import obrazu + batch | tak |
| [konto.html](konto.html) | Login/register/reset + dashboard signed-in | tak |
| [reset-hasla.html](reset-hasla.html) | Recovery flow (token z maila) | nie |
| [moje-kody.html](moje-kody.html) | Biblioteka zapisanych kodów (RLS) | tak (9 lang) |
| [szablony.html](szablony.html) | CRUD szablonów etykiet | tak |
| [drukarki.html](drukarki.html) | CRUD profili drukarek + presety | tak |
| [wydruk.html](wydruk.html) | Print builder (job → label sheet) | tak |
| [historia-wydrukow.html](historia-wydrukow.html) | Lista zapisanych jobów + prefill | tak |
| [polityka-prywatnosci.html](polityka-prywatnosci.html) | RODO | nie |
| [regulamin.html](regulamin.html) | ToS | nie |
| [404.html](404.html) | Cloudflare 404 | nie |

### JS — moduły (wszystkie ES, `<script type="module">`)
| Plik | Główne eksporty / funkcje | Linie kluczowe |
|---|---|---|
| [app.js](app.js) | Generator główny (JsBarcode + QRious), eventy, theme toggle | ~40 KB monolit |
| [decoder.js](decoder.js) | ZXing wrapper, batch CSV, EXIF rotate | ~56 KB |
| [i18n.js](i18n.js) | 10 locales × 2 sekcje (UI + FAQ/HowTo). Sekcje zaczynają się: pl@5, en@100, de@195, fr@290, es@385, it@480, pt@575, nl@670, cs@765, uk@860; FAQ@959+ analogicznie | 179 KB |
| [auth-email-password.js](auth-email-password.js) | `signUp` `signIn` `signOut` `requestPasswordReset` `setNewPassword` `validateEmail` `validatePassword` | 60 lin |
| [auth-ui.js](auth-ui.js) | `buildHeaderControls()@42`, `renderHeaderState()@73`, save-button na index | 200 lin |
| [supabase-client.js](supabase-client.js) | `getSupabase()@21`, `getSession()@47`, `onAuthStateChange()@58`, `isSupabaseAvailable()@42` | 75 lin |
| [supabase-config.js](supabase-config.js) | `SUPABASE_URL`, `SUPABASE_ANON_KEY` (publishable, w repo) | 6 lin |
| [db-codes.js](db-codes.js) | CRUD `saved_codes`. `FREE_CODES_LIMIT=10`. `listCodes/insertCode/updateCode/deleteCode/bulkDeleteCodes/countCodes/normaliseTagsInput` | 75 lin |
| [db-templates.js](db-templates.js) | CRUD `label_templates`. `FREE_TEMPLATES_LIMIT=5`. `DEFAULT_TEMPLATE_CONFIG`, `getPagePreset`, `normaliseTemplateConfig` | 110 lin |
| [db-printers.js](db-printers.js) | CRUD `printer_profiles`. `FREE_PRINTERS_LIMIT=5`. `loadPresets/findPresetById/setDefaultPrinter/normalisePrinterPayload` | 100 lin |
| [db-jobs.js](db-jobs.js) | CRUD `print_jobs` + `job_items`. `FREE_JOBS_LIMIT=20`, `MAX_ITEMS_PER_JOB=500`. `savePrintJob/normaliseJobItem` | 90 lin |
| [print-builder.js](print-builder.js) | `expandItems/paginate/buildSheetHTML/openPrintWindow/escapeHtml` (HTML do okna print) | 165 lin |
| [label-renderer.js](label-renderer.js) | JsBarcode → SVG z `bar_width_correction` (kompensacja rozlewania tuszu) | 100 lin |
| [csv-import.js](csv-import.js) + [csv-worker.js](csv-worker.js) | Worker CSV parser (delimiter detection, headerMap) | 130+75 |
| [nav-enhance.js](nav-enhance.js) | Modern pill-nav + auth-gating linków `[data-signed-in="required"]`. `detectBasePath/buildLink/normaliseNav/updateCtaForSession/setSignedIn/annotateExistingLinks` | 175 lin |
| [analytics.js](analytics.js) | Cookie consent + GA gating (RODO) | 130 lin |
| [_fix.js](_fix.js) | One-off mojibake repair script (cp1250↔UTF-8). NIE odpalać bez backupu | 130 lin |

### CSS — `styles.css` (112 KB, jeden plik). Mapa sekcji:
```
1     Skip Link (a11y)
20    Reset & Base
102   App Layout
109   Header
196   Generator Panel
253   Control Groups
294   Inputs
335   Range Sliders
394   Color Inputs
439   Toggle Switch
489   Button Group
523   Generate Button
582   Preview Section
695   Error Message
730   Dark Accent Section
794   Info Section
878   Footer
887   Toast
914   Responsive
958   Print Button Accent
970   Modal
1578  Print-only
1675  Dark Mode Overrides
1772  Theme Toggle
1812  Language Switcher
1884  Ad Slots
1904  Footer Links
1921  Cookie Consent Banner
1994  DECODER PAGE redesign
3085  FAQ + HowTo (SEO)
3202  Flag emoji polyfill
3215  DECODER scan list
3417  Popular Gallery
3514  QR-specific options
3557  AUTH tabs (Phase 1)
3597  My codes library (Phase 2)
3745  Label templates (Phase 3)
3864  Print Builder (M2.5 Phase 5)
3964  Auth UX M3.1 — header CTA
4127  konto.html auth card
4341  Account Dashboard (Phase 3)
4382  Password show/hide toggle
4407+ Modern pill nav (.app-nav) — auth-gating via [data-signed-in]
```

### Konfiguracja deploy / SEO
- `_headers` — CSP, HSTS, CORS, cache. NIE usuwać.
- `_redirects` — fallback dla SPA + alias canonicale.
- `sitemap.xml` / `robots.txt` — generowane ręcznie, 10 lang × ~12 stron.
- `ads.txt` — Google AdSense.
- `playwright.config.js` — testy w `tests/` (smoke, a11y, seo, auth-save, m25-account, phase4-agent, popular-gallery).
- `supabase/` — migracje SQL (RLS, quota triggers).

### Locales (subdirs `pl/ en/* de/ fr/ es/ it/ pt/ nl/ cs/ uk/`)
Każdy zawiera kopie HTML z `<html lang="..">` + tłumaczenia. `pl/` jest duplikatem root (canonical = root).
Zmiana w `index.html` → musi być replikowana do 9 subdirs (zwykle przez `node` script albo grep+multi-replace).

---

## Konwencje (musisz znać)

### i18n
- Tłumaczenia centralnie w `i18n.js` w globalnym `LANG_PACK = { ui: {pl,en,...}, faq: {pl,en,...} }`.
- W HTML: `<span data-i18n="account.signIn">…</span>`.
- W JS: `t('account.signIn')` (helper w każdym pliku, np. `auth-ui.js:28`).
- Dodajesz nowy string → MUSI trafić do wszystkich 10 sekcji w `i18n.js`.

### Encoding
- Pliki PL są UTF-8 bez BOM. PS 5.1 corruptuje przez cp1250 → patrz `/memories/repo/encoding.md`.
- ZAWSZE używaj `replace_string_in_file` lub Node `fs.writeFileSync(p,t,'utf8')`, NIGDY `Set-Content` bez `-Encoding utf8NoBOM`.
- Recovery: `git show <hash>:<path>`.

### Auth-gating w nawigacji
- HTML: `<a href="moje-kody.html" data-signed-in="required">…</a>` (CSS chowa gdy nie zalogowany).
- `nav-enhance.js` + sekcja CSS od linii ~4407 (`[data-signed-in="required"]`).

### Kwoty / RLS
- Limity free: codes=10, templates=5, printers=5, jobs=20, items/job=500.
- Egzekwowane na bazie (Postgres triggery w `supabase/`) + UI graceful w `db-*.js`.

### Branch / commits
- Conventional commits (`feat:`, `fix:`, `chore:`, `feat(scope):` …).
- Push na `main` → auto-deploy Cloudflare Pages.
- NIE commituj bez explicit user OK przy zmianach UX.

---

## Częste zadania — przepisy

### Dodać nowy string i18n
1. `i18n.js` — szukaj `    pl: {` (linia 5), dopisz w odpowiedniej sekcji.
2. To samo dla en/de/fr/es/it/pt/nl/cs/uk (linie 100/195/290/385/480/575/670/765/860).
3. W HTML: `data-i18n="newSection.newKey"`.
4. Test: otwórz `index.html` z `?lang=de` → klucz musi się rozwinąć.

### Dodać nową stronę chronioną
1. Stwórz `nowa.html` z `<nav class="app-nav">` (skopiuj z `moje-kody.html`).
2. Linki account-only z `data-signed-in="required"`.
3. Skopiuj do 9 subdirs (`pl/`, `de/`, …).
4. Dodaj do `sitemap.xml` (10× hreflang).
5. Test: `tests/m25-account.spec.js` extend.

### Edycja nawigacji globalnej
- Logika: `nav-enhance.js:48` (`normaliseNav`) i `:93` (`updateCtaForSession`).
- Styl: `styles.css:4407+`.
- Linki/copy: `i18n.js` sekcja `nav: {}`.

### Lokalne testowanie auth
- `python -m http.server 8000` w `wersja zarobkowa/`, otwórz `http://localhost:8000/`.
- Konto testowe: `igor.gerc@aquael.pl` (NIE zapisywać hasła nigdzie).
- Subaddress: `igor.gerc+test1@aquael.pl` żeby testować rejestrację bez nowej skrzynki.

### Screenshot dev-loop
- `_devshots/` jest w `.gitignore`.
- `msedge --headless=new --window-size=1440,2400 --screenshot=_devshots/x.png http://localhost:8000/…`.

---

## Pułapki / lessons learned

- `getSession()` zwraca `{ data: { session } }` — destrukturyzuj poprawnie (Phase 3 bug: w `drukarki.html` było `const session = await getSession()` zamiast `const { session } = await getSession()`).
- `aria-hidden="true"` na `<svg>` z fokusowalnym rodzicem łamie a11y — używaj `<svg aria-hidden="true" focusable="false">` lub `<svg hidden>` (Phase 4 fix).
- `onAuthStateChange` event `INITIAL_SESSION` nie powinien reloadować presetów (powoduje migotanie) — reload tylko na `SIGNED_OUT` (Phase 3 bug w `drukarki.html`).
- Subdir locales (`pl/`, `de/` …) nie mają zwykle `nav-enhance.js` w `<head>` — fallback to `annotateExistingLinks()` (tylko podświetla active, nie buduje nowego nava).
- Nie kasować `<!-- Open Graph -->` itp. komentarzy HTML — userzy ich oczekują.

---

## Powiązane pliki pamięci

- `/memories/repo/encoding.md` — pełne recovery instructions.
- `/memories/repo/wersje.md` — różnice firma vs zarobkowa.
- `/memories/session/plan.md` — bieżący plan (Phase 5 nav redesign — done).
- `/memories/session/plan-m3-pathA-done.md` — quoty i bar-width correction.
- `.github/copilot-instructions.md` — globalne zasady workspace.
- `.github/instructions/*.instructions.md` — szczegółowe wytyczne (a11y, seo-i18n, security, performance…).

---

## Skróty do najczęściej edytowanych miejsc

| Co chcę zmienić | Plik:linia |
|---|---|
| Strings nawigacji top | `i18n.js:5+` sekcja `nav:` (10×) |
| Wygląd nav pill | `styles.css:4407+` |
| Auth header CTA | `auth-ui.js:42-90` + `styles.css:3964+` |
| Login form | `konto.html:35-95` + `styles.css:4127+` |
| Theme toggle | `app.js` (search `themeToggle`) + `styles.css:1772` |
| Lang switcher | `lang-switch.js` (jeśli wydzielony) + `styles.css:1812` |
| Print sheet HTML | `print-builder.js:65 buildSheetHTML` |
| Bar width correction | `label-renderer.js` (search `bar_width_correction`) |
| Cookie consent | `analytics.js` + `styles.css:1921` |
| CSP/headers | `_headers` |
| Sitemap URLs | `sitemap.xml` |
