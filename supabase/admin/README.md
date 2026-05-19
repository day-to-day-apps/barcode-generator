# Supabase admin — skrypty service_role

> ⚠️ **OSTRZEŻENIE BEZPIECZEŃSTWA**
> Skrypty z tego katalogu używają `SUPABASE_SERVICE_ROLE_KEY`, który **omija RLS** i ma pełny dostęp do bazy.
> - NIGDY nie commituj `.env` z prawdziwym kluczem (jest w `.gitignore`).
> - NIGDY nie uruchamiaj tych skryptów w przeglądarce / kliencie.
> - NIGDY nie wdrażaj `service_role` do Cloudflare Pages ani innego frontu.

## Instalacja

```bash
cd "supabase/admin"
npm install
```

## Konfiguracja

Uzupełnij `supabase/.env` (skopiuj z `.env.example`):

```
SUPABASE_URL=https://twoj-projekt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
TEST_EMAIL=twoj-mail@example.com
```

## Użycie — usuń konto i wyślij ponownie potwierdzenie

```bash
# Wariant 1: e-mail z .env
node delete-and-resend.mjs

# Wariant 2: e-mail jako argument (priorytet nad .env)
node delete-and-resend.mjs inny@example.com
```

### Co robi skrypt

1. Sprawdza, czy podany e-mail istnieje w `auth.users`.
2. Jeśli istnieje — usuwa konto (`auth.admin.deleteUser`).
3. Wysyła ponowne zaproszenie z linkiem potwierdzającym (`auth.admin.inviteUserByEmail`),
   używając szablonu z `supabase/email-templates/confirm-signup.*.html`.

### Co skrypt NIE robi

- Nie loguje klucza `service_role` ani tokenu sesji.
- Nie modyfikuje tabel projektowych (`profiles`, `barcodes`, etc.) — jeśli masz triggery
  `on auth.users delete cascade`, kaskada zadziała automatycznie po stronie Postgresa.
