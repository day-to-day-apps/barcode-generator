import { parseCsvFile, rowsToJobItems } from './csv-import.js';
import { getSession } from './supabase-client.js';
import { listCodes } from './db-codes.js';
import { savePrintJob, listJobs, getJobById } from './db-jobs.js';
import { BULK_PRESETS, validateBulkItem, expandBulkItems, createBulkPdf, createBulkZip, createValidationReport, downloadBytes } from './bulk-export.js';

const pl = document.documentElement.lang === 'pl';
const copy = pl ? {
  ready: 'Zaimportuj CSV lub dodaj pierwszy rekord.', valid: 'poprawnych', corrected: 'poprawionych', errors: 'błędnych', labels: 'etykiet', anonymous: 'Tryb bez konta: do 50 rekordów i 200 etykiet.', signed: 'Zalogowano: do 500 rekordów i 2000 etykiet, zapis zadań aktywny.', importDone: 'Plik przeanalizowany.', cancelled: 'Generowanie anulowane.', saved: 'Zadanie zostało zapisane.', loaded: 'Zadanie wczytano jako kopię.', importedCodes: 'Zaimportowano zapisane kody:', login: 'Zaloguj się, aby zapisać zadanie.', noCodes: 'Brak zapisanych kodów.', jobsLoadFailed: 'Nie udało się pobrać zapisanych zadań.', exportFailed: 'Nie udało się wygenerować pliku.', limit: 'Przekroczono limit dla tego trybu.'
} : {
  ready: 'Import a CSV file or add the first record.', valid: 'valid', corrected: 'corrected', errors: 'errors', labels: 'labels', anonymous: 'Guest mode: up to 50 records and 200 labels.', signed: 'Signed in: up to 500 records and 2,000 labels, job saving enabled.', importDone: 'File analysed.', cancelled: 'Generation cancelled.', saved: 'Print job saved.', loaded: 'Job loaded as a copy.', importedCodes: 'Imported saved barcodes:', login: 'Sign in to save this job.', noCodes: 'No saved barcodes.', jobsLoadFailed: 'Saved jobs could not be loaded.', exportFailed: 'The export could not be generated.', limit: 'This mode limit has been exceeded.'
};
const $ = (id) => document.getElementById(id);
let session = null;
let items = [];
let controller = null;
let pendingCsvRows = null;

function loadVendor(globalName, filename) {
  if (window[globalName]) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(`./vendor/${filename}`, import.meta.url).href;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function limits() { return session ? { rows: 500, labels: 2000 } : { rows: 50, labels: 200 }; }
function track(name, params = {}) { window.trackBarcode?.(name, { tool: 'bulk', ...params }); }
function status(message, error = false) { $('bulk-status').textContent = message; $('bulk-status').classList.toggle('is-error', error); }
function setBusy(busy) { document.querySelectorAll('[data-export]').forEach((button) => button.disabled = busy); $('cancel-export').hidden = !busy; $('bulk-progress').hidden = !busy; }

function readRows() {
  return [...document.querySelectorAll('#bulk-rows tr')].map((row, index) => validateBulkItem({
    value: row.querySelector('[data-field=value]').value,
    code_type: row.querySelector('[data-field=code_type]').value,
    name: row.querySelector('[data-field=name]').value,
    description: row.querySelector('[data-field=description]').value,
    price: row.querySelector('[data-field=price]').value,
    copies: row.querySelector('[data-field=copies]').value,
  }, index));
}

function updateSummary() {
  items = readRows();
  const counts = { valid: 0, corrected: 0, error: 0 };
  items.forEach((item, index) => {
    counts[item.status]++;
    const row = $('bulk-rows').children[index];
    row.dataset.status = item.status;
    row.querySelector('.row-status').textContent = item.status === 'valid' ? 'OK' : item.status === 'corrected' ? item.reason : item.reason;
    if (item.status === 'corrected') row.querySelector('[data-field=value]').value = item.value;
  });
  const totalLabels = expandBulkItems(items, limits().labels).length;
  $('bulk-summary').textContent = `${counts.valid} ${copy.valid} · ${counts.corrected} ${copy.corrected} · ${counts.error} ${copy.errors} · ${totalLabels} ${copy.labels}`;
  return { counts, totalLabels };
}

function bindRow(row) {
  row.querySelector('.remove-row').addEventListener('click', () => { row.remove(); updateSummary(); });
  row.querySelectorAll('input,select').forEach((control) => control.addEventListener('change', updateSummary));
}

function addRow(item = {}) {
  if ($('bulk-rows').children.length >= limits().rows) { status(copy.limit, true); return false; }
  const fragment = $('bulk-row-template').content.cloneNode(true);
  const row = fragment.querySelector('tr');
  for (const field of ['value', 'code_type', 'name', 'description', 'price', 'copies']) {
    if (item[field] != null) row.querySelector(`[data-field=${field}]`).value = item[field];
  }
  bindRow(row);
  $('bulk-rows').appendChild(row); updateSummary(); return true;
}

async function importFile(file) {
  try {
    const parsed = await parseCsvFile(file);
    const mapped = rowsToJobItems(parsed.rows, { header: $('has-header').checked });
    pendingCsvRows = parsed.rows;
    renderMapping(mapped.headerMap, parsed.rows[0] || []);
    $('bulk-rows').innerHTML = '';
    mapped.items.slice(0, limits().rows).forEach(addRow);
    const summary = updateSummary();
    status(`${copy.importDone} ${summary.totalLabels} ${copy.labels}.`);
    track('bulk_csv_import', { delimiter: parsed.delimiter === '\t' ? 'tab' : parsed.delimiter, rows: mapped.items.length, skipped: mapped.skipped });
    track('bulk_validation', { valid: summary.counts.valid, corrected: summary.counts.corrected, errors: summary.counts.error });
  } catch (error) { status(error.message === 'csv_file_too_large' ? copy.limit : error.message, true); }
}

const MAPPING_FIELDS = ['value', 'code_type', 'name', 'description', 'price', 'copies'];
function renderMapping(headerMap, headers) {
  $('column-mapping').hidden = !$('has-header').checked || !headers.length;
  $('mapping-fields').innerHTML = '';
  if ($('column-mapping').hidden) return;
  for (const field of MAPPING_FIELDS) {
    const label = document.createElement('label'); label.textContent = field;
    const select = document.createElement('select'); select.dataset.mapField = field; select.setAttribute('aria-label', `${field} column`);
    select.add(new Option(pl ? 'Nie używaj' : 'Do not use', '-1'));
    headers.forEach((header, index) => select.add(new Option(String(header || `Column ${index + 1}`), String(index))));
    select.value = String(headerMap?.[field] ?? -1); label.appendChild(select); $('mapping-fields').appendChild(label);
  }
}

function applyMapping() {
  if (!pendingCsvRows?.length) return;
  const map = Object.fromEntries([...document.querySelectorAll('[data-map-field]')].map((select) => [select.dataset.mapField, Number(select.value)]));
  $('bulk-rows').innerHTML = '';
  const read = (row, field) => map[field] >= 0 ? String(row[map[field]] || '').trim() : '';
  for (const row of pendingCsvRows.slice(1, limits().rows + 1)) addRow({ value: read(row, 'value'), code_type: read(row, 'code_type') || 'CODE128', name: read(row, 'name'), description: read(row, 'description'), price: read(row, 'price'), copies: read(row, 'copies') || 1 });
  updateSummary(); track('bulk_column_mapping', map); status(copy.importDone);
}

function exportItems() {
  const summary = updateSummary();
  if (!items.length || summary.counts.error === items.length) { status(copy.ready, true); return null; }
  if (items.length > limits().rows || items.reduce((sum, item) => sum + (item.status === 'error' ? 0 : item.copies), 0) > limits().labels) { status(copy.limit, true); return null; }
  return items;
}

async function runExport(kind) {
  const selected = exportItems(); if (!selected) return;
  controller = new AbortController(); setBusy(true); $('bulk-progress').value = 0;
  const onProgress = (done, total) => { $('bulk-progress').max = total; $('bulk-progress').value = done; $('progress-label').textContent = `${done}/${total}`; };
  try {
    if (kind !== 'report') await loadVendor('JsBarcode', 'jsbarcode.min.js');
    if (kind === 'pdf') await loadVendor('PDFLib', 'pdf-lib.min.js');
    if (kind.startsWith('zip-')) await loadVendor('JSZip', 'jszip.min.js');
    if (kind === 'pdf') {
      const result = await createBulkPdf(selected, $('page-preset').value, { maxLabels: limits().labels, signal: controller.signal, onProgress });
      downloadBytes(result.bytes, 'barcode-labels.pdf', 'application/pdf');
      track('bulk_export_pdf', { labels: result.labels, pages: result.pages, preset: $('page-preset').value });
    } else if (kind === 'zip-svg' || kind === 'zip-png') {
      const format = kind.endsWith('png') ? 'png' : 'svg';
      const bytes = await createBulkZip(selected, format, { maxLabels: limits().labels, signal: controller.signal, onProgress });
      downloadBytes(bytes, `barcodes-${format}.zip`, 'application/zip');
      track('bulk_export_zip', { labels: expandBulkItems(selected, limits().labels).length, format });
    } else {
      downloadBytes(createValidationReport(selected), 'barcode-validation-report.csv', 'text/csv;charset=utf-8');
      track('bulk_export_report', { rows: selected.length });
    }
    status(pl ? 'Plik jest gotowy.' : 'Your file is ready.');
  } catch (error) {
    status(error.name === 'AbortError' ? copy.cancelled : copy.exportFailed, error.name !== 'AbortError');
    if (error.name !== 'AbortError') track('bulk_export_error', { kind, message: error.message });
  } finally { setBusy(false); controller = null; }
}

async function importSavedCodes() {
  if (!session) return status(copy.login, true);
  const { data, error } = await listCodes();
  if (error || !data?.length) return status(copy.noCodes, true);
  const existingRows = [...$('bulk-rows').children];
  if (existingRows.length && existingRows.every((row) => !row.querySelector('[data-field=value]').value.trim())) {
    $('bulk-rows').innerHTML = '';
  }
  let imported = 0;
  for (const code of data) {
    if (addRow({ value: code.value, code_type: code.code_type, name: code.name, copies: 1 })) imported += 1;
  }
  status(`${copy.importedCodes} ${imported}.`);
  track('bulk_saved_codes_import', { count: imported });
}

async function saveJob() {
  if (!session) return status(copy.login, true);
  const selected = exportItems(); if (!selected) return;
  const name = $('job-name').value.trim() || `Bulk ${new Date().toISOString().slice(0, 10)}`;
  const payload = selected.filter((item) => item.status !== 'error').map(({ status: _status, reason: _reason, index: _index, ...item }, position) => ({ ...item, position, extra: {} }));
  const result = await savePrintJob({ name, notes: 'Created with bulk barcode generator' }, payload);
  if (result.error) return status(result.error.message, true);
  await loadJobOptions(result.data);
  status(copy.saved); track('bulk_job_saved', { rows: payload.length });
}

async function loadPreviousJob() {
  const id = $('saved-job-select').value; if (!id) return;
  const { data, error } = await getJobById(id); if (error || !data) return status(error?.message || copy.noCodes, true);
  $('bulk-rows').innerHTML = ''; (data.items || []).forEach(addRow); $('job-name').value = `${data.name} - ${pl ? 'kopia' : 'copy'}`;
  updateSummary(); status(copy.loaded); track('bulk_job_duplicated', { items: data.items?.length || 0 });
}

async function loadJobOptions(selectedId = '') {
  const { data, error } = await listJobs(); const select = $('saved-job-select'); select.innerHTML = '';
  if (error) { status(copy.jobsLoadFailed, true); return; }
  select.add(new Option(pl ? 'Wybierz zadanie' : 'Choose a job', ''));
  (data || []).forEach((job) => select.add(new Option(job.name, job.id)));
  if (selectedId && (data || []).some((job) => job.id === selectedId)) select.value = selectedId;
  $('saved-job-wrap').hidden = !(data || []).length; $('load-job').hidden = !(data || []).length;
}

Object.entries(BULK_PRESETS).forEach(([value, preset]) => $('page-preset').add(new Option(preset.label, value)));
$('csv-file').addEventListener('change', (event) => { const file = event.target.files[0]; if (file) importFile(file); event.target.value = ''; });
$('add-row').addEventListener('click', () => addRow());
$('clear-rows').addEventListener('click', () => { $('bulk-rows').innerHTML = ''; updateSummary(); status(copy.ready); });
$('import-saved').addEventListener('click', importSavedCodes);
$('save-job').addEventListener('click', saveJob);
$('apply-mapping').addEventListener('click', applyMapping);
$('load-job').addEventListener('click', loadPreviousJob);
$('cancel-export').addEventListener('click', () => controller?.abort());
document.querySelectorAll('[data-export]').forEach((button) => button.addEventListener('click', () => runExport(button.dataset.export)));

[...$('bulk-rows').children].forEach(bindRow); updateSummary(); status(copy.ready);
$('account-mode').textContent = copy.anonymous;
$('import-saved').hidden = true; $('save-job').hidden = true; $('job-name-wrap').hidden = true; $('saved-job-wrap').hidden = true; $('load-job').hidden = true;
addEventListener('load', () => setTimeout(async () => {
  session = await getSession();
  $('account-mode').textContent = session ? copy.signed : copy.anonymous;
  $('import-saved').hidden = !session; $('save-job').hidden = !session; $('job-name-wrap').hidden = !session;
  if (session) await loadJobOptions();
}, 0), { once: true });
