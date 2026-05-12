// csv-worker.js — pełny parser CSV (quotes, escapes, CRLF). Worker module.
// Akceptuje { csvText, options } przez postMessage, zwraca { rows, errors }.

function parseCsv(text, options) {
  const opts = options || {};
  const delimiter = opts.delimiter || detectDelimiter(text);
  const rows = [];
  const errors = [];
  const len = text.length;

  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < len) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === delimiter) {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      row.push(field);
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += ch;
    i++;
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }

  return { rows, errors, delimiter };
}

function detectDelimiter(sample) {
  const head = sample.slice(0, 4096);
  const candidates = [',', ';', '\t', '|'];
  let best = ',';
  let bestCount = 0;
  for (const c of candidates) {
    const count = (head.match(new RegExp('\\' + c, 'g')) || []).length;
    if (count > bestCount) { bestCount = count; best = c; }
  }
  return best;
}

self.addEventListener('message', (ev) => {
  const { id, csvText, options } = ev.data || {};
  try {
    const result = parseCsv(String(csvText || ''), options || {});
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err && err.message || err) });
  }
});
