// db-codes.js — CRUD wrapper dla tabeli `saved_codes` (biblioteka kodów usera).
// Wszystkie metody zwracają { data?, error? } w stylu Supabase JS SDK.

import { getSupabase } from './supabase-client.js';

export const FREE_CODES_LIMIT = 10;

export function normaliseProductMetadata(raw = {}) {
  const copies = Math.max(1, Math.min(1000, Math.floor(Number(raw?.copies) || 1)));
  return {
    description: String(raw?.description || '').trim().slice(0, 500),
    price: String(raw?.price || '').trim().slice(0, 64),
    copies,
  };
}

export function withProductMetadata(settings = {}, raw = {}) {
  const next = settings && typeof settings === 'object' ? { ...settings } : {};
  const product = normaliseProductMetadata(raw);
  if (!product.description && !product.price && product.copies === 1) delete next.product;
  else next.product = product;
  return next;
}

async function client() {
  const sb = await getSupabase();
  if (!sb) return null;
  return sb;
}

export async function listCodes() {
  const sb = await client();
  if (!sb) return { data: null, error: new Error('supabase_unavailable') };
  return sb
    .from('saved_codes')
    .select('id, code_type, value, name, tags, settings, is_public, share_slug, created_at, updated_at')
    .order('created_at', { ascending: false });
}

// M4: przełącz widoczność publiczną. Po włączeniu trigger nadaje share_slug (jeśli pusty).
export async function setCodePublic(id, isPublic) {
  const sb = await client();
  if (!sb) return { data: null, error: new Error('supabase_unavailable') };
  return sb
    .from('saved_codes')
    .update({ is_public: !!isPublic })
    .eq('id', id)
    .select('id, is_public, share_slug')
    .single();
}

export async function getCodeById(id) {
  const sb = await client();
  if (!sb) return { data: null, error: new Error('supabase_unavailable') };
  return sb
    .from('saved_codes')
    .select('id, code_type, value, name, tags, settings, created_at')
    .eq('id', id)
    .maybeSingle();
}

export async function countCodes() {
  const sb = await client();
  if (!sb) return { count: 0, error: new Error('supabase_unavailable') };
  const { count, error } = await sb
    .from('saved_codes')
    .select('id', { count: 'exact', head: true });
  return { count: count ?? 0, error };
}

export async function insertCode(payload) {
  const sb = await client();
  if (!sb) return { data: null, error: new Error('supabase_unavailable') };
  return sb.from('saved_codes').insert(payload).select().single();
}

export async function updateCode(id, patch) {
  const sb = await client();
  if (!sb) return { data: null, error: new Error('supabase_unavailable') };
  return sb.from('saved_codes').update(patch).eq('id', id).select().single();
}

export async function deleteCode(id) {
  const sb = await client();
  if (!sb) return { error: new Error('supabase_unavailable') };
  return sb.from('saved_codes').delete().eq('id', id);
}

export async function bulkDeleteCodes(ids) {
  const sb = await client();
  if (!sb) return { error: new Error('supabase_unavailable') };
  if (!Array.isArray(ids) || ids.length === 0) return { error: null };
  return sb.from('saved_codes').delete().in('id', ids);
}

export function normaliseTagsInput(raw) {
  if (!raw) return [];
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}
