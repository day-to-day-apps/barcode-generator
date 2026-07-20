const MM_TO_PT = 72 / 25.4;

export const BULK_PRESETS = {
  'avery-l7160-a4': { label: 'Avery L7160 - A4 (3 x 7)', pageW: 210, pageH: 297, cols: 3, rows: 7, labelW: 63.5, labelH: 38.1, marginX: 7.2, marginY: 15.1, gapX: 2.5, gapY: 0 },
  'avery-5160-letter': { label: 'Avery 5160 - Letter (3 x 10)', pageW: 215.9, pageH: 279.4, cols: 3, rows: 10, labelW: 66.675, labelH: 25.4, marginX: 4.7625, marginY: 12.7, gapX: 3.175, gapY: 0 },
  'thermal-58x40': { label: 'Thermal 58 x 40 mm', pageW: 58, pageH: 40, cols: 1, rows: 1, labelW: 58, labelH: 40, marginX: 0, marginY: 0, gapX: 0, gapY: 0 },
  'thermal-62x29': { label: 'Brother 62 x 29 mm', pageW: 62, pageH: 29, cols: 1, rows: 1, labelW: 62, labelH: 29, marginX: 0, marginY: 0, gapX: 0, gapY: 0 },
  'thermal-100x150': { label: 'Shipping 100 x 150 mm', pageW: 100, pageH: 150, cols: 1, rows: 1, labelW: 100, labelH: 150, marginX: 0, marginY: 0, gapX: 0, gapY: 0 },
};

const TYPE_ALIASES = {
  CODE128: 'CODE128', 'CODE 128': 'CODE128', 'GS1-128': 'GS1-128', GS1128: 'GS1-128',
  EAN13: 'EAN13', 'EAN-13': 'EAN13', EAN8: 'EAN8', 'EAN-8': 'EAN8',
  UPC: 'UPC', UPCA: 'UPC', 'UPC-A': 'UPC', CODE39: 'CODE39', 'CODE 39': 'CODE39',
  ITF14: 'ITF14', 'ITF-14': 'ITF14', DATAMATRIX: 'DATAMATRIX', 'DATA MATRIX': 'DATAMATRIX',
  PDF417: 'PDF417', 'PDF 417': 'PDF417', AZTEC: 'AZTEC',
};

export const TWO_D_TYPES = new Set(['DATAMATRIX', 'PDF417', 'AZTEC']);

function checkDigit(value) {
  const sum = [...value].reverse().reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
  return String((10 - (sum % 10)) % 10);
}

export function validateBulkItem(raw, index = 0) {
  const value = String(raw?.value || '').trim();
  const codeType = TYPE_ALIASES[String(raw?.code_type || raw?.type || 'CODE128').trim().toUpperCase()];
  const base = { ...raw, index, value, code_type: codeType || String(raw?.code_type || 'CODE128').toUpperCase(), copies: Math.max(1, Math.min(1000, Math.floor(Number(raw?.copies) || 1))) };
  if (!value) return { ...base, status: 'error', reason: 'missing_value' };
  if (!codeType) return { ...base, status: 'error', reason: 'unsupported_type' };
  if (codeType === 'CODE128' && !/^[\x20-\x7E]+$/.test(value)) return { ...base, status: 'error', reason: 'invalid_characters' };
  if (codeType === 'GS1-128' && !/^[\x1D\x20-\x7E]+$/.test(value)) return { ...base, status: 'error', reason: 'invalid_characters' };
  if (TWO_D_TYPES.has(codeType) && new TextEncoder().encode(value).length > 3000) return { ...base, status: 'error', reason: 'value_too_long' };
  if (codeType === 'CODE39' && !/^[0-9A-Z .\-$/+%]+$/.test(value.toUpperCase())) return { ...base, status: 'error', reason: 'invalid_characters' };
  if (codeType === 'CODE39' && value !== value.toUpperCase()) return { ...base, value: value.toUpperCase(), status: 'corrected', reason: 'uppercase_applied' };
  const specs = { EAN13: [12, 13], EAN8: [7, 8], UPC: [11, 12], ITF14: [13, 14] };
  if (specs[codeType]) {
    if (!/^\d+$/.test(value) || !specs[codeType].includes(value.length)) return { ...base, status: 'error', reason: 'invalid_length' };
    const [withoutCheck, withCheck] = specs[codeType];
    if (value.length === withoutCheck) return { ...base, value: value + checkDigit(value), status: 'corrected', reason: 'check_digit_added' };
    if (value.at(-1) !== checkDigit(value.slice(0, -1))) return { ...base, status: 'error', reason: 'invalid_check_digit' };
  }
  return { ...base, status: 'valid', reason: '' };
}

export function expandBulkItems(items, maxLabels = 2000) {
  const output = [];
  for (const item of items) {
    if (item.status === 'error') continue;
    for (let copy = 0; copy < item.copies && output.length < maxLabels; copy++) output.push(item);
    if (output.length >= maxLabels) break;
  }
  return output;
}

export function createBarcodeSvg(item, displayValue = true) {
  if (TWO_D_TYPES.has(item.code_type)) {
    const saved = item.settings && typeof item.settings === 'object' ? item.settings : {};
    const defaults = { DATAMATRIX: 'datamatrix', PDF417: 'pdf417', AZTEC: 'azteccode' };
    const allowedBcids = {
      DATAMATRIX: new Set(['datamatrix', 'datamatrixrectangular']),
      PDF417: new Set(['pdf417']),
      AZTEC: new Set(['azteccode', 'azteccodecompact']),
    };
    const requested = String(saved.bcid || defaults[item.code_type]);
    const bcid = allowedBcids[item.code_type].has(requested) ? requested : defaults[item.code_type];
    const options = {
      bcid,
      text: item.value,
      scale: Math.max(2, Math.min(6, Number(saved.scale) || 3)),
      padding: Math.max(2, Math.min(12, Number(saved.padding) || 4)),
      barcolor: /^#[0-9a-f]{6}$/i.test(saved.barcolor) ? saved.barcolor : '#111111',
      backgroundcolor: /^#[0-9a-f]{6}$/i.test(saved.backgroundcolor) ? saved.backgroundcolor : '#ffffff',
    };
    if (bcid === 'pdf417') {
      options.columns = Math.max(2, Math.min(8, Number(saved.columns) || 4));
      options.eclevel = Math.max(2, Math.min(5, Number(saved.eclevel) || 3));
      options.rowmult = 3;
    } else if (bcid.startsWith('azteccode')) {
      options.eclevel = Math.max(23, Math.min(50, Number(saved.eclevel) || 33));
    }
    return window.bwipjs.toSVG(options);
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const gs1 = item.code_type === 'GS1-128';
  window.JsBarcode(svg, item.value, {
    format: gs1 ? 'CODE128' : item.code_type,
    ean128: gs1,
    text: gs1 && item.settings?.hri ? item.settings.hri : undefined,
    width: 2, height: 80, margin: 12, displayValue, fontSize: 18,
    background: '#ffffff', lineColor: '#000000',
  });
  return new XMLSerializer().serializeToString(svg);
}

async function svgToPng(svgText, widthPx = 900) {
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
    const ratio = image.naturalHeight / Math.max(image.naturalWidth, 1);
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = Math.max(180, Math.round(widthPx * ratio));
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    return new Uint8Array(await pngBlob.arrayBuffer());
  } finally { URL.revokeObjectURL(url); }
}

function assertActive(signal) {
  if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
}

export async function createBulkPdf(items, presetId, options = {}) {
  const preset = BULK_PRESETS[presetId] || BULK_PRESETS['avery-l7160-a4'];
  const labels = expandBulkItems(items, options.maxLabels || 2000);
  const pdf = await window.PDFLib.PDFDocument.create();
  const font = await pdf.embedFont(window.PDFLib.StandardFonts.Helvetica);
  const cache = new Map();
  const perPage = preset.cols * preset.rows;
  for (let i = 0; i < labels.length; i++) {
    assertActive(options.signal);
    if (i % perPage === 0) pdf.addPage([preset.pageW * MM_TO_PT, preset.pageH * MM_TO_PT]);
    const page = pdf.getPages().at(-1);
    const item = labels[i];
    const slot = i % perPage;
    const col = slot % preset.cols;
    const row = Math.floor(slot / preset.cols);
    const xMm = preset.marginX + col * (preset.labelW + preset.gapX);
    const topMm = preset.marginY + row * (preset.labelH + preset.gapY);
    const x = xMm * MM_TO_PT;
    const y = (preset.pageH - topMm - preset.labelH) * MM_TO_PT;
    const key = `${item.code_type}:${item.value}`;
    if (!cache.has(key)) cache.set(key, await pdf.embedPng(await svgToPng(createBarcodeSvg(item, true), Math.max(600, Math.round(preset.labelW / 25.4 * 300)))));
    const image = cache.get(key);
    const pad = Math.min(3, preset.labelW * 0.04) * MM_TO_PT;
    const textSpace = (item.name || item.price || item.description) ? Math.min(10, preset.labelH * 0.28) * MM_TO_PT : 0;
    const imageW = preset.labelW * MM_TO_PT - pad * 2;
    const imageH = preset.labelH * MM_TO_PT - pad * 2 - textSpace;
    const scale = Math.min(imageW / image.width, imageH / image.height);
    page.drawImage(image, { x: x + (preset.labelW * MM_TO_PT - image.width * scale) / 2, y: y + pad + textSpace, width: image.width * scale, height: image.height * scale });
    const caption = [item.name, item.price].filter(Boolean).join(' - ') || item.description || '';
    if (caption) page.drawText(String(caption).slice(0, 80), { x: x + pad, y: y + pad, size: Math.max(6, Math.min(10, preset.labelH / 4)), font, maxWidth: imageW, color: window.PDFLib.rgb(0, 0, 0) });
    options.onProgress?.(i + 1, labels.length);
    if (i % 12 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return { bytes: await pdf.save(), labels: labels.length, pages: Math.ceil(labels.length / perPage), preset };
}

function safeName(value, index) {
  const stem = String(value || '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || `barcode-${index + 1}`;
  return `${String(index + 1).padStart(4, '0')}-${stem}`;
}

export async function createBulkZip(items, format, options = {}) {
  const labels = expandBulkItems(items, options.maxLabels || 2000);
  const zip = new window.JSZip();
  for (let i = 0; i < labels.length; i++) {
    assertActive(options.signal);
    const svg = createBarcodeSvg(labels[i], true);
    const name = safeName(labels[i].value, i);
    if (format === 'png') zip.file(`${name}.png`, await svgToPng(svg, 1200));
    else zip.file(`${name}.svg`, svg);
    options.onProgress?.(i + 1, labels.length);
    if (i % 10 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export function createValidationReport(items) {
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [['row', 'value', 'type', 'copies', 'status', 'reason'], ...items.map((item) => [item.index + 1, item.value, item.code_type, item.copies, item.status, item.reason])];
  return '\uFEFF' + rows.map((row) => row.map(quote).join(',')).join('\r\n') + '\r\n';
}

export function downloadBytes(data, filename, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
