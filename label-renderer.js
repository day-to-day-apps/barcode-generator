/*
 * label-renderer.js — pure label HTML renderer extracted from app.js.
 *
 * Exposes `window.LabelRenderer.createLabelHTML(opts)` so the print designer
 * and the multi-barcode builder can share one implementation.
 *
 * Depends on the global `JsBarcode` (loaded via CDN before this script).
 */
(function () {
    'use strict';

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    /**
     * Render a single label as an HTML string.
     *
     * @param {Object} opts
     * @param {number} opts.widthMM            - Label width in millimetres.
     * @param {number} opts.heightMM           - Label height in millimetres.
     * @param {string} opts.text               - Barcode payload (the value encoded into bars).
     * @param {string} opts.type               - JsBarcode format id (e.g. 'CODE128', 'EAN13').
     * @param {number} opts.fSize              - Base font size in pt for product name.
     * @param {number} opts.bcHeightPercent    - Barcode height as a percentage (1-100) of label height.
     * @param {boolean} opts.showName          - Render product name.
     * @param {boolean} opts.showPrice         - Render price.
     * @param {boolean} opts.showBcText        - Render human-readable barcode text under bars.
     * @param {boolean} opts.showDesc          - Render description.
     * @param {string}  opts.productName       - Product name text.
     * @param {string}  opts.price             - Price text.
     * @param {string}  opts.description       - Description text.
     * @param {boolean} opts.cutLines          - Add visible cut guides.
     * @param {string}  opts.lineColor         - Barcode line color (hex).
     * @param {number}  [opts.barWidth]        - JsBarcode bar width in px (default 1.2). Used to apply printer bar-width correction.
     * @param {Object}  [opts.t]               - i18n table; `t.barcErr` used for the error fallback.
     * @returns {string} HTML markup for one label.
     */
    function createLabelHTML(opts) {
        const widthMM         = Number(opts.widthMM)  || 50;
        const heightMM        = Number(opts.heightMM) || 25;
        const text            = String(opts.text || '').trim();
        const type            = opts.type || 'CODE128';
        const fSize           = Number(opts.fSize) || 10;
        const bcHeightPercent = Number(opts.bcHeightPercent) || 60;
        const showName        = !!opts.showName;
        const showPrice       = !!opts.showPrice;
        const showBcText      = !!opts.showBcText;
        const productName     = (opts.productName || '').trim();
        const price           = (opts.price || '').trim();
        const description     = (opts.description || '').trim();
        const showDesc        = !!opts.showDesc && description.length > 0;
        const cutLines        = !!opts.cutLines;
        const lineColor       = opts.lineColor || '#000000';
        const barWidth        = Math.max(0.5, Math.min(4, Number(opts.barWidth) || 1.2));
        const t               = opts.t || {};

        const bcHeight  = Math.round((heightMM * bcHeightPercent) / 100);

        const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        try {
            // eslint-disable-next-line no-undef
            JsBarcode(tempSvg, text, {
                format: type,
                width: barWidth,
                height: bcHeight * 2.5,
                margin: 2,
                fontSize: showBcText ? Math.max(fSize * 0.9, 8) : 0,
                lineColor: lineColor,
                background: 'transparent',
                displayValue: showBcText,
                font: 'Inter, sans-serif',
                fontOptions: '500',
                textMargin: 1,
            });
        } catch (e) {
            const errMsg = t.barcErr || 'Barcode error';
            return '<div class="label-preview" style="width:' + widthMM + 'mm;height:' + heightMM + 'mm;justify-content:center;">' +
                   '<span style="font-size:8pt;color:#dc2626;">' + escapeHtml(errMsg) + '</span></div>';
        }

        const svgHTML  = tempSvg.outerHTML;
        const cutClass = cutLines ? ' label-cut-lines' : '';
        const gap      = Math.max(1, Math.floor(heightMM / 20));

        let html = '<div class="label-preview' + cutClass + '" style="width:' + widthMM + 'mm;height:' + heightMM + 'mm;gap:' + gap + 'px;">';

        if (showName && productName) {
            html += '<div class="label-product-name" style="font-size:' + fSize + 'pt;max-width:' + (widthMM - 2) + 'mm;">' +
                    escapeHtml(productName) + '</div>';
        }

        html += '<div class="label-barcode" style="max-width:' + (widthMM - 4) + 'mm;max-height:' + bcHeight + 'mm;overflow:hidden;display:flex;align-items:center;justify-content:center;">' +
                svgHTML + '</div>';

        if (showPrice && price) {
            html += '<div class="label-price-text" style="font-size:' + Math.round(fSize * 1.3) + 'pt;">' +
                    escapeHtml(price) + '</div>';
        }

        if (showDesc) {
            html += '<div class="label-description-text" style="font-size:' + Math.max(fSize - 2, 6) + 'pt;max-width:' + (widthMM - 2) + 'mm;">' +
                    escapeHtml(description) + '</div>';
        }

        html += '</div>';
        return html;
    }

    window.LabelRenderer = {
        createLabelHTML: createLabelHTML,
        escapeHtml: escapeHtml,
    };
})();
