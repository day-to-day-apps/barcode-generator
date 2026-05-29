# HANDOFF — prompt do wklejenia w nowy czat

> Skopiuj wszystko poniżej linii `---` i wklej jako pierwsza wiadomość do nowej sesji Copilota. To dostarczy nowemu agentowi pełny kontekst bez konieczności re-odkrywania repo.

---

## Kontekst projektu

Pracuję w workspace **`c:\Users\staz03\Desktop\Copilot Testy`**. Workspace ma **dwa warianty** generatora kodów kreskowych — NIE mieszać:

1. **`Generator kodów kreskowych/`** — wersja firmowa, embed, **3 języki** (pl/en/uk), offline-first, bez SEO/ads/analytics.
2. **`Generator kodów kreskowych/wersja zarobkowa/`** — wersja komercyjna, **10 języków**, Cloudflare Pages, Supabase backend, AdSense, GA4, RODO. **Tu pracujemy.**

Reguła: funkcje (logika/UI/a11y/perf) portuje się w dół (komercyjna → firmowa); marketing/SEO/ads/analytics/consent **nigdy** w dół.

## Co to za stack

- **Frontend:** vanilla JS (ESM), HTML5, CSS3. **Bez frameworków, bez bundlera, bez npm dla buildu.** Node tylko do Playwright i wrangler.
- **Backend:** Supabase (Postgres + Auth + RLS), projekt `aoqxznukwbdgrggxloou`.
- **Hosting:** Cloudflare Pages → domena `https://barcode-generator.daytodayapps.com` (auto-deploy z `main`).
- **i18n:** 10 locales (root = en + `pl/ de/ fr/ es/ it/ pt/ nl/ cs/ uk/`). Tłumaczenia w `i18n.js` (`LANG_PACK = { ui, faq }`).
- **Monetyzacja:** Google AdSense (collapse-on-unfilled, Pub `ca-pub-2527047257613855`). GA4 measurement ID — sprawdź `analytics.js:8` czy jest wstawione.
- **Powiązane repo:** <https://github.com/day-to-day-apps/barcode-generator>, branch `main`.

## Aktualny stan (HEAD = `origin/main` = `0b69ec9`)

W sync z prod. Ostatnie zrealizowane milestones:

- **M1** auth/save/limity — done.
- **M2 audit** — done (Stripe SKIPPED, MVP bez płatności).
- **M3** PDF/analytics — SKIPPED jako out-of-scope MVP.
- **M4** public sharing — done end-to-end:
  - Migracja `is_public + share_slug` + `get_shared_code` RPC (`00a0017`).
  - UI toggle + copy link w `/moje-kody.html`, 10 lokali (`af5161e`).
  - Cloudflare Pages Function SSR `/c/[slug]` z OG tags (`22131d5`).
  - E2E test (`59c31dd`).
- **M5** search/filter w `/moje-kody.html` — done + testy (`846b8bf`, `1b0535e`).
- **Drop subscriptions table** (`cb51c40`) — `is_pro()` zwraca false, monetyzacja tylko AdSense.
- **Canonical domain enforcement** — 301 z `*.pages.dev` → `daytodayapps.com` (`0b69ec9`).
- **UTF-8 recovery** — naprawione mojibake we flagach + select arrow po feralnym commicie `0d8499c` (commity `314f2bd`, `b75a631`).

## Kluczowe pliki do nawigacji

**ZAWSZE czytaj najpierw**: [Generator kodów kreskowych/wersja zarobkowa/AGENTS.md](Generator%20kodów%20kreskowych/wersja%20zarobkowa/AGENTS.md) — to mapa repo (drzewo plików, eksporty modułów, mapa sekcji `styles.css`, częste przepisy).

Najważniejsze:

| Plik | Rola |
|---|---|
| `app.js` | Generator główny (JsBarcode + QRious), ~40 KB monolit |
| `decoder.js` | ZXing scanner + batch CSV + EXIF rotate |
| `i18n.js` | 10 locales × 2 sekcje (ui + faq), ~179 KB. Sekcje: `pl@5, en@100, de@195, fr@290, es@385, it@480, pt@575, nl@670, cs@765, uk@860`; FAQ od 959+. |
| `auth-ui.js` / `auth-email-password.js` / `supabase-client.js` | Auth flow |
| `db-codes.js / db-templates.js / db-printers.js / db-jobs.js` | CRUD per tabela z limitami free-tier |
| `nav-enhance.js` | Modern pill-nav + auth-gating `[data-signed-in="required"]` |
| `analytics.js` | Cookie consent + GA + AdSense (RODO-compliant) |
| `print-builder.js` / `label-renderer.js` | Sheet print + JsBarcode → SVG z `bar_width_correction` |
| `functions/c/[slug].js` | Cloudflare Pages Function — SSR shared code preview |
| `_headers` / `_redirects` / `sitemap.xml` / `robots.txt` / `ads.txt` | Deploy/SEO config — **nie usuwać** |
| `styles.css` | 112 KB monolit. Mapa sekcji w AGENTS.md. |

Limity free-tier (egzekwowane DB triggerami i UI): codes=10, templates=5, printers=5, jobs=20, items/job=500.

## Konwencje — musisz przestrzegać

### Język
- Odpowiadaj **po polsku** (rozmawiam po polsku).
- W kodzie: identyfikatory po angielsku, komentarze po polsku OK.
- Komentarze typu `<!-- Open Graph -->` w HTML **zachowuj**.

### i18n — krytyczne
- Każdy nowy string idzie do **wszystkich 10 sekcji** w `i18n.js`.
- W HTML: `<span data-i18n="section.key">…</span>`.
- W JS: `t('section.key')`.
- Jeśli zmieniasz tekst w `index.html` (root, EN) → replikuj do 9 subdirs (`pl/ de/ fr/ es/ it/ pt/ nl/ cs/ uk/`).
- Nie psuj `hreflang`, `canonical`, Schema.org JSON-LD, Open Graph, Twitter Card.

### Encoding — krytyczne (PL Windows + PowerShell 5.1)
- Pliki są **UTF-8 bez BOM**.
- Windows codepage = **cp1250** (NOT cp1252). PS 5.1 `Get-Content`/`Set-Content`/`Out-File` bez `-Encoding utf8NoBOM` **korumpują UTF-8 → cp1250 mojibake**.
- Niektóre bajty (0x81, 0x83, 0x88, 0x90, 0x98) są nieprzypisane w cp1250 → `U+FFFD` (LOSSY, nieodwracalne).
- **Cyrylica i polskie znaki = wysokie ryzyko.**
- **Safe write methods**:
  1. `replace_string_in_file` tool (preferowane).
  2. Node: `fs.writeFileSync(p, t, 'utf8')`.
  3. PS: `[System.IO.File]::WriteAllText($p, $c, [System.Text.UTF8Encoding]::new($false))`.
- Recovery: `git show <commit>:<path>` (ostatni czysty baseline przed restrukturyzacją kamerą: `ebe9462`).

### CSS pitfall
- `background:` shorthand **resetuje** sub-właściwości. Jeśli base ma `background-image: url(...arrow...)`, themed override musi używać `background-color:` (nie `background:`), inaczej strzałka SVG TILE-uje się pionowo. Dotyczy `select` i `input[type="text"]` w light/dark × base/focus.

### Frequent code bugs (lessons learned)
- `getSession()` zwraca `{ data: { session } }` — destrukturyzuj `{ session }`, nie `const session = await…`.
- `<svg aria-hidden="true" focusable="false">` — nie `hidden`.
- `onAuthStateChange`: reload danych tylko na `SIGNED_OUT`, nigdy na `INITIAL_SESSION` (powoduje migotanie).
- Auth-gating: HTML `data-signed-in="required"` + CSS `:4407+` w `styles.css`.
- Subdir locale (`pl/`, `de/` …) zwykle nie mają `nav-enhance.js` w `<head>` — fallback `annotateExistingLinks()`.

### Branch & deploy
- Conventional commits: `feat:`, `fix:`, `chore:`, `feat(scope):` itd.
- `git push origin main` → auto-deploy Cloudflare Pages.
- **NIE commituj bez wyraźnej zgody przy zmianach UX.** Zmiany krytyczne (canonical, schema, _headers, _redirects, supabase config) — pokaż diff PRZED commitem.

### Czego NIE robić
- Nie konwertuj na framework (React/Vue/jQuery), nie dodawaj bundlera ani `package.json` dla buildu produkcyjnego.
- Nie dodawaj trackerów / zewnętrznych skryptów bez aktualizacji CSP w `_headers` i zgody.
- Nie zmieniaj URL-i canonicznych / domeny bez potwierdzenia.
- Nie usuwaj `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, `ads.txt`.
- Nie twórz plików `.md` dokumentujących zmiany, chyba że proszę.
- **Wszystko musi działać client-side** — żadnych żądań z danymi użytkownika do serwera trzeciego (poza Supabase i AdSense/GA z consent).

## Następne otwarte zadania (z ROADMAP)

W kolejności sugerowanego priorytetu — czekam aż wybierzesz:

1. **D2 — SEO content per typ kodu** (5 typów: EAN-13, UPC, Code-128, ITF, QR) × 10 lokali. Osobne strony `/ean-13/`, `/qr/` itd. z FAQ + HowTo. Wymaga rozszerzenia `sitemap.xml` (+~50 URL) i replikacji do subdirs.
2. **E — Lighthouse CI ≥95 we wszystkich kategoriach** + GitHub Action `lhci autorun`. Opcjonalnie PWA manifest.
3. **Polish post-launch** (z `plan-go-live.md` Faza 4): JSON-LD per locale (`index.html`), decoder i18n keys (8 brakujących × 9 lokali), decoder FAQPage + HowTo schema, meta description audit, LCP optimization (`fetchpriority="high"` na hero + preload woff2).
4. **Bug/UX bugfixy** zgłoszone przez Ciebie — czekam na listę.

Jeśli odkryjesz coś krytycznego po drodze (security, a11y violation, broken flow w prod) — zgłoś PRZED rozpoczęciem D2/E i pozwól zdecydować priorytet.

## Pliki pamięci (`/memories/`)

W trakcie pracy konsultuj:
- `/memories/repo/wersje.md` — różnice firma vs zarobkowa.
- `/memories/repo/barcode-nav.md` — szybka mapa pułapek.
- `/memories/repo/encoding.md` — pełne recovery instructions.
- `/memories/repo/css-pitfalls.md` — `background:` shorthand bug.
- `/memories/session/plan.md` — bieżący plan sesji.
- `/memories/session/plan-go-live.md` — plan post-launch polish.

Globalne zasady: `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md` (a11y WCAG 2.2 AA, performance Core Web Vitals, security OWASP Top 10 2025, seo-i18n, privacy-gdpr, cloudflare-pages, barcode, adsense).

## Pierwsze kroki dla Ciebie (nowy agent)

1. Przeczytaj `Generator kodów kreskowych/wersja zarobkowa/AGENTS.md` (5 min).
2. Sprawdź `git status` i `git log --oneline -10` w `wersja zarobkowa/`.
3. Sprawdź `/memories/session/plan.md` — to mój status quo.
4. Zapytaj mnie, którym zadaniem zacząć (D2 / E / Polish / bugfix).
5. **Nie pushuj nic dopóki nie powiem.**

Zaczynamy. 🚀
