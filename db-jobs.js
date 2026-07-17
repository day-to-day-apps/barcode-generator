// db-jobs.js — CRUD wrapper dla print_jobs + RPC save_print_job.

import { getSupabase } from './supabase-client.js';

export const FREE_JOBS_LIMIT = 20;
export const MAX_ITEMS_PER_JOB = 500;

async function client() {
  const sb = await getSupabase();
  if (!sb) return null;
  return sb;
}

export async function listJobs() {
  const sb = await client();
  if (!sb) return { data: null, error: new Error('supabase_unavailable') };
  const result = await sb
    .from('print_jobs')
    .select('id, name, template_id, printer_profile_id, notes, created_at, updated_at, print_job_items(copies)')
    .order('created_at', { ascending: false });
  if (result.error) return result;
  return {
    ...result,
    data: (result.data || []).map(({ print_job_items: items = [], ...job }) => ({
      ...job,
      item_count: items.length,
      label_count: items.reduce((sum, item) => sum + Math.max(1, Number(item.copies) || 1), 0),
    })),
  };
}

export async function getJobById(id) {
  const sb = await client();
  if (!sb) return { data: null, error: new Error('supabase_unavailable') };
  const jobRes = await sb
    .from('print_jobs')
    .select('id, name, template_id, printer_profile_id, notes, created_at')
    .eq('id', id)
    .maybeSingle();
  if (jobRes.error || !jobRes.data) return jobRes;
  const itemsRes = await sb
    .from('print_job_items')
    .select('id, position, code_type, value, name, price, description, copies, extra')
    .eq('job_id', id)
    .order('position', { ascending: true });
  if (itemsRes.error) return { data: null, error: itemsRes.error };
  return { data: { ...jobRes.data, items: itemsRes.data || [] }, error: null };
}

export async function countJobs() {
  const sb = await client();
  if (!sb) return { count: 0, error: new Error('supabase_unavailable') };
  const { count, error } = await sb
    .from('print_jobs')
    .select('id', { count: 'exact', head: true });
  return { count: count ?? 0, error };
}

export async function deleteJob(id) {
  const sb = await client();
  if (!sb) return { error: new Error('supabase_unavailable') };
  return sb.from('print_jobs').delete().eq('id', id);
}

// Atomowy zapis joba + items przez RPC save_print_job (transakcja po stronie DB).
// job: { name, template_id?, printer_profile_id?, notes? }
// items: Array<{ code_type, value, name?, price?, description?, copies?, extra? }>
export async function savePrintJob(job, items) {
  const sb = await client();
  if (!sb) return { data: null, error: new Error('supabase_unavailable') };
  if (!Array.isArray(items) || items.length === 0) {
    return { data: null, error: new Error('job_items_required') };
  }
  if (items.length > MAX_ITEMS_PER_JOB) {
    return { data: null, error: new Error('job_items_limit_exceeded') };
  }
  return sb.rpc('save_print_job', { job_data: job, items });
}

export function normaliseJobItem(raw, position) {
  const codeType = String(raw?.code_type || raw?.type || 'CODE128').slice(0, 32);
  const value = String(raw?.value || '').slice(0, 4096);
  const name = raw?.name ? String(raw.name).slice(0, 200) : null;
  const price = raw?.price ? String(raw.price).slice(0, 64) : null;
  const description = raw?.description ? String(raw.description).slice(0, 500) : null;
  const copiesNum = Number(raw?.copies);
  const copies = Number.isFinite(copiesNum) && copiesNum >= 1 && copiesNum <= 1000
    ? Math.floor(copiesNum)
    : 1;
  return {
    position: position ?? 0,
    code_type: codeType,
    value,
    name,
    price,
    description,
    copies,
    extra: raw?.extra && typeof raw.extra === 'object' ? raw.extra : {},
  };
}
