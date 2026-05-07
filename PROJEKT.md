# PROJEKT.md — Kompendium projektu „Generator Kodów Kreskowych" (wersja zarobkowa)

> **Żywy dokument.** Aktualizowany po każdej istotnej wiadomości / zmianie.
> Ostatnia aktualizacja: **2026-05-07**
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
