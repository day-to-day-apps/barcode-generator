document.addEventListener('DOMContentLoaded', () => {
    // ===== FLAG EMOJI POLYFILL (Windows doesn't render flag emojis) =====
    (function replaceFlagEmojis() {
        const flagToCode = {
            '🇬🇧': 'gb', '🇵🇱': 'pl', '🇩🇪': 'de', '🇫🇷': 'fr', '🇪🇸': 'es',
            '🇮🇹': 'it', '🇵🇹': 'pt', '🇳🇱': 'nl', '🇨🇿': 'cz', '🇺🇦': 'ua'
        };
        document.querySelectorAll('.lang-current, .lang-option').forEach(el => {
            let html = el.innerHTML;
            Object.keys(flagToCode).forEach(flag => {
                if (html.includes(flag)) {
                    const code = flagToCode[flag];
                    html = html.replaceAll(flag, `<img src="https://flagcdn.com/20x15/${code}.png" srcset="https://flagcdn.com/40x30/${code}.png 2x" width="20" height="15" alt="" class="flag-img">`);
                }
            });
            el.innerHTML = html;
        });
    })();

    // ===== DARK MODE =====
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('barcode-theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);

    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('barcode-theme', next);
    });

    // ===== I18N =====
    const LANG = document.documentElement.lang || 'en';
    const T = (window.BARCODE_I18N || {})[LANG] || (window.BARCODE_I18N || {})['en'] || {};

    // ===== LANGUAGE DROPDOWN =====
    const langToggle = document.getElementById('lang-toggle');
    const langDropdown = document.getElementById('lang-dropdown');
    if (langToggle && langDropdown) {
        langToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            langDropdown.classList.toggle('open');
        });
        document.addEventListener('click', () => {
            langDropdown.classList.remove('open');
        });
    }

    // DOM elements
    const barcodeType = document.getElementById('barcode-type');
    const barcodeText = document.getElementById('barcode-text');
    const barWidth = document.getElementById('bar-width');
    const barHeight = document.getElementById('bar-height');
    const barMargin = document.getElementById('bar-margin');
    const fontSize = document.getElementById('font-size');
    const lineColor = document.getElementById('line-color');
    const bgColor = document.getElementById('bg-color');
    const rotation = document.getElementById('rotation');
    const showText = document.getElementById('show-text');
    const btnGenerate = document.getElementById('btn-generate');
    const btnDownloadPng = document.getElementById('btn-download-png');
    const btnDownloadSvg = document.getElementById('btn-download-svg');
    const btnCopy = document.getElementById('btn-copy');
    const barcodeSvg = document.getElementById('barcode-svg');
    const barcodeContainer = document.getElementById('barcode-container');
    const previewHint = document.getElementById('preview-hint');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');

    // Range value displays
    const rangeInputs = [
        { input: barWidth, display: document.getElementById('bar-width-val') },
        { input: barHeight, display: document.getElementById('bar-height-val') },
        { input: barMargin, display: document.getElementById('bar-margin-val') },
        { input: fontSize, display: document.getElementById('font-size-val') },
    ];

    // Debounce for slider regeneration (avoid regenerating on every micro-step)
    let regenDebounce;
    function scheduleRegen() {
        clearTimeout(regenDebounce);
        regenDebounce = setTimeout(() => {
            if (barcodeText.value.trim()) generateBarcode();
        }, 80);
    }

    rangeInputs.forEach(({ input, display }) => {
        input.addEventListener('input', () => {
            display.textContent = input.value;
            scheduleRegen();
        });
    });

    // Color hex displays
    const lineColorHex = document.getElementById('line-color-hex');
    const bgColorHex = document.getElementById('bg-color-hex');

    lineColor.addEventListener('input', () => {
        lineColorHex.textContent = lineColor.value.toUpperCase();
        scheduleRegen();
    });
    bgColor.addEventListener('input', () => {
        bgColorHex.textContent = bgColor.value.toUpperCase();
        scheduleRegen();
    });

    // Rotation + show-text toggle trigger regeneration too
    rotation.addEventListener('change', () => { if (barcodeText.value.trim()) generateBarcode(); });
    showText.addEventListener('change', () => { if (barcodeText.value.trim()) generateBarcode(); });

    // Text alignment buttons
    let textAlign = 'center';
    document.querySelectorAll('.btn-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            if (target === 'text-align') {
                document.querySelectorAll(`.btn-option[data-target="${target}"]`).forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
                textAlign = btn.dataset.value;
                if (barcodeText.value.trim()) generateBarcode();
            }
        });
    });

    // Barcode type descriptions for placeholders (from i18n)
    const placeholders = T.placeholders || {};

    const defaults = {
        'CODE128': 'Barcode 2026',
        'QR': 'https://barcode-generator.daytodayapps-contact.workers.dev/',
        'CODE128A': 'HELLO123',
        'CODE128B': 'Hello-123',
        'CODE128C': '123456',
        'EAN13': '5901234123457',
        'EAN8': '96385074',
        'EAN5': '54495',
        'EAN2': '53',
        'UPC': '123456789012',
        'CODE39': 'CODE39TEST',
        'ITF14': '98249880215005',
        'ITF': '123456',
        'MSI': '123456',
        'MSI10': '123456',
        'MSI11': '123456',
        'MSI1010': '123456',
        'MSI1110': '123456',
        'pharmacode': '1234',
        'codabar': 'A12345B',
    };

    // ===== QR Code support (qrcode-generator) =====
    const qrPreview = document.getElementById('qr-preview');
    const qrOptions = document.getElementById('qr-options');
    const qrEcc = document.getElementById('qr-ecc');
    const qrLogoInput = document.getElementById('qr-logo-input');
    let qrLogoDataUrl = null;
    let qrMatrix = null; // last successfully built qrcode-generator instance
    const QR_LOGO_SIZE_PCT = 22; // logo size relative to QR side (with bg padding)

    // Build a viewBox-based SVG string that scales fluidly when width/height = "100%".
    // pxSize: explicit pixel dimensions for export (PNG raster, SVG download).
    function buildQrSvgString(qr, { fg, bg, margin = 4, logoDataUrl = null, logoSizePct = QR_LOGO_SIZE_PCT, pxSize = null } = {}) {
        const n = qr.getModuleCount();
        const total = n + margin * 2;
        const cell = 10;
        const sz = total * cell;
        const rects = [];
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                if (qr.isDark(r, c)) {
                    rects.push(`<rect x="${(c + margin) * cell}" y="${(r + margin) * cell}" width="${cell}" height="${cell}"/>`);
                }
            }
        }
        let logoSvg = '';
        if (logoDataUrl) {
            const logoSize = Math.floor(sz * (logoSizePct / 100));
            const lx = Math.floor((sz - logoSize) / 2);
            const padPx = Math.max(4, Math.floor(cell * 0.8));
            logoSvg = `<rect x="${lx - padPx}" y="${lx - padPx}" width="${logoSize + padPx * 2}" height="${logoSize + padPx * 2}" fill="${bg}"/>` +
                `<image x="${lx}" y="${lx}" width="${logoSize}" height="${logoSize}" href="${logoDataUrl}"/>`;
        }
        const dim = pxSize ? `width="${pxSize}" height="${pxSize}"` : `width="100%" height="100%"`;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sz} ${sz}" ${dim} shape-rendering="crispEdges" role="img" aria-label="QR code">` +
            `<rect width="${sz}" height="${sz}" fill="${bg}"/>` +
            `<g fill="${fg}">${rects.join('')}</g>` +
            logoSvg +
            `</svg>`;
    }

    function renderQR(text) {
        if (typeof window.qrcode === 'undefined' || !qrPreview) return;
        // Auto-promote ECC to 'H' when a logo is present to preserve scan reliability.
        let ecc = qrEcc ? qrEcc.value : 'M';
        if (qrLogoDataUrl && ecc !== 'H') ecc = 'H';
        try {
            const qr = window.qrcode(0, ecc);
            qr.addData(text);
            qr.make();
            qrMatrix = qr;
            qrPreview.innerHTML = buildQrSvgString(qr, {
                fg: lineColor.value,
                bg: bgColor.value,
                margin: 4,
                logoDataUrl: qrLogoDataUrl,
            });
            qrPreview.classList.add('active');
        } catch (_) {
            qrMatrix = null;
            qrPreview.innerHTML = '';
        }
    }

    // Raster QR (current state) to PNG Blob at the requested pixel size.
    function qrToPngBlob(pxSize = 1024) {
        return new Promise((resolve, reject) => {
            if (!qrMatrix) { reject(new Error('No QR matrix')); return; }
            const svg = buildQrSvgString(qrMatrix, {
                fg: lineColor.value,
                bg: bgColor.value,
                margin: 4,
                logoDataUrl: qrLogoDataUrl,
                pxSize,
            });
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = pxSize;
                canvas.height = pxSize;
                canvas.getContext('2d').drawImage(img, 0, 0, pxSize, pxSize);
                canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
            };
            img.onerror = () => reject(new Error('SVG load failed'));
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
        });
    }

    function isQR() { return barcodeType.value === 'QR'; }

    function renderPopularPreviews() {
        // Per-format presets so each card visually reflects its actual standard:
        // different sample value lengths, bar widths, heights and visible
        // human-readable text make the 6 cards immediately distinguishable.
        const presets = {
            EAN13:   { value: '5901234123457',  width: 1.0, height: 38, fontSize: 9,  textMargin: 1, margin: 4 },
            UPC:     { value: '042100005264',   width: 1.1, height: 38, fontSize: 9,  textMargin: 1, margin: 4 },
            CODE128: { value: 'CODE-128',       width: 1.6, height: 40, fontSize: 10, textMargin: 1, margin: 2 },
            CODE39:  { value: 'CODE 39',        width: 1.4, height: 40, fontSize: 10, textMargin: 1, margin: 2 },
            ITF14:   { value: '10012345678902', width: 1.2, height: 40, fontSize: 9,  textMargin: 1, margin: 6 },
            QR:      { value: 'https://barcode-generator.daytodayapps-contact.workers.dev/' }
        };
        const SVG_NS = 'http://www.w3.org/2000/svg';
        const monoFont = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
        document.querySelectorAll('.popular-card__preview').forEach(el => {
            const fmt = el.getAttribute('data-preview');
            const cfg = presets[fmt];
            if (!cfg) return;
            el.innerHTML = '';
            if (fmt === 'QR') {
                if (typeof window.qrcode === 'undefined') return;
                try {
                    const qr = window.qrcode(0, 'M');
                    qr.addData(cfg.value);
                    qr.make();
                    el.innerHTML = buildQrSvgString(qr, { fg: '#0f172a', bg: '#ffffff', margin: 2, pxSize: 80 });
                } catch (_) { /* preview only */ }
                return;
            }
            if (typeof JsBarcode === 'undefined') return;
            try {
                const svg = document.createElementNS(SVG_NS, 'svg');
                el.appendChild(svg);
                JsBarcode(svg, cfg.value, {
                    format: fmt,
                    width: cfg.width,
                    height: cfg.height,
                    displayValue: true,
                    fontSize: cfg.fontSize,
                    textMargin: cfg.textMargin,
                    font: monoFont,
                    margin: cfg.margin,
                    background: '#ffffff',
                    lineColor: '#0f172a'
                });
            } catch (_) { /* preview only */ }
        });
    }

    function syncTypeUI() {
        const qr = isQR();
        if (qrOptions) qrOptions.hidden = !qr;
        if (qrPreview) qrPreview.classList.toggle('active', qr);
        // Hide JsBarcode SVG host when in QR mode; show otherwise
        barcodeSvg.style.display = qr ? 'none' : '';
    }

    barcodeType.addEventListener('change', () => {
        const type = barcodeType.value;
        barcodeText.placeholder = placeholders[type] || T.fallback || 'Enter text...';
        barcodeText.value = defaults[type] || '';
        syncTypeUI();
        generateBarcode();
    });

    if (qrEcc) qrEcc.addEventListener('change', () => { if (isQR() && barcodeText.value.trim()) generateBarcode(); });
    if (qrLogoInput) {
        qrLogoInput.addEventListener('change', () => {
            const file = qrLogoInput.files && qrLogoInput.files[0];
            if (!file) { qrLogoDataUrl = null; if (isQR()) generateBarcode(); return; }
            const reader = new FileReader();
            reader.onload = e => { qrLogoDataUrl = e.target.result; if (isQR()) generateBarcode(); };
            reader.readAsDataURL(file);
        });
    }

    // ===== Popular Gallery wiring =====
    document.querySelectorAll('.popular-card').forEach(card => {
        card.addEventListener('click', () => {
            const fmt = card.dataset.format;
            if (!fmt) return;
            barcodeType.value = fmt;
            document.querySelectorAll('.popular-card').forEach(c => c.setAttribute('aria-pressed', c === card ? 'true' : 'false'));
            barcodeType.dispatchEvent(new Event('change'));
            barcodeText.focus();
        });
    });

    // ===== Render real previews inside popular cards =====
    renderPopularPreviews();

    syncTypeUI();

    // Generate barcode
    function generateBarcode() {
        const text = barcodeText.value.trim();
        if (!text) {
            showError(T.errEmpty || 'Enter text to encode');
            barcodeContainer.style.display = 'none';
            previewHint.style.display = 'block';
            return;
        }

        hideError();

        if (isQR()) {
            try {
                renderQR(text);
                barcodeContainer.style.display = 'flex';
                previewHint.style.display = 'none';
                barcodeContainer.className = 'barcode-container';
                const rotQ = rotation.value;
                if (rotQ !== 'N') barcodeContainer.classList.add(`rotate-${rotQ}`);
            } catch (e) {
                showError((T.errGen || 'Generation error: {0}').replace('{0}', e.message));
                barcodeContainer.style.display = 'none';
                previewHint.style.display = 'block';
            }
            return;
        }

        try {
            let isValid = true;
            JsBarcode(barcodeSvg, text, {
                format: barcodeType.value,
                width: parseFloat(barWidth.value),
                height: parseInt(barHeight.value),
                margin: parseInt(barMargin.value),
                fontSize: parseInt(fontSize.value),
                lineColor: lineColor.value,
                background: bgColor.value,
                displayValue: showText.checked,
                textAlign: textAlign,
                font: 'Inter, sans-serif',
                fontOptions: '500',
                valid: function(valid) {
                    if (!valid) {
                        isValid = false;
                        showError((T.errInvalid || 'Invalid value for format {0}').replace('{0}', barcodeType.value));
                    }
                }
            });

            if (!isValid) {
                barcodeSvg.replaceChildren();
                barcodeContainer.style.display = 'none';
                previewHint.style.display = 'block';
                return;
            }

            barcodeContainer.style.display = 'flex';
            previewHint.style.display = 'none';

            // Rotation
            barcodeContainer.className = 'barcode-container';
            const rot = rotation.value;
            if (rot !== 'N') {
                barcodeContainer.classList.add(`rotate-${rot}`);
            }

        } catch (e) {
            showError((T.errGen || 'Generation error: {0}').replace('{0}', e.message));
            barcodeContainer.style.display = 'none';
            previewHint.style.display = 'block';
        }
    }

    function showError(msg) {
        errorText.textContent = msg;
        errorMessage.style.display = 'flex';
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }

    function showToast(msg) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // Generate on button click
    btnGenerate.addEventListener('click', generateBarcode);

    // Generate on Enter key
    barcodeText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') generateBarcode();
    });

    // Live generation on text input
    barcodeText.addEventListener('input', () => {
        if (barcodeText.value.trim()) {
            generateBarcode();
        }
    });

    // Download PNG
    btnDownloadPng.addEventListener('click', async () => {
        if (isQR()) {
            if (!qrMatrix) { showToast(T.genFirst || 'Generate a barcode first'); return; }
            try {
                const blob = await qrToPngBlob(1024);
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `qr_${barcodeText.value.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}.png`;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
                showToast(T.pngDl || 'PNG file downloaded');
            } catch {
                showToast(T.copyFail || 'Could not export');
            }
            return;
        }
        const svgEl = barcodeSvg;
        if (!svgEl.getBBox().width) {
            showToast(T.genFirst || 'Generate a barcode first');
            return;
        }

        const svgData = new XMLSerializer().serializeToString(svgEl);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        const scale = 3; // High-res

        img.onload = () => {
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);
            const link = document.createElement('a');
            link.download = `barcode_${barcodeText.value.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast(T.pngDl || 'PNG file downloaded');
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    });

    // Download SVG
    btnDownloadSvg.addEventListener('click', async () => {
        if (isQR()) {
            if (!qrMatrix) { showToast(T.genFirst || 'Generate a barcode first'); return; }
            const svg = buildQrSvgString(qrMatrix, {
                fg: lineColor.value,
                bg: bgColor.value,
                margin: 4,
                logoDataUrl: qrLogoDataUrl,
                pxSize: 1024,
            });
            const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n` + svg], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `qr_${barcodeText.value.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}.svg`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            showToast(T.svgDl || 'SVG file downloaded');
            return;
        }
        const svgEl = barcodeSvg;
        if (!svgEl.getBBox().width) {
            showToast(T.genFirst || 'Generate a barcode first');
            return;
        }

        const svgData = new XMLSerializer().serializeToString(svgEl);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `barcode_${barcodeText.value.replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        showToast(T.svgDl || 'SVG file downloaded');
    });

    // Copy to clipboard
    btnCopy.addEventListener('click', async () => {
        if (isQR()) {
            if (!qrMatrix) { showToast(T.genFirst || 'Generate a barcode first'); return; }
            try {
                const blob = await qrToPngBlob(1024);
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                showToast(T.copied || 'Copied to clipboard');
            } catch {
                showToast(T.copyFail || 'Could not copy');
            }
            return;
        }
        const svgEl = barcodeSvg;
        if (!svgEl.getBBox().width) {
            showToast(T.genFirst || 'Generate a barcode first');
            return;
        }

        try {
            const svgData = new XMLSerializer().serializeToString(svgEl);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            const scale = 3;

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
            });

            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);

            canvas.toBlob(async (blob) => {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    showToast(T.copied || 'Copied to clipboard');
                } catch {
                    showToast(T.copyFail || 'Could not copy');
                }
            }, 'image/png');
        } catch {
            showToast(T.copyErr || 'Could not copy');
        }
    });

    // Initial barcode generation
    generateBarcode();

    // ===== PRINT LABELS MODULE =====
    const printModal = document.getElementById('print-modal');
    const modalClose = document.getElementById('modal-close');
    const btnPrintLabels = document.getElementById('btn-print-labels');
    const btnDoPrint = document.getElementById('btn-do-print');
    const printPreview = document.getElementById('print-preview');
    const printPreviewWrapper = document.getElementById('print-preview-wrapper');
    const printInfoText = document.getElementById('print-info-text');
    const printOutput = document.getElementById('print-output');

    // Print settings elements
    const labelProductName = document.getElementById('label-product-name');
    const labelPrice = document.getElementById('label-price');
    const labelDescription = document.getElementById('label-description');
    const labelCopies = document.getElementById('label-copies');
    const labelShowName = document.getElementById('label-show-name');
    const labelShowPrice = document.getElementById('label-show-price');
    const labelShowBarcodeText = document.getElementById('label-show-barcode-text');
    const labelShowDesc = document.getElementById('label-show-desc');
    const labelFontSize = document.getElementById('label-font-size');
    const labelBarcodeHeight = document.getElementById('label-barcode-height');
    const labelFontSizeVal = document.getElementById('label-font-size-val');
    const labelBarcodeHeightVal = document.getElementById('label-barcode-height-val');
    const customW = document.getElementById('custom-w');
    const customH = document.getElementById('custom-h');
    const labelCutLines = document.getElementById('label-cut-lines');

    let currentPrinterType = 'thermal';
    let currentLabelW = 50;
    let currentLabelH = 25;
    let currentA4Cols = 3;
    let currentA4Rows = 8;
    let currentA4LabelW = 64;
    let currentA4LabelH = 34;

    // Range display updaters for print modal
    labelFontSize.addEventListener('input', () => {
        labelFontSizeVal.textContent = labelFontSize.value;
        updatePrintPreview();
    });
    labelBarcodeHeight.addEventListener('input', () => {
        labelBarcodeHeightVal.textContent = labelBarcodeHeight.value;
        updatePrintPreview();
    });

    // Open/close modal
    btnPrintLabels.addEventListener('click', () => {
        if (!barcodeSvg.getBBox().width) {
            showToast(T.genFirst || 'Generate a barcode first');
            return;
        }
        printModal.style.display = 'flex';
        printModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        updatePrintPreview();
    });

    modalClose.addEventListener('click', closePrintModal);
    printModal.addEventListener('click', (e) => {
        if (e.target === printModal) closePrintModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && printModal.style.display === 'flex') closePrintModal();
    });

    function closePrintModal() {
        printModal.style.display = 'none';
        printModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    // Printer type tabs
    document.querySelectorAll('.printer-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.printer-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentPrinterType = tab.dataset.printer;

            document.getElementById('thermal-section').style.display = currentPrinterType === 'thermal' ? '' : 'none';
            document.getElementById('a4-section').style.display = currentPrinterType === 'a4' ? '' : 'none';
            document.getElementById('custom-section').style.display = currentPrinterType === 'custom' ? '' : 'none';

            // Default copies to labels per page when switching to A4
            if (currentPrinterType === 'a4') {
                labelCopies.value = currentA4Cols * currentA4Rows;
            }

            updatePrintPreview();
        });
    });

    // Thermal label template selection
    document.querySelectorAll('.label-tpl').forEach(tpl => {
        tpl.addEventListener('click', () => {
            document.querySelectorAll('.label-tpl').forEach(t => t.classList.remove('active'));
            tpl.classList.add('active');
            currentLabelW = parseInt(tpl.dataset.w);
            currentLabelH = parseInt(tpl.dataset.h);
            updatePrintPreview();
        });
    });

    // A4 sheet template selection
    document.querySelectorAll('.label-tpl-a4').forEach(tpl => {
        tpl.addEventListener('click', () => {
            document.querySelectorAll('.label-tpl-a4').forEach(t => t.classList.remove('active'));
            tpl.classList.add('active');
            currentA4Cols = parseInt(tpl.dataset.cols);
            currentA4Rows = parseInt(tpl.dataset.rows);
            currentA4LabelW = parseInt(tpl.dataset.lw);
            currentA4LabelH = parseInt(tpl.dataset.lh);
            // Default copies to labels per page
            labelCopies.value = currentA4Cols * currentA4Rows;
            updatePrintPreview();
        });
    });

    // Custom size inputs
    customW.addEventListener('input', () => { updatePrintPreview(); });
    customH.addEventListener('input', () => { updatePrintPreview(); });

    // Content field listeners - update preview on change
    [labelProductName, labelPrice, labelDescription, labelCopies].forEach(el => {
        el.addEventListener('input', updatePrintPreview);
    });
    [labelShowName, labelShowPrice, labelShowBarcodeText, labelShowDesc, labelCutLines].forEach(el => {
        el.addEventListener('change', updatePrintPreview);
    });

    // Generate a single label HTML
    function createLabelHTML(widthMM, heightMM, forPrint) {
        const text = barcodeText.value.trim();
        const fSize = parseInt(labelFontSize.value);
        const bcHeightPercent = parseInt(labelBarcodeHeight.value);
        const showName = labelShowName.checked;
        const showPrice = labelShowPrice.checked;
        const showBcText = labelShowBarcodeText.checked;
        const showDesc = labelShowDesc.checked && labelDescription.value.trim();
        const productName = labelProductName.value.trim();
        const price = labelPrice.value.trim();
        const description = labelDescription.value.trim();

        // Calculate barcode dimensions
        const bcHeight = Math.round((heightMM * bcHeightPercent) / 100);
        const bcWidthPx = Math.max(widthMM * 2.5, 60);

        // Create temp SVG for barcode
        const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        try {
            JsBarcode(tempSvg, text, {
                format: barcodeType.value,
                width: 1.2,
                height: bcHeight * 2.5,
                margin: 2,
                fontSize: showBcText ? Math.max(fSize * 0.9, 8) : 0,
                lineColor: lineColor.value,
                background: 'transparent',
                displayValue: showBcText,
                font: 'Inter, sans-serif',
                fontOptions: '500',
                textMargin: 1,
            });
        } catch (e) {
            return `<div class="label-preview" style="width:${widthMM}mm;height:${heightMM}mm;justify-content:center;"><span style="font-size:8pt;color:#dc2626;">${T.barcErr || 'Barcode error'}</span></div>`;
        }

        const svgHTML = tempSvg.outerHTML;

        const cutClass = labelCutLines.checked ? ' label-cut-lines' : '';
        let html = `<div class="label-preview${cutClass}" style="width:${widthMM}mm;height:${heightMM}mm;gap:${Math.max(1, Math.floor(heightMM / 20))}px;">`;

        if (showName && productName) {
            html += `<div class="label-product-name" style="font-size:${fSize}pt;max-width:${widthMM - 2}mm;">${escapeHtml(productName)}</div>`;
        }

        // Barcode SVG
        html += `<div class="label-barcode" style="max-width:${widthMM - 4}mm;max-height:${bcHeight}mm;overflow:hidden;display:flex;align-items:center;justify-content:center;">${svgHTML}</div>`;

        if (showPrice && price) {
            html += `<div class="label-price-text" style="font-size:${Math.round(fSize * 1.3)}pt;">${escapeHtml(price)}</div>`;
        }

        if (showDesc && description) {
            html += `<div class="label-description-text" style="font-size:${Math.max(fSize - 2, 6)}pt;max-width:${widthMM - 2}mm;">${escapeHtml(description)}</div>`;
        }

        html += '</div>';
        return html;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Update print preview
    function updatePrintPreview() {
        let labelW, labelH;

        if (currentPrinterType === 'thermal') {
            labelW = currentLabelW;
            labelH = currentLabelH;
            const labelHTML = createLabelHTML(labelW, labelH, false);
            printPreview.innerHTML = labelHTML;
            printInfoText.textContent = (T.thermal || 'Thermal label: {0} × {1} mm').replace('{0}', labelW).replace('{1}', labelH);
        } else if (currentPrinterType === 'a4') {
            labelW = currentA4LabelW;
            labelH = currentA4LabelH;
            const labelsPerPage = currentA4Cols * currentA4Rows;
            const copies = Math.max(1, parseInt(labelCopies.value) || labelsPerPage);
            const pages = Math.ceil(copies / labelsPerPage);
            const filledOnLastPage = copies % labelsPerPage || labelsPerPage;

            // Section 1: Readable single-label preview
            let html = '<div class="a4-preview-layout">';
            html += '<div class="a4-label-section">';
            html += `<div class="a4-label-heading">${T.singleH || 'Single label preview'}</div>`;
            html += '<div class="a4-single-label">';
            html += createLabelHTML(labelW, labelH, false);
            html += '</div>';
            html += `<div class="a4-label-dims">${labelW} × ${labelH} mm</div>`;
            html += '</div>';

            // Section 2: Schematic A4 grid
            html += '<div class="a4-grid-section">';
            html += `<div class="a4-label-heading">${T.gridH || 'A4 sheet layout'}</div>`;
            const cutGridClass = labelCutLines.checked ? ' a4-grid-cut' : '';
            html += '<div class="a4-sheet-schematic">';
            html += `<div class="a4-sheet-grid${cutGridClass}" style="grid-template-columns:repeat(${currentA4Cols},1fr);grid-template-rows:repeat(${currentA4Rows},1fr);">`;

            // Show the first page fill state
            const filledOnFirstPage = Math.min(copies, labelsPerPage);
            for (let i = 0; i < labelsPerPage; i++) {
                const filled = i < filledOnFirstPage;
                const col = i % currentA4Cols;
                const row = Math.floor(i / currentA4Cols);
                const isLastCol = col === currentA4Cols - 1;
                const isLastRow = row === currentA4Rows - 1;
                let cellClass = 'a4-cell';
                if (filled) cellClass += ' a4-cell-filled';
                if (isLastCol) cellClass += ' a4-cell-last-col';
                if (isLastRow) cellClass += ' a4-cell-last-row';
                html += `<div class="${cellClass}">${filled ? '<svg width="12" height="8" viewBox="0 0 12 8"><rect x="1" width="1" height="8" fill="currentColor"/><rect x="3" width="0.5" height="8" fill="currentColor"/><rect x="4.5" width="1.5" height="8" fill="currentColor"/><rect x="7" width="0.5" height="8" fill="currentColor"/><rect x="8.5" width="1" height="8" fill="currentColor"/><rect x="10.5" width="0.5" height="8" fill="currentColor"/></svg>' : ''}</div>`;
            }

            html += '</div>';
            html += '</div>';

            // Info line
            let infoLine = `${currentA4Cols} \u00d7 ${currentA4Rows} = <strong>${labelsPerPage} ${T.labels || 'labels'}</strong> ${T.perSheet || 'per sheet'}`;
            if (pages > 1) {
                infoLine += ` \u00b7 <span class="a4-pages-badge">${copies} ${T.labels || 'labels'} = ${pages} ${pages < 5 ? (T.pagesFew || 'pages') : (T.pages || 'pages')}</span>`;
            } else {
                infoLine += ` \u00b7 ${T.filled || 'filled'}: <strong>${copies}</strong>`;
            }
            html += `<div class="a4-grid-info">${infoLine}</div>`;
            html += '</div>';
            html += '</div>';

            printPreview.innerHTML = html;
            let infoText = (T.a4Info || 'A4: {0} labels/page ({1}×{2}), label: {3} × {4} mm').replace('{0}', labelsPerPage).replace('{1}', currentA4Cols).replace('{2}', currentA4Rows).replace('{3}', labelW).replace('{4}', labelH);
            if (pages > 1) infoText += ' ' + (T.a4Pages || '— to print: {0} {1}').replace('{0}', pages).replace('{1}', pages < 5 ? (T.pagesFew || 'pages') : (T.pages || 'pages'));
            printInfoText.textContent = infoText;
        } else {
            // Custom
            labelW = parseInt(customW.value) || 60;
            labelH = parseInt(customH.value) || 40;
            const labelHTML = createLabelHTML(labelW, labelH, false);
            printPreview.innerHTML = labelHTML;
            printInfoText.textContent = (T.custom || 'Custom label: {0} × {1} mm').replace('{0}', labelW).replace('{1}', labelH);
        }
    }

    // Print button
    btnDoPrint.addEventListener('click', () => {
        let labelW, labelH;
        let pageStyle = '';

        if (currentPrinterType === 'thermal' || currentPrinterType === 'custom') {
            labelW = currentPrinterType === 'thermal' ? currentLabelW : (parseInt(customW.value) || 60);
            labelH = currentPrinterType === 'thermal' ? currentLabelH : (parseInt(customH.value) || 40);
            const copies = Math.max(1, parseInt(labelCopies.value) || 1);

            // Let the browser paginate naturally to the user's selected paper size.
            // Labels tile via flex-wrap, each with break-inside:avoid so none gets split.
            pageStyle = `<style>@page { margin: 10mm; }</style>`;

            let html = pageStyle + `<div style="font-family:Inter,sans-serif;display:flex;flex-wrap:wrap;gap:4mm;align-content:flex-start;justify-content:flex-start;">`;
            for (let i = 0; i < copies; i++) {
                html += `<div style="width:${labelW}mm;height:${labelH}mm;page-break-inside:avoid;break-inside:avoid;">${createLabelHTML(labelW, labelH, true)}</div>`;
            }
            html += '</div>';
            printOutput.innerHTML = html;
        } else {
            // A4
            labelW = currentA4LabelW;
            labelH = currentA4LabelH;
            const copies = Math.min(parseInt(labelCopies.value) || 1, 500);
            const labelsPerPage = currentA4Cols * currentA4Rows;
            const pages = Math.ceil(copies / labelsPerPage);

            pageStyle = `<style>@page { size: A4; margin: 5mm; }</style>`;

            let html = pageStyle + '<div style="font-family:Inter,sans-serif;">';
            let labelsDone = 0;

            for (let p = 0; p < pages; p++) {
                const isLast = p === pages - 1;
                const breakStyle = isLast ? '' : 'page-break-after:always;break-after:page;';
                html += `<div style="width:210mm;min-height:287mm;display:grid;grid-template-columns:repeat(${currentA4Cols},${labelW}mm);grid-template-rows:repeat(${currentA4Rows},${labelH}mm);gap:0;justify-content:center;align-content:start;padding:${Math.max(2, Math.floor((287 - currentA4Rows * labelH) / 2))}mm ${Math.max(2, Math.floor((200 - currentA4Cols * labelW) / 2))}mm;${breakStyle}">`;

                for (let i = 0; i < labelsPerPage && labelsDone < copies; i++) {
                    html += createLabelHTML(labelW, labelH, true);
                    labelsDone++;
                }
                html += '</div>';
            }
            html += '</div>';
            printOutput.innerHTML = html;
        }

        // Trigger print
        printOutput.style.display = 'block';
        window.print();
        setTimeout(() => { printOutput.style.display = 'none'; }, 1000);
    });
});
