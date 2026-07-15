import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigin = 'https://barcode-generator.daytodayapps.com';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': allowedOrigin,
      'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
      'access-control-allow-methods': 'POST, OPTIONS',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return json({}, 204);
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const origin = request.headers.get('origin');
  if (origin && origin !== allowedOrigin) return json({ error: 'origin_not_allowed' }, 403);

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

  let body: { confirmation?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (!['DELETE ACCOUNT', 'USUN KONTO'].includes(body.confirmation || '')) {
    return json({ error: 'confirmation_required' }, 400);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceRoleKey) return json({ error: 'server_not_configured' }, 500);

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ error: 'delete_failed' }, 500);
  return json({ deleted: true });
});
