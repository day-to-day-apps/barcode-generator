-- Revoke EXECUTE on SECURITY DEFINER functions from public/anon/authenticated roles.
-- handle_new_user() is invoked via AFTER INSERT trigger on auth.users (server-side).
-- is_pro() and enforce_free_saved_codes_limit() will be invoked server-side only
-- (Edge Function / future RPC wrapper). Removing default EXECUTE prevents PostgREST
-- from exposing them as /rest/v1/rpc/<name>.
-- Mirrors remote migration: revoke_security_definer_functions_from_public_roles
--   (applied 2026-05-07 via Supabase MCP).

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_pro(uuid) from public, anon, authenticated;
revoke execute on function public.enforce_free_saved_codes_limit(uuid) from public, anon, authenticated;
