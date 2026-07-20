import { getSession } from './supabase-client.js';
import { countCodes, FREE_CODES_LIMIT, insertCode } from './db-codes.js';

const pl = document.documentElement.lang === 'pl';
const copy = pl ? {
  save: 'Zapisz na koncie', signIn: 'Zaloguj się, aby zapisać', saving: 'Zapisywanie...',
  saved: 'Kod zapisany na koncie.', open: 'Moje kody', invalid: 'Najpierw wygeneruj poprawny kod.',
  failed: 'Nie udało się zapisać kodu.', limit: 'Limit 10 kodów został osiągnięty. Usuń kod z biblioteki i spróbuj ponownie.',
} : {
  save: 'Save to account', signIn: 'Sign in to save', saving: 'Saving...',
  saved: 'Barcode saved to your account.', open: 'My codes', invalid: 'Generate a valid barcode first.',
  failed: 'The barcode could not be saved.', limit: 'The 10-code limit has been reached. Remove a code from your library and try again.',
};

const PENDING_KEY = 'bg.pending.specialized-code';
const button = document.querySelector('[data-account-save]');
const feedback = document.querySelector('[data-account-save-feedback]');
const libraryLink = document.querySelector('[data-account-library]');
let currentPayload = null;
let session = null;
let saving = false;

function setFeedback(message, error = false) {
  if (!feedback) return;
  feedback.textContent = message;
  feedback.classList.toggle('is-error', error);
}

function renderButton() {
  if (!button) return;
  button.textContent = session?.user ? copy.save : copy.signIn;
  button.disabled = saving || !currentPayload;
  if (libraryLink) {
    libraryLink.textContent = copy.open;
    libraryLink.hidden = !session?.user;
  }
}

function safePayload(value) {
  if (!value || typeof value !== 'object') return null;
  const codeType = String(value.code_type || '').slice(0, 32);
  const barcodeValue = String(value.value || '').slice(0, 4096);
  if (!codeType || !barcodeValue) return null;
  return {
    code_type: codeType,
    value: barcodeValue,
    name: value.name ? String(value.name).slice(0, 120) : null,
    tags: Array.isArray(value.tags) ? value.tags.map(String).slice(0, 20) : [],
    settings: value.settings && typeof value.settings === 'object' ? value.settings : {},
  };
}

function rememberPending(payload) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ payload, path: `${location.pathname}${location.search}`, savedAt: Date.now() }));
  } catch { /* storage can be unavailable in strict privacy modes */ }
}

function readPending() {
  try {
    const pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
    if (!pending?.payload || Date.now() - Number(pending.savedAt || 0) > 60 * 60 * 1000) return null;
    return pending;
  } catch {
    return null;
  }
}

function clearPending() {
  try { sessionStorage.removeItem(PENDING_KEY); } catch { /* noop */ }
}

function readStoredSession() {
  try {
    const stored = JSON.parse(localStorage.getItem('bg.auth') || 'null');
    return stored?.access_token && stored?.user ? stored : null;
  } catch {
    return null;
  }
}

async function persist(payload, automatic = false) {
  if (!session?.user || saving) return false;
  saving = true;
  renderButton();
  if (button) button.textContent = copy.saving;
  try {
    const { count, error: countError } = await countCodes();
    if (countError) throw countError;
    if (count >= FREE_CODES_LIMIT) {
      setFeedback(copy.limit, true);
      return false;
    }
    const { error } = await insertCode({ ...payload, user_id: session.user.id });
    if (error) throw error;
    clearPending();
    setFeedback(copy.saved);
    window.trackBarcode?.('save_barcode', {
      code_type: payload.code_type,
      tool: payload.settings?.generator || 'specialized',
      automatic,
    });
    return true;
  } catch (error) {
    console.warn('[specialized-save] save failed:', error?.message);
    setFeedback(copy.failed, true);
    return false;
  } finally {
    saving = false;
    renderButton();
  }
}

async function handleSave() {
  if (!currentPayload) {
    setFeedback(copy.invalid, true);
    return;
  }
  if (!session?.user) {
    rememberPending(currentPayload);
    const accountPath = pl ? '/pl/konto' : '/konto';
    const returnTo = `${location.pathname}${location.search}`;
    location.assign(`${accountPath}?returnTo=${encodeURIComponent(returnTo)}#login`);
    return;
  }
  await persist(currentPayload);
}

window.addEventListener('barcode:save-state', (event) => {
  currentPayload = event.detail?.valid ? safePayload(event.detail.payload) : null;
  if (!currentPayload) setFeedback('');
  renderButton();
});

button?.addEventListener('click', handleSave);

async function init() {
  session = readStoredSession();
  renderButton();
  window.dispatchEvent(new CustomEvent('barcode:request-save-state'));
  if (session?.user) {
    session = await getSession();
    renderButton();
  }
  const pending = readPending();
  if (session?.user && pending?.path === `${location.pathname}${location.search}`) {
    const payload = safePayload(pending.payload);
    if (payload) await persist(payload, true);
  }
}

init();
