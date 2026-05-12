// print-builder.js — orchestrator: template + printer profile + items → arkusz HTML do druku.
// Wymaga, by w oknie był załadowany window.LabelRenderer (label-renderer.js + JsBarcode).

const DEFAULT_TEMPLATE = {
  pageSize: 'A4',
  widthMm: 210,
  heightMm: 297,
  marginTopMm: 10,
  marginRightMm: 10,
  marginBottomMm: 10,
  marginLeftMm: 10,
  fontSizePt: 10,
};

const DEFAULT_PRINTER = {
  printer_type: 'a4-sheet',
  page_w_mm: 210,
  page_h_mm: 297,
  cols: 3,
  rows: 8,
  label_w_mm: 63,
  label_h_mm: 33,
  margin_top_mm: 10,
  margin_left_mm: 10,
  gap_x_mm: 2,
  gap_y_mm: 0,
  dpi: 203,
  offset_x_mm: 0,
  offset_y_mm: 0,
  bar_width_correction: 1.0,
};

// Rozwija items[{value, copies, ...}] na pełną listę etykiet, respektując MAX_LABELS.
const MAX_LABELS = 2000;

export function expandItems(items) {
  const out = [];
  if (!Array.isArray(items)) return out;
  for (const it of items) {
    const copies = Math.max(1, Math.min(1000, Number(it?.copies) || 1));
    for (let c = 0; c < copies && out.length < MAX_LABELS; c++) {
      out.push({
        value: String(it?.value || '').trim(),
        code_type: String(it?.code_type || 'CODE128'),
        name: it?.name || '',
        price: it?.price || '',
        description: it?.description || '',
      });
    }
    if (out.length >= MAX_LABELS) break;
  }
  return out;
}

export function paginate(labels, perPage) {
  const pages = [];
  if (!labels.length || perPage < 1) return pages;
  for (let i = 0; i < labels.length; i += perPage) {
    pages.push(labels.slice(i, i + perPage));
  }
  return pages;
}

// Buduje pełny HTML arkusza (jeden lub wiele @page). Zwraca { html, pages, labelsTotal }.
export function buildSheetHTML(opts) {
  const items = Array.isArray(opts?.items) ? opts.items : [];
  const template = { ...DEFAULT_TEMPLATE, ...(opts?.template || {}) };
  const printer = { ...DEFAULT_PRINTER, ...(opts?.printer || {}) };
  const i18n = opts?.t || {};
  const lineColor = opts?.lineColor || '#000000';

  if (!window.LabelRenderer || typeof window.LabelRenderer.createLabelHTML !== 'function') {
    throw new Error('label_renderer_unavailable');
  }

  const expanded = expandItems(items);
  const perPage = Math.max(1, Number(printer.cols) * Number(printer.rows));
  const pages = paginate(expanded, perPage);

  const pageW = Number(printer.page_w_mm) || template.widthMm;
  const pageH = Number(printer.page_h_mm) || template.heightMm;
  const cols = Math.max(1, Number(printer.cols) || 1);
  const labelW = Number(printer.label_w_mm) || 50;
  const labelH = Number(printer.label_h_mm) || 25;
  const gapX = Math.max(0, Number(printer.gap_x_mm) || 0);
  const gapY = Math.max(0, Number(printer.gap_y_mm) || 0);
  const marginTop = Math.max(0, (Number(printer.margin_top_mm) || 0) + (Number(printer.offset_y_mm) || 0));
  const marginLeft = Math.max(0, (Number(printer.margin_left_mm) || 0) + (Number(printer.offset_x_mm) || 0));
  const fontSize = Number(template.fontSizePt) || 10;

  const pageBlocks = pages.map((labels) => {
    const cells = labels.map((lbl) => {
      const html = window.LabelRenderer.createLabelHTML({
        widthMM: labelW,
        heightMM: labelH,
        text: lbl.value,
        type: lbl.code_type,
        fSize: fontSize,
        bcHeightPercent: 60,
        showName: !!lbl.name,
        showPrice: !!lbl.price,
        showBcText: true,
        showDesc: !!lbl.description,
        productName: lbl.name,
        price: lbl.price,
        description: lbl.description,
        cutLines: false,
        lineColor,
        t: i18n,
      });
      return '<div class="pb-cell" style="width:' + labelW + 'mm;height:' + labelH + 'mm;">' + html + '</div>';
    }).join('');

    return '<section class="pb-page" style="' +
      'width:' + pageW + 'mm;height:' + pageH + 'mm;' +
      'padding:' + marginTop + 'mm 0 0 ' + marginLeft + 'mm;' +
      'grid-template-columns:repeat(' + cols + ', ' + labelW + 'mm);' +
      'column-gap:' + gapX + 'mm;row-gap:' + gapY + 'mm;' +
      '">' + cells + '</section>';
  }).join('');

  const styles = '@page{size:' + pageW + 'mm ' + pageH + 'mm;margin:0;}' +
    'html,body{margin:0;padding:0;background:#fff;}' +
    '.pb-page{box-sizing:border-box;display:grid;align-content:start;page-break-after:always;}' +
    '.pb-page:last-child{page-break-after:auto;}' +
    '.pb-cell{box-sizing:border-box;overflow:hidden;}';

  const html = '<!doctype html><html><head><meta charset="utf-8">' +
    '<title>' + escapeHtml(opts?.title || 'Print') + '</title>' +
    '<style>' + styles + '</style>' +
    '</head><body>' + pageBlocks + '</body></html>';

  return { html, pages: pages.length, labelsTotal: expanded.length };
}

// Otwiera arkusz w nowym oknie i wywołuje druk. Zwraca okno (lub null jeśli zablokowane).
// Otwiera arkusz w nowym oknie i wywołuje druk. Wymaga referencji do okna,
// więc nie używamy noopener; dokument jest budowany lokalnie (same-origin), bez zewnętrznych URL-i.
export function openPrintWindow(sheetHtml) {
  const w = window.open('', '_blank');
  if (!w) return null;
  w.document.open();
  w.document.write(sheetHtml);
  w.document.close();
  w.addEventListener('load', () => {
    setTimeout(() => { try { w.focus(); w.print(); } catch (_e) { /* noop */ } }, 250);
  });
  return w;
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export { MAX_LABELS };
