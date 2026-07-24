// csv-worker.js — pełny parser CSV (quotes, escapes, CRLF). Worker module.
// Akceptuje { csvText, options } przez postMessage, zwraca { rows, errors }.

function parseCsv(text, options) {
  const opts = options || {};
  text = String(text || '').replace(/^\uFEFF/, '');
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
  if (inQuotes) {
    errors.push({ row: rows.length || 1, code: 'unterminated_quote' });
  }

  return { rows, errors, delimiter };
}

function detectDelimiter(sample) {
  const head = sample.slice(0, 32768);
  const candidates = [',', ';', '\t', '|'];
  const rowCounts = [];
  let counts = Object.fromEntries(candidates.map((candidate) => [candidate, 0]));
  let inQuotes = false;

  for (let i = 0; i < head.length && rowCounts.length < 20; i++) {
    const ch = head[i];
    if (ch === '"') {
      if (inQuotes && head[i + 1] === '"') {
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (inQuotes) continue;
    if (Object.hasOwn(counts, ch)) counts[ch]++;
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && head[i + 1] === '\n') i++;
      rowCounts.push(counts);
      counts = Object.fromEntries(candidates.map((candidate) => [candidate, 0]));
    }
  }
  if (Object.values(counts).some(Boolean)) rowCounts.push(counts);

  let best = ',';
  let bestScore = 0;
  for (const candidate of candidates) {
    const fieldCounts = rowCounts.map((entry) => entry[candidate] + 1).filter((count) => count > 1);
    if (!fieldCounts.length) continue;
    const frequencies = new Map();
    for (const count of fieldCounts) frequencies.set(count, (frequencies.get(count) || 0) + 1);
    const [modalFields, matchingRows] = [...frequencies.entries()]
      .sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
    const score = matchingRows * 1000 + modalFields;
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
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
