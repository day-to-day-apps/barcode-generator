# Barcode Generator - Deploy Checklist

Stan zweryfikowany: 2026-07-27.

## Produkcja

- [x] Repozytorium: [day-to-day-apps/barcode-generator](https://github.com/day-to-day-apps/barcode-generator)
- [x] Produkcja: [barcode-generator.daytodayapps.com](https://barcode-generator.daytodayapps.com/)
- [x] Custom domain ma poprawny HTTPS.
- [x] Techniczny host Cloudflare Pages przekierowuje `301` na domenę canonical z zachowaniem ścieżki i query.
- [x] Canonical, hreflang, Open Graph, robots i sitemap używają domeny produkcyjnej.
- [x] Prywatne ekrany konta pozostają poza sitemapą i mają `noindex`.
- [x] Nagłówki bezpieczeństwa i prawdziwe odpowiedzi `404` są wdrożone.

## Analityka i indeksowanie

- [x] GA4 jest skonfigurowane jako `G-SVBQKGWE1Y` i ładuje się dopiero po zgodzie.
- [x] Własność domeny `daytodayapps.com` jest zweryfikowana w Google Search Console.
- [x] Sitemap generatora została zgłoszona w Search Console.
- [x] Główne publiczne adresy są indeksowalne; `/pl/` został potwierdzony jako zaindeksowany.
- [ ] Monitorować raport Pages/Indexing po kolejnych przetworzeniach sitemapy przez Google.

## Supabase i konto

- [x] `Site URL` oraz dozwolone redirecty wskazują `https://barcode-generator.daytodayapps.com`.
- [x] Produkcyjny cykl tymczasowego użytkownika przeszedł: auth, konto, CRUD i usunięcie danych testowych.
- [x] Linki powrotne są ograniczone do własnego originu.
- [ ] Utrzymywać okresowy automatyczny test pełnego cyklu Supabase.

## AdSense

- [x] Publisher ID: `ca-pub-2527047257613855`.
- [x] `ads.txt` jest opublikowany pod `/ads.txt`.
- [x] Kod nie renderuje pustych reklam bez prawdziwego `data-ad-slot`.
- [x] Dolny sticky slot pozostaje wyłączony.
- [ ] Potwierdzić w AdSense status witryny `Ready`.
- [ ] Utworzyć prawdziwe display ad units i wpisać ich identyfikatory do `AD_SLOTS` w `analytics.js`.
- [ ] Po aktywacji sprawdzić desktop/mobile, CLS i zgodność zgody reklamowej dla EOG/UK/Szwajcarii.

## QA po każdym deployu

- [ ] Uruchomić build oraz pełny Playwright.
- [ ] Sprawdzić generator, dekoder, PNG, SVG, CSV/PDF/ZIP i kopiowanie.
- [ ] Sprawdzić 10 wersji językowych, mobile, dark mode i brak błędów konsoli.
- [ ] Sprawdzić logowanie, reset hasła, zapisane kody, szablony, drukarki i historię.
- [ ] Sprawdzić A4, Letter i formaty termiczne w podglądzie PDF.
- [ ] Zweryfikować `robots.txt`, `sitemap.xml`, `ads.txt`, canonical i prawdziwe `404` na produkcji.

## Otwarte testy fizyczne

- [ ] Wydrukować stronę kalibracyjną przy skali sterownika 100%.
- [ ] Potwierdzić przesunięcia i `bar_width_correction` na realnej drukarce termicznej.
- [ ] Odczytać próbki fizycznym skanerem; test przeglądarkowy nie zastępuje certyfikowanego weryfikatora kodów.
