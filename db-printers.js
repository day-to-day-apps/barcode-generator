// db-printers.js — CRUD wrapper dla `printer_profiles` + ładowanie presetów statycznych.

import { getSupabase } from './supabase-client.js';

export const FREE_PRINTERS_LIMIT = 5;

let presetsCache = null;
const PRESET_ALIASES = Object.freeze({
  'avery-5160-a4': 'avery-l7160-a4',
  'avery-5163-a4': 'avery-l7163-a4',
});

export async function loadPresets() {
  if (presetsCache) return presetsCache;
  try {
    const res = await fetch(new URL('./printer-presets.json', import.meta.url), { cache: 'force-cache' });
    if (!res.ok) throw new Error('preset_fetch_failed');
    const json = await res.json();
    presetsCache = Array.isArray(json?.presets) ? json.presets : [];
  } catch (_e) {
    presetsCache = [];
  }
  return presetsCache;
}

export function findPresetById(presets, id) {
  const resolved = PRESET_ALIASES[id] || id;
  return presets.find((p) => p.id === resolved) || null;
}

async function client() {
  const sb = await getSupabase();
  if (!sb) return null;
  return sb;
}

export async function listPrinters() {
  const sb = await client();
  if (!sb) return { data: null, error: new Error('supabase_unavailable') };
  return sb
    .from('printer_profiles')
    .select('id, name, base_preset_id, printer_type, page_w_mm, page_h_mm, cols, rows, label_w_mm, label_h_mm, margin_top_mm, margin_right_mm, margin_bottom_mm, margin_left_mm, gap_x_mm, gap_y_mm, dpi, offset_x_mm, offset_y_mm, bar_width_correction, is_default, created_at, updated_at')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
}

export async function getPrinterById(id) {
  const sb = await client();
  if (!sb) return { data: null, error: new Error('supabase_unavailable') };
  return sb.from('printer_profiles').select('*').eq('id', id).maybeSingle();
}

export async function countPrinters() {
  const sb = await client();
  if (!sb) return { count: 0, error: new Error('supabase_unavailable') };
  const { count, error } = await sb
    .from('printer_profiles')
    .select('id', { count: 'exact', head: true });
  return { count: count ?? 0, error };
}

export async function insertPrinter(payload) {
  const sb = await client();
  if (!sb) return { data: null, error: new Error('supabase_unavailable') };
  return sb.from('printer_profiles').insert(payload).select().single();
}

export async function updatePrinter(id, patch) {
  const sb = await client();
  if (!sb) return { data: null, error: new Error('supabase_unavailable') };
  return sb.from('printer_profiles').update(patch).eq('id', id).select().single();
}

export async function deletePrinter(id) {
  const sb = await client();
  if (!sb) return { error: new Error('supabase_unavailable') };
  return sb.from('printer_profiles').delete().eq('id', id);
}

export async function setDefaultPrinter(id) {
  const sb = await client();
  if (!sb) return { error: new Error('supabase_unavailable') };
  const { error: clearErr } = await sb
    .from('printer_profiles')
    .update({ is_default: false })
    .eq('is_default', true)
    .neq('id', id);
  if (clearErr) return { error: clearErr };
  return sb.from('printer_profiles').update({ is_default: true }).eq('id', id);
}

// Walidacja danych formularza. Zwraca { payload, errors[] } — errors jako klucze i18n.
export function normalisePrinterPayload(raw) {
  const errors = [];
  const out = {};

  const name = String(raw?.name || '').trim();
  if (!name || name.length > 80) errors.push('printerNameRequired');
  out.name = name;

  const rawPresetId = raw?.base_preset_id ? String(raw.base_preset_id) : null;
  const presetId = PRESET_ALIASES[rawPresetId] || rawPresetId;
  out.base_preset_id = presetId;

  const type = String(raw?.printer_type || 'thermal');
  out.printer_type = ['thermal', 'a4-sheet', 'custom'].includes(type) ? type : 'thermal';

  const numField = (key, min, max, errKey) => {
    const v = Number(raw?.[key]);
    if (!Number.isFinite(v) || v < min || v > max) {
      errors.push(errKey);
      return null;
    }
    return Math.round(v * 100) / 100;
  };

  out.page_w_mm = numField('page_w_mm', 1, 1000, 'printerPageInvalid');
  out.page_h_mm = numField('page_h_mm', 1, 1000, 'printerPageInvalid');
  out.label_w_mm = numField('label_w_mm', 1, 1000, 'printerLabelInvalid');
  out.label_h_mm = numField('label_h_mm', 1, 1000, 'printerLabelInvalid');

  const cols = Number(raw?.cols);
  const rows = Number(raw?.rows);
  out.cols = Number.isFinite(cols) && cols >= 1 && cols <= 50 ? Math.floor(cols) : 1;
  out.rows = Number.isFinite(rows) && rows >= 1 && rows <= 200 ? Math.floor(rows) : 1;

  for (const key of ['margin_top_mm', 'margin_right_mm', 'margin_bottom_mm', 'margin_left_mm', 'gap_x_mm', 'gap_y_mm']) {
    const v = Number(raw?.[key]);
    out[key] = Number.isFinite(v) && v >= 0 && v <= 200 ? Math.round(v * 100) / 100 : 0;
  }

  const dpi = Number(raw?.dpi);
  out.dpi = Number.isFinite(dpi) && dpi >= 72 && dpi <= 1200 ? Math.floor(dpi) : 203;

  const offsetX = Number(raw?.offset_x_mm);
  const offsetY = Number(raw?.offset_y_mm);
  out.offset_x_mm = Number.isFinite(offsetX) && Math.abs(offsetX) <= 20 ? Math.round(offsetX * 100) / 100 : 0;
  out.offset_y_mm = Number.isFinite(offsetY) && Math.abs(offsetY) <= 20 ? Math.round(offsetY * 100) / 100 : 0;

  const bwc = Number(raw?.bar_width_correction);
  out.bar_width_correction = Number.isFinite(bwc) && bwc >= 0.5 && bwc <= 1.5 ? Math.round(bwc * 100) / 100 : 1.0;

  if (out.page_w_mm && out.label_w_mm) {
    const usedW = out.margin_left_mm + out.cols * out.label_w_mm + (out.cols - 1) * out.gap_x_mm + out.margin_right_mm;
    if (usedW > out.page_w_mm + 0.01) errors.push('printerLayoutOverflowX');
  }
  if (out.page_h_mm && out.label_h_mm) {
    const usedH = out.margin_top_mm + out.rows * out.label_h_mm + (out.rows - 1) * out.gap_y_mm + out.margin_bottom_mm;
    if (usedH > out.page_h_mm + 0.01) errors.push('printerLayoutOverflowY');
  }

  return { payload: out, errors };
}
