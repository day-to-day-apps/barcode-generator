// Cloudflare Pages Function: SSR strony udostępnionego kodu (/c/:slug)
// Pobiera dane przez publiczny RPC `get_shared_code` (SECURITY DEFINER).

const SLUG_RE = /^[A-Za-z0-9]{6,32}$/;
const BARCODE_TYPES = new Set(['CODE128', 'CODE128A', 'CODE128B', 'CODE128C', 'EAN13', 'EAN8', 'EAN5', 'EAN2', 'UPC', 'UPCA', 'UPCE', 'CODE39', 'ITF14', 'ITF', 'MSI', 'MSI10', 'MSI11', 'MSI1010', 'MSI1110', 'pharmacode', 'codabar']);

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
}

function escapeJson(s) {
    return JSON.stringify(String(s ?? ''));
}

function sharedHeader(origin) {
    const home = `${escapeHtml(origin)}/`;
    return `<header class="site-header"><div class="site-header__inner">
<a class="site-brand" href="${home}" aria-label="Barcode Generator"><span class="site-brand__bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span>Barcode Generator</span></a>
<nav class="site-nav" aria-label="Main navigation">
<a class="site-nav__link" href="${home}">Generator</a><a class="site-nav__link" href="${home}decoder">Scanner</a><a class="site-nav__link" href="${home}bulk-barcode-generator">Bulk / CSV</a><a class="site-nav__link" href="${home}gs1-barcode-generator">GS1</a><a class="site-nav__link" href="${home}2d-barcode-generator">2D codes</a><a class="site-nav__link" href="${home}konto">Account</a>
</nav>
<div class="site-header__actions"><button class="theme-toggle" id="theme-toggle" type="button" title="Toggle theme" aria-label="Toggle theme"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/></svg></button></div>
</div></header>`;
}

function notFound(env) {
    const origin = siteOrigin(env);
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Code not found | Barcode Generator</title><meta name="robots" content="noindex"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/site-shell.css"><script src="/appearance.js"></script><script defer src="/site-shell.js"></script><style>${sharedPageStyles()}</style></head><body class="site-shell-ready shared-page">${sharedHeader(origin)}<main class="shared-layout"><section class="shared-card shared-card--empty"><p class="shared-kicker">Shared code</p><h1>Code not found</h1><p class="shared-meta">This shared code does not exist or is no longer public.</p><a class="shared-cta" href="${escapeHtml(origin)}/">Open generator</a></section></main></body></html>`;
    return new Response(html, {
        status: 404,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Robots-Tag': 'noindex'
        }
    });
}

function siteOrigin(env) {
    return env.SITE_ORIGIN || 'https://barcode-generator.daytodayapps.com';
}

function sharedPageStyles() {
    return `
* { box-sizing: border-box; }
.shared-page { min-height: 100vh; margin: 0; font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; }
.shared-layout { display: grid; place-items: center; width: min(100% - 32px, 1120px); min-height: calc(100vh - 69px); margin: 0 auto; padding: 48px 0; }
.shared-card { width: min(100%, 600px); padding: 32px; border: 1px solid var(--site-border); border-radius: 8px; background: var(--site-surface); box-shadow: var(--site-shadow); text-align: center; }
.shared-card--empty { max-width: 520px; }
.shared-kicker { margin: 0 0 8px; color: var(--site-primary-strong); font-size: .78rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.shared-card h1 { margin: 0 0 6px; color: var(--site-text); font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.2; overflow-wrap: anywhere; }
.shared-meta { margin: 0 0 24px; color: var(--site-muted); font-size: .95rem; }
.shared-render { display: flex; justify-content: center; align-items: center; min-height: 220px; margin-bottom: 20px; padding: 24px; border: 1px solid var(--site-border); border-radius: 8px; background: #fff; color: #202738; }
.shared-render svg, .shared-render canvas { max-width: 100%; height: auto; }
.shared-value { margin: 0 0 24px; padding: 12px; border: 1px solid var(--site-border); border-radius: 8px; background: var(--site-bg); color: var(--site-text); font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: .95rem; overflow-wrap: anywhere; }
.shared-cta { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 10px 18px; border-radius: 8px; background: var(--site-primary); color: #fff; font-weight: 750; text-decoration: none; }
.shared-cta:hover { background: var(--site-primary-strong); }
.shared-footer { margin: 20px 0 0; color: var(--site-muted); font-size: .82rem; }
.shared-footer a { color: var(--site-primary-strong); }
@media (max-width: 720px) { .shared-layout { min-height: auto; padding: 28px 0; } .shared-card { padding: 24px 18px; } .shared-render { min-height: 180px; padding: 16px; } }
`;
}

function renderPage({ row, origin }) {
    const name = row.name || '(unnamed)';
    const type = row.code_type || '';
    const value = row.value || '';
    const isQR = type === 'QR';
    const isBarcode = BARCODE_TYPES.has(type);
    const canonical = `${origin}/c/${row.share_slug}`;
    const description = `Shared ${isQR ? 'QR code' : 'barcode'}: ${name}`;

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(name)} — Shared code</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(name)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/site-shell.css">
<script src="/appearance.js"></script>
<script defer src="/site-shell.js"></script>
<style>${sharedPageStyles()}</style>
</head>
<body class="site-shell-ready shared-page">
${sharedHeader(origin)}
<main class="shared-layout"><section class="shared-card">
<p class="shared-kicker">Shared code</p>
<h1>${escapeHtml(name)}</h1>
<p class="shared-meta">${escapeHtml(type)}</p>
<div class="shared-render" id="render" aria-label="${escapeHtml(isQR ? 'QR code' : 'Barcode')}">
<noscript><p>Enable JavaScript to view the code.</p></noscript>
</div>
<p class="shared-value">${escapeHtml(value)}</p>
<a class="shared-cta" href="${escapeHtml(origin)}/">Open generator</a>
<p class="shared-footer">Shared via <a href="${escapeHtml(origin)}/">Barcode Generator</a></p>
</section></main>
<script>
(function () {
    var value = ${escapeJson(value)};
    var type = ${escapeJson(type)};
    var isQR = ${JSON.stringify(isQR)};
    var isBarcode = ${JSON.stringify(isBarcode)};
    var host = document.getElementById('render');
    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = resolve;
            s.onerror = function () { reject(new Error('load failed: ' + src)); };
            document.head.appendChild(s);
        });
    }
    function renderQR() {
        return loadScript('/vendor/qrcode-generator.js').then(function () {
            if (window.qrcode && window.qrcode.stringToBytes) {
                window.qrcode.stringToBytes = function (s) { return Array.from(new TextEncoder().encode(s)); };
            }
            var qr = window.qrcode(0, 'M');
            qr.addData(value);
            qr.make();
            host.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
        });
    }
    function renderBarcode() {
        return loadScript('/vendor/jsbarcode.min.js').then(function () {
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            host.innerHTML = '';
            host.appendChild(svg);
            window.JsBarcode(svg, value, { format: type, displayValue: false, margin: 8 });
        });
    }
    var task = isQR ? renderQR() : (isBarcode ? renderBarcode() : Promise.resolve());
    task.catch(function () {
        host.innerHTML = '<p>Unable to render preview.</p>';
    });
})();
</script>
</body>
</html>`;
}

export async function onRequestGet(context) {
    const { params, env } = context;
    const slug = String(params.slug || '');

    if (!SLUG_RE.test(slug)) return notFound(env);

    const supabaseUrl = env.SUPABASE_URL;
    const anonKey = env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
        return new Response('Service unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }

    let row = null;
    try {
        const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_shared_code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': anonKey,
                'Authorization': `Bearer ${anonKey}`
            },
            body: JSON.stringify({ p_slug: slug })
        });
        if (!res.ok) return notFound(env);
        const data = await res.json();
        row = Array.isArray(data) ? data[0] : data;
    } catch (_err) {
        return notFound(env);
    }

    if (!row || !row.share_slug) return notFound(env);

    const html = renderPage({ row, origin: siteOrigin(env) });
    return new Response(html, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=300, s-maxage=300',
            'X-Robots-Tag': 'noindex, follow'
        }
    });
}
