(function () {
    'use strict';

    // ===== FLAG EMOJI POLYFILL (Windows doesn't render flag emojis) =====
    document.addEventListener('DOMContentLoaded', () => {
        const flagToCode = {
            '🇬🇧': 'gb', '🇵🇱': 'pl', '🇩🇪': 'de', '🇫🇷': 'fr', '🇪🇸': 'es',
            '🇮🇹': 'it', '🇵🇹': 'pt', '🇳🇱': 'nl', '🇨🇿': 'cz', '🇺🇦': 'ua'
        };
        const flagRegex = new RegExp(Object.keys(flagToCode).join('|'), 'g');
        document.querySelectorAll('.lang-current, .lang-option').forEach(el => {
            const text = el.textContent;
            if (!flagRegex.test(text)) return;
            flagRegex.lastIndex = 0;
            const parts = text.split(flagRegex);
            const flags = text.match(flagRegex) || [];
            el.textContent = '';
            parts.forEach((part, i) => {
                if (part) el.appendChild(document.createTextNode(part));
                if (flags[i]) {
                    const code = flagToCode[flags[i]];
                    const img = document.createElement('img');
                    img.src = `https://flagcdn.com/20x15/${code}.png`;
                    img.srcset = `https://flagcdn.com/40x30/${code}.png 2x`;
                    img.width = 20;
                    img.height = 15;
                    img.alt = '';
                    img.className = 'flag-img';
                    el.appendChild(img);
                }
            });
        });
    });

    const LANG = document.documentElement.lang || 'en';
    const T = (window.BARCODE_I18N || {})[LANG] || (window.BARCODE_I18N || {})['en'] || {};

    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const previewImg = document.getElementById('preview-img');
    const previewContainer = document.querySelector('.preview-container');
    const resultBox = document.getElementById('result-box');
    const resultType = document.getElementById('result-type');
    const resultValue = document.getElementById('result-value');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');
    const errorBox = document.getElementById('error-box');
    const spinner = document.getElementById('spinner');
    const cameraBtn = document.getElementById('camera-btn');
    const cameraModal = document.getElementById('camera-modal');
    const cameraVideo = document.getElementById('camera-video');
    const cameraClose = document.getElementById('camera-close');

    // Translations fallback
    const strings = {
        decoding: T.decoder_decoding || 'Decoding…',
        notFound: T.decoder_not_found || 'No barcode detected in the image. Try a clearer photo or different angle.',
        invalidFile: T.decoder_invalid_file || 'Please select a valid image file (JPG, PNG, WebP).',
        tooLarge: T.decoder_too_large || 'Image too large (max 10 MB).',
        copied: T.decoder_copied || 'Copied!',
        copyFailed: T.decoder_copy_failed || 'Copy failed',
        formatLabel: T.decoder_format_label || 'Format',
        valueLabel: T.decoder_value_label || 'Value',
        cameraUnavailable: T.decoder_camera_unavailable || 'Camera not available in this browser. Use HTTPS and grant permission.',
        cameraDenied: T.decoder_camera_denied || 'Camera permission denied.',
        cameraNotFound: T.decoder_camera_not_found || 'No camera found on this device.'
    };

    const MAX_SIZE = 10 * 1024 * 1024;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];

    let codeReader = null;

    function getReader() {
        if (codeReader) return codeReader;
        const lib = window.ZXing || window.ZXingBrowser;
        if (!lib || typeof lib.BrowserMultiFormatReader !== 'function') return null;

        // Hints: TRY_HARDER + explicit format list dramatically improves detection
        // from live camera feeds (motion blur, angles, low contrast).
        let hints = null;
        try {
            if (lib.DecodeHintType && lib.BarcodeFormat) {
                hints = new Map();
                hints.set(lib.DecodeHintType.TRY_HARDER, true);
                const F = lib.BarcodeFormat;
                const formats = [
                    F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E,
                    F.CODE_128, F.CODE_39, F.CODE_93, F.CODABAR,
                    F.ITF, F.QR_CODE, F.DATA_MATRIX, F.AZTEC,
                    F.PDF_417, F.RSS_14, F.RSS_EXPANDED
                ].filter(f => typeof f !== 'undefined');
                hints.set(lib.DecodeHintType.POSSIBLE_FORMATS, formats);
            }
        } catch (_) { hints = null; }

        // timeBetweenScansMillis = 200 → 5 attempts/sec (default is 500ms)
        codeReader = hints
            ? new lib.BrowserMultiFormatReader(hints, 200)
            : new lib.BrowserMultiFormatReader();
        return codeReader;
    }

    function showError(msg) {
        errorBox.textContent = msg;
        errorBox.hidden = false;
        resultBox.hidden = true;
    }

    function hideError() {
        errorBox.hidden = true;
        errorBox.textContent = '';
    }

    function showSpinner(show) {
        spinner.hidden = !show;
    }

    function resetResult() {
        resultBox.hidden = true;
        resultType.textContent = '';
        resultValue.textContent = '';
    }

    function validateFile(file) {
        if (!file || !ALLOWED_TYPES.includes(file.type)) {
            return strings.invalidFile;
        }
        if (file.size > MAX_SIZE) {
            return strings.tooLarge;
        }
        return null;
    }

    async function decodeFile(file) {
        const err = validateFile(file);
        if (err) {
            showError(err);
            return;
        }

        hideError();
        resetResult();
        showSpinner(true);

        const reader = getReader();
        if (!reader) {
            showError('Decoder library failed to load. Check your internet connection.');
            showSpinner(false);
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        previewImg.src = objectUrl;
        previewImg.hidden = false;
        if (previewContainer) previewContainer.classList.add('scanning');

        try {
            // Wait for image to load before decoding
            await new Promise((resolve, reject) => {
                if (previewImg.complete && previewImg.naturalWidth > 0) {
                    resolve();
                } else {
                    previewImg.onload = () => resolve();
                    previewImg.onerror = () => reject(new Error('Image load failed'));
                }
            });

            const result = await reader.decodeFromImageElement(previewImg);

            resultType.textContent = result.getBarcodeFormat();
            resultValue.textContent = result.getText();
            resultBox.hidden = false;
        } catch (e) {
            if (e && e.name === 'NotFoundException') {
                showError(strings.notFound);
            } else {
                showError((e && e.message) || strings.notFound);
            }
        } finally {
            showSpinner(false);
            if (previewContainer) previewContainer.classList.remove('scanning');
            URL.revokeObjectURL(objectUrl);
        }
    }

    // File input
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) decodeFile(file);
    });

    // Drag & drop
    ['dragenter', 'dragover'].forEach((evt) => {
        dropArea.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropArea.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach((evt) => {
        dropArea.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropArea.classList.remove('drag-over');
        });
    });

    dropArea.addEventListener('drop', (e) => {
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) decodeFile(file);
    });

    // Paste from clipboard — document scope + auto-cleanup on unload
    const pasteController = new AbortController();
    document.addEventListener('paste', (e) => {
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (const item of items) {
            if (item.type && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) decodeFile(file);
                return;
            }
        }
    }, { signal: pasteController.signal });
    window.addEventListener('pagehide', () => pasteController.abort(), { once: true });

    // Copy button — guard against double-click race
    let copyOriginalHtml = null;
    let copyResetTimer = null;
    copyBtn.addEventListener('click', async () => {
        if (copyBtn.classList.contains('copied')) return;
        const value = resultValue.textContent;
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            copyOriginalHtml = copyBtn.innerHTML;
            copyBtn.classList.add('copied');
            copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 10 8 14 16 6"/></svg>' + strings.copied;
            clearTimeout(copyResetTimer);
            copyResetTimer = setTimeout(() => {
                copyBtn.classList.remove('copied');
                if (copyOriginalHtml !== null) copyBtn.innerHTML = copyOriginalHtml;
            }, 1800);
        } catch (e) {
            showError(strings.copyFailed);
        }
    });

    // Clear button
    clearBtn.addEventListener('click', () => {
        fileInput.value = '';
        previewImg.src = '';
        previewImg.hidden = true;
        resetResult();
        hideError();
    });

    // ===== CAMERA SCANNING =====
    let cameraActive = false;
    let cameraStream = null;
    let rafId = 0;
    let usingNativeDetector = false;

    // Multi-scan state
    let scanMode = 'single'; // 'single' | 'multi'
    const scanMap = new Map(); // value -> { format, count, lastAt }
    const SCAN_DEBOUNCE_MS = 1500;
    const SCAN_STORAGE_KEY = 'decoder.scanMap.v1';
    const SCAN_STORAGE_LIMIT = 1000;
    let multiUI = null; // { toggle, badge, panel, list, confirmBtn, clearBtn }

    const multiStrings = {
        single:   T.decoder_mode_single   || 'Single',
        multi:    T.decoder_mode_multi    || 'Multi',
        scanned:  T.decoder_scanned_count || 'Scanned',
        copyAll:  T.decoder_copy_all      || 'Copy all',
        confirm:  T.decoder_confirm       || 'Confirm',
        clearAll: T.decoder_clear_all     || 'Clear',
        empty:    T.decoder_list_empty    || 'Point camera at codes — they will appear here.',
        resultsHeading: T.decoder_results_heading || 'Scanned codes',
        decrease: T.decoder_qty_decrease  || 'Decrease quantity',
        increase: T.decoder_qty_increase  || 'Increase quantity',
        quantity: T.decoder_qty_label     || 'Quantity',
        remove:   T.decoder_qty_remove    || 'Remove',
        summaryTitle:    T.decoder_summary_title    || 'Scan summary',
        summarySubtitle: T.decoder_summary_subtitle || 'Review scanned codes and export the list',
        summaryEmpty:    T.decoder_summary_empty    || 'No codes scanned yet.',
        summaryOpen:     T.decoder_summary_open     || 'Full view',
        summaryClose:    T.decoder_summary_close    || 'Close',
        clearConfirm:    T.decoder_clear_confirm    || 'Clear the entire scanned list?',
        exportCsv:       T.decoder_export_csv       || 'CSV',
        exportXlsx:      T.decoder_export_xlsx      || 'Excel (XLSX)',
        exportJson:      T.decoder_export_json      || 'JSON',
        exportPdf:       T.decoder_export_pdf       || 'PDF',
        exportTxtCopy:   T.decoder_export_txt_copy  || 'Copy as text',
        exportTxtDownload: T.decoder_export_txt_download || 'Download .txt',
        colCode:         T.decoder_export_col_code      || 'Code',
        colFormat:       T.decoder_export_col_format    || 'Format',
        colQuantity:     T.decoder_export_col_quantity  || 'Quantity',
        colScannedAt:    T.decoder_export_col_scanned_at || 'Scanned at',
        exportDone:      T.decoder_export_done       || 'Exported: {0}',
        loadingLib:      T.decoder_loading_lib       || 'Loading...'
    };

    // ===== Persistence (localStorage) =====
    function loadScanMapFromStorage() {
        try {
            const raw = localStorage.getItem(SCAN_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return;
            for (const entry of parsed) {
                if (!entry || typeof entry.value !== 'string') continue;
                const count = Math.max(0, Math.floor(Number(entry.count) || 0));
                if (count <= 0) continue;
                scanMap.set(entry.value, {
                    format: typeof entry.format === 'string' ? entry.format : '',
                    count,
                    lastAt: Number(entry.lastAt) || Date.now()
                });
                if (scanMap.size >= SCAN_STORAGE_LIMIT) break;
            }
        } catch (e) {
            console.warn('[decoder] localStorage scanMap corrupted, resetting:', e);
            try { localStorage.removeItem(SCAN_STORAGE_KEY); } catch (_) {}
        }
    }

    let saveTimerId = 0;
    function saveScanMap() {
        if (saveTimerId) return;
        saveTimerId = setTimeout(() => {
            saveTimerId = 0;
            try {
                const arr = [];
                let i = 0;
                for (const [value, v] of scanMap) {
                    if (i++ >= SCAN_STORAGE_LIMIT) break;
                    arr.push({ value, format: v.format || '', count: v.count, lastAt: v.lastAt });
                }
                localStorage.setItem(SCAN_STORAGE_KEY, JSON.stringify(arr));
            } catch (e) {
                console.warn('[decoder] failed to save scanMap:', e);
            }
        }, 300);
    }

    loadScanMapFromStorage();

    // ===== JsBarcode preview helpers =====
    // Map ZXing-style format names → JsBarcode format ids.
    const JSBARCODE_FORMAT_MAP = {
        'EAN_13': 'EAN13', 'EAN13': 'EAN13', 'EAN-13': 'EAN13',
        'EAN_8':  'EAN8',  'EAN8':  'EAN8',  'EAN-8':  'EAN8',
        'UPC_A':  'UPC',   'UPCA':  'UPC',   'UPC':    'UPC',   'UPC-A':  'UPC',
        'UPC_E':  'UPC',   'UPCE':  'UPC',   'UPC-E':  'UPC',
        'CODE_128': 'CODE128', 'CODE128': 'CODE128', 'CODE-128': 'CODE128',
        'CODE_39':  'CODE39',  'CODE39':  'CODE39',  'CODE-39':  'CODE39',
        'CODE_93':  'CODE128', 'CODE93':  'CODE128',
        'ITF':      'ITF',     'ITF14':   'ITF14',   'ITF-14':   'ITF14',
        'CODABAR':  'codabar'
    };
    const JSBARCODE_2D_FORMATS = new Set(['QR_CODE', 'QRCODE', 'QR', 'DATA_MATRIX', 'DATAMATRIX', 'AZTEC', 'PDF_417', 'PDF417']);

    function jsBarcodeFormat(format) {
        const key = String(format || '').toUpperCase().replace(/\s/g, '_');
        return JSBARCODE_FORMAT_MAP[key] || null;
    }

    function renderInlinePreview(svgEl, value, format, opts) {
        if (!svgEl) return;
        const o = opts || {};
        const width = o.width || 1.6;
        const height = o.height || 32;
        const fontSize = o.fontSize || 0;
        const upper = String(format || '').toUpperCase().replace(/\s/g, '_');
        if (JSBARCODE_2D_FORMATS.has(upper)) {
            // Fallback for 2D codes — small placeholder.
            svgEl.outerHTML = '<span class="scan-list-2d" title="' + escapeHtml(format || '') + '">' + escapeHtml(format || 'QR') + '</span>';
            return;
        }
        const fmt = jsBarcodeFormat(format);
        if (!fmt || !window.JsBarcode) {
            svgEl.style.display = 'none';
            return;
        }
        try {
            window.JsBarcode(svgEl, value, {
                format: fmt,
                width: width,
                height: height,
                displayValue: false,
                margin: 4,
                background: '#ffffff',
                lineColor: '#000000'
            });
            svgEl.setAttribute('role', 'img');
            svgEl.setAttribute('aria-label', (multiStrings.colCode || 'Code') + ' ' + value);
        } catch (_) {
            svgEl.style.display = 'none';
        }
    }

    function schedulePreviewRender(rootEl) {
        const run = () => {
            const targets = rootEl.querySelectorAll('svg.scan-list-preview[data-pending="1"]');
            targets.forEach(svg => {
                svg.removeAttribute('data-pending');
                renderInlinePreview(svg, svg.dataset.value, svg.dataset.format, {
                    width: Number(svg.dataset.barWidth) || 1.6,
                    height: Number(svg.dataset.barHeight) || 32
                });
            });
        };
        if (window.requestIdleCallback) {
            window.requestIdleCallback(run, { timeout: 400 });
        } else {
            setTimeout(run, 16);
        }
    }

    // ===== Toast (aria-live) =====
    let toastEl = null;
    let toastTimer = 0;
    function ensureToast() {
        if (toastEl) return toastEl;
        toastEl = document.createElement('div');
        toastEl.className = 'scan-toast';
        toastEl.setAttribute('role', 'status');
        toastEl.setAttribute('aria-live', 'polite');
        document.body.appendChild(toastEl);
        return toastEl;
    }
    function showToast(msg) {
        const el = ensureToast();
        el.textContent = msg;
        el.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2400);
    }
    function tFormat(template, value) {
        return String(template).replace('{0}', value);
    }

    function ensureMultiUI() {
        if (multiUI || !cameraModal) return multiUI;
        const inner = cameraModal.querySelector('.camera-modal-inner');
        if (!inner) return null;
        const headerControls = inner.querySelector('.camera-header-controls');
        const sidePanel = inner.querySelector('.camera-side');
        if (!headerControls || !sidePanel) return null;

        const toggle = document.createElement('div');
        toggle.className = 'scan-mode-toggle';
        toggle.setAttribute('role', 'tablist');
        toggle.innerHTML =
            '<button type="button" class="scan-mode-btn is-active" data-mode="single" role="tab" aria-selected="true">' + multiStrings.single + '</button>' +
            '<button type="button" class="scan-mode-btn" data-mode="multi" role="tab" aria-selected="false">' + multiStrings.multi + '</button>';
        headerControls.appendChild(toggle);

        const badge = document.createElement('div');
        badge.className = 'scan-badge';
        badge.hidden = true;
        badge.innerHTML = '<span class="scan-badge-label">' + multiStrings.scanned + '</span><span class="scan-badge-count">0</span>';
        headerControls.appendChild(badge);

        const panel = document.createElement('div');
        panel.className = 'scan-list-panel';
        panel.innerHTML =
            '<ul class="scan-list" aria-live="polite"></ul>' +
            '<div class="scan-list-empty">' + multiStrings.empty + '</div>' +
            '<div class="scan-list-actions">' +
                '<button type="button" class="scan-list-btn scan-list-confirm">' + escapeHtml(multiStrings.confirm) + '</button>' +
                '<button type="button" class="scan-list-btn scan-list-clear">' + escapeHtml(multiStrings.clearAll) + '</button>' +
            '</div>';
        sidePanel.appendChild(panel);

        const list = panel.querySelector('.scan-list');
        const confirmBtn = panel.querySelector('.scan-list-confirm');
        const clearBtnEl = panel.querySelector('.scan-list-clear');

        toggle.addEventListener('click', (ev) => {
            const btn = ev.target.closest('.scan-mode-btn');
            if (!btn) return;
            setScanMode(btn.dataset.mode);
        });

        confirmBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            openSummaryDialog();
        });

        clearBtnEl.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (scanMap.size === 0) return;
            if (!window.confirm(multiStrings.clearConfirm)) return;
            scanMap.clear();
            saveScanMap();
            renderScanList();
            renderMultiResultsInMainBox();
        });

        list.addEventListener('click', (ev) => {
            const btn = ev.target.closest('button[data-action]');
            if (!btn) return;
            ev.stopPropagation();
            const item = btn.closest('.scan-list-item');
            if (!item) return;
            const value = item.dataset.value;
            const action = btn.dataset.action;
            if (action === 'dec') setScanQuantity(value, getScanQuantity(value) - 1);
            else if (action === 'inc') setScanQuantity(value, getScanQuantity(value) + 1);
            else if (action === 'remove') setScanQuantity(value, 0);
        });

        list.addEventListener('change', (ev) => {
            const input = ev.target.closest('input.scan-list-qty-input');
            if (!input) return;
            const item = input.closest('.scan-list-item');
            if (!item) return;
            const value = item.dataset.value;
            const next = parseInt(input.value, 10);
            setScanQuantity(value, Number.isFinite(next) ? next : getScanQuantity(value));
        });

        multiUI = { toggle, badge, panel, list, confirmBtn, clearBtn: clearBtnEl };
        return multiUI;
    }

    function setScanMode(mode) {
        scanMode = (mode === 'multi') ? 'multi' : 'single';
        if (!multiUI) return;
        multiUI.toggle.querySelectorAll('.scan-mode-btn').forEach(b => {
            const active = b.dataset.mode === scanMode;
            b.classList.toggle('is-active', active);
            b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        const isMulti = scanMode === 'multi';
        multiUI.badge.hidden = !isMulti;
        const sidePanel = cameraModal && cameraModal.querySelector('.camera-side');
        if (sidePanel) sidePanel.hidden = !isMulti;
        if (isMulti) renderScanList();
    }

    function renderScanList() {
        if (!multiUI) return;
        const entries = Array.from(scanMap.entries());
        const total = entries.reduce((n, [, v]) => n + v.count, 0);
        multiUI.badge.querySelector('.scan-badge-count').textContent = String(total);
        const empty = multiUI.panel.querySelector('.scan-list-empty');
        if (entries.length === 0) {
            multiUI.list.innerHTML = '';
            empty.hidden = false;
            return;
        }
        empty.hidden = true;
        // Most recent first
        entries.sort((a, b) => b[1].lastAt - a[1].lastAt);
        multiUI.list.innerHTML = entries.map(([value, v]) =>
            '<li class="scan-list-item" data-value="' + escapeHtml(value) + '">' +
                '<div class="scan-list-qty" role="group" aria-label="' + escapeHtml(multiStrings.quantity) + '">' +
                    '<button type="button" class="scan-list-qty-btn" data-action="dec" aria-label="' + escapeHtml(multiStrings.decrease) + '">−</button>' +
                    '<input type="number" class="scan-list-qty-input" min="0" inputmode="numeric" value="' + v.count + '" aria-label="' + escapeHtml(multiStrings.quantity) + '">' +
                    '<button type="button" class="scan-list-qty-btn" data-action="inc" aria-label="' + escapeHtml(multiStrings.increase) + '">+</button>' +
                '</div>' +
                '<div class="scan-list-meta">' +
                    '<span class="scan-list-format">' + escapeHtml(v.format || '') + '</span>' +
                    '<span class="scan-list-value">' + escapeHtml(value) + '</span>' +
                '</div>' +
                '<button type="button" class="scan-list-remove" data-action="remove" aria-label="' + escapeHtml(multiStrings.remove) + '" title="' + escapeHtml(multiStrings.remove) + '">' +
                    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' +
                '</button>' +
            '</li>'
        ).join('');
    }

    function getScanQuantity(value) {
        const entry = scanMap.get(value);
        return entry ? entry.count : 0;
    }

    function setScanQuantity(value, qty) {
        const next = Math.max(0, Math.floor(Number(qty) || 0));
        if (next <= 0) {
            scanMap.delete(value);
        } else {
            const entry = scanMap.get(value);
            if (entry) {
                entry.count = next;
                entry.lastAt = Date.now();
            }
        }
        saveScanMap();
        renderScanList();
    }

    function scanListToText() {
        const entries = Array.from(scanMap.entries());
        entries.sort((a, b) => b[1].count - a[1].count);
        return entries.map(([value, v]) => v.count + '\t' + (v.format || '') + '\t' + value).join('\n');
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[ch]));
    }

    function renderMultiResultsInMainBox() {
        const entries = Array.from(scanMap.entries());
        if (entries.length === 0) {
            resultBox.hidden = true;
            return;
        }
        entries.sort((a, b) => b[1].count - a[1].count);
        resultType.textContent = entries.length + ' ' + (multiStrings.resultsHeading || 'codes');
        const headerHtml =
            '<div class="result-multi-toolbar">' +
                '<button type="button" id="result-multi-summary" class="decoder-btn decoder-btn-primary">' + escapeHtml(multiStrings.summaryOpen) + '</button>' +
            '</div>';
        const rowsHtml = entries.map(([value, v]) =>
            '<div class="result-multi-row" data-value="' + escapeHtml(value) + '">' +
                '<div class="scan-list-qty result-multi-qty" role="group" aria-label="' + escapeHtml(multiStrings.quantity) + '">' +
                    '<button type="button" class="scan-list-qty-btn" data-action="dec" aria-label="' + escapeHtml(multiStrings.decrease) + '">−</button>' +
                    '<input type="number" class="scan-list-qty-input" min="0" inputmode="numeric" value="' + v.count + '" aria-label="' + escapeHtml(multiStrings.quantity) + '">' +
                    '<button type="button" class="scan-list-qty-btn" data-action="inc" aria-label="' + escapeHtml(multiStrings.increase) + '">+</button>' +
                '</div>' +
                '<svg class="scan-list-preview" data-pending="1" data-value="' + escapeHtml(value) + '" data-format="' + escapeHtml(v.format || '') + '" data-bar-width="1.6" data-bar-height="36" aria-hidden="true"></svg>' +
                '<div class="scan-list-meta">' +
                    '<span class="result-multi-format">' + escapeHtml(v.format || '') + '</span>' +
                    '<span class="result-multi-value">' + escapeHtml(value) + '</span>' +
                '</div>' +
                '<button type="button" class="scan-list-remove" data-action="remove" aria-label="' + escapeHtml(multiStrings.remove) + '" title="' + escapeHtml(multiStrings.remove) + '">' +
                    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' +
                '</button>' +
            '</div>'
        ).join('');
        resultValue.innerHTML = headerHtml + rowsHtml;
        resultBox.hidden = false;
        schedulePreviewRender(resultValue);
        const summaryTrigger = document.getElementById('result-multi-summary');
        if (summaryTrigger) summaryTrigger.addEventListener('click', openSummaryDialog);
    }

    if (resultValue && !resultValue.dataset.qtyBound) {
        resultValue.dataset.qtyBound = '1';
        const updateMainBox = (value, nextQty) => {
            const next = Math.max(0, Math.floor(Number(nextQty) || 0));
            if (next <= 0) {
                scanMap.delete(value);
            } else {
                const entry = scanMap.get(value);
                if (entry) { entry.count = next; entry.lastAt = Date.now(); }
            }
            saveScanMap();
            if (multiUI) renderScanList();
            renderMultiResultsInMainBox();
        };
        resultValue.addEventListener('click', (ev) => {
            const btn = ev.target.closest('button[data-action]');
            if (!btn) return;
            const row = btn.closest('.result-multi-row');
            if (!row) return;
            ev.stopPropagation();
            const value = row.dataset.value;
            const entry = scanMap.get(value);
            const cur = entry ? entry.count : 0;
            const action = btn.dataset.action;
            if (action === 'dec') updateMainBox(value, cur - 1);
            else if (action === 'inc') updateMainBox(value, cur + 1);
            else if (action === 'remove') updateMainBox(value, 0);
        });
        resultValue.addEventListener('change', (ev) => {
            const input = ev.target.closest('input.scan-list-qty-input');
            if (!input) return;
            const row = input.closest('.result-multi-row');
            if (!row) return;
            updateMainBox(row.dataset.value, parseInt(input.value, 10));
        });
    }

    function mapCameraError(e) {
        const name = (e && e.name) || '';
        const msg = (e && e.message) || '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
            return strings.cameraDenied + ' (' + (name || 'denied') + ')';
        }
        if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
            return strings.cameraNotFound + ' (' + name + ')';
        }
        if (name === 'NotReadableError' || name === 'TrackStartError') {
            return 'Camera is in use by another application. Close it and try again. (' + name + ')';
        }
        return (name ? name + ': ' : '') + (msg || strings.cameraUnavailable);
    }

    // Sync scan-line sweep distance with actual frame height (for smooth GPU animation)
    function updateScanTravel() {
        const frame = cameraModal && cameraModal.querySelector('.camera-frame');
        if (!frame) return;
        const h = frame.clientHeight;
        if (h > 0) frame.style.setProperty('--scan-travel', (h - 2) + 'px');
    }

    // Try to enable continuous autofocus — improves detection on close-up barcodes
    function tryEnableContinuousFocus(stream) {
        try {
            const track = stream.getVideoTracks && stream.getVideoTracks()[0];
            if (!track || !track.applyConstraints) return;
            const caps = track.getCapabilities ? track.getCapabilities() : {};
            if (caps.focusMode && caps.focusMode.indexOf('continuous') !== -1) {
                track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
            }
        } catch (_) { /* ignored */ }
    }

    function handleDetection(format, text) {
        if (!text) return;
        if (scanMode === 'multi') {
            const now = Date.now();
            const existing = scanMap.get(text);
            if (existing && (now - existing.lastAt) < SCAN_DEBOUNCE_MS) {
                existing.lastAt = now;
                return;
            }
            if (existing) {
                existing.count += 1;
                existing.lastAt = now;
                if (format && !existing.format) existing.format = format;
            } else {
                if (scanMap.size >= SCAN_STORAGE_LIMIT) return;
                scanMap.set(text, { format: format || '', count: 1, lastAt: now });
            }
            saveScanMap();
            renderScanList();
            if (navigator.vibrate) { try { navigator.vibrate(60); } catch (_) {} }
            return;
        }
        resultType.textContent = format || '';
        resultValue.textContent = text;
        resultBox.hidden = false;
        if (navigator.vibrate) { try { navigator.vibrate(120); } catch (_) {} }
        stopCamera();
    }

    async function startNativeDetector(detector) {
        usingNativeDetector = true;
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });
        cameraVideo.srcObject = cameraStream;
        cameraVideo.setAttribute('playsinline', 'true');
        cameraVideo.muted = true;
        await cameraVideo.play();
        tryEnableContinuousFocus(cameraStream);
        updateScanTravel();

        const loop = async () => {
            if (!cameraActive) return;
            try {
                const codes = await detector.detect(cameraVideo);
                if (codes && codes.length > 0) {
                    if (scanMode === 'multi') {
                        for (const c of codes) {
                            handleDetection((c.format || '').toUpperCase().replace(/_/g, ' '), c.rawValue || '');
                        }
                    } else {
                        const c = codes[0];
                        handleDetection((c.format || '').toUpperCase().replace(/_/g, ' '), c.rawValue || '');
                    }
                }
            } catch (_) { /* transient decode errors ignored */ }
            if (cameraActive) rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
    }

    async function startZXingDetector() {
        usingNativeDetector = false;
        const reader = getReader();
        if (!reader) throw new Error('Decoder library failed to load.');

        const constraints = {
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        };

        await reader.decodeFromConstraints(constraints, cameraVideo, (result) => {
            if (!result) return;
            const format = result.getBarcodeFormat ? result.getBarcodeFormat() : '';
            const formatName = typeof format === 'number' && window.ZXing && window.ZXing.BarcodeFormat
                ? Object.keys(window.ZXing.BarcodeFormat).find(k => window.ZXing.BarcodeFormat[k] === format) || String(format)
                : String(format);
            handleDetection(formatName, result.getText());
        });

        // ZXing attaches its own stream; capture the reference for cleanup and focus
        if (cameraVideo.srcObject) {
            cameraStream = cameraVideo.srcObject;
            tryEnableContinuousFocus(cameraStream);
        }
        cameraVideo.addEventListener('loadedmetadata', updateScanTravel, { once: true });
        updateScanTravel();
    }

    async function startCamera() {
        if (cameraActive) return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showError(strings.cameraUnavailable + ' (getUserMedia API missing)');
            return;
        }
        if (!window.isSecureContext) {
            showError(strings.cameraUnavailable + ' (requires HTTPS)');
            return;
        }

        hideError();
        resetResult();
        cameraModal.hidden = false;
        cameraActive = true;
        ensureMultiUI();
        setScanMode(scanMode);

        try {
            // Primary path: native BarcodeDetector (hardware-accelerated on Android/iOS/macOS)
            if ('BarcodeDetector' in window) {
                const supported = await window.BarcodeDetector.getSupportedFormats();
                const wanted = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'codabar', 'itf', 'qr_code', 'data_matrix', 'aztec', 'pdf417'];
                const formats = wanted.filter(f => supported.indexOf(f) !== -1);
                if (formats.length > 0) {
                    const detector = new window.BarcodeDetector({ formats });
                    await startNativeDetector(detector);
                    return;
                }
            }
            // Fallback: ZXing-js with TRY_HARDER hints
            await startZXingDetector();
        } catch (e) {
            showError(mapCameraError(e));
            stopCamera();
        }
    }

    function stopCamera() {
        const wasMultiWithResults = (scanMode === 'multi') && scanMap.size > 0;
        cameraActive = false;
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        try { if (codeReader && typeof codeReader.reset === 'function') codeReader.reset(); } catch (_) {}
        if (cameraStream) {
            try { cameraStream.getTracks().forEach(t => t.stop()); } catch (_) {}
            cameraStream = null;
        }
        if (cameraVideo) {
            try { cameraVideo.pause(); } catch (_) {}
            if (cameraVideo.srcObject) {
                try { cameraVideo.srcObject.getTracks().forEach(t => t.stop()); } catch (_) {}
                cameraVideo.srcObject = null;
            }
        }
        cameraModal.hidden = true;
        usingNativeDetector = false;
        if (wasMultiWithResults) renderMultiResultsInMainBox();
    }

    // Recompute scan-line travel distance on window resize (orientation change)
    window.addEventListener('resize', () => { if (cameraActive) updateScanTravel(); });

    if (cameraBtn) cameraBtn.addEventListener('click', startCamera);
    if (cameraClose) cameraClose.addEventListener('click', stopCamera);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && cameraActive) stopCamera();
    });
    window.addEventListener('pagehide', stopCamera);

    // ===== SUMMARY DIALOG + EXPORTERS =====
    function getScanRecords() {
        const arr = [];
        for (const [value, v] of scanMap) {
            arr.push({
                value,
                format: v.format || '',
                count: v.count,
                lastAt: v.lastAt,
                lastAtIso: new Date(v.lastAt).toISOString()
            });
        }
        arr.sort((a, b) => b.count - a.count || b.lastAt - a.lastAt);
        return arr;
    }

    let summaryDialog = null;
    function ensureSummaryDialog() {
        if (summaryDialog) return summaryDialog;
        summaryDialog = document.getElementById('scan-summary');
        if (!summaryDialog) {
            summaryDialog = document.createElement('dialog');
            summaryDialog.id = 'scan-summary';
            summaryDialog.className = 'scan-summary-dialog';
            document.body.appendChild(summaryDialog);
        }
        summaryDialog.addEventListener('click', (ev) => {
            if (ev.target === summaryDialog) summaryDialog.close();
        });
        return summaryDialog;
    }

    function openSummaryDialog() {
        const dlg = ensureSummaryDialog();
        const records = getScanRecords();
        const rowsHtml = records.length === 0
            ? '<p class="scan-summary-empty">' + escapeHtml(multiStrings.summaryEmpty) + '</p>'
            : '<ul class="scan-summary-list">' + records.map(r =>
                '<li class="scan-summary-row" data-value="' + escapeHtml(r.value) + '">' +
                    '<span class="scan-summary-count" aria-label="' + escapeHtml(multiStrings.colQuantity) + '">' + r.count + '\u00d7</span>' +
                    '<svg class="scan-summary-preview scan-list-preview" data-pending="1" data-value="' + escapeHtml(r.value) + '" data-format="' + escapeHtml(r.format) + '" data-bar-width="2" data-bar-height="64" aria-hidden="true"></svg>' +
                    '<div class="scan-summary-meta">' +
                        '<span class="scan-summary-format">' + escapeHtml(r.format) + '</span>' +
                        '<span class="scan-summary-value">' + escapeHtml(r.value) + '</span>' +
                    '</div>' +
                '</li>'
            ).join('') + '</ul>';
        dlg.innerHTML =
            '<form method="dialog" class="scan-summary-inner">' +
                '<header class="scan-summary-header">' +
                    '<div>' +
                        '<h2 class="scan-summary-title">' + escapeHtml(multiStrings.summaryTitle) + '</h2>' +
                        '<p class="scan-summary-subtitle">' + escapeHtml(multiStrings.summarySubtitle) + '</p>' +
                    '</div>' +
                    '<button type="submit" class="scan-summary-close" value="cancel" aria-label="' + escapeHtml(multiStrings.summaryClose) + '">\u00d7</button>' +
                '</header>' +
                '<div class="scan-summary-body">' + rowsHtml + '</div>' +
                (records.length === 0 ? '' :
                '<footer class="scan-summary-footer" role="group" aria-label="Export">' +
                    '<button type="button" class="decoder-btn" data-export="csv">' + escapeHtml(multiStrings.exportCsv) + '</button>' +
                    '<button type="button" class="decoder-btn" data-export="xlsx">' + escapeHtml(multiStrings.exportXlsx) + '</button>' +
                    '<button type="button" class="decoder-btn" data-export="json">' + escapeHtml(multiStrings.exportJson) + '</button>' +
                    '<button type="button" class="decoder-btn" data-export="pdf">' + escapeHtml(multiStrings.exportPdf) + '</button>' +
                    '<button type="button" class="decoder-btn" data-export="txt-copy">' + escapeHtml(multiStrings.exportTxtCopy) + '</button>' +
                    '<button type="button" class="decoder-btn" data-export="txt-dl">' + escapeHtml(multiStrings.exportTxtDownload) + '</button>' +
                '</footer>') +
            '</form>';
        dlg.querySelectorAll('button[data-export]').forEach(btn => {
            btn.addEventListener('click', () => handleExport(btn.dataset.export));
        });
        schedulePreviewRender(dlg);
        if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    }

    function handleExport(kind) {
        const records = getScanRecords();
        if (records.length === 0) return;
        try {
            switch (kind) {
                case 'csv':     exportCsv(records); break;
                case 'xlsx':    exportXlsx(records); break;
                case 'json':    exportJson(records); break;
                case 'pdf':     exportPdf(records); break;
                case 'txt-copy':   exportTxtCopy(records); break;
                case 'txt-dl': exportTxtDownload(records); break;
            }
        } catch (e) {
            console.error('[decoder] export failed:', e);
        }
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    }

    function timestampStem() {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes());
    }

    function csvEscape(value) {
        const s = String(value == null ? '' : value);
        if (/[",;\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
    }

    function exportCsv(records) {
        const sep = ';';
        const header = [multiStrings.colCode, multiStrings.colFormat, multiStrings.colQuantity, multiStrings.colScannedAt].map(csvEscape).join(sep);
        const lines = records.map(r => [r.value, r.format, r.count, r.lastAtIso].map(csvEscape).join(sep));
        const csv = '\uFEFF' + header + '\r\n' + lines.join('\r\n') + '\r\n';
        downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'scans-' + timestampStem() + '.csv');
        showToast(tFormat(multiStrings.exportDone, 'CSV'));
    }

    function exportJson(records) {
        const payload = {
            exportedAt: new Date().toISOString(),
            count: records.length,
            records: records.map(r => ({ value: r.value, format: r.format, count: r.count, scannedAt: r.lastAtIso }))
        };
        const json = JSON.stringify(payload, null, 2);
        downloadBlob(new Blob([json], { type: 'application/json;charset=utf-8' }), 'scans-' + timestampStem() + '.json');
        showToast(tFormat(multiStrings.exportDone, 'JSON'));
    }

    function recordsToText(records) {
        const sep = '\t';
        const header = [multiStrings.colCode, multiStrings.colFormat, multiStrings.colQuantity, multiStrings.colScannedAt].join(sep);
        const lines = records.map(r => [r.value, r.format, r.count, r.lastAtIso].join(sep));
        return header + '\n' + lines.join('\n') + '\n';
    }

    async function exportTxtCopy(records) {
        const text = recordsToText(records);
        try {
            await navigator.clipboard.writeText(text);
            showToast(tFormat(multiStrings.exportDone, 'TXT'));
        } catch (_) {
            exportTxtDownload(records);
        }
    }

    function exportTxtDownload(records) {
        const text = recordsToText(records);
        downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), 'scans-' + timestampStem() + '.txt');
        showToast(tFormat(multiStrings.exportDone, 'TXT'));
    }

    // Lazy-load SheetJS for XLSX export
    let xlsxPromise = null;
    function ensureXlsx() {
        if (window.XLSX) return Promise.resolve(window.XLSX);
        if (xlsxPromise) return xlsxPromise;
        xlsxPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
            s.async = true;
            s.onload = () => resolve(window.XLSX);
            s.onerror = () => { xlsxPromise = null; reject(new Error('xlsx load failed')); };
            document.head.appendChild(s);
        });
        return xlsxPromise;
    }

    async function exportXlsx(records) {
        showToast(multiStrings.loadingLib);
        const XLSX = await ensureXlsx();
        const data = [
            [multiStrings.colCode, multiStrings.colFormat, multiStrings.colQuantity, multiStrings.colScannedAt],
            ...records.map(r => [r.value, r.format, r.count, r.lastAtIso])
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 10 }, { wch: 22 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Scans');
        const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        downloadBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'scans-' + timestampStem() + '.xlsx');
        showToast(tFormat(multiStrings.exportDone, 'XLSX'));
    }

    // Lazy-load jsPDF
    let jspdfPromise = null;
    function ensureJsPDF() {
        if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
        if (jspdfPromise) return jspdfPromise;
        jspdfPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
            s.async = true;
            s.onload = () => resolve(window.jspdf && window.jspdf.jsPDF);
            s.onerror = () => { jspdfPromise = null; reject(new Error('jspdf load failed')); };
            document.head.appendChild(s);
        });
        return jspdfPromise;
    }

    async function exportPdf(records) {
        showToast(multiStrings.loadingLib);
        const JsPDF = await ensureJsPDF();
        const doc = new JsPDF({ unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 12;
        const colGap = 6;
        const colW = (pageW - margin * 2 - colGap) / 2;
        const rowH = 28;
        let x = margin, y = margin;
        doc.setFontSize(14);
        doc.text(multiStrings.summaryTitle, margin, y); y += 8;
        doc.setFontSize(10);
        doc.text(new Date().toLocaleString(), margin, y); y += 6;
        const top = y;

        for (let i = 0; i < records.length; i++) {
            const r = records[i];
            const col = i % 2;
            x = margin + col * (colW + colGap);
            if (col === 0 && i > 0) y += rowH;
            if (y + rowH > pageH - margin) {
                doc.addPage();
                y = top;
            }
            // Render barcode to data URL via offscreen SVG
            const dataUrl = await barcodeToPngDataUrl(r.value, r.format, 360, 80);
            if (dataUrl) {
                try { doc.addImage(dataUrl, 'PNG', x, y, colW, 18); } catch (_) {}
            }
            doc.setFontSize(9);
            doc.text(r.count + '\u00d7  ' + r.value, x, y + 22);
            doc.setFontSize(7);
            doc.text(r.format || '', x, y + 26);
        }
        doc.save('scans-' + timestampStem() + '.pdf');
        showToast(tFormat(multiStrings.exportDone, 'PDF'));
    }

    function barcodeToPngDataUrl(value, format, w, h) {
        return new Promise((resolve) => {
            try {
                const fmt = jsBarcodeFormat(format);
                if (!fmt || !window.JsBarcode) { resolve(null); return; }
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                window.JsBarcode(svg, value, { format: fmt, width: 2, height: 80, displayValue: true, margin: 4, background: '#ffffff', lineColor: '#000000' });
                const xml = new XMLSerializer().serializeToString(svg);
                const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
                    ctx.drawImage(img, 0, 0, w, h);
                    URL.revokeObjectURL(url);
                    resolve(canvas.toDataURL('image/png'));
                };
                img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
                img.src = url;
            } catch (_) {
                resolve(null);
            }
        });
    }

    // Auto-render persisted scans on load
    if (scanMap.size > 0) {
        scanMode = 'multi';
        renderMultiResultsInMainBox();
    }

    // ===== THEME TOGGLE (shared with main app) =====
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            const next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        });
    }

    // ===== LANGUAGE DROPDOWN =====
    const langToggle = document.getElementById('lang-toggle');
    const langDropdown = document.getElementById('lang-dropdown');
    if (langToggle && langDropdown) {
        langToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            langDropdown.classList.toggle('open');
        });
        document.addEventListener('click', () => langDropdown.classList.remove('open'));
    }
})();
