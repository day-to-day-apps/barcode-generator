#!/usr/bin/env node
// Usuwa konto użytkownika z Supabase Auth i wysyła ponowne zaproszenie (potwierdzenie e-mail).
// WYMAGA service_role key — uruchamiać WYŁĄCZNIE lokalnie / w bezpiecznym CI.
// NIGDY nie loguje tokenów ani klucza service_role.

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_EMAIL = process.argv[2] || process.env.TEST_EMAIL;
const REDIRECT_TO = process.env.REDIRECT_TO || 'https://barcode-generator.daytodayapps.com/';

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

if (!SUPABASE_URL || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL)) {
  fail('SUPABASE_URL nie ustawione lub niepoprawne (oczekiwany format https://xxx.supabase.co)');
}
if (!SERVICE_ROLE || SERVICE_ROLE.length < 40) {
  fail('SUPABASE_SERVICE_ROLE_KEY nie ustawione w supabase/.env');
}
if (!TEST_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(TEST_EMAIL)) {
  fail('Podaj e-mail jako argument lub ustaw TEST_EMAIL w .env');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
    if (page > 50) return null;
  }
}

async function main() {
  console.log(`🔎 Szukam konta: ${TEST_EMAIL}`);
  const existing = await findUserByEmail(TEST_EMAIL);

  if (existing) {
    console.log(`🗑️  Znaleziono użytkownika (id=${existing.id.slice(0, 8)}…) — usuwam`);
    const { error: delErr } = await supabase.auth.admin.deleteUser(existing.id);
    if (delErr) fail(`Błąd usuwania: ${delErr.message}`);
    console.log('✅ Usunięto');
  } else {
    console.log('ℹ️  Brak konta — pomijam usuwanie');
  }

  console.log(`📨 Wysyłam zaproszenie / link potwierdzający na: ${TEST_EMAIL}`);
  console.log(`   ↪ redirectTo: ${REDIRECT_TO}`);
  const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(TEST_EMAIL, {
    redirectTo: REDIRECT_TO,
  });
  if (inviteErr) {
    console.error('   status :', inviteErr.status);
    console.error('   code   :', inviteErr.code);
    console.error('   name   :', inviteErr.name);
    fail(`Błąd wysyłki zaproszenia: ${inviteErr.message}`);
  }
  console.log('✅ Wysłano. Sprawdź skrzynkę (folder Spam) i potwierdź konto.');
}

main().catch((e) => fail(e?.message || String(e)));
