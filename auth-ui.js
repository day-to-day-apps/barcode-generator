// auth-ui.js — moduł ESM, łączy app.js (vanilla, classic script) z Supabase Auth.
// - wstrzykuje link "Konto" / e-mail użytkownika w headerze
// - dodaje przycisk "Zapisz ten kod" pod podglądem (tylko dla zalogowanych)
// - eksponuje window.__authState dla diagnostyki/integracji

import { getSupabase, getSession, onAuthStateChange } from './supabase-client.js';
import { countCodes, FREE_CODES_LIMIT } from './db-codes.js';

const ROUTES = {
  account: '/konto.html',
  myCodes: '/moje-kody.html',
  templates: '/szablony.html',
};

const FALLBACK_TEXT = {
  signIn: 'Sign in',
  headerCtaCreate: 'Create free account',
  headerCtaLogin: 'I have an account',
  myCodes: 'My codes',
  signOut: 'Sign out',
  saveCode: 'Save this code',
  saved: 'Saved',
  saving: 'Saving…',
  saveFail: 'Could not save the code',
  freeLimit: 'Free plan keeps your last 10 codes — older ones will be removed.',
  loginRequired: 'Sign in to save codes',
  pendingCodePrompt: 'Sign in to keep this code — we saved it temporarily.',
  pendingCodeSaved: 'Your pending code was saved to your account.',
  accountMenuLabel: 'Account menu',
  accountMenuHeader: 'Signed in as',
  accountPresets: 'My presets',
  accountSettings: 'Account settings',
};

const PENDING_COOKIE = 'bc_pending_code';
const PENDING_TTL_SECONDS = 86400;

function writePendingCookie(payload) {
  try {
    const value = encodeURIComponent(JSON.stringify(payload));
    document.cookie = `${PENDING_COOKIE}=${value}; path=/; max-age=${PENDING_TTL_SECONDS}; SameSite=Strict`;
    return true;
  } catch {
    return false;
  }
}

function readPendingCookie() {
  const match = document.cookie.split('; ').find(c => c.startsWith(`${PENDING_COOKIE}=`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match.split('=')[1]));
  } catch {
    return null;
  }
}

function clearPendingCookie() {
  document.cookie = `${PENDING_COOKIE}=; path=/; max-age=0; SameSite=Strict`;
}

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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function getInitial(email) {
  if (!email) return '?';
  const first = email.trim().charAt(0);
  return first ? first.toUpperCase() : '?';
}

function buildHeaderControls() {
  const slot = document.querySelector('.topbar__right')
    || document.querySelector('header.animated-header');
  if (!slot || slot.querySelector('.auth-controls')) {
    return slot ? slot.querySelector('.auth-controls') : null;
  }

  const wrap = document.createElement('div');
  wrap.className = 'auth-controls';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', 'Account');
  wrap.innerHTML = `
    <span class="auth-anon" hidden>
      <a class="btn-auth-primary auth-signin-cta" href="${ROUTES.account}#register">${escapeHtml(t('headerCtaCreate'))}</a>
      <a class="auth-link-secondary auth-signin-link" href="${ROUTES.account}#login">${escapeHtml(t('headerCtaLogin'))}</a>
    </span>
    <div class="account-menu auth-user" aria-expanded="false" hidden>
      <button type="button" class="account-menu__trigger" aria-haspopup="menu" aria-expanded="false" aria-label="${escapeHtml(t('accountMenuLabel'))}">
        <span class="account-menu__avatar" aria-hidden="true">?</span>
        <span class="account-menu__label auth-email"></span>
        <svg class="account-menu__caret" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 5 6 8 9 5"/></svg>
      </button>
      <div class="account-menu__panel" role="menu">
        <div class="account-menu__header">
          <span class="account-menu__header-label">${escapeHtml(t('accountMenuHeader'))}</span>
          <span class="account-menu__header-email"></span>
        </div>
        <a class="account-menu__item auth-mycodes" role="menuitem" href="${ROUTES.myCodes}">
          <svg class="account-menu__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="14" height="12" rx="2"/><path d="M3 8h14"/></svg>
          <span>${escapeHtml(t('myCodes'))}</span>
        </a>
        <a class="account-menu__item" role="menuitem" href="${ROUTES.templates}">
          <svg class="account-menu__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h12M4 10h12M4 14h8"/></svg>
          <span>${escapeHtml(t('accountPresets'))}</span>
        </a>
        <a class="account-menu__item" role="menuitem" href="${ROUTES.account}#settings">
          <svg class="account-menu__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="2.5"/><path d="M16 10a6 6 0 0 0-.12-1.18l1.66-1.3-1.5-2.6-2 .7a6 6 0 0 0-2.04-1.18L11.5 2.5h-3l-.5 1.94a6 6 0 0 0-2.04 1.18l-2-.7-1.5 2.6 1.66 1.3A6 6 0 0 0 4 10c0 .4.04.8.12 1.18l-1.66 1.3 1.5 2.6 2-.7a6 6 0 0 0 2.04 1.18l.5 1.94h3l.5-1.94a6 6 0 0 0 2.04-1.18l2 .7 1.5-2.6-1.66-1.3c.08-.38.12-.78.12-1.18z"/></svg>
          <span>${escapeHtml(t('accountSettings'))}</span>
        </a>
        <button type="button" class="account-menu__item account-menu__item--danger auth-signout" role="menuitem">
          <svg class="account-menu__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3"/><polyline points="9 13 12 10 9 7"/><line x1="12" y1="10" x2="4" y2="10"/></svg>
          <span>${escapeHtml(t('signOut'))}</span>
        </button>
      </div>
    </div>
  `;
  slot.appendChild(wrap);

  const menu = wrap.querySelector('.account-menu');
  const trigger = wrap.querySelector('.account-menu__trigger');
  const panel = wrap.querySelector('.account-menu__panel');

  function setOpen(open) {
    if (!menu || !trigger) return;
    menu.setAttribute('aria-expanded', open ? 'true' : 'false');
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menu.getAttribute('aria-expanded') === 'true';
    setOpen(!isOpen);
    if (!isOpen) {
      const first = panel?.querySelector('[role="menuitem"]');
      first?.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (!menu) return;
    if (menu.contains(e.target)) return;
    if (menu.getAttribute('aria-expanded') === 'true') setOpen(false);
  });

  wrap.addEventListener('keydown', (e) => {
    if (!menu) return;
    if (e.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      trigger?.focus();
    }
  });

  const signOutBtn = wrap.querySelector('.auth-signout');
  signOutBtn?.addEventListener('click', async () => {
    setOpen(false);
    const sb = await getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
  });

  return wrap;
}

function renderHeaderState(controls) {
  if (!controls) return;
  const anon = controls.querySelector('.auth-anon');
  const userBox = controls.querySelector('.auth-user');
  const emailLabel = controls.querySelector('.account-menu__label.auth-email');
  const headerEmail = controls.querySelector('.account-menu__header-email');
  const avatar = controls.querySelector('.account-menu__avatar');
  const user = state.session?.user;
  if (user) {
    if (anon) anon.hidden = true;
    if (userBox) userBox.hidden = false;
    const mail = user.email ?? '';
    if (emailLabel) emailLabel.textContent = mail;
    if (headerEmail) headerEmail.textContent = mail;
    if (avatar) avatar.textContent = getInitial(mail);
  } else {
    if (anon) anon.hidden = false;
    if (userBox) {
      userBox.hidden = true;
      userBox.setAttribute('aria-expanded', 'false');
      const trig = userBox.querySelector('.account-menu__trigger');
      trig?.setAttribute('aria-expanded', 'false');
    }
    if (emailLabel) emailLabel.textContent = '';
    if (headerEmail) headerEmail.textContent = '';
    if (avatar) avatar.textContent = '?';
  }
}

function buildSaveButton() {
  const previewActions = document.querySelector('.preview .preview-actions');
  if (!previewActions || previewActions.querySelector('.btn-save-code')) return null;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-action btn-save-code';
  btn.hidden = false;
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
  btn.hidden = false;
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
    const pending = readCurrentBarcode();
    if (pending) {
      writePendingCookie({ ...pending, ts: Date.now() });
      announce(t('pendingCodePrompt'));
    }
    window.location.href = `${ROUTES.account}#register`;
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
    const { count, error: countErr } = await countCodes();
    if (countErr) throw countErr;
    if (count >= FREE_CODES_LIMIT) {
      const msg = (t('freeLimitReached') || 'Free limit reached. Delete a code first or upgrade.');
      announce(msg);
      label.textContent = original;
      return;
    }
    const { error } = await sb.from('saved_codes').insert({
      user_id: state.session.user.id,
      code_type: data.code_type,
      value: data.value,
      settings: data.settings,
    });
    if (error) throw error;
    window.trackBarcode?.('save_barcode', { code_type: data.code_type });
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
  const headerControls = buildHeaderControls();
  renderHeaderState(headerControls);

  const sb = await getSupabase();
  if (!sb) {
    return;
  }

  const saveBtn = buildSaveButton();

  state.session = await getSession();
  state.user = state.session?.user ?? null;
  renderHeaderState(headerControls);
  renderSaveButton(saveBtn);

  await onAuthStateChange((event, session) => {
    const wasAnon = !state.session?.user;
    state.session = session;
    state.user = session?.user ?? null;
    renderHeaderState(headerControls);
    renderSaveButton(saveBtn);
    if (wasAnon && session?.user) {
      consumePendingCode().catch(err => console.warn('[auth-ui] pending consume:', err?.message));
    }
  });

  if (state.session?.user) {
    consumePendingCode().catch(err => console.warn('[auth-ui] pending consume:', err?.message));
  }
}

async function consumePendingCode() {
  const pending = readPendingCookie();
  if (!pending || !pending.code_type || !pending.value) return;
  const sb = await getSupabase();
  if (!sb || !state.session?.user) return;
  try {
    const { count, error: countErr } = await countCodes();
    if (countErr) throw countErr;
    if (count >= FREE_CODES_LIMIT) {
      clearPendingCookie();
      announce(t('freeLimit'));
      return;
    }
    const { error } = await sb.from('saved_codes').insert({
      user_id: state.session.user.id,
      code_type: pending.code_type,
      value: pending.value,
      settings: pending.settings || {},
    });
    if (error) throw error;
    clearPendingCookie();
    announce(t('pendingCodeSaved'));
  } catch (err) {
    console.warn('[auth-ui] pending save error:', err?.message);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
