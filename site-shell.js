(function () {
  try {
    const saved = localStorage.getItem('barcode-theme');
    const theme = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  function init() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const toggle = header.querySelector('#lang-toggle');
    const dropdown = header.querySelector('#lang-dropdown');
    const themeToggle = header.querySelector('#theme-toggle');
    if (toggle && dropdown) {
      toggle.addEventListener('click', () => {
        const open = dropdown.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', (event) => {
        if (!event.target.closest('.lang-switch')) {
          dropdown.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('barcode-theme', next); } catch { /* preference remains active */ }
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
