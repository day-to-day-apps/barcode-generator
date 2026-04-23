# Barcode Generator — Roadmap 2026

> **Status:** v1.0 live, 10 języków, AdSense w weryfikacji, brak backendu.
> **Cel:** Freemium SaaS, domena `.com`, zasięg globalny, przejście z reklam na subskrypcje.
> **Konto projektu:** `day-to-day-apps` (GitHub org) + `daytodayappscontact@gmail.com`.

---

## ✅ Decyzje podjęte

| Temat | Decyzja | Komentarz |
|---|---|---|
| Płatna wersja + konta | ✅ TAK | Clerk (auth) + Stripe (płatności) |
| Auth provider | ✅ **Clerk** | Free do 10k MAU, szybszy start niż Supabase |
| Google OAuth | ✅ TAK | Wbudowane w Clerk |
| EN jako domyślny | ✅ TAK | EN → `/`, PL → `/pl/` |
| Domena `.com` | ✅ TAK | Lista nazw — później |
| Kolejność prac | ✅ **EN migracja → domena → backend** | Zmiana URL po dodaniu userów = koszmar |
| Ceny | 🟡 Pro **19 zł/mc** (~$4.75), roczna 15 zł/mc | 10 zł za nisko na pokrycie kosztów backendu |
| Life Deal | ✅ 99 zł jednorazowo (pierwszych 100 userów) | Boost startowy |
| Business tier | ⏸ Później | Po pierwszych 50 płatnych userach |
| QR generator | ⏸ **Osobna bliźniacza strona** + osobne SEO | Później |
| QR decoder | ✅ **TAK, wysoki priorytet** | Duży ruch SEO, łatwo dodać |
| Landing page | ❌ **NIE** | Od razu narzędzie = wyższa konwersja dla utility SaaS |
| SEO przez ukryte nagłówki | ⚠️ **Ostrożnie** | Ukryte treści (`display:none`) = penalizacja Google. Zamiast: widoczny H1 + FAQ pod toolem + per-type landing pages |
| Działalność gospodarcza | ❌ Brak | Stripe jako osoba fizyczna (PL: limit ~14k PLN/mc) — OK na start |
| Stack | ✅ Cloudflare + Clerk + Stripe | $0/mc na starcie |

---

## 📦 Migracja konta (DO ZROBIENIA TERAZ)

### Co Ty musisz zrobić w przeglądarce:
1. **Stwórz org na GitHub** — zaloguj się na `daytodayappscontact@gmail.com` → [github.com/organizations/new](https://github.com/organizations/new) → nazwa: `day-to-day-apps`, plan Free
2. **Stwórz pusty repo** w org: [github.com/new](https://github.com/new) → Owner: `day-to-day-apps`, name: `barcode-generator`, publiczne, **bez README** (mamy już historię)
3. **Usuń stary repo** (po weryfikacji że push działa): [github.com/IgorGerc/Generator-kodow-kreskowych/settings](https://github.com/IgorGerc/Generator-kodow-kreskowych/settings) → Delete
4. **Nowe konto Cloudflare** na `daytodayappscontact@gmail.com` — [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
5. **Usuń stary Cloudflare project** (po uruchomieniu nowego)

### Co zrobię ja (jak dasz sygnał "repo stworzone"):
- `git remote set-url origin https://github.com/day-to-day-apps/barcode-generator.git`
- `git push -u origin main`
- Update `DEPLOY-CHECKLIST.md` z nowymi linkami
- Update URL-i w projekcie (skrypt PowerShell) po redeploy na nowym Cloudflare

---

## 🗺 Plan: 6 faz

### **Faza 4 — Migracja EN + nowa infrastruktura** (1–2 tyg.) 🔴

#### 4.1 Migracja repo (dziś/jutro)
- [ ] Ty: org `day-to-day-apps` + pusty repo `barcode-generator`
- [ ] Ja: zmiana remote, push historii, update linków
- [ ] Ty: nowe Cloudflare Pages, podpięcie repo
- [ ] Ja: update URL w projekcie na nowy `*.pages.dev`

#### 4.2 EN jako domyślny
- [ ] Przenieś PL z `/` → `/pl/` (cały folder)
- [ ] Przenieś EN z `/en/` → `/` (root)
- [ ] 301 redirects w `_redirects` dla starych PL URL-i
- [ ] Update wszystkich plików (canonical, hreflang, og:url, og:locale, sitemap, Schema.org)
- [ ] Default lang w `app.js`: `'en'`
- [ ] Dropdown: EN pierwszy, PL drugi
- [ ] Zgłoś zmianę w Google Search Console

#### 4.3 Domena `.com` (gdy gotów)
- [ ] Lista 20 propozycji dostępnych domen — poproś kiedy będziesz gotów kupić
- [ ] Rejestracja w Cloudflare Registrar (cena hurtowa, bez markupu)
- [ ] Custom domain w Pages
- [ ] Global find/replace URL-i

#### 4.4 Dokumenty prawne EN
- [ ] `en/terms.html` — Terms of Service
- [ ] `en/privacy.html` — Privacy Policy (GDPR + CCPA + cookies + processors: Clerk, Stripe, Google, AdSense)
- [ ] `en/cookies.html` — Cookie Policy (osobna strona, wymagane przez AdSense + GDPR)
- [ ] `en/refund.html` — Refund Policy (14 dni zwrot dla UE)
- [ ] Pozostałe 8 języków: link do EN version + krótkie tłumaczenie
- [ ] Update PL policy: dodaj Clerk, Stripe jako procesorów (po implementacji)

#### 4.5 Cookie consent v2 (GDPR-compliant)
- [ ] Obecny Accept/Reject → **granularne kategorie**:
  - Necessary (zawsze aktywne)
  - Analytics (GA4)
  - Advertising (AdSense)
  - Preferences (dark mode, język)
- [ ] AdSense **wymaga tego prawnie** dla UE
- [ ] Biblioteka: [Klaro!](https://klaro.org) lub własny rozbudowany banner
- [ ] Integracja z Google Consent Mode v2

---

### **Faza 5 — Backend + Auth + Premium** (3–4 tyg.) 🔴

#### 5.1 Architektura
```
Frontend (Cloudflare Pages, statyczny)
    ↓
Cloudflare Workers (/api/*)
    ↓
    ├── Clerk (auth, sessions, Google OAuth)
    ├── D1 (users, saved_codes, layouts, subscriptions)
    ├── R2 (uploaded logos, exported PDFs)
    └── Stripe (payments + webhooks)
```

#### 5.2 Clerk integration
- [ ] Konto Clerk na `daytodayappscontact@gmail.com`
- [ ] Providers: Email/Password + Google OAuth
- [ ] Hosted sign-in/sign-up pages na start (szybciej) → później custom UI
- [ ] Session = httpOnly JWT cookie

#### 5.3 Dashboard
- [ ] `/dashboard` — lista zapisanych kodów
- [ ] `/dashboard/codes/new` — kreator z "Save"
- [ ] `/dashboard/layouts` — zapisane układy do druku
- [ ] `/dashboard/settings` — profil, plan, link do Stripe Portal
- [ ] `/dashboard/api-keys` — klucze API (Pro+)
- [ ] Middleware (Worker) sprawdza Clerk JWT

#### 5.4 Stripe
- [ ] Konto Stripe na `daytodayappscontact@gmail.com`
- [ ] Produkty:
  - `Pro Monthly` — 19 zł / mies.
  - `Pro Annual` — 180 zł / rok (15 zł/mc)
  - `Pro Lifetime Deal` — 99 zł jednorazowo (limit: 100 licencji)
- [ ] Stripe Checkout (hosted) + Customer Portal (self-serve)
- [ ] Webhook → Worker → update `subscription_status` w D1
- [ ] **Stripe Tax** dla UE VAT OSS (0.5% fee, automatyzuje MOSS)
- [ ] Faktury automatyczne (Stripe Invoicing)

#### 5.5 Tiery cenowe (finalne)

| Feature | Free | Pro — **19 zł/mc** | Lifetime Deal — **99 zł** |
|---|---|---|---|
| Generowanie kodów | ∞ | ∞ | ∞ |
| Eksport PNG/SVG | ✅ | ✅ | ✅ |
| Reklamy | ✅ | ❌ | ❌ |
| Zapisane kody | ❌ | 500 | 500 |
| Zapisane układy | ❌ | 50 | 50 |
| Bulk CSV upload | max 10 | 1000/batch | 1000/batch |
| Eksport PDF | ❌ | ✅ | ✅ |
| Wysokie DPI (600+) | ❌ | ✅ | ✅ |
| API access | ❌ | 1k req/mc | 1k req/mc |
| Decoder (obraz → zawartość) | 10/dzień | ∞ | ∞ |
| QR z własnym logo | ❌ | ✅ | ✅ |
| Historia wersji | ❌ | 30 dni | 30 dni |
| Priority email support | ❌ | ✅ | ✅ |

Business tier (5 userów, SLA) — **po osiągnięciu 50 płatnych userów**.

---

### **Faza 6 — Nowe funkcje** (ongoing po Fazie 5) 🟡

#### 6.1 High priority (konwersja + SEO)
- [ ] **Decoder** — upload obrazu → odczyt zawartości (`ZXing-js`, client-side). Free: 10/dzień, Pro: ∞
- [ ] **Bulk CSV upload** — upload `values.csv` → generuj wszystkie → pobierz ZIP. Free: 10, Pro: 1000
- [ ] **PDF export** układów etykiet — `pdf-lib` (client-side, ~100 KB). Premium only.
- [ ] **Templates library** — predefiniowane układy (Avery 5160/5163/5167, Zebra ZD410, DYMO 450)
- [ ] **Barcode verification** — walidacja checksumy EAN/UPC + info co jest błędne
- [ ] **Shareable links** — `/s/abc123` → link do zapisanego kodu (public/private, premium)

#### 6.2 SEO content (równolegle do Fazy 5)
- [ ] **Per-type landing pages** (największy SEO boost):
  - `/ean-13-generator`, `/ean-8-generator`, `/upc-a-generator`, `/upc-e-generator`
  - `/code-128-generator`, `/code-39-generator`, `/code-93-generator`
  - `/itf-14-generator`, `/msi-generator`, `/codabar-generator`
  - Każda: H1 specific, HowTo Schema.org, use cases, tool pre-selected, FAQ
- [ ] **Blog** (`/blog`) — Markdown → HTML build:
  - "EAN-13 vs UPC-A: Which to use?"
  - "How to print barcodes on Zebra thermal printer"
  - "What is GS1? Complete guide"
  - "Best free barcode generator comparison (2026)"
  - "CODE128 subsets A/B/C explained"
  - Cel: 20 artykułów w pierwszym roku
- [ ] Schema.org: `FAQPage`, `HowTo`, `Product` + `AggregateRating`

#### 6.3 Nice-to-have
- [ ] PWA (instalacja) — manifest.json + Service Worker
- [ ] Offline mode (pełna funkcjonalność już jest client-side!)
- [ ] Keyboard shortcuts (Ctrl+S save, Ctrl+D download)
- [ ] Undo/redo historia (lokalne, free)
- [ ] Drag-and-drop reorder w układach
- [ ] Color picker kodu/tła
- [ ] GS1 Application Identifiers wizard

#### 6.4 Integracje (gdy Business tier)
- [ ] Zapier / Make.com
- [ ] Shopify app (osobny produkt, duży rynek)
- [ ] WooCommerce plugin
- [ ] Google Sheets add-on
- [ ] Webhooks

---

### **Faza 7 — SEO bez landing page'a** (2 tyg., równolegle) 🟡

> **Twoja decyzja:** od razu narzędzie. Zgoda — SEO robimy tak:

#### 7.1 Tool-first SEO (jak remove.bg, pdfescape, tinypng)
- [ ] **Widoczne** `<h1>`: "Free Online Barcode Generator — EAN, UPC, Code 128, QR"
- [ ] Pod toolem: **"How to use"** z HowTo Schema
- [ ] **FAQ** (8-10 pytań) z FAQPage Schema
- [ ] **Supported formats** lista z opisem każdego
- [ ] Stopka: blog, docs, terms, privacy, cookies, refund
- [ ] **Nie używamy ukrytego tekstu** — Google karze cloaking od 2012
- [ ] Poprawne `aria-label` i `alt` (SEO + a11y)

#### 7.2 Per-type pages
- [ ] Każda `/ean-13-generator` etc. — pre-selected type, specyficzny H1, branżowe FAQ
- [ ] Min 300 słów unique na każdej
- [ ] Cross-linking: "Also try: [UPC-A](/upc-a-generator)"

---

### **Faza 8 — Bliźniacza strona QR Generator** (po Fazie 5) 🟢

- [ ] Osobna domena (np. `qrcoder.app` lub `qr.day-to-day-apps.com`)
- [ ] Osobne repo: `day-to-day-apps/qr-generator`
- [ ] Wspólny backend (Workers + D1 + Clerk) — jeden user, dwa produkty
- [ ] SSO między produktami (Clerk)
- [ ] Cross-promotion w footer
- [ ] Focus: dynamic QR, QR z logo, QR tracking (statystyki skanów) — premium

---

### **Faza 9 — Design polish + Agent recenzujący** (równolegle) 🟢

#### 9.1 Branding
- [ ] Logo (nie tylko favicon)
- [ ] Brand guidelines: paleta, typografia, tone of voice (EN primary)
- [ ] Ilustracje zamiast emoji flag

#### 9.2 Design agent — **on-demand**
Komenda: napisz `/design-review [url]` a ja:
1. Screenshoty w 3 breakpointach (320/768/1440 px)
2. Ocena wg heurystyk Nielsena + Web Vitals + WCAG
3. Konkretne poprawki z kodem
4. Uruchomię subagenta `web-design-reviewer` ze skilla

Auto-review po każdej zmianie = spam. On-demand lepsze.

#### 9.3 UX improvements
- [ ] Skeleton loaders zamiast spinnerów
- [ ] Empty states w dashboardzie
- [ ] Mobile-first review
- [ ] A11y audit (WCAG 2.2 AA) — keyboard nav w nowym UI

---

## 🏗 Stack (potwierdzony)

| Warstwa | Wybór | Koszt @ MVP |
|---|---|---|
| Hosting | Cloudflare Pages | $0 |
| API | Cloudflare Workers | $0 (100k req/dzień) |
| DB | Cloudflare D1 | $0 (5M reads/dzień) |
| File storage | Cloudflare R2 | $0 (10 GB) |
| Auth | **Clerk** | $0 (10k MAU) |
| Payments | Stripe | 1.5% + 0.25€ / EU cards |
| Email | Resend | $0 (3k/mc) |
| Analytics | GA4 + PostHog | $0 |
| Error tracking | Sentry | $0 (5k err/mc) |
| **Razem** | | **$0/mc na start** |

---

## 🎯 Najbliższe 4 tygodnie

### Tydzień 1
1. ✅ Roadmap zatwierdzony
2. ⏳ **Ty:** org `day-to-day-apps` + repo + konto Cloudflare
3. ⏳ **Ja:** migracja remote + redeploy + URL updates
4. ⏳ **Ja:** EN jako domyślny (przeniesienie folderów)

### Tydzień 2
5. Dokumenty prawne EN (terms/privacy/cookies/refund)
6. Cookie consent v2 (granularne kategorie, GDPR)
7. Zakup domeny `.com` (gdy wybierzesz z listy)
8. Per-type pages SEO (5-10 stron)

### Tydzień 3
9. Clerk + `/login`, `/signup`, `/dashboard` szkielet
10. D1 schema + API endpoints (saved codes)
11. "Save to cloud" button na narzędziu (dla zalogowanych)

### Tydzień 4
12. Stripe Checkout + webhook
13. Pricing page + paywall
14. Decoder MVP
15. Launch: ProductHunt + Hacker News + LinkedIn + r/smallbusiness

---

## 📋 Co potrzebuję od Ciebie TERAZ (żeby ruszyć Tydzień 1)

1. ✅ **Stwórz GitHub org** `day-to-day-apps` (na `daytodayappscontact@gmail.com`)
2. ✅ **Stwórz pusty repo** `barcode-generator` w tej org (publiczny, BEZ README)
3. 🟡 **Nowe konto Cloudflare** na `daytodayappscontact@gmail.com` (możesz zrobić później)
4. 🟡 **Daj sygnał "repo stworzony"** — zrobię push i aktualizację linków

Resztę (EN migracja, dokumenty prawne, cookie consent v2, per-type pages) robię sam — daj znać kiedy repo jest gotowy.

---

*Roadmap zaktualizowany: 2026-04-23*
