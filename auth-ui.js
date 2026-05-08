// auth-ui.js — moduł ESM, łączy app.js (vanilla, classic script) z Supabase Auth.
// - wstrzykuje link "Konto" / e-mail użytkownika w headerze
// - dodaje przycisk "Zapisz ten kod" pod podglądem (tylko dla zalogowanych)
// - eksponuje window.__authState dla diagnostyki/integracji

import { getSupabase, getSession, onAuthStateChange } from './supabase-client.js';

const ROUTES = {
  account: 'konto.html',
  myCodes: 'moje-kody.html',
};

const FALLBACK_TEXT = {
  signIn: 'Sign in',
  myCodes: 'My codes',
  signOut: 'Sign out',
  saveCode: 'Save this code',
  saved: 'Saved',
  saving: 'Saving…',
  saveFail: 'Could not save the code',
  freeLimit: 'Free plan keeps your last 10 codes — older ones will be removed.',
  loginRequired: 'Sign in to save codes',
};

function t(key) {
  const lang = document.documentElement.lang || 'en';
  const dict = (window.BARCODE_I18N || {})[lang] || (window.BARCODE_I18N || {}).en || {};
  return (dict.account && dict.account[key]) || FALLBACK_TEXT[key] || key;
}

const state = {
  session: null,
  user: null,
  saving: false,
};

window.__authState = state;

function buildHeaderControls() {
  const header = document.querySelector('header.animated-header');
  if (!header || header.querySelector('.auth-controls')) return null;

  const wrap = document.createElement('div');
  wrap.className = 'auth-controls';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', 'Account');
  wrap.innerHTML = `
    <a class="auth-link auth-signin" href="${ROUTES.account}" hidden>${t('signIn')}</a>
    <span class="auth-user" hidden>
      <a class="auth-link auth-mycodes" href="${ROUTES.myCodes}">${t('myCodes')}</a>
      <span class="auth-email" aria-live="polite"></span>
      <button type="button" class="auth-signout">${t('signOut')}</button>
    </span>
  `;
  header.appendChild(wrap);

  const signOutBtn = wrap.querySelector('.auth-signout');
  signOutBtn?.addEventListener('click', async () => {
    const sb = await getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
  });

  return wrap;
}

function renderHeaderState(controls) {
  if (!controls) return;
  const signIn = controls.querySelector('.auth-signin');
  const userBox = controls.querySelector('.auth-user');
  const email = controls.querySelector('.auth-email');
  if (state.session?.user) {
    signIn.hidden = true;
    userBox.hidden = false;
    email.textContent = state.session.user.email ?? '';
  } else {
    signIn.hidden = false;
    userBox.hidden = true;
    email.textContent = '';
  }
}

function buildSaveButton() {
  const previewActions = document.querySelector('.preview .preview-actions');
  if (!previewActions || previewActions.querySelector('.btn-save-code')) return null;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-action btn-save-code';
  btn.hidden = true;
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <path d="M3 3h10l3 3v9a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 012 15V4.5A1.5 1.5 0 013.5 3z"/>
      <path d="M5 3v4h7V3M5 12.5h7"/>
    </svg>
    <span class="btn-save-label">${t('saveCode')}</span>
  `;
  btn.addEventListener('click', () => saveCurrentBarcode(btn));
  previewActions.appendChild(btn);
  return btn;
}

function renderSaveButton(btn) {
  if (!btn) return;
  btn.hidden = !state.session?.user;
}

function readCurrentBarcode() {
  const typeSel = document.getElementById('barcode-type');
  const valueInp = document.getElementById('barcode-value') || document.getElementById('barcode-text');
  const code_type = typeSel?.value?.trim();
  const value = valueInp?.value?.trim();
  if (!code_type || !value) return null;
  const settings = collectSettings();
  return { code_type, value, settings };
}

function collectSettings() {
  const out = {};
  const ids = [
    'barcode-width', 'barcode-height', 'barcode-margin',
    'fg-color', 'bg-color', 'rotation', 'show-text', 'text-align',
  ];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    out[id] = el.type === 'checkbox' ? el.checked : el.value;
  }
  return out;
}

async function saveCurrentBarcode(btn) {
  if (state.saving) return;
  const sb = await getSupabase();
  if (!sb || !state.session?.user) {
    announce(t('loginRequired'));
    return;
  }
  const data = readCurrentBarcode();
  if (!data) {
    announce(t('saveFail'));
    return;
  }

  const label = btn.querySelector('.btn-save-label');
  const original = label.textContent;
  state.saving = true;
  btn.disabled = true;
  label.textContent = t('saving');

  try {
    const { error } = await sb.from('saved_codes').insert({
      user_id: state.session.user.id,
      code_type: data.code_type,
      value: data.value,
      settings: data.settings,
    });
    if (error) throw error;
    label.textContent = t('saved');
    announce(t('saved'));
  } catch (err) {
    console.warn('[auth-ui] save error:', err?.message);
    label.textContent = original;
    announce(t('saveFail'));
  } finally {
    state.saving = false;
    btn.disabled = false;
    setTimeout(() => { label.textContent = original; }, 2000);
  }
}

function announce(msg) {
  let live = document.getElementById('auth-live');
  if (!live) {
    live = document.createElement('div');
    live.id = 'auth-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.className = 'sr-only';
    document.body.appendChild(live);
  }
  live.textContent = '';
  setTimeout(() => { live.textContent = msg; }, 30);
}

async function init() {
  const sb = await getSupabase();
  if (!sb) {
    return;
  }

  const headerControls = buildHeaderControls();
  const saveBtn = buildSaveButton();

  state.session = await getSession();
  state.user = state.session?.user ?? null;
  renderHeaderState(headerControls);
  renderSaveButton(saveBtn);

  await onAuthStateChange((event, session) => {
    state.session = session;
    state.user = session?.user ?? null;
    renderHeaderState(headerControls);
    renderSaveButton(saveBtn);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
