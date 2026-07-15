import { getSupabase, getSession, onAuthStateChange } from './supabase-client.js';
import { signUp, signIn, requestPasswordReset, signOut, validateEmail, validatePassword } from './auth-email-password.js';
import { loadDashboardStats, clearDashboardStats } from './dashboard-stats.js';
import { countCodes, listCodes, FREE_CODES_LIMIT } from './db-codes.js';
import { countTemplates, listTemplates, FREE_TEMPLATES_LIMIT } from './db-templates.js';
import { countPrinters, listPrinters, FREE_PRINTERS_LIMIT } from './db-printers.js';
import { countJobs, listJobs, FREE_JOBS_LIMIT } from './db-jobs.js';

const LANG = document.documentElement.lang || 'en';
const I = window.BARCODE_I18N || {};
const T = (I[LANG] && I[LANG].account) || (I.en && I.en.account) || {};
const $ = (id) => document.getElementById(id);
const status = $('email-status');
let currentSession = null;

const copy = LANG === 'pl' ? {
  recent: 'Ostatnio zapisane kody', empty: 'Nie masz jeszcze zapisanych kodow.', quick: 'Szybkie akcje',
  createCode: 'Utworz kod', createTemplate: 'Utworz szablon', createPrint: 'Przygotuj wydruk',
  settings: 'Ustawienia konta', export: 'Eksportuj dane (JSON)', remove: 'Usun konto', resend: 'Wyslij potwierdzenie ponownie',
} : {
  recent: 'Recently saved codes', empty: 'You have no saved codes yet.', quick: 'Quick actions',
  createCode: 'Create barcode', createTemplate: 'Create template', createPrint: 'Create print job',
  settings: 'Account settings', export: 'Export data (JSON)', remove: 'Delete account', resend: 'Resend confirmation email',
};

function setStatus(message, isError = false) {
  status.textContent = '';
  status.className = isError ? 'form-error' : 'form-success';
  requestAnimationFrame(() => { status.textContent = message || ''; });
}

const accountPath = () => LANG === 'en' ? '/konto.html' : `/${LANG}/konto.html`;
const localPath = (file) => new URL(file, location.href).pathname;

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n');
    if (T[key]) element.textContent = T[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    const key = element.getAttribute('data-i18n-placeholder');
    if (T[key]) element.setAttribute('placeholder', T[key]);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    const key = element.getAttribute('data-i18n-aria-label');
    if (T[key]) element.setAttribute('aria-label', T[key]);
  });
  if (T.title) document.title = `${T.title} - Barcode Generator`;
}

function switchTab(name) {
  ['login', 'register', 'reset'].forEach((item) => {
    const active = item === name;
    $(`tab-${item}`).setAttribute('aria-selected', String(active));
    $(`tab-${item}`).classList.toggle('is-active', active);
    $(`panel-${item}`).hidden = !active;
  });
  setStatus('');
}

function addPasswordMeter() {
  const input = $('register-password');
  const meter = document.createElement('div');
  meter.id = 'password-strength';
  meter.className = 'password-strength';
  meter.setAttribute('aria-live', 'polite');
  input.closest('.password-field').after(meter);
  input.addEventListener('input', () => {
    let score = input.value.length >= 8 ? 1 : 0;
    if (/[a-z]/.test(input.value) && /[A-Z]/.test(input.value)) score += 1;
    if (/\d/.test(input.value)) score += 1;
    if (/[^A-Za-z0-9]/.test(input.value)) score += 1;
    const labels = LANG === 'pl' ? ['Za krotkie', 'Slabe', 'Srednie', 'Dobre', 'Silne'] : ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
    meter.dataset.score = String(score);
    meter.textContent = input.value ? labels[score] : '';
  });
}

function ensureDashboardExtras() {
  if ($('account-extras')) return;
  const container = document.createElement('div');
  container.id = 'account-extras';
  container.className = 'account-extras';
  container.innerHTML = `
    <section class="dashboard-panel"><h3>${copy.quick}</h3><div class="quick-actions">
      <a class="btn-action" href="${localPath('./')}">${copy.createCode}</a>
      <a class="btn-action" href="${localPath('szablony.html')}">${copy.createTemplate}</a>
      <a class="btn-action" href="${localPath('wydruk.html')}">${copy.createPrint}</a>
    </div></section>
    <section class="dashboard-panel"><div class="dashboard-panel-heading"><h3>${copy.recent}</h3><a href="${localPath('moje-kody.html')}">${T.myCodes || 'My codes'}</a></div>
      <ul id="recent-codes" class="recent-codes"><li>${copy.empty}</li></ul></section>
    <section id="settings" class="dashboard-panel"><h3>${copy.settings}</h3>
      <form id="account-email-form" class="settings-form"><label for="account-new-email">${T.email || 'Email address'}</label><div class="settings-row"><input id="account-new-email" type="email" autocomplete="email" required><button class="btn-action" type="submit">${LANG === 'pl' ? 'Zmien e-mail' : 'Change email'}</button></div></form>
      <form id="account-password-form" class="settings-form"><label for="account-new-password">${T.password || 'Password'}</label><div class="settings-row"><input id="account-new-password" type="password" autocomplete="new-password" minlength="8" required><button class="btn-action" type="submit">${LANG === 'pl' ? 'Zmien haslo' : 'Change password'}</button></div></form>
      <div class="settings-actions"><button id="export-account" class="btn-action" type="button">${copy.export}</button><button id="delete-account" class="btn-action btn-danger" type="button">${copy.remove}</button></div>
    </section>`;
  $('signed-in').insertBefore(container, $('signed-in').querySelector('.dashboard-actions'));
  bindDashboardActions();
}

async function loadRecentCodes() {
  const list = $('recent-codes');
  const { data, error } = await listCodes();
  if (error || !data?.length) return;
  list.replaceChildren(...data.slice(0, 5).map((code) => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `${localPath('moje-kody.html')}?id=${encodeURIComponent(code.id)}`;
    link.textContent = code.name || code.value || code.code_type;
    const meta = document.createElement('span');
    meta.textContent = `${code.code_type} - ${new Date(code.updated_at || code.created_at).toLocaleDateString(LANG)}`;
    item.append(link, meta);
    return item;
  }));
}

function downloadJson(data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `barcode-generator-account-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function bindDashboardActions() {
  $('account-email-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = $('account-new-email').value.trim();
    if (!validateEmail(email)) return setStatus(T.invalidEmail || 'Enter a valid email.', true);
    const sb = await getSupabase();
    const { error } = await sb.auth.updateUser({ email });
    setStatus(error ? error.message : (LANG === 'pl' ? 'Potwierdz zmiane na nowym adresie e-mail.' : 'Confirm the change at the new email address.'), !!error);
  });
  $('account-password-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = $('account-new-password').value;
    if (!validatePassword(password)) return setStatus(T.weakPassword || 'Password must be at least 8 characters.', true);
    const sb = await getSupabase();
    const { error } = await sb.auth.updateUser({ password });
    if (!error) event.target.reset();
    setStatus(error ? error.message : (LANG === 'pl' ? 'Haslo zostalo zmienione.' : 'Password updated.'), !!error);
  });
  $('export-account').addEventListener('click', async () => {
    setStatus(T.sending || 'Preparing export...');
    const [codes, templates, printers, jobs] = await Promise.all([listCodes(), listTemplates(), listPrinters(), listJobs()]);
    const failed = [codes, templates, printers, jobs].find((result) => result.error);
    if (failed) return setStatus(failed.error.message || 'Could not export data.', true);
    downloadJson({ exportedAt: new Date().toISOString(), user: { id: currentSession.user.id, email: currentSession.user.email }, codes: codes.data, templates: templates.data, printers: printers.data, jobs: jobs.data });
    setStatus('');
  });
  $('delete-account').addEventListener('click', async () => {
    const phrase = LANG === 'pl' ? 'USUN KONTO' : 'DELETE ACCOUNT';
    if (window.prompt(`${copy.remove}: ${phrase}`) !== phrase) return;
    const sb = await getSupabase();
    setStatus(T.sending || 'Deleting account...');
    const { error } = await sb.functions.invoke('delete-account', { body: { confirmation: phrase } });
    if (error) return setStatus(error.message || 'Could not delete the account.', true);
    await signOut();
    location.assign('/');
  });
}

async function renderSession(session) {
  currentSession = session;
  const signedIn = Boolean(session?.user);
  $('signed-in').hidden = !signedIn;
  $('signed-out').hidden = signedIn;
  document.body.classList.toggle('account-authenticated', signedIn);
  if (!signedIn) {
    $('account-title').textContent = T.signIn || 'Sign in';
    clearDashboardStats();
    return;
  }
  $('user-email').textContent = session.user.email || '';
  $('account-title').textContent = T.dashboardTitle || 'Your account';
  ensureDashboardExtras();
  await Promise.all([
    loadDashboardStats({ helpers: { countCodes, countTemplates, countPrinters, countJobs }, limits: { FREE_CODES_LIMIT, FREE_TEMPLATES_LIMIT, FREE_PRINTERS_LIMIT, FREE_JOBS_LIMIT }, i18n: T }),
    loadRecentCodes(),
  ]);
  if (location.hash === '#settings') $('settings').scrollIntoView({ behavior: 'smooth' });
}

function ensureResendButton(email) {
  let button = $('resend-confirmation');
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.id = 'resend-confirmation';
    button.className = 'btn-action auth-resend';
    button.textContent = copy.resend;
    status.after(button);
  }
  button.onclick = async () => {
    button.disabled = true;
    const sb = await getSupabase();
    const { error } = await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: location.origin + accountPath() } });
    button.disabled = false;
    setStatus(error ? error.message : (T.registerCheckInbox || 'Check your inbox.'), !!error);
  };
}

function bindForms() {
  document.querySelectorAll('.auth-tab').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.tab)));
  if (['login', 'register', 'reset'].includes(location.hash.slice(1))) switchTab(location.hash.slice(1));
  $('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = $('login-email').value;
    const password = $('login-password').value;
    if (!validateEmail(email)) return setStatus(T.invalidEmail || 'Please enter a valid email address.', true);
    if (!validatePassword(password)) return setStatus(T.weakPassword || 'Password must be at least 8 characters.', true);
    $('login-submit').disabled = true;
    setStatus(T.sending || 'Signing in...');
    const { error } = await signIn({ email, password });
    $('login-submit').disabled = false;
    if (error) return setStatus(error.message || T.signInFail || 'Could not sign in.', true);
    const returnTo = new URLSearchParams(location.search).get('returnTo');
    if (returnTo?.startsWith('/') && !returnTo.startsWith('//')) location.assign(returnTo);
  });
  $('register-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = $('register-email').value;
    const password = $('register-password').value;
    if (!validateEmail(email)) return setStatus(T.invalidEmail || 'Please enter a valid email address.', true);
    if (!validatePassword(password)) return setStatus(T.weakPassword || 'Password must be at least 8 characters.', true);
    if (password !== $('register-password-confirm').value) return setStatus(T.passwordMismatch || 'Passwords do not match.', true);
    if (!$('register-terms').checked) return setStatus(T.mustAcceptTerms || 'You must accept the privacy policy.', true);
    $('register-submit').disabled = true;
    setStatus(T.sending || 'Creating account...');
    const { error } = await signUp({ email, password, redirectPath: accountPath() });
    $('register-submit').disabled = false;
    if (error) return setStatus(error.message || T.registerFail || 'Could not create the account.', true);
    setStatus(T.registerCheckInbox || 'Account created. Check your inbox to confirm your email.');
    ensureResendButton(email);
  });
  $('reset-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = $('reset-email').value;
    if (!validateEmail(email)) return setStatus(T.invalidEmail || 'Please enter a valid email address.', true);
    $('reset-submit').disabled = true;
    setStatus(T.sending || 'Sending...');
    const { error } = await requestPasswordReset({ email, redirectPath: `/reset-hasla.html?lang=${encodeURIComponent(LANG)}` });
    $('reset-submit').disabled = false;
    setStatus(error ? (error.message || T.resetFail) : (T.resetSent || 'Check your inbox for the reset link.'), !!error);
  });
  $('signout-btn').addEventListener('click', async () => { await signOut(); setStatus(T.signedOut || 'Signed out.'); });
  document.querySelectorAll('.password-toggle').forEach((button) => button.addEventListener('click', () => {
    const input = $(button.dataset.target);
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    button.setAttribute('aria-pressed', String(!showing));
    button.querySelector('.eye-open')?.toggleAttribute('hidden', !showing);
    button.querySelector('.eye-closed')?.toggleAttribute('hidden', showing);
  }));
}

async function init() {
  applyTranslations();
  addPasswordMeter();
  const sb = await getSupabase();
  if (!sb) { setStatus(T.notConfigured || 'Account features are not configured.', true); $('signed-out').hidden = false; return; }
  bindForms();
  await renderSession(await getSession());
  await onAuthStateChange((_event, session) => renderSession(session));
}

init();
