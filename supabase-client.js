// Lazy singleton klienta Supabase ładowanego z jsDelivr (CSP: script-src zawiera cdn.jsdelivr.net).
// Konfiguracja: skopiuj supabase-config.example.js → supabase-config.js i uzupełnij anon key.
// Anon key jest bezpieczny do publikacji w kliencie — RLS pilnuje dostępu po stronie bazy.

let clientPromise = null;

async function loadConfig() {
  try {
    const mod = await import('./supabase-config.js');
    if (!mod?.SUPABASE_URL || !mod?.SUPABASE_ANON_KEY) {
      console.warn('[supabase] Brak SUPABASE_URL / SUPABASE_ANON_KEY w supabase-config.js');
      return null;
    }
    return { url: mod.SUPABASE_URL, anonKey: mod.SUPABASE_ANON_KEY };
  } catch (err) {
    console.warn('[supabase] supabase-config.js nieobecny — funkcje konta wyłączone.', err?.message);
    return null;
  }
}

export async function getSupabase() {
  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    const cfg = await loadConfig();
    if (!cfg) return null;

    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    return createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'bg.auth',
      },
    });
  })();

  return clientPromise;
}

export async function isSupabaseAvailable() {
  const client = await getSupabase();
  return client !== null;
}

export async function getSession() {
  const client = await getSupabase();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error) {
    console.warn('[supabase] getSession error:', error.message);
    return null;
  }
  return data.session;
}

export async function onAuthStateChange(callback) {
  const client = await getSupabase();
  if (!client) return () => {};
  const { data } = client.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => data.subscription.unsubscribe();
}
