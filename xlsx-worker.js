const XLSX_URL = new URL('./vendor/xlsx.min.js', self.location.href).href;
let parserLoaded = false;

function loadParser() {
  if (parserLoaded && self.XLSX) return;
  importScripts(XLSX_URL);
  if (!self.XLSX) throw new Error('workbook_parser_unavailable');
  parserLoaded = true;
}

function rangeCellCount(sheet) {
  if (!sheet?.['!ref']) return 0;
  const range = self.XLSX.utils.decode_range(sheet['!ref']);
  return (range.e.r - range.s.r + 1) * (range.e.c - range.s.c + 1);
}

function parseWorkbook(buffer, maxRows, maxCells) {
  loadParser();
  const workbook = self.XLSX.read(buffer, {
    type: 'array',
    cellDates: false,
    dense: true,
    sheetRows: maxRows + 2,
  });

  let workbookCells = 0;
  for (const sheetName of workbook.SheetNames || []) {
    const sheet = workbook.Sheets[sheetName];
    workbookCells += rangeCellCount(sheet);
    if (workbookCells > maxCells) throw new Error('workbook_too_many_cells');

    const rows = self.XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: '',
      blankrows: false,
    });
    if (rows.length) return { rows, sheetName, format: 'xlsx' };
  }
  throw new Error('workbook_invalid');
}

self.addEventListener('message', (event) => {
  const { buffer, maxRows, maxCells } = event.data || {};
  try {
    const result = parseWorkbook(buffer, maxRows, maxCells);
    self.postMessage({ ok: true, result });
  } catch (error) {
    self.postMessage({ ok: false, error: String(error?.message || error) });
  }
});
