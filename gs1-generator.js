(function () {
  'use strict';

  const tools = window.GS1Tools;
  const pl = document.documentElement.lang === 'pl';
  const text = pl ? {
    valid: 'Kod jest poprawny i gotowy do eksportu.', corrected: 'Dodano cyfrę kontrolną:',
    digits_only: 'Wpisz wyłącznie cyfry.', wrong_length: 'Nieprawidłowa liczba cyfr.',
    invalid_check_digit: 'Nieprawidłowa cyfra kontrolna. Oczekiwana:', unsupported_gtin: 'Nieobsługiwana długość GTIN.',
    invalid_date: 'Podaj prawidłową datę.', value_too_long: 'Wartość jest zbyt długa.',
    invalid_character: 'Pole zawiera znak niedozwolony przez zestaw GS1.', copied: 'Skopiowano ciąg GS1.',
    copy_failed: 'Nie udało się skopiować.', generated: 'Wygenerowano kod',
  } : {
    valid: 'The code is valid and ready to export.', corrected: 'Check digit added:',
    digits_only: 'Enter digits only.', wrong_length: 'The number of digits is incorrect.',
    invalid_check_digit: 'Invalid check digit. Expected:', unsupported_gtin: 'Unsupported GTIN length.',
    invalid_date: 'Enter a valid date.', value_too_long: 'The value is too long.',
    invalid_character: 'The field contains a character outside the GS1 character set.', copied: 'GS1 element string copied.',
    copy_failed: 'Copy failed.', generated: 'Generated',
  };

  const $ = (id) => document.getElementById(id);
  const form = $('gs1-form');
  const preview = $('gs1-preview');
  const status = $('gs1-status');
  const hri = $('gs1-hri');
  const encoded = $('gs1-encoded');
  let current = null;
  let lastTrackedSignature = '';

  function mode() {
    return form.elements.mode.value;
  }

  function showMode() {
    document.querySelectorAll('[data-mode-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.modePanel !== mode();
    });
    render();
  }

  function errorMessage(error) {
    let message = text[error.code] || error.message;
    if (error.code === 'wrong_length') message += ` ${error.details.expected.join(' / ')}.`;
    if (error.code === 'invalid_check_digit') message += ` ${error.details.expected}.`;
    if (error.code === 'value_too_long') message += ` (${error.details.max})`;
    return message;
  }

  function resultFromForm() {
    if (mode() === 'gtin') return tools.buildGtin($('gtin-value').value, Number($('gtin-length').value));
    if (mode() === 'sscc') return tools.buildSscc($('sscc-value').value);
    const gtinLength = Number($('gs1-gtin-length').value);
    const gtin = tools.normalizeGtin($('gs1-gtin').value, gtinLength);
    return {
      ...tools.buildGs1128({
        gtin: gtin.value,
        expiry: $('gs1-expiry').value,
        batch: $('gs1-batch').value,
        serial: $('gs1-serial').value,
      }),
      corrected: gtin.corrected,
    };
  }

  function render() {
    try {
      current = resultFromForm();
      preview.replaceChildren();
      window.JsBarcode(preview, current.encoded, {
        format: current.format,
        ean128: current.gs1,
        text: current.hri,
        displayValue: true,
        width: 2,
        height: 88,
        margin: 16,
        fontSize: 16,
        background: '#ffffff',
        lineColor: '#111111',
      });
      hri.textContent = current.hri;
      encoded.textContent = current.encoded.replaceAll(tools.FNC1, '<FNC1>');
      encoded.dataset.raw = current.encoded;
      status.textContent = current.corrected ? `${text.corrected} ${current.value || current.elements[0].value}` : text.valid;
      status.classList.remove('is-error');
      document.querySelectorAll('[data-gs1-action]').forEach((button) => { button.disabled = false; });
      const signature = `${mode()}|${current.encoded}`;
      if (signature !== lastTrackedSignature) {
        lastTrackedSignature = signature;
        window.trackBarcode?.('gs1_generate', { mode: mode(), elements: current.elements.length, corrected: current.corrected });
      }
    } catch (error) {
      current = null;
      preview.replaceChildren();
      hri.textContent = '—';
      encoded.textContent = '—';
      delete encoded.dataset.raw;
      status.textContent = errorMessage(error);
      status.classList.add('is-error');
      document.querySelectorAll('[data-gs1-action]').forEach((button) => { button.disabled = true; });
    }
  }

  function svgBlob() {
    const source = new XMLSerializer().serializeToString(preview);
    return new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${source}`], { type: 'image/svg+xml;charset=utf-8' });
  }

  function download(blob, extension) {
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `gs1-${mode()}-${Date.now()}.${extension}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
    window.trackBarcode?.('gs1_export', { mode: mode(), format: extension });
  }

  function exportPng() {
    const url = URL.createObjectURL(svgBlob());
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, image.width * 3);
      canvas.height = Math.max(1, image.height * 3);
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => blob && download(blob, 'png'), 'image/png');
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }

  async function copyHri() {
    try {
      await navigator.clipboard.writeText(current.hri);
      status.textContent = text.copied;
      status.classList.remove('is-error');
    } catch {
      status.textContent = text.copy_failed;
      status.classList.add('is-error');
    }
  }

  form.addEventListener('input', render);
  form.addEventListener('change', (event) => {
    if (event.target.name === 'mode') showMode();
    else render();
  });
  $('download-svg').addEventListener('click', () => download(svgBlob(), 'svg'));
  $('download-png').addEventListener('click', exportPng);
  $('copy-gs1').addEventListener('click', copyHri);
  showMode();
}());
