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

    async function startCamera() {
        if (cameraActive) return;
        const reader = getReader();
        if (!reader) { showError('Decoder library failed to load. Please refresh the page.'); return; }
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

        // ZXing handles: getUserMedia → attach stream → play → continuous decode.
        // Prefer rear camera; request higher resolution for sharper barcodes.
        const constraints = {
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        };

        try {
            await reader.decodeFromConstraints(constraints, cameraVideo, (result, err) => {
                if (!result) return;
                const format = result.getBarcodeFormat ? result.getBarcodeFormat() : '';
                const formatName = typeof format === 'number' && window.ZXing && window.ZXing.BarcodeFormat
                    ? Object.keys(window.ZXing.BarcodeFormat).find(k => window.ZXing.BarcodeFormat[k] === format) || String(format)
                    : String(format);
                resultType.textContent = formatName;
                resultValue.textContent = result.getText();
                resultBox.hidden = false;
                if (navigator.vibrate) { try { navigator.vibrate(120); } catch (_) {} }
                stopCamera();
            });
        } catch (e) {
            showError(mapCameraError(e));
            stopCamera();
        }
    }

    function stopCamera() {
        cameraActive = false;
        try { if (codeReader && typeof codeReader.reset === 'function') codeReader.reset(); } catch (_) {}
        if (cameraVideo) {
            try { cameraVideo.pause(); } catch (_) {}
            if (cameraVideo.srcObject) {
                try { cameraVideo.srcObject.getTracks().forEach(t => t.stop()); } catch (_) {}
                cameraVideo.srcObject = null;
            }
        }
        cameraModal.hidden = true;
    }

    if (cameraBtn) cameraBtn.addEventListener('click', startCamera);
    if (cameraClose) cameraClose.addEventListener('click', stopCamera);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && cameraActive) stopCamera();
    });
    window.addEventListener('pagehide', stopCamera);

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
