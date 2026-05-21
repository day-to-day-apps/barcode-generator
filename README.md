# Barcode Generator — wersja zarobkowa

Statyczny generator kodów kreskowych (vanilla JS / HTML / CSS) z i18n (10 języków), SEO i monetyzacją AdSense. Hosting: Cloudflare Pages. Backend: Supabase (auth + saved codes). Domena produkcyjna: https://barcode-generator.daytodayapps.com

## Dokumentacja

| Plik | Zawartość |
|------|-----------|
| [PROJEKT.md](./PROJEKT.md) | Pełne kompendium — architektura, decyzje, dziennik zmian. |
| [ROADMAP.md](./ROADMAP.md) | Mapa drogowa M0–M5 + backlog (odłożone TODO, manual configs Supabase/Cloudflare). |
| [MASTER-PLAN.md](./MASTER-PLAN.md) | Plan wdrożenia Pro i monetyzacji (historyczny + plan dalszy). |
| [AGENTS.md](./AGENTS.md) | Instrukcje dla agentów AI pracujących z repo. |
| [DEPLOY-CHECKLIST.md](./DEPLOY-CHECKLIST.md) | Lista kroków deployu (GA4, AdSense, Search Console). |

## Quick start (lokalnie)

```powershell
# Z katalogu "wersja zarobkowa":
npx wrangler pages dev .  # lub dowolny static server na porcie 8080
```

Testy E2E:

```powershell
npx playwright test --project=chromium
```

## Stack

- **Frontend:** vanilla JS (ESM), HTML5, CSS3 — bez frameworków, bez bundlera.
- **i18n:** 10 języków (root=en + pl/de/fr/es/it/pt/nl/cs/uk).
- **Backend:** Supabase (PostgreSQL + Auth + RLS) — projekt `aoqxznukwbdgrggxloou`.
- **Hosting:** Cloudflare Pages / Workers (`_headers`, `_redirects`).
- **Monetyzacja:** Google AdSense (collapse-on-unfilled, brak pustych slotów).

## Konwencje

Identyfikatory po angielsku, komentarze po polsku OK. Szczegółowe wytyczne w `.github/instructions/*.instructions.md` (a11y, SEO, security, performance, barcode domain).