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
- [ ] B2. Audyt JSON-LD w pozostałych 9 `index.html` — uzupełnić HowTo + FAQPage + BreadcrumbList per język.
- [ ] B3. Audyt `<title>` i `<meta description>` (długość, unikalność per język).
- [ ] D2. Preload czcionek + `fetchpriority="high"` na LCP.
- [ ] D3. Stała wysokość slotów AdSense (CLS-safe).

### M1 — Lokalne uruchomienie Supabase
Cel: bezpiecznie połączyć się z istniejącym projektem Supabase i przejrzeć migracje przed pushem.

- [ ] `supabase login`, `supabase init`, `supabase link --project-ref aoqxznukwbdgrggxloou`.
- [ ] `supabase db push --dry-run` na 3 istniejących migracjach.
- [ ] Audyt migracji (schemat `saved_codes`, kompletność RLS, walidacje).
- [ ] `.env.local` (gitignore) z `SUPABASE_URL` + `SUPABASE_ANON_KEY` (publishable).
- [ ] `supabase-client.js` — singleton ESM ładowany dynamicznie (tylko gdy potrzebny).

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
