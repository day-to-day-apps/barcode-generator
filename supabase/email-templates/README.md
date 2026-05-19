# Szablony e-mail Supabase

## Pliki

- `confirm-signup.pl.html` — potwierdzenie rejestracji (PL)
- `confirm-signup.en.html` — potwierdzenie rejestracji (EN)

## Instalacja w Supabase

1. Otwórz **Supabase Dashboard → Authentication → Email Templates → Confirm signup**.
2. Wybierz tryb HTML.
3. Wklej zawartość `confirm-signup.pl.html` (lub `.en.html` jeśli docelowo EN).
4. Zachowaj placeholder `{{ .ConfirmationURL }}` — Supabase podstawia go automatycznie.
5. Zapisz.

## Konfiguracja URL przekierowania

W **Authentication → URL Configuration** ustaw:
- **Site URL**: `https://barcode-generator.daytodayapps-contact.workers.dev`
- **Redirect URLs** (whitelista):
  - `https://barcode-generator.daytodayapps-contact.workers.dev/konto.html`
  - `https://barcode-generator.daytodayapps-contact.workers.dev/en/account.html`
  - `http://127.0.0.1:8765/konto.html` (dev)
  - `http://127.0.0.1:8765/en/account.html` (dev)

## Charakterystyka szablonów

- Tabelowy layout 600px (kompatybilność z Outlookiem / Gmail / Apple Mail).
- Gradient `#3b82f6 → #8b5cf6` (zgodny z motywem aplikacji).
- Stack fontów: Inter → system. Brak zewnętrznych @font-face (lepsze dostarczalność).
- WCAG: kontrast tekstu ≥ 4.5:1, dekoracyjne emoji z `aria-hidden="true"`.
- Brak zewnętrznych obrazów = brak blokowania przez klientów pocztowych.
