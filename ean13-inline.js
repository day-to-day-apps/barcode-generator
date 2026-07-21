(function () {
  'use strict';

  const tool = document.querySelector('.ean13-tool');
  if (!tool) return;

  const form = tool.querySelector('.ean13-tool__form');
  const input = tool.querySelector('#ean13-inline-value');
  const barcode = tool.querySelector('#ean13-inline-barcode');
  const status = tool.querySelector('#ean13-inline-status');
  const advancedLink = tool.querySelector('[data-advanced-link]');
  const actions = tool.querySelector('.ean13-tool__actions');
  let currentValue = '';

  function checkDigit(firstTwelve) {
    const sum = [...firstTwelve].reduce((total, digit, index) =>
      total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
    return String((10 - (sum % 10)) % 10);
  }

  function message(template, values) {
    return Object.entries(values).reduce(
      (result, [key, value]) => result.replace(`{${key}}`, value),
      template,
    );
  }

  function setError(text) {
    currentValue = '';
    input.setAttribute('aria-invalid', 'true');
    status.className = 'ean13-tool__status ean13-tool__status--error';
    status.textContent = text;
    actions.hidden = true;
    barcode.replaceChildren();
  }

  function generate() {
    const raw = input.value.replace(/\s+/g, '');
    input.value = raw;
    if (!/^\d{12,13}$/.test(raw)) {
      setError(tool.dataset.invalid);
      return;
    }

    const expected = checkDigit(raw.slice(0, 12));
    if (raw.length === 13 && raw.at(-1) !== expected) {
      setError(message(tool.dataset.checksum, { digit: expected }));
      return;
    }

    currentValue = raw.length === 12 ? raw + expected : raw;
    input.removeAttribute('aria-invalid');
    try {
      window.JsBarcode(barcode, currentValue, {
        format: 'EAN13',
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
    status.className = 'ean13-tool__status ean13-tool__status--success';
    status.textContent = message(tool.dataset.ready, { value: currentValue });
    advancedLink.href = `${advancedLink.pathname}?type=ean13&value=${encodeURIComponent(currentValue)}`;
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
    anchor.download = `ean13-${currentValue}.${extension}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadPng() {
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
    input.value = input.value.replace(/\D/g, '').slice(0, 13);
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
