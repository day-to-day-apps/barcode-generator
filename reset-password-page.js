import { getSupabase, onAuthStateChange } from './supabase-client.js';
import { setNewPassword, validatePassword } from './auth-email-password.js';

const supported = new Set(['en', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'cs', 'uk']);
const requested = new URLSearchParams(location.search).get('lang');
const LANG = supported.has(requested) ? requested : 'en';
document.documentElement.lang = LANG;
const I = window.BARCODE_I18N || {};
const T = (I[LANG] && I[LANG].account) || (I.en && I.en.account) || {};
const $ = (id) => document.getElementById(id);
const form = $('reset-password-form');
const accountUrl = LANG === 'en' ? '/konto.html' : `/${LANG}/konto.html`;
let hasRecoverySession = false;

document.querySelectorAll('[data-i18n]').forEach((element) => { const key = element.getAttribute('data-i18n'); if (T[key]) element.textContent = T[key]; });
document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => { const key = element.getAttribute('data-i18n-placeholder'); if (T[key]) element.setAttribute('placeholder', T[key]); });
document.querySelector('[data-back-to-account]')?.setAttribute('href', accountUrl);
if (T.setNewPasswordTitle) document.title = `${T.setNewPasswordTitle} - Barcode Generator`;

function setStatus(message, isError = false) {
  $('status').className = isError ? 'form-error' : 'form-success';
  $('status').textContent = message;
}

async function init() {
  const sb = await getSupabase();
  if (!sb) { setStatus(T.notConfigured || 'Account features are not configured.', true); form.querySelector('button').disabled = true; return; }
  await onAuthStateChange((event, session) => { if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) hasRecoverySession = true; });
  const { data } = await sb.auth.getSession();
  if (data?.session) hasRecoverySession = true;
  setTimeout(() => { if (!hasRecoverySession) setStatus(T.resetTokenMissing || 'Reset link is invalid or expired. Request a new one.', true); }, 1500);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = $('new-password').value;
    if (!validatePassword(password)) return setStatus(T.weakPassword || 'Password must be at least 8 characters.', true);
    if (password !== $('new-password-confirm').value) return setStatus(T.passwordMismatch || 'Passwords do not match.', true);
    if (!hasRecoverySession) return setStatus(T.resetTokenMissing || 'Reset link is invalid or expired. Request a new one.', true);
    const button = $('reset-password-submit');
    button.disabled = true;
    setStatus(T.sending || 'Updating...');
    const { error } = await setNewPassword({ password });
    button.disabled = false;
    if (error) return setStatus(error.message || T.passwordUpdateFail || 'Could not update password.', true);
    setStatus(T.passwordUpdated || 'Password updated. You can sign in now.');
    setTimeout(() => location.assign(accountUrl), 1500);
  });
}

init();
