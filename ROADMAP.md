# Barcode Generator — Roadmap 2026

> **Status:** Aktualna mapa drogowa po decyzji **Supabase + free-with-ads**.
> Stara wersja (Clerk + Stripe + Pro 19 zł) jest **zarchiwizowana w historii Git**.
> Pełny kontekst i kompendium → [`PROJEKT.md`](./PROJEKT.md).
> Ostatnia aktualizacja: **2026-05-07**.

---

## TL;DR

- **Model:** aplikacja darmowa, monetyzacja przez Google AdSense.
- **Backend:** Supabase (PostgreSQL + Auth + RLS) — projekt `aoqxznukwbdgrggxloou`.
- **Stack:** vanilla JS / HTML / CSS, hosting Cloudflare Pages.
- **MVP konta:** email + hasło, prywatne kody.
- **Brak Stripe.** Brak planów płatnych.
- **Wersjonowanie kamieni milowych:** M0 → M5 (zob. niżej).

---

## Kamienie milowe

### M0 — Stabilizacja jakości i monetyzacji statycznej (TERAZ)
Cel: zielone testy, czyste SEO/i18n, AdSense gotowy do włączenia, CSP przygotowany pod Supabase.

- [x] `.gitignore`: artefakty Playwright (`playwright-report/`, `test-results/`).
- [x] Audyt `inLanguage` w 20 plikach HTML.
- [x] Czyszczenie 32 markerów `TRANSLATION-REVIEW-NEEDED` (9 plików).
- [x] AdSense scaffold: pub ID w `analytics.js`, `ads.txt`.
- [x] Stabilizacja Playwright: stub sieciowy AdSense/GA → smoke 21/21 zielonych.
- [x] B1. JSON-LD HowTo + FAQPage + BreadcrumbList w `nl/index.html`.
- [x] CSP w `_headers`: dodanie Supabase + Google Analytics do `connect-src`.
- [x] A4. `tests/seo.spec.js` (canonical, og:url, hreflang, JSON-LD `@type`).
- [x] A5. `tests/a11y.spec.js` z `@axe-core/playwright`.
- [x] B2. Audyt JSON-LD w pozostałych 9 `index.html`. — Wszystkie 11 plików (root + 10 lokalizacji) mają komplet 4 typów: WebApplication, HowTo, FAQPage, BreadcrumbList. Treści zlokalizowane per język.
- [x] B3. Audyt `<title>` i `<meta description>` (długość, unikalność per język). — Wszystkie 10 lokalizacji w spec (title ≤60, description ≤160), unikalne, brak edycji.
- [x] D2. Preload czcionek + `fetchpriority="high"` na LCP. — Dodano `fetchpriority="high"` do preload Inter (Google Fonts) w 11 plikach `index.html`.
- [x] D3. ~~Stała wysokość slotów AdSense (CLS-safe)~~ → **Collapse-on-unfilled** (zgodnie z decyzją: brak pustych miejsc). Usunięto `min-height` z `.ad-slot` i inline `minHeight` z `<ins>` w `analytics.js`; dodano reguły `:has(ins[data-ad-status="unfilled"])` kolapsujące sloty. AdSense nadal wykrywa pozycje przez markup. Akceptowany trade-off: niewielki CLS gdy reklama się załaduje.

### M1 — Lokalne uruchomienie Supabase
Cel: bezpiecznie połączyć się z istniejącym projektem Supabase i przejrzeć migracje przed pushem.

> **Status: ✅ DONE** — projekt jest już na produkcji (`aoqxznukwbdgrggxloou`) z 11 migracjami obejmującymi M1+M2.5+M3. Migracje aplikowane przez Supabase MCP / dashboard (nie wymaga lokalnego CLI). Audyt 2026-05-21 potwierdza poprawność.

- [x] ~~`supabase login`, `supabase init`, `supabase link --project-ref aoqxznukwbdgrggxloou`.~~ — Pominięte: migracje wgrywane przez Supabase MCP. Lokalne CLI nie jest wymagane do dalszej pracy (Edge Functions wgrane analogicznie).
- [x] ~~`supabase db push --dry-run` na 3 istniejących migracjach.~~ — N/A: jest 11 migracji już zaaplikowanych na prod.
- [x] Audyt migracji (schemat `saved_codes`, kompletność RLS, walidacje). — **Wynik audytu**:
  - Tabele: profiles, saved_codes, label_templates, usage_events, printer_profiles, print_jobs, print_job_items. ~~subscriptions~~ — dropped 2026-05-21 (commit `cb51c40`, migracja `20260613140000_drop_subscriptions.sql`).
  - RLS: pełne CRUD-owner na wszystkich user-data tables; usage_events read-only (write przez service_role/RPC); print_job_items ownership via parent EXISTS subquery.
  - SECURITY DEFINER funkcje mają `revoke execute from public/anon/authenticated` + `set search_path = public`; tylko `save_print_job(jsonb, jsonb[])` ma `grant execute to authenticated` (atomowy z ownership-check).
  - Server-side quoty free tier: saved_codes=10, label_templates=5, printer_profiles=5, print_jobs=20 (AFTER INSERT triggery raise 23514).
  - Walidacje CHECK: rozmiary mm 0-1000, dpi 72-1200, offset ±20mm, bar_width 0.5-1.5, długości stringów na print_job_items, max 500 items per save_print_job.
  - ~~**Uwaga niska priorytet**: tabela `subscriptions` martwa po decyzji 2026-05-07.~~ — **Rozwiązane 2026-05-21**: drop tabeli + enum `subscription_status` + `is_pro()` zwraca stale `false` (free-tier-only). Migracja `20260613140000_drop_subscriptions.sql`.
- [x] ~~`.env.local` (gitignore) z `SUPABASE_URL` + `SUPABASE_ANON_KEY` (publishable).~~ — Zamiast `.env.local` użyto `supabase-config.js` (gitignored przez root `.gitignore`), z `supabase-config.example.js` jako szablon. Lepsze dla static-client (brak build stepu do substytucji env).
- [x] `supabase-client.js` — singleton ESM ładowany dynamicznie (tylko gdy potrzebny). — Lazy `getSupabase()`, dynamic `import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')` zgodne z CSP `script-src cdn.jsdelivr.net`, storageKey `bg.auth`.

### M2 — Auth (email + hasło) i prywatne kody (MVP konta)

> **Status: ✅ DONE** — audyt 2026-05-21 potwierdza pełną funkcjonalność. Testy `auth-save.spec.js` + `m25-account.spec.js` zielone (16/16, 1 skip).

- [x] Strona `/konto.html` (taby login/register/reset) + `/reset-hasla.html`.
- [x] Stan sesji w UI: `auth-ui.js` z `onAuthStateChange`, header „Zaloguj" ↔ menu konta + Sign out.
- [x] Akcja „Zapisz ten kod" w generatorze (widoczna tylko dla zalogowanych, `app.js` + `auth-ui.js`).
- [x] Lista zapisanych kodów `/moje-kody.html` — list/regenerate/rename/bulk-delete/tags/filter (CRUD przez `db-codes.js`).
- [x] Tłumaczenia kluczy `account.*` w `i18n.js` dla 10 języków.
- [x] Test E2E `tests/auth-save.spec.js` — rejestracja → zapis → wylogowanie → relogowanie → kod widoczny.

### M3 — Logowanie Google + magic link

> **Status: ⏭ SKIPPED (out of scope MVP)** — decyzja 2026-05-21. Email/password + reset wystarczają dla MVP. Klucze i18n `magicLink` istnieją jako leftover (do usunięcia w Backlog). Może wrócić po D1+D2 jeśli będzie real-world potrzeba.

- [ ] ~~Konfiguracja OAuth Google w panelu Supabase.~~
- [ ] ~~Przycisk „Zaloguj z Google".~~
- [ ] ~~Magic link jako trzecia metoda.~~

### M4 — Publiczne udostępnianie kodów (opcjonalne)
- [ ] Kolumna `is_public` + losowy `share_slug` (≥12 znaków base62).
- [ ] Polityka RLS: SELECT po `share_slug` gdy `is_public = true`.
- [ ] Strona `/c/<slug>.html` renderowana po stronie klienta.
- [ ] Ochrona przed enumeracją (długi slug + ewentualny rate-limit po stronie Cloudflare).

### M5 — Polish / domena / wizerunek
- [ ] Zakup własnej domeny i przepięcie z `*.workers.dev`.
- [ ] Aktualizacja `canonical`, `sitemap.xml`, `og:url`.
- [ ] Lighthouse CI ≥ 95 dla Performance/SEO/Best/A11y.
- [ ] PWA manifest + service worker (offline cache statyk).

---

## Treści SEO (równolegle do milestone'ów)

> Cel: ruch organiczny z długiego ogona. Strony tworzone jako statyczne HTML w obrębie istniejącej struktury i18n.

### Strony per typ kodu (po jednej na język)
Sugerowana ścieżka: `/<lang>/ean-13/`, `/<lang>/upc/`, `/<lang>/code-128/`, `/<lang>/qr/`.

- [ ] EAN-13 (struktura, suma kontrolna, gdzie kupić prefiks GS1).
- [ ] UPC-A vs UPC-E (różnice, kompatybilność z EAN).
- [ ] Code 128 (zestawy A/B/C, kiedy stosować).
- [ ] QR Code (poziomy korekcji, rozmiar a pojemność).
- [ ] ITF / ITF-14 (kody na opakowaniach zbiorczych).

### Blog (opcjonalnie, M5+)
- [ ] „Jak wygenerować kod EAN-13 do produktu spożywczego" (PL, EN).
- [ ] „Różnica między EAN, UPC i GTIN" (PL, EN).
- [ ] „Czy mogę używać darmowego generatora w sklepie?" (PL, EN).

---

## Nice-to-have (bez przypisanego milestone'a)

- [ ] Dekoder z dłuższych obrazów / batch (kilka kodów na jednym zdjęciu).
- [ ] Eksport listy kodów do PDF (wydruk arkusza etykiet).
- [ ] Bulk import z CSV → generowanie wielu kodów naraz (z poziomu konta).
- [ ] Skrót klawiaturowy „Ctrl+S" w generatorze → szybki zapis do konta.
- [ ] Tryb wysokiego kontrastu (a11y AAA) jako opcja w ustawieniach.

---

## Czego NIE robimy

- ❌ Stripe i płatności jednorazowe / subskrypcyjne (decyzja 2026-05-07).
- ❌ Plan Pro / Lifetime / kupony.
- ❌ Frameworki frontendowe (React/Vue/Svelte).
- ❌ Bundler / npm w runtime.
- ❌ Zewnętrzne API generujące kod (wszystko po stronie klienta).
- ❌ Tracking użytkowników bez consentu.

---

## Definition of Done dla każdego milestone'a

1. Smoke + SEO + a11y w Playwright = zielone (lokalnie i w CI, gdy CI ruszy).
2. CSP w `_headers` zaktualizowane, jeśli doszły nowe domeny.
3. `i18n.js` zawiera wszystkie nowe klucze tekstów dla 10 języków.
4. Wpis w `PROJEKT.md` §8 (dziennik) + odznaczone checkboxy w §6/§7.
5. Sprawdzony manualnie scenariusz produktowy (np. „rejestracja → zapis → wylogowanie → logowanie → widać kod").

---

## Backlog (przeniesione z TODO-FUTURE.md)

> Sekcja zawiera odłożone usprawnienia, zadania manual-config (Supabase Dashboard, Cloudflare Pages) oraz przygotowanie pod Phase 3/5/6.

Odłożone na później zmiany, które wymagają dodatkowej pracy lub koordynacji.

## Security / Headers

### Content-Security-Policy
**Status:** Odłożone — wymaga koordynacji z AdSense.

Aktualnie brak `Content-Security-Policy` w `_headers`. Przed dodaniem CSP trzeba:
1. Zinwentaryzować wszystkie zewnętrzne domeny (obecnie: `cdn.jsdelivr.net`, `flagcdn.com`, `fonts.googleapis.com`, `fonts.gstatic.com`).
2. Sprawdzić czy docelowo zostanie wdrożony Google AdSense — jeśli tak, CSP musi zawierać:
   - `script-src` + domeny Googla (`*.google.com`, `*.googleadservices.com`, `*.googlesyndication.com`, `*.doubleclick.net`)
   - `frame-src`/`child-src` dla iframe'ów reklam
   - `img-src` dla kreacji
   - Trzeba też zdecydować w sprawie `unsafe-inline` vs nonce
3. Przetestować na staging przed deployem produkcyjnym — CSP łatwo zepsuć analytics i reklamy.

Proponowany minimalny CSP (bez AdSense):

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src https://fonts.gstatic.com; img-src 'self' data: https://flagcdn.com; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```

### Inne nagłówki do rozważenia
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`

## i18n — brakujące klucze dekodera

`i18n.js` **nie zawiera** kluczy dekodera (`decoder_decoding`, `decoder_not_found`, `decoder_invalid_file`, `decoder_too_large`, `decoder_copied`, `decoder_copy_failed`, `decoder_format_label`, `decoder_value_label`). Dekoder używa fallbacków w `decoder.js`, więc we wszystkich językach innych niż angielski komunikaty są po angielsku.

Do zrobienia: dodać tłumaczenia dla 10 języków (pl, de, fr, es, it, pt, nl, cs, uk) dla w/w 8 kluczy.

## FAQ + HowTo (dekoder)

Sekcje FAQ/HowTo (Schema.org FAQPage, HowTo) są obecnie dostępne tylko w `index.html` / `pl/index.html`. Decoder nie ma własnej strukturyzacji Schema.org poza WebApplication JSON-LD.

Do zrobienia:
- Dodać `FAQPage` JSON-LD na `decoder.html` (pytania typu „Jakie formaty obsługuje?”, „Czy moje zdjęcia są wysyłane na serwer?”, „Dlaczego nie wykrywa kodu?”).
- Rozważyć `HowTo` („Jak odczytać kod kreskowy ze zdjęcia: 3 kroki”).
- Tłumaczenia dla 10 języków.

## Dekoder — nowe funkcje (opcjonalne)

- **Dropdown 10-języków** na stronach dekodera — obecnie w większości wersji są tylko 2-3 opcje. Skopiować pełny dropdown z `index.html`.
- **Deep-link do generatora** — przycisk „Otwórz w generatorze" po dekodowaniu, przekazujący wartość przez query param (`?value=...&type=...`).
- **Kamera na żywo** — `getUserMedia()` + `ZXing.decodeFromVideoDevice()`. Duża funkcja, ale zwiększyłaby atrakcyjność.
- **Historia ostatnich skanowań** — localStorage, max 10 pozycji, z przyciskiem „Wyczyść historię".

## Audyt w przeglądarce

Audyt statyczny wyłapał dużo, ale niektóre problemy wymagają runtime:
- Layout shift (CLS) — zmierzyć przez Lighthouse / PageSpeed Insights po deployu
- FPS animacji (`meshRotate`, `scanSweep`) na słabszych urządzeniach
- Rzeczywisty kontrast po renderze z gradientami w tle (1.4.3 WCAG)
- Czy `@zxing/library` z `async` ładuje się przed pierwszą interakcją (w praktyce tak, ale warto potwierdzić)
- Test na iOS Safari (clipboard paste może wymagać fallbacku)

Do zrobienia: uruchomić Lighthouse CI lub Chrome DevTools MCP i zweryfikować CWV po deployu.

## Kosmetyka

- Usunąć meta `keywords` z dekoderów (przestarzałe, zero wartości SEO).
- Sprawdzić czy w `styles.css` nie ma duplikatów sekcji FAQ/HowTo (audyt zgłosił podejrzenie).
- Rozważyć zmianę nazw plików przy dużych refaktorach CSS, żeby obejść agresywny cache `styles.css` (`max-age=31536000, immutable` w `_headers`).


## Manual config — Supabase Dashboard (poza repo)

Wymagane do działania flow email+hasło (Phase 1) oraz przyszłych funkcji. **Bez tego linki w mailach nie zadziałają.**

### Authentication › URL Configuration
Dodać do listy **Redirect URLs** (Allow list):
- `https://barcode-generator.daytodayapps-contact.workers.dev/konto.html`
- `https://barcode-generator.daytodayapps-contact.workers.dev/reset-hasla.html`
- Po dodaniu lokalizacji w Phase 6: analogiczne URL-e dla `/pl/`, `/de/`, `/fr/`, `/es/`, `/it/`, `/pt/`, `/nl/`, `/cs/`, `/uk/` (oba pliki w każdej).
- Lokalny development: `http://localhost:8080/konto.html`, `http://localhost:8080/reset-hasla.html` (lub port używany przez `wrangler pages dev`).
- **Site URL**: ustawić na `https://barcode-generator.daytodayapps-contact.workers.dev` (bez trailing slash).

### Authentication › Email Templates
Skonfigurować treści (najlepiej EN-first, potem rozszerzyć):
- **Confirm signup** — temat „Confirm your email — Barcode Generator", body z `{{ .ConfirmationURL }}`, krótki tekst „Click the link below to confirm your email…".
- **Reset password** — temat „Reset your password — Barcode Generator", body z `{{ .ConfirmationURL }}`, krótki tekst „You requested a password reset. Click the link below…". Link powinien prowadzić do `/reset-hasla.html`.
- **Magic Link** — niewykorzystywane (Phase 1 usunęło ten flow), można zostawić default lub wyłączyć.
- **Change Email Address** — analogicznie do reset password.

### Authentication › Providers › Email
- **Enable Email provider:** ON
- **Confirm email:** ON (zalecane — wymusza weryfikację adresu przed pierwszym logowaniem)
- **Secure email change:** ON
- **Secure password change:** ON
- **Minimum password length:** 8 (zgodnie z walidacją w `auth-email-password.js`)

### Authentication › Rate Limits (opcjonalnie)
Zostawić defaulty, ale rozważyć obniżenie limitów dla `/auth/v1/recover` (reset) jeśli zauważymy nadużycia.

---

## Manual config — Cloudflare Pages (poza repo)

### Environment variables (Production + Preview)
- `SUPABASE_URL` = `https://aoqxznukwbdgrggxloou.supabase.co`
- `SUPABASE_ANON_KEY` = publiczny anon key z Supabase Dashboard › Project Settings › API
- Anon key jest bezpieczny do osadzenia w kliencie (RLS pilnuje dostępu). **Service role NIGDY w env Pages.**

### Build configuration
- Bez build command (statyczne pliki). Output directory: katalog z `index.html`.

---

## Manual config — Phase 3 prep (Supabase Storage)

Przed wdrożeniem Phase 3 (szablony etykiet z logo):
- Utworzyć bucket `logos` (Public: OFF).
- Polityka RLS: `auth.uid()::text = (storage.foldername(name))[1]` — user może pisać/czytać tylko pliki w prefiksie `<uid>/...`.
- Limit pliku: 5 MB (ustawiony w bucket settings).
- Allowed MIME types: `image/png`, `image/jpeg`, `image/svg+xml`, `image/webp`.

---

## Manual config — Phase 5 prep (SheetJS via CDN)

Przed wdrożeniem importu XLSX:
- Pin wersję `xlsx@0.20.3` z jsDelivr.
- Wygenerować i wkleić SRI hash do `_headers` (lub bezpośrednio do `<script integrity="…">`).
- Sprawdzić licencję (SheetJS Community Edition = Apache-2.0, OK do projektu komercyjnego).

---

## Phase 1 — odłożone do Phase 6 (tłumaczenia i18n)

`i18n.js` w Phase 1 dostał ~26 nowych kluczy `account.*` (tabLogin, tabRegister, tabReset, password, confirmPassword, signInCta, registerCta, resetCta, acceptTerms, weakPassword, passwordMismatch, registerCheckInbox, resetSent, setNewPasswordTitle, passwordUpdated, resetTokenMissing, subtitleEmailPassword, …) **tylko w lokalizacji EN**. Pozostałe 9 (`pl`, `de`, `fr`, `es`, `it`, `pt`, `nl`, `cs`, `uk`) nadal zawiera stare klucze magic-link (`magicLink`, `checkInbox`) i **nie zawiera** nowych kluczy email+hasło.

Do zrobienia w Phase 6:
- Usunąć `magicLink`/`checkInbox` z 9 lokalizacji.
- Dodać tłumaczenia ~26 kluczy account.* dla 9 lokalizacji (~234 stringi).
- Dodać tłumaczenia przyszłych ~150 kluczy (`designer.*`, `printer.*`, `printJob.*`, `myJobs.*`) × 9 lokalizacji.
- Zaktualizować `subtitleEmailPassword` jako zastępnik `subtitle` w sekcji `account` dla wszystkich lokalizacji.

---

## Phase 6 — pełna lista zadań końcowych

- **sitemap.xml** — dodać nowe strony (`reset-hasla.html`, `szablony.html`, `drukarki.html`, `wydruk.html`, `historia-wydrukow.html`); początkowo tylko EN bez `hreflang` (do uzupełnienia po przetłumaczeniu).
- **PROJEKT.md** — wpis do zmieniła changelog dla M2.5 (Print Builder + Printer Profiles); zaktualizować M2 › ?.
- **Playwright** — 6 spec files: `auth-flow.spec.ts`, `library-crud.spec.ts`, `print-designer.spec.ts`, `printer-profiles.spec.ts`, `print-builder.spec.ts`, `csv-import.spec.ts`.
- **`DOCS-PRINT-BUILDER.md`** (opcjonalnie) — user guide dla sklepów: CSV z magazynu, kalibracja drukarki, troubleshooting.

---

## Przyszłość — egzekwowanie limitów free planu na poziomie DB

Obecnie limity (`saved_codes:10`) są tylko triggerem `enforce_limit_trigger` na `saved_codes`. Po Phase 4/5 dochodzą:
- `label_templates`: 5
- `printer_profiles`: 3
- `print_jobs`: 20 (rolling window 30 dni?)
- `print_job_items` per job: 500

Do zrobienia: rozbudować `check_user_quota(table_name)` (lub osobne triggery per tabela), z możliwością bypassu dla użytkowników Pro (gdy włączymy subskrypcje).
