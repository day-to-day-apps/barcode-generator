(function () {
  'use strict';

  const tool = document.querySelector('.format-tool');
  if (!tool) return;

  const form = tool.querySelector('.format-tool__form');
  const input = tool.querySelector('#format-inline-value');
  const barcode = tool.querySelector('#format-inline-barcode');
  const status = tool.querySelector('#format-inline-status');
  const actions = tool.querySelector('.format-tool__actions');
  const advancedLink = tool.querySelector('[data-advanced-link]');
  const errorCorrection = tool.querySelector('#format-inline-ecc');
  const format = tool.dataset.format;
  const appType = tool.dataset.type;
  const formatName = tool.dataset.name;
  let currentValue = '';

  function fillTemplate(template, values) {
    return Object.entries(values).reduce(
      (result, [key, value]) => result.replaceAll(`{${key}}`, value),
      template,
    );
  }

  function gtinCheckDigit(base) {
    const sum = [...base].reverse().reduce(
      (total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1),
      0,
    );
    return String((10 - (sum % 10)) % 10);
  }

  function numericGtin(value, baseLength) {
    if (!new RegExp(`^\\d{${baseLength},${baseLength + 1}}$`).test(value)) return { error: tool.dataset.invalid };
    const expected = gtinCheckDigit(value.slice(0, baseLength));
    if (value.length === baseLength + 1 && value.at(-1) !== expected) {
      return { error: fillTemplate(tool.dataset.checksum, { digit: expected }) };
    }
    return { value: value.length === baseLength ? value + expected : value };
  }

  function validate(raw) {
    if (format === 'QR') {
      return raw && raw.length <= 1000 ? { value: raw } : { error: tool.dataset.invalid };
    }
    if (format === 'UPC') return numericGtin(raw, 11);
    if (format === 'ITF14') return numericGtin(raw, 13);
    if (format === 'CODE128') {
      return /^[\x20-\x7E]{1,80}$/.test(raw) ? { value: raw } : { error: tool.dataset.invalid };
    }
    if (format === 'CODE39') {
      const value = raw.toUpperCase();
      return /^[0-9A-Z \-.$/+%]{1,48}$/.test(value) ? { value } : { error: tool.dataset.invalid };
    }
    if (format === 'codabar') {
      let value = raw.toUpperCase();
      if (/^[0-9\-$:/.+]+$/.test(value)) value = `A${value}A`;
      return /^[ABCD][0-9\-$:/.+]+[ABCD]$/.test(value) ? { value } : { error: tool.dataset.invalid };
    }
    return { error: tool.dataset.invalid };
  }

  function renderQr(value) {
    if (typeof window.qrcode !== 'function') throw new Error('QR library unavailable');
    if (window.qrcode.stringToBytes && !window.qrcode.__utf8Patched) {
      window.qrcode.stringToBytes = (text) => Array.from(new TextEncoder().encode(text));
      window.qrcode.__utf8Patched = true;
    }
    const qr = window.qrcode(0, errorCorrection?.value || 'M');
    qr.addData(value, 'Byte');
    qr.make();
    const count = qr.getModuleCount();
    const quietZone = 4;
    const namespace = 'http://www.w3.org/2000/svg';
    const background = document.createElementNS(namespace, 'rect');
    background.setAttribute('x', String(-quietZone));
    background.setAttribute('y', String(-quietZone));
    background.setAttribute('width', String(count + quietZone * 2));
    background.setAttribute('height', String(count + quietZone * 2));
    background.setAttribute('fill', '#ffffff');
    const modules = document.createElementNS(namespace, 'path');
    let path = '';
    for (let row = 0; row < count; row += 1) {
      for (let column = 0; column < count; column += 1) {
        if (qr.isDark(row, column)) path += `M${column} ${row}h1v1h-1z`;
      }
    }
    modules.setAttribute('d', path);
    modules.setAttribute('fill', '#111111');
    barcode.replaceChildren(background, modules);
    barcode.setAttribute('viewBox', `${-quietZone} ${-quietZone} ${count + quietZone * 2} ${count + quietZone * 2}`);
    barcode.setAttribute('width', '320');
    barcode.setAttribute('height', '320');
    barcode.setAttribute('shape-rendering', 'crispEdges');
  }

  function setError(text) {
    currentValue = '';
    input.setAttribute('aria-invalid', 'true');
    status.className = 'format-tool__status format-tool__status--error';
    status.textContent = text;
    actions.hidden = true;
    barcode.replaceChildren();
  }

  function generate() {
    const raw = input.value.trim();
    const result = validate(raw);
    if (result.error) {
      setError(result.error);
      return;
    }

    currentValue = result.value;
    input.value = currentValue;
    input.removeAttribute('aria-invalid');
    try {
      if (format === 'QR') renderQr(currentValue);
      else {
        window.JsBarcode(barcode, currentValue, {
          format,
          width: 2,
          height: 88,
          margin: 16,
          displayValue: true,
          background: '#ffffff',
          lineColor: '#111111',
          fontSize: 18,
        });
      }
    } catch (_error) {
      setError(tool.dataset.invalid);
      return;
    }
    barcode.setAttribute('aria-label', `${formatName}: ${currentValue}`);
    status.className = 'format-tool__status format-tool__status--success';
    status.textContent = fillTemplate(tool.dataset.ready, { value: currentValue });
    advancedLink.href = `${advancedLink.pathname}?type=${encodeURIComponent(appType)}&value=${encodeURIComponent(currentValue)}`;
    actions.hidden = false;
  }

  function svgBlob() {
    const clone = barcode.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' });
  }

  function download(blob, extension) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const safeValue = currentValue.slice(0, 40).replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'code';
    anchor.download = `${appType}-${safeValue}.${extension}`;
    anchor.click();
    window.trackBarcode?.('export_barcode', { tool: 'format_inline', code_type: format, file_type: extension });
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadPng() {
    const url = URL.createObjectURL(svgBlob());
    const image = new Image();
    image.onload = () => {
      const width = Math.max(320, Math.ceil(image.width * 2));
      const height = Math.max(180, Math.ceil(image.height * 2));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) download(blob, 'png');
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    image.src = url;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    generate();
    if (currentValue) window.trackBarcode?.('generate_barcode', { tool: 'format_inline', code_type: format, method: 'button' });
  });
  input.addEventListener('input', () => {
    if (format === 'UPC' || format === 'ITF14') input.value = input.value.replace(/\D/g, '');
  });
  errorCorrection?.addEventListener('change', generate);
  tool.addEventListener('click', (event) => {
    const button = event.target.closest('[data-download]');
    if (!button || !currentValue) return;
    if (button.dataset.download === 'svg') download(svgBlob(), 'svg');
    else downloadPng();
  });

  if ((format === 'QR' && typeof window.qrcode === 'function') || (format !== 'QR' && typeof window.JsBarcode === 'function')) generate();
  else window.addEventListener('load', generate, { once: true });
})();
