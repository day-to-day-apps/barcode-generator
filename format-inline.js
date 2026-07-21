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
    anchor.download = `${appType}-${currentValue}.${extension}`;
    anchor.click();
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
  });
  input.addEventListener('input', () => {
    if (format === 'UPC' || format === 'ITF14') input.value = input.value.replace(/\D/g, '');
  });
  tool.addEventListener('click', (event) => {
    const button = event.target.closest('[data-download]');
    if (!button || !currentValue) return;
    if (button.dataset.download === 'svg') download(svgBlob(), 'svg');
    else downloadPng();
  });

  if (typeof window.JsBarcode === 'function') generate();
  else window.addEventListener('load', generate, { once: true });
})();
