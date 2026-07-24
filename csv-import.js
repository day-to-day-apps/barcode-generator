// csv-import.js — wrapper nad csv-worker.js + mapowanie wierszy na pozycje print joba.

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 500;

let workerRef = null;
let nextId = 1;
const pending = new Map();

function getWorker() {
  if (workerRef) return workerRef;
  try {
    workerRef = new Worker(new URL('./csv-worker.js', import.meta.url));
    workerRef.addEventListener('message', (ev) => {
      const { id, ok, result, error } = ev.data || {};
      const handler = pending.get(id);
      if (!handler) return;
      pending.delete(id);
      if (ok) handler.resolve(result);
      else handler.reject(new Error(error || 'csv_worker_failed'));
    });
    workerRef.addEventListener('error', (ev) => {
      for (const [, handler] of pending) handler.reject(new Error(ev.message || 'csv_worker_error'));
      pending.clear();
    });
  } catch (_e) {
    workerRef = null;
  }
  return workerRef;
}

export function parseCsvText(text, options) {
  return new Promise((resolve, reject) => {
    const worker = getWorker();
    if (!worker) {
      reject(new Error('worker_unavailable'));
      return;
    }
    const id = nextId++;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, csvText: String(text || ''), options: options || {} });
  });
}

export async function parseCsvFile(file) {
  if (!file) throw new Error('csv_no_file');
  if (file.size > MAX_FILE_BYTES) throw new Error('csv_file_too_large');
  const text = await file.text();
  return parseCsvText(text);
}

// Mapuje wiersze CSV na items joba.
// header: pierwsza linia traktowana jako nagłówki (case-insensitive: value/code, name, price, description, copies, type/code_type).
// Zwraca { items, skipped, headerMap }.
export function rowsToJobItems(rows, options) {
  const opts = options || {};
  const useHeader = opts.header !== false;
  if (!Array.isArray(rows) || rows.length === 0) {
    return { items: [], skipped: 0, headerMap: null };
  }

  let headerMap = null;
  let dataStart = 0;
  if (useHeader) {
    const head = rows[0].map((h) => String(h || '').trim().toLowerCase());
    headerMap = mapHeaders(head);
    dataStart = 1;
  }

  const items = [];
  let skipped = 0;
  for (let i = dataStart; i < rows.length && items.length < MAX_ROWS; i++) {
    const r = rows[i];
    if (!r || r.length === 0) { skipped++; continue; }
    const item = mapRow(r, headerMap);
    if (!item || !item.value) { skipped++; continue; }
    items.push({ position: items.length, ...item });
  }
  return { items, skipped, headerMap };
}

function mapHeaders(head) {
  const map = { value: -1, name: -1, price: -1, description: -1, copies: -1, code_type: -1 };
  for (let i = 0; i < head.length; i++) {
    const h = head[i];
    if (map.value === -1 && (h === 'value' || h === 'code' || h === 'barcode' || h === 'sku' || h === 'ean')) map.value = i;
    else if (map.name === -1 && (h === 'name' || h === 'product' || h === 'title')) map.name = i;
    else if (map.price === -1 && (h === 'price' || h === 'cost')) map.price = i;
    else if (map.description === -1 && (h === 'description' || h === 'desc' || h === 'notes')) map.description = i;
    else if (map.copies === -1 && (h === 'copies' || h === 'qty' || h === 'quantity' || h === 'count')) map.copies = i;
    else if (map.code_type === -1 && (h === 'code_type' || h === 'type' || h === 'format')) map.code_type = i;
  }
  if (map.value === -1) map.value = 0;
  return map;
}

function mapRow(row, headerMap) {
  const get = (idx) => (idx >= 0 && idx < row.length ? String(row[idx] || '').trim() : '');
  if (!headerMap) {
    return {
      value: get(0),
      code_type: get(1) || 'CODE128',
      name: get(2) || null,
      description: get(3) || null,
      price: get(4) || null,
      copies: parseCopies(get(5)),
    };
  }
  const value = get(headerMap.value);
  if (!value) return null;
  return {
    value,
    name: get(headerMap.name) || null,
    price: get(headerMap.price) || null,
    description: get(headerMap.description) || null,
    copies: parseCopies(get(headerMap.copies)),
    code_type: get(headerMap.code_type) || 'CODE128',
  };
}

function parseCopies(s) {
  const n = Number(s);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(1000, Math.floor(n));
}

export { MAX_FILE_BYTES, MAX_ROWS };
