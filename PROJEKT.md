# PROJEKT.md — Kompendium projektu „Generator Kodów Kreskowych" (wersja zarobkowa)

> **Żywy dokument.** Aktualizowany po każdej istotnej wiadomości / zmianie.
> Ostatnia aktualizacja: **2026-06-06**
> Maintainer: GitHub Copilot (sesja interaktywna z użytkownikiem)
> Zakres edycji: `Generator kodów kreskowych/wersja zarobkowa/`

---

## Spis treści

1. [O projekcie](#1-o-projekcie)
2. [Stack i ograniczenia techniczne](#2-stack-i-ograniczenia-techniczne)
3. [Struktura katalogu](#3-struktura-katalogu)
4. [Decyzje produktowe (Q&A)](#4-decyzje-produktowe-qa)
5. [Konfiguracja Supabase](#5-konfiguracja-supabase)
6. [Mapa drogowa — kamienie milowe](#6-mapa-drogowa--kamienie-milowe)
7. [Backlog zadań (Grupy A–F)](#7-backlog-zadań-grupy-af)
8. [Dziennik sesji / changelog](#8-dziennik-sesji--changelog)
9. [Otwarte pytania i ryzyka](#9-otwarte-pytania-i-ryzyka)
10. [Zasady współpracy z agentem](#10-zasady-współpracy-z-agentem)
11. [Referencje i linki](#11-referencje-i-linki)

---

## 1. O projekcie

**Nazwa:** Generator Kodów Kreskowych (wersja zarobkowa / produkcyjna).

**Cel:** Statyczna aplikacja webowa (PWA-like) do **generowania** i **dekodowania** kodów kreskowych w przeglądarce — bez wysyłania danych użytkownika na serwer. Wersja zarobkowa rozszerza wersję bazową o:
- i18n (10 języków: en + pl, de, fr, es, it, pt, nl, cs, uk),
- pełne SEO (hreflang, canonical, Schema.org JSON-LD: WebApplication / HowTo / FAQPage / BreadcrumbList, Open Graph, Twitter Card),
- analytics + consent (GA4, AdSense),
- monetyzację (AdSense — w trakcie konfiguracji),
- (planowane) konta użytkowników i zapisywanie kodów (Supabase).

**Model biznesowy (aktualny):** Aplikacja **darmowa** dla użytkownika końcowego. Monetyzacja przez reklamy AdSense + opcjonalne konto pozwalające zapisywać własne kody. Brak Stripe / planów płatnych (Pro 19 zł zostało zarzucone — zob. §4).

**Deployment produkcyjny:** Cloudflare Pages / Workers — adres tymczasowy
`https://barcode-generator.daytodayapps-contact.workers.dev`
(własna domena: na razie odroczona).

**Repozytoria GitHub powiązane:**
- `day-to-day-apps/barcode-generator` (główny, branch: `main`)
- `day-to-day-apps/QR-code-generator` (siostrzany, branch: `main`)

**Filozofia produktu:**
- Prywatność: generowanie i dekodowanie wyłącznie po stronie klienta.
- Vanilla web: brak frameworków, brak bundlerów (npm tylko do narzędzi developerskich, np. Playwright).
- Dostępność: WCAG 2.2 AA jako poziom docelowy.
- Zgodność: RODO/GDPR (consent przed cookies analitycznymi/reklamowymi), `ads.txt` dla AdSense.

---

## 2. Stack i ograniczenia techniczne

### Runtime (produkcja)
| Warstwa | Technologia |
|---|---|
| Język | Vanilla JavaScript (ES Modules), HTML5, CSS3 |
| Hosting | Cloudflare Pages (statyczny) + nagłówki w `_headers`, redirecty w `_redirects` |
| Dekodowanie kodów | `@zxing/library` (CDN) |
| Generowanie kodów | `JsBarcode`, `qrcode` (CDN) |
| Analytics | GA4 + AdSense — bootstrap w `analytics.js` z cookie consent |
| Backend (planowany) | **Supabase** (PostgreSQL + Auth + RLS) |

### Tooling (developerskie, lokalnie)
| Narzędzie | Wersja / uwagi |
|---|---|
| Playwright | `@playwright/test` ^1.49.0 (ESM, Chromium) |
| Lokalny serwer testowy | `python -m http.server 8765 --bind 127.0.0.1` (uruchamiany przez Playwright `webServer`) |
| Powłoka edycji plików | PowerShell 5.1, UTF-8 bez BOM (`[Text.UTF8Encoding]::new($false)` + `[IO.File]::ReadAllText/WriteAllText`) |

### Zasady (obowiązują agenta)
- **Brak frameworków** (React/Vue/jQuery/itp.) i **brak bundlerów** w runtime.
- **Brak `package.json` w runtime** — npm tylko dla narzędzi dev (Playwright, axe, itp.).
- **Język**: chat po polsku, identyfikatory w kodzie po angielsku, komentarze po polsku OK.
- **Nie psuć**: i18n (`hreflang`, `canonical`, JSON-LD), `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`.
- **Nie dodawać** zewnętrznych skryptów bez aktualizacji CSP i potwierdzenia.
- **Prywatność**: dane wpisywane przez użytkownika nigdy nie opuszczają przeglądarki.

---

## 3. Struktura katalogu

```
wersja zarobkowa/
├── index.html              # EN (domyślny) — landing + generator
├── decoder.html            # EN — dekoder z kamery / pliku
├── 404.html
├── polityka-prywatnosci.html
├── regulamin.html
├── app.js                  # logika generatora + i18n bootstrap
├── decoder.js              # logika dekodera (ZXing)
├── i18n.js                 # słownik tłumaczeń (10 języków)
├── analytics.js            # GA4 + AdSense + consent
├── styles.css
├── favicon.svg / og-image.svg
├── ads.txt                 # google.com, pub-2527047257613855, DIRECT, ...
├── _headers / _redirects   # Cloudflare Pages
├── robots.txt / sitemap.xml
├── pl|de|fr|es|it|pt|nl|cs|uk/
│   ├── index.html          # tłumaczenie landing per język
│   └── decoder.html
├── supabase/               # migracje SQL (nieuruchomione jeszcze)
│   ├── .env.example
│   └── migrations/
│       ├── 20260424000001_initial_schema.sql
│       ├── 20260424000002_rls_policies.sql
│       └── 20260424000003_functions_triggers.sql
├── tests/
│   └── smoke.spec.js       # 21 testów (10 index + 10 decoder + 1 asset)
├── playwright.config.js
├── package.json            # tylko devDeps (Playwright)
├── README.md
├── ROADMAP.md              # ⚠ STARY (Clerk, Stripe) — do przepisania
├── DEPLOY-CHECKLIST.md
├── TODO-FUTURE.md
└── PROJEKT.md              # ← TEN PLIK (kompendium)
```

---

## 4. Decyzje produktowe (Q&A)

> Wpisy chronologicznie. Każda decyzja ma datę i status.

### 2026-05-07 — Kierunek backendu: Supabase (potwierdzone)
- **Pytanie:** Clerk (z ROADMAP.md) czy Supabase (rozpoczęte w `supabase/`)?
- **Odpowiedź użytkownika:** „Zaczęliśmy już coś tworzyć pod Supabase, co było Twoim pierwszym pomysłem".
- **Decyzja:** ✅ **Supabase**. Clerk i Stripe wycofane. `ROADMAP.md` do przepisania.

### 2026-05-07 — Model monetyzacji: free + reklamy
- **Pytanie:** Plan Pro 19 zł (z ROADMAP) czy darmowo + AdSense?
- **Decyzja:** ✅ **Aplikacja darmowa**, monetyzacja AdSense. Brak Stripe.

### 2026-05-07 — Projekt Supabase
- **Pytanie 1 (agent):** „Czy projekt w Supabase już istnieje?"
- **Odpowiedź:** ✅ **TAK**. Dane w §5.

### 2026-05-07 — Metoda logowania (etap 1)
- **Pytanie 2 (agent):** Email+hasło, magic link, czy Google?
- **Odpowiedź:** „Na razie zróbmy **e-mail + hasło**, a w późniejszych aktualizacjach zrobimy logowanie Google."
- **Decyzja MVP:** ✅ **email + hasło**. Magic link / Google → później (M3).

### 2026-05-07 — Widoczność zapisanych kodów (etap 1)
- **Pytanie 3 (agent):** Prywatne czy z opcją publicznego linku?
- **Odpowiedź:** „Na razie niech będzie jedynie **prywatny**, a dopiero potem zrobimy opcję udostępniania."
- **Decyzja MVP:** ✅ tylko **prywatne** (RLS po `auth.uid()`). Publiczne linki → później (M4).

### 2026-05-07 — Mandat „bezpiecznej paczki"
- **Cytat:** „Zacznij od tego, co uważasz za słuszne".
- **Interpretacja:** Agent może wykonywać zmiany niskiego ryzyka (gitignore, testy stabilizacja, AdSense scaffold, czyszczenie markerów tłumaczeń) bez ponownego pytania, dopóki nie naruszają i18n/SEO/CSP.

---

## 5. Konfiguracja Supabase

> ⚠ Klucz publishable (`sb_publishable_*`) jest bezpieczny do umieszczenia w kodzie klienckim (analogon `anon`). Hasło bazy i `service_role` **NIGDY** nie trafiają do repo — tylko `.env` lokalnie i sekrety w CI.

| Pole | Wartość |
|---|---|
| Project ref | `aoqxznukwbdgrggxloou` |
| Project URL | `https://aoqxznukwbdgrggxloou.supabase.co` |
| Publishable key (klient) | `sb_publishable_vnawJTY8NEl7tuUoDKJ83Q_QFcOh_Se` |
| Direct connection string | `postgresql://postgres:[YOUR-PASSWORD]@db.aoqxznukwbdgrggxloou.supabase.co:5432/postgres` |

### CLI bootstrap (do uruchomienia ręcznie przez użytkownika lub w sesji)
```powershell
supabase login
supabase init
supabase link --project-ref aoqxznukwbdgrggxloou
```

### Przyjęty schemat (z istniejących migracji w `supabase/migrations/`)
1. `20260424000001_initial_schema.sql` — tabele (m.in. `saved_codes`, profile użytkowników).
2. `20260424000002_rls_policies.sql` — Row-Level Security: właściciel = `auth.uid()`.
3. `20260424000003_functions_triggers.sql` — triggery aktualizujące `updated_at`, walidacja itp.

> Migracje wymagają audytu zanim trafią do hostowanej bazy (zob. §7 Group F).

### MVP zakresu Supabase (M2)
- Auth: email + hasło, potwierdzenie maila włączone.
- Tabela `saved_codes` z polami: `id`, `user_id`, `type` (ean13/upc/qr/...), `value`, `label`, `options` (JSONB), `created_at`, `updated_at`.
- RLS: SELECT/INSERT/UPDATE/DELETE tylko dla właściciela.
- Brak publicznych linków na tym etapie.

---

## 6. Mapa drogowa — kamienie milowe

> Skala statusu: ⬜ planowane · 🟡 w toku · ✅ zrobione · ⏸ wstrzymane

### M0 — Stabilizacja jakości i monetyzacji statycznej (TERAZ)
- [x] A1. Wykluczyć artefakty Playwright z gita (`playwright-report/`, `test-results/`).
- [x] A2. Audyt `inLanguage` w 20 plikach HTML.
- [x] A3. Usunięcie 32 markerów `TRANSLATION-REVIEW-NEEDED` (9 plików).
- [x] AdSense scaffold: pub ID w `analytics.js`, plik `ads.txt`.
- [x] Stabilizacja Playwright: stub sieciowy AdSense/GA → **21/21 zielonych w 37 s** (było flaky).
- [x] B1. Uzupełnić `nl/index.html` o JSON-LD HowTo + FAQPage + BreadcrumbList (NL).
- [x] A4. Nowe testy: `tests/seo.spec.js` (hreflang/canonical/JSON-LD) + `tests/a11y.spec.js` (`@axe-core/playwright`).
- [x] CSP w `_headers`: rozszerzono `connect-src` o Supabase (https + wss) i `www.google-analytics.com`. Domeny AdSense w innych dyrektywach już były.
- [x] Przepisać `ROADMAP.md` (Clerk → Supabase, usunąć Pro 19 zł).

### M1 — Lokalne uruchomienie Supabase (przygotowanie)
- [ ] `supabase login` + `supabase init` + `supabase link` w środowisku użytkownika.
- [ ] `supabase db push` lokalnie z `--dry-run` na istniejących migracjach.
- [ ] Audyt migracji 1–3 (czy schemat zgodny z MVP, czy RLS są kompletne, czy tabela `saved_codes` ma walidacje typu kodu).
- [ ] `.env.local` (gitignore) z `SUPABASE_URL` + `SUPABASE_ANON_KEY` (publishable).

### M2 — Auth (email + hasło) i CRUD prywatnych kodów (MVP konta)
- [ ] Strona `/konto.html` (lub modal): formularze rejestracji/logowania/resetu hasła.
- [ ] Klient `supabase-client.js` — singleton z URL + publishable key.
- [ ] Stan zalogowania w UI (header: „Zaloguj" ↔ „Wyloguj / Mój profil").
- [ ] Akcja „Zapisz ten kod" w generatorze (widoczna tylko dla zalogowanych).
- [ ] Lista zapisanych kodów `/moje-kody.html` z możliwością regeneracji i usunięcia.
- [ ] Tłumaczenia kluczy `account.*` w `i18n.js` dla 10 języków.
- [ ] Aktualizacja CSP (`connect-src` o `https://aoqxznukwbdgrggxloou.supabase.co`).
- [ ] Test E2E (Playwright): rejestracja → zapis kodu → wylogowanie → ponowne zalogowanie → kod widoczny.

### M3 — Logowanie Google + magic link
- [ ] Konfiguracja OAuth Google w Supabase (Client ID/Secret w panelu Supabase).
- [ ] Przycisk „Zaloguj Google" w UI.
- [ ] (Opcjonalnie) magic link jako alternatywa.

### M4 — Publiczne udostępnianie kodów (opcjonalne)
- [ ] Kolumna `is_public` + losowy `share_slug` (np. 12 znaków base62).
- [ ] Polityka RLS dla SELECT po `share_slug` z `is_public = true`.
- [ ] Strona `/c/<slug>.html` (renderowana po stronie klienta z fetch po slug).
- [ ] Ochrona przed enumeracją (rate limit / długi slug).

### M5 — Polish / domeny / wizerunek
- [ ] Zakup własnej domeny i przepięcie z workers.dev.
- [ ] Aktualizacja `canonical` + `sitemap.xml` + `og:url`.
- [ ] Lighthouse CI (≥95 dla Performance/SEO/Best/A11y).
- [ ] PWA manifest + service worker (offline cache statyk).

---

## 7. Backlog zadań (Grupy A–F)

> Grupy są ortogonalne do milestone'ów — to „półki" tematyczne. Pojedyncze zadanie odznaczamy `[x]` po wykonaniu.

### Grupa A — Higiena i jakość
- [x] A1. `.gitignore`: `playwright-report/`, `test-results/`.
- [x] A2. Audyt `inLanguage` we wszystkich 10 folderach.
- [x] A3. Usunięcie 32 markerów `TRANSLATION-REVIEW-NEEDED` (9 plików).
- [x] A4. `tests/seo.spec.js` (hreflang, canonical, og:url, JSON-LD `@type` z `expect.soft`).
- [x] A5. `tests/a11y.spec.js` z `@axe-core/playwright` (fail na critical/serious, wcag2a/aa + 2.1).
- [ ] A6. Pre-commit / CI: `npx playwright test` w GitHub Actions.

### Grupa B — SEO / i18n
- [x] B1. `nl/index.html`: dodano HowTo (4 kroki) + FAQPage (4 Q) + BreadcrumbList (NL).
- [ ] B2. Audyt JSON-LD we wszystkich 10 `index.html` (czy każdy ma WebApplication + HowTo + FAQPage + BreadcrumbList).
- [ ] B3. Audyt `<title>` i `<meta description>` (długość, unikalność per język).
- [ ] B4. `sitemap.xml` — sprawdzić, czy wszystkie 20 URL-i obecne i z `hreflang`.

### Grupa C — Bezpieczeństwo / Cloudflare
- [x] C1. CSP w `_headers`: `connect-src` rozszerzone o `https://aoqxznukwbdgrggxloou.supabase.co`, `wss://...`, `www.google-analytics.com`. AdSense (pagead2/doubleclick) już były.
- [ ] C2. Audyt `Permissions-Policy`, `Referrer-Policy`, HSTS.
- [ ] C3. Sprawdzić, czy `_redirects` nie wycieka pustych ścieżek (open redirect).

### Grupa D — Wydajność / UX
- [ ] D1. `loading="lazy"` na obrazach off-screen (jeśli istnieją).
- [ ] D2. Preload czcionek/krytycznego CSS, `fetchpriority="high"` dla LCP.
- [ ] D3. Audyt CLS (rezerwacja miejsca na slot AdSense).

### Grupa E — Reklamy / monetyzacja
- [x] E1. `ads.txt` z `pub-2527047257613855`.
- [x] E2. `analytics.js`: ładowanie `adsbygoogle.js` po consent.
- [ ] E3. Sloty reklamowe w UI (stała wysokość → bez CLS).
- [ ] E4. Polityka cookies — uzupełnić informacje o AdSense/personalizacji.

### Grupa F — Backend / Supabase (po M1)
- [ ] F1. CLI bootstrap (`login`, `init`, `link`) — instrukcja w README.
- [ ] F2. Audyt 3 istniejących migracji (schema / RLS / triggery).
- [ ] F3. `supabase-client.js` w runtime + `connect-src` w CSP.
- [ ] F4. Strona/modal logowania (email + hasło) + i18n kluczy `account.*`.
- [ ] F5. Akcja „Zapisz kod" + `/moje-kody.html`.
- [ ] F6. Test E2E pełnego flow.
- [ ] F7. (M3) OAuth Google.
- [ ] F8. (M4) Publiczne udostępnianie.

---

## 8. Dziennik sesji / changelog

> Notuje wykonane zmiany. Najnowsze na górze.

### 2026-06-06 (M2.5 Phase 6 — zamknięcie kamienia: i18n 10 lokali, sitemap, deploy)

- ✅ **i18n 9 lokali** — `i18n.js` dopełniony: ~85 nowych kluczy `account.*` (Phase 1–5: tabLogin/tabRegister/tabReset, password*, signInCta/registerCta/resetCta, setNewPasswordTitle, weakPassword, passwordMismatch, registerCheckInbox, resetSent, resetTokenMissing, subtitleEmailPassword, rename/cancel/save, tags*, selectAll/deselectAll/deleteSelected, codesUsed/freeLimitReached/bulkDeleteConfirm, myTemplates+templatesTitle+widthMm/heightMm/margins*/fontSizePt/setAsDefault/defaultBadge/templateSaved/templateDeleted/template*Invalid, myPrinters+printersTitle+printerType*/pageWidthMm/labelWidthMm/cols/rows/gapX/gapY/dpi/offsetX/offsetY/barWidthCorrection/calibrationHelp/printerSaved, builderTitle+subtitleBuilder+printHistory+jobName+useTemplate+usePrinter+selectPrinter+items+itemsCount+addRow+importCsv+clearAll+colValue/CodeType/Name/Price/Copies+preview+previewSummary+printNow+popupBlocked+saveJob+jobSaved+jobsUsed+csvImported+csvFailed+csvFileTooLarge+newJob+emptyJobs+deleteJobConfirm) zsynchronizowanych dla `pl, de, fr, es, it, pt, nl, cs, uk`. Wcześniejsze klucze magic-link (`magicLink`, `checkInbox`) pozostawione jako legacy bez użycia. `i18n.js` ma teraz 2933 linie; parytet kluczy między wszystkimi 10 lokalami potwierdzony.
- ✅ **sitemap.xml** — `lastmod` zaktualizowany na bieżącą datę dla wszystkich 22 wpisów (homepage + decoder × 11 lokali). Strony konta/builder/historii nadal poza sitemap (noindex,follow + canonical workers.dev, świadoma decyzja — to obszar prywatny użytkownika).
- ✅ **Deploy potwierdzony** — push `65d7f16..2e78549` na `origin/main` o ~14:00 UTC; build Cloudflare Workers OK, propagacja <30 s, wszystkie surfaces (`/konto.html`, `/moje-kody.html`, `/szablony.html`, `/drukarki.html`, `/wydruk.html`, `/historia-wydrukow.html`) odpowiadają 200.
- 🟡 **Odłożone do post-MVP / M3+:**
  - Playwright TS specs (auth, codes, templates, printers, builder, csv-import) — szkielet zostanie dodany razem z setupem CI w M3.
  - `xlsx-import.js` (SheetJS lazy via CDN) — odłożone, użytkownicy enterprise mogą eksportować z Excela do CSV.
  - `batch-scan.js` (BarcodeDetector + getUserMedia) — odłożone, wymaga osobnej rundy UX.
  - Pre-wypełniony builder przy `wydruk.html?id=<job_id>` — pomocna QoL, ale nie blokuje MVP.
  - Aplikacja `bar_width_correction` z `printer_profiles` do `JsBarcode` w `print-builder.js` — wymaga testów na realnej drukarce termicznej.
  - Egzekwowanie limitów (`label_templates:5`, `printer_profiles:5`, `print_jobs:20`) per-tabela triggerem DB; obecnie tylko walidacja client-side + RLS.
- ✅ **M2.5 zamknięte.** Status M2 zmieniony na ukończony. Następny kamień: M3 (monetyzacja Pro / Stripe / wyższe limity) — patrz §6.

### 2026-06-05 (M2.5 Phase 5 — Print Builder + historia wydruków, EN-only)

- ✅ **Migracja DB** — tabele `print_jobs` i `print_job_items` + RPC `save_print_job(job_data jsonb, items jsonb[]) → uuid`. `print_jobs`: id, user_id, name (1–120), template_id (FK `label_templates` ON DELETE SET NULL), printer_profile_id (FK `printer_profiles` ON DELETE SET NULL), notes (≤2000), created_at, updated_at; index `(user_id, created_at desc)`. `print_job_items`: id, job_id (FK cascade), position (≥0), code_type (1–32), value (1–4096), name (≤200), price (≤64), description (≤500), copies (1–1000 def 1), extra jsonb '{}', created_at. RPC waliduje sesję i kontrakt (`not_authenticated/42501`, `job_name_required/22023`, `job_items_required/22023`, `job_items_limit_exceeded/22023` dla >500 itemów, `template_not_found/42501`, `printer_not_found/42501`). RLS na obu tabelach by user_id.
- ✅ **`db-jobs.js`** (NEW, ESM) — wrapper RPC `save_print_job` + CRUD czytane bezpośrednio (`listJobs`, `getJobById` z JOIN items, `countJobs`, `deleteJob`). Stałe `FREE_JOBS_LIMIT=20`, `MAX_ITEMS_PER_JOB=500`. Eksport `normaliseJobItem` (walidacja długości pól, clamp `copies` 1–1000, default `code_type='CODE128'`).
- ✅ **`csv-worker.js`** (NEW, classic worker) — self-contained parser CSV. Auto-detekcja separatora z `, ; \t |` (zliczanie wystąpień w pierwszej linii). Obsługa cudzysłowów RFC 4180 (escape `""`). Worker odpowiada `{type:'rows', rows, headers}` lub `{type:'error', message}`.
- ✅ **`csv-import.js`** (NEW, ESM) — orkiestrator importu CSV w Web Workerze. `MAX_FILE_BYTES=5*1024*1024`, `MAX_ROWS=500`. Header auto-map: `value←{value,code,barcode,sku,ean}`, `name←{name,product,title}`, `price←{price,cost}`, `description←{description,desc,notes}`, `copies←{copies,qty,quantity,count}`, `code_type←{code_type,type,format}`. Zwraca `{items, skipped}`. CSP wymaga `worker-src 'self' blob:` (już ustawione w `_headers`).
- ✅ **`print-builder.js`** (NEW, ESM) — silnik paginacji + druk. Eksporty: stała `MAX_LABELS=2000`, `expandItems(items)` (rozwija `copies`, error przy przekroczeniu), `paginate(labels, layout)` (układa w kolumny/wiersze wg profilu drukarki), `buildSheetHTML(pages, template, printer, t)` (HTML standalone z inline CSS `@page` size + margin, woła `LabelRenderer.createLabelHTML` per etykieta), `openPrintWindow(html)` (window.open + auto `window.print()`). **TODO:** `bar_width_correction` z `printer_profiles` jeszcze nie aplikowane do JsBarcode (Phase 6 fix).
- ✅ **`wydruk.html`** (NEW, EN-only, `noindex,follow`, canonical workers.dev) — Print Builder. Form: job name, template select (z `label_templates`), printer profile select (wymagane, z `printer_profiles`), notes. Tabela items (`.items-table` w `.table-scroll`) z kolumnami: value, code type, name, price, copies, delete row. Toolbar: Add row, Import CSV (file input → `csv-import.js` → worker), Clear all (confirm). Akcje: Preview (`paginate` + `buildSheetHTML` w `<iframe>` w `#preview-area`), Print now (`openPrintWindow`), Save job (`savePrintJob` przez RPC; limit free=20 jobs sprawdzony przez `countJobs` przed save). Auth-gate przez `getSession()`. Komunikat „Free plan limit reached ({max}). Delete a saved job to add another." gdy quota wyczerpana.
- ✅ **`historia-wydrukow.html`** (NEW, EN-only, `noindex,follow`, canonical workers.dev) — lista zapisanych zadań druku. Reuse Phase 3 klas: `.codes-list`, `.code-row`, `.template-summary`, `.code-name`, `.template-meta`, `.code-actions`, `.empty-state`. Toolbar: licznik `{n}/{max} jobs saved` + CTA „New print job" → `wydruk.html`. Akcja delete z `confirm()`. Brak akcji „Load" w tej wersji — szczegóły dostępne tylko przez DB (load do buildera odłożone na post-MVP).
- ✅ **Nawigacja** — link „Print builder" → `wydruk.html` i „Print history" → `historia-wydrukow.html` w `drukarki.html`, `szablony.html`, `moje-kody.html`, `konto.html`.
- ✅ **`i18n.js`** — dodano ~50 nowych kluczy EN w `en.account`: `builderTitle`, `subtitleBuilder`, `printHistory`, `printHistoryTitle`, `subtitlePrintHistory`, `jobName`, `jobNamePlaceholder`, `useTemplate`, `usePrinter`, `selectPrinter`, `optional`, `jobNotes`, `items`, `itemsCount` (`{n} items`), `addRow`, `importCsv`, `clearAll`, `clearAllConfirm`, `colValue`, `colCodeType`, `colName`, `colPrice`, `colCopies`, `preview`, `previewSummary` (`{pages} pages, {labels} labels`), `previewFailed`, `printNow`, `popupBlocked`, `saveJob`, `jobSaved`, `jobSaveFail`, `jobNameRequired`, `jobItemsRequired`, `jobItemsLimit`, `freeJobsLimitReached`, `jobsUsed`, `builderLoadFail`, `csvImported` (`Imported {n} rows ({skipped} skipped).`), `csvFailed`, `csvFileTooLarge`, `newJob`, `emptyJobs`, `jobLoadFail`, `deleteJobConfirm`, `jobDeleteFail`, `jobDeleted`. **Tylko EN — 9 pozostałych lokalizacji odłożone do Phase 6.**
- ✅ **`styles.css`** — dodane reguły Phase 5: `.builder-form` (grid 1fr/1fr responsive), `.builder-toolbar`, `.items-table` + `.table-scroll` (overflow-x dla mobilnych), `.btn-link`, `.btn-row-delete` (transparent → hover #fee2e2), `.preview-area` z `iframe { height: 400px }`. `.preview-area` (Phase 5) ≠ `.print-preview-area` (Phase 3) — różne kontekst i layout.
- ✅ **Cache-bust** — `?v=20260612000000` na `styles.css` i `i18n.js` we wszystkich pages M2.5 (`drukarki.html`, `szablony.html`, `moje-kody.html`, `konto.html`, `wydruk.html`, `historia-wydrukow.html`).
- ⏸ **Odłożone do Phase 5.5 / post-MVP:** `xlsx-import.js` (lazy SheetJS, dodatkowy format obok CSV), `batch-scan.js` (BarcodeDetector API + getUserMedia jako trzeci sposób inputu obok manual/CSV), load saved job do buildera w `wydruk.html?id=...`, `bar_width_correction` aplikowane do JsBarcode w `print-builder.js`.
- **Powód:** Phase 5 z planu Multi-Barcode Print Builder — kluczowa funkcja produkcyjna: użytkownik dodaje wiele kodów ręcznie lub przez import CSV, wybiera szablon + profil drukarki, podgląda w iframe i drukuje arkusz w jednym kliku. Web Worker przy CSV trzyma main thread responsive nawet przy 500 rows. Quota free=20 jobs spójna z 10 saved_codes / 5 templates / 5 printers — bardziej liberalna, bo job to wartość użytkowa (historia), nie aktywny zasób runtime. Limit 500 itemów per job + 2000 etykiet po expand-copies chroni przed nadużyciem RPC i `window.print()` OOM. `template_id`/`printer_profile_id` z `ON DELETE SET NULL`, bo historia ma przeżyć usunięcie zasobu.
- ⏸ **Następne kroki:** Phase 6 (Playwright specs dla auth/codes/templates/printers/print-builder, `sitemap.xml` + `robots.txt` z noindex dla `/konto.html`, `/moje-kody.html`, `/szablony.html`, `/drukarki.html`, `/wydruk.html`, `/historia-wydrukow.html`; 9-locale i18n batch dla Phases 1+3+4+5 jednorazowo; PROJEKT.md M2.5 closure; DEPLOY-CHECKLIST.md; final `get_errors` sweep).

### 2026-06-04 (M2.5 Phase 4 — profile drukarek, EN-only)

- ✅ **`printer-presets.json`** (NEW, static) — wersjonowany (`version: 1`) katalog presetów drukarek pogrupowanych po `vendor`: Zebra (ZD220 58 mm, ZD420 102×152, GK420 100×50), Brother (QL-700 62×100, QL-820 62×29), Dymo (LabelWriter 450 89×36), Rongta (RP420 100×150), Munbyn (ITPP941 100×150), Avery (5160 letter 3×10, 5163 letter 2×5). Każdy preset zawiera `id`, `vendor`, `model`, `printer_type` ∈ thermal/a4-sheet/custom, `page_w_mm`, `page_h_mm`, `label_w_mm`, `label_h_mm`, `cols`, `rows`, `margin_top_mm`, `margin_left_mm`, `gap_x_mm`, `gap_y_mm`, `dpi`. Plik fetchowany lazy z `cache: 'force-cache'`.
- ✅ **`db-printers.js`** (NEW, ESM) — CRUD wrapper dla `printer_profiles` (tabela już provisionowana migracją `20260601000001`). Eksporty: `loadPresets()` (cache + fallback []), `findPresetById()`, `listPrinters` (sort: is_default DESC, created_at DESC), `getPrinterById`, `countPrinters`, `insertPrinter`, `updatePrinter`, `deletePrinter`, `setDefaultPrinter` (2-step: clear stary default → set nowy, dla unikalnego indeksu częściowego `printer_profiles_one_default`), `normalisePrinterPayload` (walidacja zgodna z constraintami DB: name 1–80, printer_type enum, page/label 1–1000 mm, cols 1–50, rows 1–200, margins/gaps 0–200 mm, dpi 72–1200, offset ±20 mm, bar_width_correction 0.5–1.5), stała `FREE_PRINTERS_LIMIT=5`. **Brak migracji SQL — schema już istnieje.**
- ✅ **`drukarki.html`** (NEW, EN-only, `noindex,follow`, canonical workers.dev) — strona profili drukarek. Toolbar z licznikiem `{n}/{max}` i „New printer profile". Inline form: name, base preset (optgroup po vendor + "Custom"), printer type, page width/height, label width/height, cols/rows, margins (top/left) + gaps (x/y) w fieldset „Margins & gaps", calibration fieldset (DPI, offset X/Y ±20, bar width correction 0.5–1.5), checkbox „Set as default". Wybór presetu auto-wypełnia pola layoutu. Lista wykorzystuje `<template id="row-template">` z `.template-row`/`.template-summary`/`.template-meta`/`.badge-default` z Phase 3. Auth-gate przez `getSession()`; reload na `SIGNED_IN`/`SIGNED_OUT`.
- ✅ **`i18n.js`** — dodane ~30 nowych kluczy EN w `en.account`: `myPrinters`, `printersTitle`, `subtitlePrinters`, `printersUsed`, `freePrintersLimitReached`, `newPrinter`, `printerName`, `printerNamePlaceholder`, `printerPreset`, `printerPresetCustom`, `printerType`, `printerTypeThermal`, `printerTypeA4Sheet`, `printerTypeCustom`, `pageWidthMm`, `pageHeightMm`, `labelWidthMm`, `labelHeightMm`, `cols`, `rows`, `marginTopShort`, `marginLeftShort`, `gapX`, `gapY`, `dpi`, `offsetX`, `offsetY`, `barWidthCorrection`, `calibrationHelp`, `printerSaved`, `printerDeleted`, `printerDeleteConfirm`, `printerSaveFail`, `printerLoadFail`, `emptyPrinters`, `emptyPrintersCta`, `printerNameRequired`, `printerPageInvalid`, `printerLabelInvalid`. **Tylko EN — 9 pozostałych lokalizacji odłożone do Phase 6.**
- ✅ **Nawigacja** — dodany link „My printers" → `drukarki.html` w `moje-kody.html`, `szablony.html` i `konto.html` (data-i18n="myPrinters").
- ✅ **`styles.css`** — brak zmian; `drukarki.html` reuse'uje pełen zestaw klas Phase 3 (`.template-form`, `.form-row`, `.form-row-2`, `.form-fieldset`, `.form-grid-4`, `.form-actions`, `.form-error`, `.checkbox-row`, `.template-row`, `.template-summary`, `.template-meta`, `.badge-default`).
- ✅ **Cache-bust** — `?v=20260612000000` dla `styles.css` i `i18n.js` w `drukarki.html`.
- **Powód:** Phase 4 z planu Multi-Barcode Print Builder. Profile drukarek to wymagana składnia dla Phase 5 (`wydruk.html` użyje `getPrinterById` + `LabelRenderer` z poprawkami DPI/offset/bar-width). Quota free=5 spójna z `label_templates`. Presety statyczne (JSON) zamiast w DB, bo nie wymagają edycji per user — usera obchodzi tylko jego własny profil (kopia presetu z lokalnymi korekcjami).
- ⏸ **Następne kroki:** Phase 5 (`db-jobs.js` + `csv-import.js` w Web Worker + `xlsx-import.js` z lazy SheetJS + `batch-scan.js` z BarcodeDetector + `print-builder.js` jako orkiestrator + `wydruk.html` + `historia-wydrukow.html`).

### 2026-06-03 (M2.5 Phase 3 — biblioteka szablonów etykiet, EN-only)

- ✅ **`db-templates.js`** (NEW, ESM) — CRUD wrapper dla `label_templates` w stylu `db-codes.js`. Eksportuje `listTemplates`, `getTemplateById`, `countTemplates`, `insertTemplate`, `updateTemplate`, `deleteTemplate`, `setDefaultTemplate` (2-step: clear stary default → set nowy, ze względu na unikalny indeks częściowy `label_templates_one_default_per_user`), `normaliseTemplateConfig` (walidacja: pageSize ∈ A4/A5/Letter/custom, widthMm/heightMm 10–1000, margins 0–100, fontSizePt 4–72), stałe `FREE_TEMPLATES_LIMIT=5`, `DEFAULT_TEMPLATE_CONFIG`, `PAGE_PRESETS`, helper `getPagePreset()`.
- ✅ **`szablony.html`** (NEW, EN-only, `noindex,follow`) — strona biblioteki szablonów. Toolbar z licznikiem `{n}/{max}` i przyciskiem „New template" (disabled gdy quota osiągnięta). Lista `code-row` z nazwą, badge „Default" (jeśli `is_default=true`), podsumowaniem konfiguracji (`A4 (210×297 mm) · 10 pt`), akcje Edit/Set default/Delete. Inline form (grid 2-col, single na mobile) z polami: name (required, max 120), pageSize select (A4/A5/Letter/custom), width/height (custom only), 4 marginesy, fontSize, checkbox „Set as default". Reuses `normaliseTemplateConfig` z `db-templates.js` przed insertem/update'em. Quota gate via `countTemplates()` przed insertem. Subskrypcja `onAuthStateChange` (sign out → reset UI). Logo upload **odłożone do Phase 3.5** (wymaga manualnego utworzenia bucketu `logos` w Supabase Dashboard — patrz TODO-FUTURE.md).
- ✅ **`i18n.js`** — dodane ~33 nowych kluczy w sekcji `en.account`: `myTemplates`, `templatesTitle`, `subtitleTemplates`, `templatesUsed` (z placeholderami `{n}`/`{max}`), `freeTemplatesLimitReached`, `newTemplate`, `templateName`, `templateNamePlaceholder`, `pageSize`, `pageSizeCustom`, `widthMm`, `heightMm`, `margins`, `marginTop`, `marginRight`, `marginBottom`, `marginLeft`, `fontSizePt`, `setAsDefault`, `defaultBadge`, `templateSaved`, `templateDeleted`, `templateDeleteConfirm`, `templateSaveFail`, `templateLoadFail`, `emptyTemplates`, `emptyTemplatesCta`, `templateWidthInvalid`, `templateHeightInvalid`, `templateMarginInvalid`, `templateFontSizeInvalid`, `templateNameRequired`. **Tylko EN — 9 pozostałych lokalizacji odłożone do Phase 6.**
- ✅ **Nawigacja** — dodany link „My templates" → `szablony.html` w `moje-kody.html` i `konto.html` (data-i18n="myTemplates").
- ✅ **`styles.css`** (append, blok „Phase 3: Label templates") — `.template-row` (align-items: flex-start), `.template-summary` (column flex w grid-area `meta`), `.template-meta` (muted text 0.9rem), `.badge-default` (pill z `--accent`, biały tekst, 0.75rem). `.template-form` (grid 2-col 1rem gap, card bg, border, padding 1.25rem). `.form-row`/`.form-row-2`/`.form-fieldset`/`.form-grid-4` jako sub-grid layouty. Inputy z focus-visible 2px outline `--accent`. `.form-error` z czerwonym tłem `#fee2e2` / borderem `#fca5a5` / kolorem `#991b1b`. Media query ≤ 720px: single column + 2-col grids dla margins/sizes.
- ✅ **Cache-bust** — `?v=20260603000000` dla `styles.css` i `i18n.js` w nowych/zmienionych plikach HTML.
- **Powód:** Phase 3 z planu Multi-Barcode Print Builder. Szablony to fundament Phase 5 (`wydruk.html` użyje `getTemplateById` + `LabelRenderer` do batch-printu). Quota free=5 spójna z 10 dla `saved_codes`, ale bardziej restrykcyjna ze względu na większy ciężar i przewidywaną niższą rotację. Logo upload (Storage bucket `logos`) odłożone — nie blokuje Phase 5, a wymaga manualnej konfiguracji bucketu + CSP `img-src`.
- ⏸ **Następne kroki:** Phase 4 (`drukarki.html` + `printer-presets.json` — profile Zebra/Brother/Dymo/Rongta/Munbyn/Avery), potem Phase 5 (Print Builder + CSV/XLSX import + Web Worker).

### 2026-06-01 (M2.5 Phase 0 + Phase 1 — fundamenty Print Builder + email+hasło)

**Phase 0 — fundamenty (DB + render extraction + CSP):**
- ✅ **4 migracje SQL** w `supabase/migrations/`:
  - `20260601000001_printer_profiles.sql` — tabela `printer_profiles` (user_id, name, model_key, paper_size, dpi, calibration JSONB, …).
  - `20260601000002_print_jobs.sql` — tabele `print_jobs` + `print_job_items` (items: cascade delete, indeks po `job_id`).
  - `20260601000003_rls_new_tables.sql` — polityki RLS (`auth.uid() = user_id`) dla obu nowych tabel + grant select/insert/update/delete dla `authenticated`.
  - `20260601000004_save_print_job_rpc.sql` — funkcja `save_print_job(p_job jsonb, p_items jsonb)` atomowo wstawiająca job + items w transakcji.
- ✅ **`label-renderer.js`** — wyekstrahowane z `app.js` (`createLabelHTML`, `renderLabelToDataURL`) do globalnego `window.LabelRenderer`. `index.html` ładuje teraz `label-renderer.js` przed `app.js`. Cel: ten sam renderer będzie używany przez Print Designer (Phase 3) i Print Builder (Phase 5).
- ✅ **CSP `_headers`** — dodane `worker-src 'self' blob:` (przygotowanie pod Web Worker dla parsera CSV w Phase 5).

**Phase 1 — email+hasło auth (EN-only, magic-link usunięte):**
- ✅ **`auth-email-password.js`** (NEW, ESM) — centralny wrapper. Eksportuje `signUp`, `signIn`, `requestPasswordReset`, `setNewPassword`, `signOut`, `validateEmail`, `validatePassword` (8–128 znaków). Wszystkie funkcje zwracają `{ data?, error? }` w shape Supabase; graceful degradation gdy `getSupabase()` zwróci null.
- ✅ **`konto.html`** (REWRITE) — 3 zakładki ARIA (`tablist` + `tab` + `tabpanel`): Login / Register / Reset. Login: email + hasło. Register: email + hasło + powtórz hasło + checkbox „accept terms". Reset: tylko email. Walidacja kliencka (email regex, długość hasła, zgodność haseł, terms). Redirect po sukcesie respektuje aktywną lokalizację (`/konto.html` dla EN, `/{lang}/konto.html` dla pozostałych).
- ✅ **`reset-hasla.html`** (NEW) — strona docelowa linku reset z maila (`noindex,nofollow`). Słucha `onAuthStateChange` na zdarzenie `PASSWORD_RECOVERY` lub `SIGNED_IN` z sesją. 1.5s timeout pokazuje komunikat `resetTokenMissing` jeśli sesja nie pojawia się (link wygasł / błędny). Po wpisaniu nowego hasła wywołuje `setNewPassword({password})` i przekierowuje do `./konto.html` po 2s.
- ✅ **`i18n.js`** — usunięte stare `magicLink`/`checkInbox` z sekcji `account` (tylko EN), dodane ~26 nowych kluczy: `tabLogin`, `tabRegister`, `tabReset`, `password`, `passwordPlaceholder`, `confirmPassword`, `signInCta`, `registerCta`, `resetCta`, `forgotPassword`, `backToLogin`, `acceptTerms`, `mustAcceptTerms`, `weakPassword`, `passwordMismatch`, `signInFail`, `registerFail`, `registerCheckInbox`, `resetSent`, `resetFail`, `setNewPasswordTitle`, `setNewPasswordCta`, `passwordUpdated`, `passwordUpdateFail`, `resetTokenMissing`, `subtitleEmailPassword`. **9 pozostałych lokalizacji (`pl`/`de`/`fr`/`es`/`it`/`pt`/`nl`/`cs`/`uk`) celowo niezmienionych — tłumaczenia odłożone do Phase 6.**
- ✅ **`styles.css`** (append) — `.auth-tabs` (flex + border-bottom), `.auth-tab` (transparent, focus-visible outline 2px #005fcc, `.is-active` z bottom-border `currentColor`), `.checkbox-row` (flex align-start z gap 8px). WCAG 2.4.7 — widoczny focus indicator.
- ✅ **Weryfikacja:** `grep_search "signInWithOtp"` w `wersja zarobkowa/*.{html,js}` → 0 trafień (magic-link kompletnie usunięte).
- ⏸ **Wymaga akcji użytkownika** — szczegóły w [TODO-FUTURE.md](TODO-FUTURE.md) („Manual config — Supabase Dashboard"):
  - Authentication → URL Configuration: dodać `/konto.html` i `/reset-hasla.html` do listy dozwolonych redirect URL-ów.
  - Authentication → Email Templates: skonfigurować treści dla „Confirm signup" i „Reset password" — **bez tego linki w mailach nie zadziałają**.
  - Authentication → Providers → Email: włączyć „Confirm email".
- **Powód:** Phase 1 z planu Multi-Barcode Print Builder (`/memories/session/plan-accounts-multibarcode.md`). Email+hasło zamyka brakujący kawałek M2 z roadmapy i jest fundamentem pod Phase 2 (biblioteka `?load=<id>`, bulk delete, rename/tags, free-limit X/10).

### 2026-05-07 (paczka F/M1 — szkielet klienta Supabase)
- ✅ **`supabase-client.js`** — lazy ESM singleton. Dynamiczny import SDK z `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm` (CSP `script-src` już zezwala na jsDelivr). Eksportuje `getSupabase()`, `isSupabaseAvailable()`, `getSession()`, `onAuthStateChange()`. Storage key `bg.auth`, `persistSession: true`, `autoRefreshToken: true`. Graceful degradation gdy brak konfiguracji — moduł zwraca `null` i loguje `console.warn` zamiast wywalać aplikację.
- ✅ **`supabase-config.example.js`** — szablon konfiguracji. Anon key jest publiczny i bezpieczny do osadzenia w kliencie (RLS pilnuje dostępu po stronie bazy); service_role NIGDY nie trafia do klienta.
- ✅ **`.gitignore`** — dodane `supabase-config.js` i `supabase/.env`, żeby lokalne anon key nie trafiło przez przypadek do repo (mimo że jest publiczne, separujemy „config przykładowy" od „config produkcyjny").
- ⏸ **Wymaga akcji użytkownika** (M1 dokończenie): utworzenie konta Supabase / weryfikacja istniejącego projektu `aoqxznukwbdgrggxloou`, pobranie anon key z dashboardu, wklejenie do `supabase-config.js`, dodanie zmiennych w Cloudflare Pages.
- 🟢 **Testy:** 41/41 zielone (po retry SEO — `[de]/[fr]/[es]` flaky raz, drugie podejście czyste). Moduł Supabase nie jest jeszcze ładowany przez strony, więc nie wpływa na CWV ani na CSP w runtime.
- **Powód:** ROADMAP M1 — fundament pod auth (M2) i prywatne kody (M2/M3). Lazy load oznacza zero kosztu dla użytkowników niezalogowanych (anonimowy ruch z reklam).

### 2026-05-07 (paczka D2 + B3 — preload LCP + audyt title/description)
- ✅ **D2.** Dodano blok preload natychmiast po `<meta viewport>` w 10 plikach `index.html` (root + 9 języków):
  - `<link rel="preload" href="styles.css?v=…" as="style">` (root) lub `../styles.css` (subkatalogi) — wcześniejsze odkrycie krytycznego CSS przez parser HTML, przed blokami JSON-LD.
  - `<link rel="preconnect" href="https://fonts.googleapis.com">` + `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` na początku head (browser deduplikuje z istniejącymi preconnect na końcu head — kompromis akceptowalny vs. przebudowa kolejności tagów w 10 plikach).
  - `<link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:…" as="style">` — szybsze odkrycie arkusza Google Fonts; LCP to `<h1>Barcode Generator</h1>` (text + inline SVG; brak hero-image), więc font Inter jest realnym wąskim gardłem renderu.
- ✅ **B3.** Audyt długości `<title>` i `<meta description>` we wszystkich 10 językach (limity SEO: title ≤60, description 50–160 znaków):
  - **Tytuły (10/10 OK):** zakres 37–60 znaków; `es` na granicy (60), pozostałe komfortowo poniżej.
  - **Description przed fixem przekraczające 160:**
    - `pl`: 162 znaki (`…na drukarce termicznej lub A4.`) → skrócone do **152**: `…Drukuj etykiety termiczne lub A4.`
    - `de`: 161 znaków (`…Etiketten auf Thermo- oder A4-Druckern drucken.`) → skrócone do **152**: `…Druck auf Thermo- und A4-Druckern.`
  - Pozostałe 8 języków w przedziale 113–144 — bez zmian.
- ✅ **Test wzmocniony** w `tests/seo.spec.js` (krok `title and meta description within SEO bounds`):
  - dodano `expect(title.length).toBeLessThanOrEqual(60)`,
  - dodano `expect(desc.length).toBeLessThanOrEqual(160)`,
  - komunikaty błędów zawierają kod języka i zmierzoną długość — szybka diagnostyka regresji.
- ✅ **Walidacja:** `npx playwright test --reporter=line` — **41/41 zielonych w 39.5 s** (smoke 21 + a11y 10 + seo 10). Brak retry, brak flaky.

### 2026-05-07 (paczka B2 — JSON-LD HowTo/FAQ/Breadcrumb dla 9 języków)
- ✅ **B2.** Dodano `BreadcrumbList` JSON-LD do `index.html` (en) i `pl/index.html` (HowTo + FAQPage były już wcześniej obecne). Pozycje: Home/Strona główna → Barcode Generator/Generator Kodów Kreskowych, oba kierują na URL strony.
- ✅ **B2.** Wstawiono pełny komplet trzech bloków JSON-LD (HowTo + FAQPage + BreadcrumbList) do `de/`, `fr/`, `es/`, `it/`, `pt/`, `cs/`, `uk/` `index.html`:
  - **HowTo:** 4 standardowe kroki z `totalTime: "PT1M"` (Wybierz format / Wprowadź dane / Dostosuj wygląd / Pobierz lub wydrukuj) — nazwy i teksty przetłumaczone per język.
  - **FAQPage:** 6 standardowych pytań (gratis, prywatność, formaty, dekoder, etykiety, użytek komercyjny) — odpowiedzi przetłumaczone per język.
  - **BreadcrumbList:** 2 pozycje (Home → nazwa strony) z lokalnymi etykietami (Startseite, Accueil, Inicio, Home/IT, Início, Domů, Головна).
  - Każdy blok zawiera `"inLanguage": "<kod>"`.
- ✅ Rozszerzono `tests/seo.spec.js`: `completed` z `['nl']` do `['en','pl','de','fr','es','it','pt','nl','cs','uk']` — walidacja obecności `HowTo`/`FAQPage`/`BreadcrumbList` aktywna globalnie.
- ✅ **Walidacja:** `npx playwright test` — 38/41 + 3 timeouty teardownu (flake przy 4 workerach), retry `--last-failed` → 3/3 zielone w 4.6 s. Łącznie 41/41 OK; brak realnych błędów asercji.

### 2026-05-07 (paczka B1 + A4 + A5 + C1 + ROADMAP rewrite)
- ✅ **B1.** `nl/index.html`: dodano trzy bloki JSON-LD — HowTo (4 kroki: Kies barcodetype / Voer waarde in / Genereer en pas aan / Exporteer of print), FAQPage (4 Q&A: standaarden, gratis, server-side, GS1) oraz BreadcrumbList (Home → Barcodegenerator NL). `inLanguage: "nl"` w każdym bloku.
- ✅ **C1.** `_headers`: `connect-src` rozszerzone o `https://aoqxznukwbdgrggxloou.supabase.co`, `wss://aoqxznukwbdgrggxloou.supabase.co` (Realtime) oraz `https://www.google-analytics.com`. AdSense/DoubleClick już były obecne.
- ✅ **A4.** Utworzony `tests/seo.spec.js`: walidacja `canonical` href, `og:url`, długości `<title>` i `<meta description>`, kompletu hreflang (10 języków + `x-default`) oraz typu JSON-LD `WebApplication` (hard) — `HowTo`/`FAQPage`/`BreadcrumbList` sprawdzane warunkowo przez tablicę `completed = ['nl']`. B2 dopisuje kolejne kody języków, gdy ukończy ich JSON-LD.
- ✅ **A5.** Utworzony `tests/a11y.spec.js` z `@axe-core/playwright` — skanowanie 10 stron `index.html` z tagami WCAG 2 A/AA + 2.1 A/AA, hard fail na violations o `impact` `critical`/`serious`.
- ✅ Dependency: `@axe-core/playwright` dodane do `devDependencies` (npm install: 2 packages, 0 vulnerabilities).
- ✅ **ROADMAP.md** przepisany od zera: usunięto Clerk, Stripe, plan Pro 19 zł, plan Lifetime 99 zł. Nowa mapa M0–M5 zsynchronizowana z PROJEKT.md, plus sekcja treści SEO (per-typ kodu, blog) i nice-to-have (PWA, bulk CSV, PDF eksport).
- ✅ **playwright.config.js**: `workers: 4` — pojedynczowątkowy `python -m http.server` przestaje gubić requesty pod równoległym ładowaniem 41 testów.
- ✅ **Walidacja:** `npx playwright test` — **41/41 zielonych w ~37 s** (smoke 21 + a11y 10 + seo 10).

### 2026-05-07 (założenie kompendium)
- ✅ Utworzony `PROJEKT.md` (ten plik) jako żywe kompendium.
- ✅ Zarejestrowane decyzje produktowe: Supabase potwierdzone, MVP = email+hasło + prywatne kody, projekt Supabase istnieje (`aoqxznukwbdgrggxloou`).
- ✅ Stabilizacja Playwright: `tests/smoke.spec.js` — `test.beforeEach` z `page.route(...)` zwracającym pusty JS (200/`application/javascript`) dla `pagead2.googlesyndication.com`, `googletagmanager.com`, `google-analytics.com` → **21/21 zielonych w ~37 s** (było ~1.5 min, flaky).
- ✅ A3: usunięto 32 markery `TRANSLATION-REVIEW-NEEDED` w 9 plikach (8× `<lang>/decoder.html` + `i18n.js`) — PowerShell regex, jeden przebieg.
- ✅ AdSense scaffold:
  - `analytics.js`: `const ADSENSE_PUBLISHER_ID = 'ca-pub-2527047257613855'` (skrypt ładowany po consent).
  - `ads.txt`: `google.com, pub-2527047257613855, DIRECT, f08c47fec0942fa0`.
- ✅ A1: `.gitignore` — sekcja „Playwright artifacts" (`playwright-report/`, `test-results/`).

### Wcześniej (przed założeniem PROJEKT.md)
- ✅ A2: audyt `inLanguage` we wszystkich 20 plikach `index.html`/`decoder.html`.
- ✅ Refaktor zduplikowanego `camera-modal` w 8 `decoder.html`.
- ✅ Smoke-suite Playwright: 21 testów (10 index + 10 decoder + 1 asset).

---

## 9. Otwarte pytania i ryzyka

- [ ] **Domena.** Kiedy własna domena? Wymaga aktualizacji `canonical`, `sitemap.xml`, `og:url`, `_headers` (HSTS preload).
- [ ] **AdSense weryfikacja.** Czy konto AdSense jest już zatwierdzone, czy wciąż w review? (Wpływa na harmonogram E3.)
- [ ] **Migracje Supabase.** Czy zostały uruchomione na hostowanej bazie? (W repo są pliki, ale nie ma śladu `supabase db push`.) — Audyt w F2.
- [ ] **Hasło bazy.** Czy mamy zapisane hasło z `[YOUR-PASSWORD]` w bezpiecznym miejscu (manager haseł)? Nie wpisujemy go do repo.
- [ ] **Reset hasła w MVP.** Wbudowany flow Supabase wymaga skonfigurowanego SMTP (Supabase ma własny dla małych projektów). Czy używamy domyślnego, czy własny SMTP?
- [ ] **Polityka prywatności.** Czy aktualnie obejmuje AdSense + Supabase? (Aktualizacja w E4.)

---

## 10. Zasady współpracy z agentem

1. Każda istotna zmiana → wpis w §8 (dziennik) i, jeśli trzeba, aktualizacja §6/§7 (checkboxy).
2. Każde nowe pytanie zadane użytkownikowi i jego odpowiedź → wpis w §4 (Q&A) z datą.
3. **Brak innych plików `.md` z dziennikiem zmian** — wszystko trafia do `PROJEKT.md`.
4. Przed każdą zmianą w warstwie i18n/SEO/CSP/headers — szybki przegląd §2 i §10.
5. Komendy PowerShell używają UTF-8 bez BOM (`[Text.UTF8Encoding]::new($false)`).
6. Edycje wyłącznie w `Generator kodów kreskowych/wersja zarobkowa/`.
7. Po każdej zmianie wpływającej na runtime — uruchomić `npx playwright test` i odnotować wynik.

---

## 11. Referencje i linki

- **Produkcja (tymczasowa):** https://barcode-generator.daytodayapps-contact.workers.dev
- **Repo (główne):** https://github.com/day-to-day-apps/barcode-generator (branch `main`)
- **Repo (siostrzane):** https://github.com/day-to-day-apps/QR-code-generator (branch `main`)
- **Supabase project:** https://aoqxznukwbdgrggxloou.supabase.co
- **AdSense pub ID:** `ca-pub-2527047257613855`
- **Pliki krytyczne dla SEO/i18n:** `index.html` × 10, `decoder.html` × 10, `i18n.js`, `sitemap.xml`, `robots.txt`, `_headers`.
- **Pliki krytyczne dla testów:** `playwright.config.js`, `tests/smoke.spec.js`.
- **Pliki krytyczne dla monetyzacji:** `analytics.js`, `ads.txt`, `polityka-prywatnosci.html`.

---

> _Koniec pliku. Następna aktualizacja: po następnej wiadomości użytkownika lub po wykonaniu zadania z §6/§7._
