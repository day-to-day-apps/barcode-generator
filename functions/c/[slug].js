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

function notFound(env) {
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Not found</title><meta name="robots" content="noindex"></head><body><h1>404 — Code not found</h1><p>This shared code does not exist or is no longer public.</p><p><a href="${escapeHtml(siteOrigin(env))}/">Go to homepage</a></p></body></html>`;
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
<style>
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; background: #f6f7f9; color: #1a1d21; }
@media (prefers-color-scheme: dark) { body { background: #14171c; color: #e8eaed; } .card { background: #1f242b; box-shadow: 0 4px 20px rgba(0,0,0,.4); } .meta { color: #9aa0a6; } }
.card { background: #fff; border-radius: 12px; padding: 2rem; max-width: 480px; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,.08); text-align: center; }
h1 { margin: 0 0 .5rem; font-size: 1.5rem; word-break: break-word; }
.meta { color: #5f6368; font-size: .9rem; margin: 0 0 1.5rem; }
.render { display: flex; justify-content: center; align-items: center; min-height: 160px; margin: 0 0 1.5rem; padding: 1rem; background: #fff; border-radius: 8px; }
.render svg, .render canvas { max-width: 100%; height: auto; }
.value { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: .95rem; word-break: break-all; padding: .75rem; background: rgba(0,0,0,.04); border-radius: 6px; margin: 0 0 1.5rem; }
@media (prefers-color-scheme: dark) { .value { background: rgba(255,255,255,.06); } }
.cta { display: inline-block; padding: .75rem 1.25rem; background: #1a73e8; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500; }
.cta:hover { background: #1557b0; }
.footer { margin-top: 1.5rem; font-size: .8rem; color: #80868b; }
.footer a { color: inherit; }
</style>
</head>
<body>
<main class="card">
<h1>${escapeHtml(name)}</h1>
<p class="meta">${escapeHtml(type)}</p>
<div class="render" id="render" aria-label="${escapeHtml(isQR ? 'QR code' : 'Barcode')}">
<noscript><p>Enable JavaScript to view the code.</p></noscript>
</div>
<p class="value">${escapeHtml(value)}</p>
<a class="cta" href="${escapeHtml(origin)}/">Open generator</a>
<p class="footer">Shared via <a href="${escapeHtml(origin)}/">Barcode Generator</a></p>
</main>
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
