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
  - Tabele: profiles, saved_codes, label_templates, subscriptions, usage_events, printer_profiles, print_jobs, print_job_items.
  - RLS: pełne CRUD-owner na wszystkich user-data tables; subscriptions/usage_events read-only (write przez service_role/RPC); print_job_items ownership via parent EXISTS subquery.
  - SECURITY DEFINER funkcje mają `revoke execute from public/anon/authenticated` + `set search_path = public`; tylko `save_print_job(jsonb, jsonb[])` ma `grant execute to authenticated` (atomowy z ownership-check).
  - Server-side quoty free tier: saved_codes=10, label_templates=5, printer_profiles=5, print_jobs=20 (AFTER INSERT triggery raise 23514).
  - Walidacje CHECK: rozmiary mm 0-1000, dpi 72-1200, offset ±20mm, bar_width 0.5-1.5, długości stringów na print_job_items, max 500 items per save_print_job.
  - **Uwaga niska priorytet**: tabela `subscriptions` z polami LemonSqueezy istnieje, ale po decyzji 2026-05-07 (no payments) jest martwym schematem — zostawić (RLS read-only, niegroźne) lub osobny migration drop w M5.
- [x] ~~`.env.local` (gitignore) z `SUPABASE_URL` + `SUPABASE_ANON_KEY` (publishable).~~ — Zamiast `.env.local` użyto `supabase-config.js` (gitignored przez root `.gitignore`), z `supabase-config.example.js` jako szablon. Lepsze dla static-client (brak build stepu do substytucji env).
- [x] `supabase-client.js` — singleton ESM ładowany dynamicznie (tylko gdy potrzebny). — Lazy `getSupabase()`, dynamic `import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')` zgodne z CSP `script-src cdn.jsdelivr.net`, storageKey `bg.auth`.

### M2 — Auth (email + hasło) i prywatne kody (MVP konta)
Cel: zalogowany użytkownik zapisuje wygenerowane kody i widzi je po powrocie.

- [ ] Strona `/konto.html` (lub modal) — rejestracja / logowanie / reset hasła.
- [ ] Stan sesji w UI: header „Zaloguj" ↔ „Mój profil / Wyloguj".
- [ ] Akcja „Zapisz ten kod" w generatorze (widoczna tylko dla zalogowanych).
- [ ] Lista zapisanych kodów `/moje-kody.html` z regeneracją i usuwaniem.
- [ ] Tłumaczenia kluczy `account.*` w `i18n.js` dla 10 języków.
- [ ] Test E2E: rejestracja → zapis kodu → wylogowanie → ponowne logowanie → kod widoczny.

### M3 — Logowanie Google + magic link
- [ ] Konfiguracja OAuth Google w panelu Supabase (Client ID/Secret).
- [ ] Przycisk „Zaloguj z Google" obok formularza email/hasło.
- [ ] (Opcjonalnie) magic link jako trzecia metoda.

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
