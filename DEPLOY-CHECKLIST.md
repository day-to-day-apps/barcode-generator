# Barcode Generator — Deploy Checklist

## 🔧 Co musisz zrobić (krok po kroku):

### 1. ~~GitHub — repozytorium~~ ✅
- [x] Repozytorium: [github.com/day-to-day-apps/barcode-generator](https://github.com/day-to-day-apps/barcode-generator)

### 2. ~~Cloudflare Pages — hosting~~ ✅
- [x] Strona live: [barcode-generator.daytodayapps-contact.workers.dev](https://barcode-generator.daytodayapps-contact.workers.dev/)

### 3. Własna domena (opcjonalnie)
- [ ] Kup domenę (np. na [OVH](https://ovh.pl), [Cloudflare Registrar](https://dash.cloudflare.com/domains), [Porkbun](https://porkbun.com))
- [ ] W Cloudflare Pages → **Custom domains** → dodaj swoją domenę
- [ ] Skonfiguruj DNS (Cloudflare poda instrukcje CNAME)
- [ ] **Po zmianie domeny** zaktualizuj we wszystkich plikach:
  - `sitemap.xml` — URL-e
  - `robots.txt` — URL sitemap
  - Wszystkie `index.html` — canonical, hreflang, og:url, og:image
  - `analytics.js` — (jeśli potrzebne)

### 4. Google Analytics 4
- [ ] Utwórz konto na [analytics.google.com](https://analytics.google.com)
- [ ] Utwórz nową usługę (property) → Web
- [ ] Skopiuj **Measurement ID** (format: `G-XXXXXXXXXX`)
- [ ] Otwórz plik `analytics.js` i wklej ID:
  ```js
  const GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX';
  ```
- [ ] Commit + push

### 5. Google AdSense
- [ ] Utwórz konto na [adsense.google.com](https://adsense.google.com)
- [ ] Dodaj swoją stronę i przejdź weryfikację (zajmuje 1-14 dni)
- [ ] Skopiuj **Publisher ID** (format: `ca-pub-XXXXXXXXXXXXXXXX`)
- [ ] Otwórz plik `analytics.js` i wklej ID:
  ```js
  const ADSENSE_PUBLISHER_ID = 'ca-pub-XXXXXXXXXXXXXXXX';
  ```
- [ ] Utwórz bloki reklamowe w AdSense i wklej kod `<ins>` w miejsce istniejących `<!-- AD SLOT -->` komentarzy w HTML
- [ ] Commit + push

### 6. Google Search Console
- [ ] Otwórz [search.google.com/search-console](https://search.google.com/search-console)
- [ ] Dodaj property → Wpisz URL strony
- [ ] Zweryfikuj (Cloudflare DNS verification jest najłatwiejszy)
- [ ] Zgłoś sitemap: `https://barcode-generator.daytodayapps-contact.workers.dev/sitemap.xml`
- [ ] Poproś o indeksowanie strony głównej

### 7. Sprawdzenie po deployu
- [ ] Otwórz stronę — czy działa?
- [ ] Sprawdź wszystkie 10 wersji językowych
- [ ] Sprawdź dark mode
- [ ] Wygeneruj kod kreskowy i pobierz PNG/SVG
- [ ] Test mobilny (telefon lub DevTools → responsive)
- [ ] Sprawdź 404 — wejdź na `/nieistniejaca-strona`
- [ ] Otwórz [PageSpeed Insights](https://pagespeed.web.dev/) — wklej URL
- [ ] Sprawdź OG image: [opengraph.xyz](https://www.opengraph.xyz/)

---

## 📁 Struktura plików (gotowa):

```
wersja zarobkowa/
├── index.html          ← 🇵🇱 Strona główna (polski)
├── en/index.html       ← 🇬🇧 English
├── de/index.html       ← 🇩🇪 Deutsch
├── fr/index.html       ← 🇫🇷 Français
├── es/index.html       ← 🇪🇸 Español
├── it/index.html       ← 🇮🇹 Italiano
├── pt/index.html       ← 🇵🇹 Português
├── nl/index.html       ← 🇳🇱 Nederlands
├── cs/index.html       ← 🇨🇿 Čeština
├── uk/index.html       ← 🇺🇦 Українська
├── polityka-prywatnosci.html
├── regulamin.html
├── 404.html            ← Strona błędu (auto-detect język)
├── app.js              ← Logika generatora
├── i18n.js             ← Tłumaczenia (10 języków)
├── analytics.js        ← GA4 + AdSense + cookie banner
├── styles.css          ← Style + dark mode + cookie banner
├── favicon.svg         ← Ikona strony
├── og-image.svg        ← Obraz do social media
├── sitemap.xml         ← Mapa strony (SEO)
├── robots.txt          ← Instrukcje dla botów
├── _headers            ← Cloudflare: nagłówki bezpieczeństwa + cache
├── _redirects          ← Cloudflare: przekierowania językowe
└── .gitignore          ← Ignorowane pliki
```

## ⏱ Szacowany czas: ~30-60 minut (bez czekania na weryfikację AdSense)
