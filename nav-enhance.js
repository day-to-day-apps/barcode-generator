/**
 * App primary navigation enhancer.
 *
 * Each account page declares `<body data-page="...">` and a
 * `<nav class="app-nav" aria-label="Primary">...</nav>`. This module:
 *   1. Normalises existing links (classes, data-attrs, aria-current).
 *   2. Adds the active-page self-link if missing.
 *   3. Auth-gates `data-auth="required"` links via Supabase session.
 *   4. Swaps the CTA between "Sign in" (signed-out) and "Account" (signed-in).
 *
 * Works with `./` and `../` relative paths (lang subdirs).
 */

const ITEMS = [
    { href: './',                     i18n: 'backToGenerator',  fallback: '← Generator',     role: 'back', page: 'home' },
    { href: 'moje-kody',              i18n: 'myCodes',          fallback: 'My codes',        role: 'link', auth: 'required', page: 'moje-kody' },
    { href: 'szablony',               i18n: 'myTemplates',      fallback: 'My templates',    role: 'link', auth: 'required', page: 'szablony' },
    { href: 'drukarki',               i18n: 'myPrinters',       fallback: 'My printers',     role: 'link', auth: 'required', page: 'drukarki' },
    { href: 'wydruk',                 i18n: 'builderTitle',     fallback: 'Print builder',   role: 'link', auth: 'required', page: 'wydruk' },
    { href: 'historia-wydrukow',      i18n: 'printHistory',     fallback: 'Print history',   role: 'link', auth: 'required', page: 'historia' },
    { href: 'konto',                  i18n: 'title',            fallback: 'Account',         role: 'cta',  page: 'konto' },
];

function routeName(href) {
    return href
        .replace(/^\.\.?\//, '')
        .replace(/[?#].*$/, '')
        .replace(/\.html$/, '')
        .replace(/\/$/, '');
}

function detectBasePath() {
    try {
        const here = new URL(import.meta.url, location.href);
        const dir = here.pathname.replace(/\/[^\/]*$/, '/');
        const docDir = location.pathname.replace(/\/[^\/]*$/, '/');
        return docDir.startsWith(dir) ? './' : (dir.endsWith('/wersja zarobkowa/') ? '../' : './');
    } catch {
        return './';
    }
}

function buildLink(item, basePath) {
    const a = document.createElement('a');
    a.href = basePath + item.href.replace(/^\.\//, '');
    a.textContent = item.fallback;
    a.setAttribute('data-i18n', item.i18n);
    a.setAttribute('data-page', item.page);
    if (item.role === 'back') a.className = 'app-nav__back';
    else if (item.role === 'cta') a.className = 'app-nav__cta';
    else a.className = 'app-nav__link';
    if (item.auth) a.setAttribute('data-auth', item.auth);
    return a;
}

function normaliseNav(nav, basePath, currentPage) {
    const existing = new Map();
    nav.querySelectorAll('a').forEach((a) => {
        const href = a.getAttribute('href') || '';
        const name = routeName(href);
        existing.set(name, a);
    });

    const fragment = document.createDocumentFragment();
    ITEMS.forEach((item) => {
        const key = item.href === './' ? '' : item.href;
        let link = existing.get(key);
        if (!link) {
            link = buildLink(item, basePath);
        } else {
            link.setAttribute('data-page', item.page);
            if (item.auth) link.setAttribute('data-auth', item.auth);
            if (item.role === 'back') link.classList.add('app-nav__back');
            else if (item.role === 'cta') link.classList.add('app-nav__cta');
            else link.classList.add('app-nav__link');
            // Keep existing text/i18n (page might use shorter labels)
        }
        if (item.page === currentPage) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
        fragment.appendChild(link);
    });

    nav.textContent = '';
    nav.appendChild(fragment);
    applyI18n(nav);
}

function applyI18n(root) {
    const lang = document.documentElement.lang || 'en';
    const dict = window.BARCODE_I18N || {};
    const tree = (dict[lang] && dict[lang].account) || (dict.en && dict.en.account) || {};
    root.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        if (tree[key]) el.textContent = tree[key];
    });
}

function updateCtaForSession(nav, session) {
    const cta = nav.querySelector('.app-nav__cta');
    if (!cta) return;
    const lang = document.documentElement.lang || 'en';
    const dict = window.BARCODE_I18N || {};
    const tree = (dict[lang] && dict[lang].account) || (dict.en && dict.en.account) || {};
    if (session) {
        const label = tree.title || 'Account';
        cta.textContent = label;
        cta.setAttribute('data-i18n', 'title');
        cta.setAttribute('aria-label', label);
    } else {
        const label = tree.signIn || tree.signInCta || 'Sign in';
        cta.textContent = label;
        cta.setAttribute('data-i18n', 'signIn');
        cta.setAttribute('aria-label', label);
    }
}

function setSignedIn(nav, signedIn) {
    nav.setAttribute('data-signed-in', signedIn ? 'true' : 'false');
}

function annotateExistingLinks(nav, currentPage) {
    nav.querySelectorAll('a').forEach((a) => {
        const href = (a.getAttribute('href') || '').replace(/[?#].*$/, '');
        const isBack = href === './' || href === '../' || href === '';
        const name = routeName(href);
        const isAccount = name === 'konto' || name.endsWith('/konto');
        if (isBack) a.classList.add('app-nav__back');
        else if (isAccount) a.classList.add('app-nav__cta');
        else a.classList.add('app-nav__link');
        const match = ITEMS.find((item) => routeName(item.href) === name || (isBack && item.role === 'back'));
        if (match) {
            a.setAttribute('data-page', match.page);
            if (match.auth) a.setAttribute('data-auth', match.auth);
            if (match.page === currentPage) a.setAttribute('aria-current', 'page');
        }
    });
}

async function init() {
    const nav = document.querySelector('nav.app-nav[aria-label="Primary"]');
    if (!nav) return;

    const currentPage = (document.body && document.body.dataset.page) || '';
    const basePath = detectBasePath();

    // Only the main folder has the full account-area set (moje-kody, szablony,
    // drukarki, wydruk, historia). Language subfolders contain just a back link
    // and an Account CTA — there we only annotate existing links.
    if (basePath === './') {
        normaliseNav(nav, basePath, currentPage);
    } else {
        annotateExistingLinks(nav, currentPage);
        applyI18n(nav);
    }

    let supabaseClient;
    try {
        const mod = await import(basePath + 'supabase-client.js');
        supabaseClient = mod;
    } catch (err) {
        console.warn('[nav-enhance] Supabase client unavailable:', err);
        setSignedIn(nav, false);
        updateCtaForSession(nav, null);
        return;
    }

    const session = await supabaseClient.getSession();
    setSignedIn(nav, Boolean(session));
    updateCtaForSession(nav, session);

    supabaseClient.onAuthStateChange((event, nextSession) => {
        setSignedIn(nav, Boolean(nextSession));
        updateCtaForSession(nav, nextSession);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}
