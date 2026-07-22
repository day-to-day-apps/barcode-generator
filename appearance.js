(function () {
  const STORAGE_KEY = 'barcode-contrast';
  const VALID_CHOICES = new Set(['auto', 'normal', 'high']);
  const copy = {
    en: ['Contrast', 'System', 'Standard', 'High'],
    pl: ['Kontrast', 'Systemowy', 'Standardowy', 'Wysoki'],
    de: ['Kontrast', 'System', 'Standard', 'Hoch'],
    fr: ['Contraste', 'Syst\u00e8me', 'Standard', '\u00c9lev\u00e9'],
    es: ['Contraste', 'Sistema', 'Est\u00e1ndar', 'Alto'],
    it: ['Contrasto', 'Sistema', 'Standard', 'Alto'],
    pt: ['Contraste', 'Sistema', 'Padr\u00e3o', 'Alto'],
    nl: ['Contrast', 'Systeem', 'Standaard', 'Hoog'],
    cs: ['Kontrast', 'Syst\u00e9m', 'Standardn\u00ed', 'Vysok\u00fd'],
    uk: ['Контраст', 'Системний', 'Стандартний', 'Високий'],
  };
  const contrastMedia = window.matchMedia('(prefers-contrast: more)');

  function readPreference() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return VALID_CHOICES.has(stored) ? stored : 'auto';
    } catch {
      return 'auto';
    }
  }

  function applyPreference(choice) {
    const high = choice === 'high' || (choice === 'auto' && contrastMedia.matches);
    if (high) document.documentElement.setAttribute('data-contrast', 'high');
    else document.documentElement.removeAttribute('data-contrast');
    document.querySelectorAll('[data-contrast-choice]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.contrastChoice === choice));
    });
    window.dispatchEvent(new CustomEvent('barcode:contrast-change', { detail: { choice, high } }));
  }

  function setPreference(choice) {
    if (!VALID_CHOICES.has(choice)) return;
    try { localStorage.setItem(STORAGE_KEY, choice); } catch { /* preference remains active */ }
    applyPreference(choice);
  }

  function buildControl() {
    const existing = document.querySelector('[data-appearance-settings]');
    if (existing) return existing;
    const lang = (document.documentElement.lang || 'en').split('-')[0];
    const labels = copy[lang] || copy.en;
    const container = document.createElement('section');
    container.className = 'appearance-setting';
    container.dataset.appearanceSettings = '';
    container.innerHTML = `
      <span class="appearance-setting__label" id="contrast-setting-label">${labels[0]}</span>
      <div class="appearance-segments" role="group" aria-labelledby="contrast-setting-label">
        ${['auto', 'normal', 'high'].map((choice, index) => `<button type="button" class="appearance-segment" data-contrast-choice="${choice}" aria-pressed="false">${labels[index + 1]}</button>`).join('')}
      </div>`;
    container.addEventListener('click', (event) => {
      const button = event.target instanceof Element
        ? event.target.closest('[data-contrast-choice]')
        : null;
      if (button) setPreference(button.dataset.contrastChoice);
    });
    return container;
  }

  function placeControl() {
    const accountCard = document.querySelector('main.container > .card[aria-labelledby="account-title"]');
    if (!accountCard) return false;
    const control = buildControl();
    const settings = document.getElementById('settings');
    const destination = settings || accountCard;
    if (control.parentElement !== destination) destination.appendChild(control);
    applyPreference(readPreference());
    return true;
  }

  applyPreference(readPreference());
  contrastMedia.addEventListener?.('change', () => {
    if (readPreference() === 'auto') applyPreference('auto');
  });
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) applyPreference(readPreference());
  });

  function init() {
    if (!placeControl()) return;
    const observer = new MutationObserver(() => placeControl());
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  window.BarcodeAppearance = { applyPreference, setPreference, readPreference };
})();
