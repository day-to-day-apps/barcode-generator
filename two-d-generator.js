(function () {
  'use strict';

  const pl = document.documentElement.lang === 'pl';
  const copy = pl ? {
    empty: 'Wpisz dane do zakodowania.', ready: 'Kod jest gotowy do pobrania.', bytes: 'bajtów',
    pixels: 'px', copied: 'Skopiowano dane.', copyFailed: 'Nie udało się skopiować.',
    renderError: 'Tych danych nie można zakodować przy wybranych ustawieniach.',
  } : {
    empty: 'Enter data to encode.', ready: 'The barcode is ready to download.', bytes: 'bytes',
    pixels: 'px', copied: 'Data copied.', copyFailed: 'Copy failed.',
    renderError: 'This data cannot be encoded with the selected settings.',
  };

  const $ = (id) => document.getElementById(id);
  const form = $('two-d-form');
  const canvas = $('two-d-preview');
  const status = $('two-d-status');
  const metrics = $('two-d-metrics');
  const payload = $('two-d-payload');
  const advanced = $('two-d-advanced');
  let renderTimer = 0;
  let currentOptions = null;
  let lastTrackedSignature = '';

  if (matchMedia('(max-width: 480px)').matches) advanced.open = false;

  function mode() {
    return form.elements.mode.value;
  }

  function optionsFromForm() {
    const text = payload.value;
    if (!text) throw new Error('empty');
    const selectedMode = mode();
    const options = {
      bcid: selectedMode,
      text,
      scale: Number($('two-d-scale').value),
      padding: Number($('two-d-padding').value),
      barcolor: $('two-d-foreground').value,
      backgroundcolor: $('two-d-background').value,
    };
    if (selectedMode === 'datamatrix' && $('data-matrix-shape').value === 'rectangular') {
      options.bcid = 'datamatrixrectangular';
    }
    if (selectedMode === 'pdf417') {
      options.columns = Number($('pdf-columns').value);
      options.eclevel = Number($('pdf-error-level').value);
      options.rowmult = 3;
    }
    if (selectedMode === 'azteccode') {
      options.bcid = $('aztec-format').value === 'compact' ? 'azteccodecompact' : 'azteccode';
      options.eclevel = Number($('aztec-error-level').value);
    }
    return options;
  }

  function friendlyError(error) {
    if (error.message === 'empty') return copy.empty;
    const detail = String(error.message || error).replace(/^bwipp\.[^:]+:\s*/i, '').trim();
    return detail && detail.length < 180 ? `${copy.renderError} ${detail}` : copy.renderError;
  }

  function updatePanels() {
    document.querySelectorAll('[data-format-options]').forEach((panel) => {
      panel.hidden = panel.dataset.formatOptions !== mode();
    });
    scheduleRender(0);
  }

  function render() {
    try {
      currentOptions = optionsFromForm();
      window.bwipjs.toCanvas(canvas, currentOptions);
      canvas.dataset.format = currentOptions.bcid;
      const byteCount = new TextEncoder().encode(payload.value).length;
      metrics.textContent = `${byteCount} ${copy.bytes} · ${canvas.width} × ${canvas.height} ${copy.pixels}`;
      status.textContent = copy.ready;
      status.classList.remove('is-error');
      document.querySelectorAll('[data-two-d-action]').forEach((button) => { button.disabled = false; });
      const signature = `${currentOptions.bcid}|${payload.value}|${currentOptions.scale}|${currentOptions.padding}`;
      if (signature !== lastTrackedSignature) {
        lastTrackedSignature = signature;
        window.trackBarcode?.('two_d_generate', { format: currentOptions.bcid, bytes: byteCount });
      }
    } catch (error) {
      currentOptions = null;
      delete canvas.dataset.format;
      const context = canvas.getContext('2d');
      context?.clearRect(0, 0, canvas.width, canvas.height);
      metrics.textContent = `${new TextEncoder().encode(payload.value).length} ${copy.bytes}`;
      status.textContent = friendlyError(error);
      status.classList.add('is-error');
      document.querySelectorAll('[data-two-d-action]').forEach((button) => { button.disabled = true; });
    }
  }

  function scheduleRender(delay = 120) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, delay);
  }

  function downloadBlob(blob, extension) {
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `${currentOptions.bcid}-${Date.now()}.${extension}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
    window.trackBarcode?.('two_d_export', { format: currentOptions.bcid, file_type: extension });
  }

  function exportSvg() {
    try {
      const svg = window.bwipjs.toSVG(currentOptions);
      downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), 'svg');
    } catch (error) {
      status.textContent = friendlyError(error);
      status.classList.add('is-error');
    }
  }

  function exportPng() {
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, 'png');
    }, 'image/png');
  }

  async function copyPayload() {
    try {
      await navigator.clipboard.writeText(payload.value);
      status.textContent = copy.copied;
      status.classList.remove('is-error');
    } catch {
      status.textContent = copy.copyFailed;
      status.classList.add('is-error');
    }
  }

  form.addEventListener('input', () => scheduleRender());
  form.addEventListener('change', (event) => {
    if (event.target.name === 'mode') updatePanels();
    else scheduleRender(0);
  });
  $('download-two-d-svg').addEventListener('click', exportSvg);
  $('download-two-d-png').addEventListener('click', exportPng);
  $('copy-two-d').addEventListener('click', copyPayload);
  updatePanels();
}());
