// db-templates.js — CRUD wrapper dla tabeli `label_templates` (szablony etykiet).
// Wszystkie metody zwracają { data?, error?, count? } w stylu Supabase JS SDK.

import { getSupabase } from './supabase-client.js';

export const FREE_TEMPLATES_LIMIT = 5;

export const DEFAULT_TEMPLATE_CONFIG = Object.freeze({
  pageSize: 'A4',
  widthMm: 210,
  heightMm: 297,
  marginTopMm: 10,
  marginRightMm: 10,
  marginBottomMm: 10,
  marginLeftMm: 10,
  fontSizePt: 10,
});

const PAGE_PRESETS = Object.freeze({
  A4: { widthMm: 210, heightMm: 297 },
  A5: { widthMm: 148, heightMm: 210 },
  Letter: { widthMm: 216, heightMm: 279 },
});

export function getPagePreset(name) {
  return PAGE_PRESETS[name] || null;
}

async function client() {
  const sb = await getSupabase();
  if (!sb) return null;
  return sb;
}

export async function listTemplates() {
  const sb = await client();
  if (!sb) return { data: null, error: new Error('supabase_unavailable') };
  return sb
    .from('label_templates')
    .select('id, name, config, logo_path, is_default, created_at, updated_at')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
}

export async function getTemplateById(id) {
  const sb = await client();
  if (!sb) return { data: null, error: new Error('supabase_unavailable') };
  return sb
    .from('label_templates')
    .select('id, name, config, logo_path, is_default, created_at')
    .eq('id', id)
    .maybeSingle();
}

export async function countTemplates() {
  const sb = await client();
  if (!sb) return { count: 0, error: new Error('supabase_unavailable') };
  const { count, error } = await sb
    .from('label_templates')
    .select('id', { count: 'exact', head: true });
  return { count: count ?? 0, error };
}

export async function insertTemplate(payload) {
  const sb = await client();
  if (!sb) return { data: null, error: new Error('supabase_unavailable') };
  return sb.from('label_templates').insert(payload).select().single();
}

export async function updateTemplate(id, patch) {
  const sb = await client();
  if (!sb) return { data: null, error: new Error('supabase_unavailable') };
  return sb.from('label_templates').update(patch).eq('id', id).select().single();
}

export async function deleteTemplate(id) {
  const sb = await client();
  if (!sb) return { error: new Error('supabase_unavailable') };
  return sb.from('label_templates').delete().eq('id', id);
}

// Ustawia is_default=true dla wskazanego szablonu i czyści flagę dla pozostałych.
// Wymaga dwóch zapytań ze względu na unique index `one_default_per_user`.
export async function setDefaultTemplate(id) {
  const sb = await client();
  if (!sb) return { error: new Error('supabase_unavailable') };

  const { error: clearErr } = await sb
    .from('label_templates')
    .update({ is_default: false })
    .eq('is_default', true)
    .neq('id', id);
  if (clearErr) return { error: clearErr };

  return sb.from('label_templates').update({ is_default: true }).eq('id', id);
}

// Walidacja i normalizacja configu szablonu z formularza.
// Zwraca { config, errors[] }; errors są kluczami i18n.
export function normaliseTemplateConfig(raw) {
  const errors = [];
  const out = { ...DEFAULT_TEMPLATE_CONFIG };

  const preset = String(raw?.pageSize || 'A4');
  out.pageSize = ['A4', 'A5', 'Letter', 'custom'].includes(preset) ? preset : 'A4';

  if (out.pageSize === 'custom') {
    const w = Number(raw?.widthMm);
    const h = Number(raw?.heightMm);
    if (!Number.isFinite(w) || w < 10 || w > 1000) errors.push('templateWidthInvalid');
    if (!Number.isFinite(h) || h < 10 || h > 1000) errors.push('templateHeightInvalid');
    out.widthMm = Math.round(w);
    out.heightMm = Math.round(h);
  } else {
    const p = PAGE_PRESETS[out.pageSize];
    out.widthMm = p.widthMm;
    out.heightMm = p.heightMm;
  }

  for (const key of ['marginTopMm', 'marginRightMm', 'marginBottomMm', 'marginLeftMm']) {
    const v = Number(raw?.[key]);
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      errors.push('templateMarginInvalid');
      out[key] = DEFAULT_TEMPLATE_CONFIG[key];
    } else {
      out[key] = Math.round(v * 10) / 10;
    }
  }

  const fs = Number(raw?.fontSizePt);
  if (!Number.isFinite(fs) || fs < 4 || fs > 72) {
    errors.push('templateFontSizeInvalid');
    out.fontSizePt = DEFAULT_TEMPLATE_CONFIG.fontSizePt;
  } else {
    out.fontSizePt = Math.round(fs * 10) / 10;
  }

  return { config: out, errors };
}
