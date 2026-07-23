import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import path from 'node:path';
import { PurgeCSS } from 'purgecss';
import CleanCSS from 'clean-css';
import { minify } from 'terser';
import { PNG } from 'pngjs';
import { qrPageHtml } from './qr-pages.mjs';
import { ADDITIONAL_GUIDE_PAGES } from './additional-guides.mjs';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'dist');
const BASE = 'https://barcode-generator.daytodayapps.com';
const LANGS = ['en', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'cs', 'uk'];
const FLAG_CODES = ['gb', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'cz', 'ua'];
const LOCALE_DIRS = LANGS.filter((lang) => lang !== 'en');
const SOURCE_FORMATS = ['ean-13', 'code-128', 'upc-a', 'code-39', 'itf-14', 'codabar'];
const FORMATS = [...SOURCE_FORMATS, 'qr-code'];
const PRIVATE_PAGES = ['konto', 'moje-kody', 'szablony', 'drukarki', 'wydruk', 'historia-wydrukow'];
const ROOT_ASSETS = [
  '404.html', '_headers', '_redirects', 'ads.txt', 'robots.txt', 'favicon.svg', 'og-image.svg',
  'manifest.webmanifest', 'pwa-register.js',
  'googlec18ae46a3db92f98.html',
  'analytics.js', 'appearance.js', 'app.js', 'auth-email-password.js', 'auth-ui.js', 'account-page.js', 'account-dialogs.js',
  'ean13-inline.js', 'ean13-inline.css', 'format-inline.js', 'format-inline.css',
  'bulk.js', 'bulk-export.js', 'bulk-job-state.js', 'bulk.css', 'gs1.js', 'gs1-generator.js', 'gs1.css',
  'two-d-generator.js', 'two-d.css', 'specialized-save.js',
  'csv-import.js', 'csv-worker.js', 'dashboard-stats.js', 'db-codes.js', 'db-jobs.js',
  'db-printers.js', 'db-templates.js', 'decoder.js', 'i18n.js', 'label-renderer.js',
  'nav-enhance.js', 'print-builder.js', 'printer-presets.json', 'reset-password-page.js',
  'styles.css', 'supabase-client.js', 'supabase-config.js',
  'index.html', 'decoder.html', 'konto.html', 'moje-kody.html', 'szablony.html',
  'drukarki.html', 'wydruk.html', 'historia-wydrukow.html', 'reset-hasla.html',
  'privacy-policy.html', 'terms.html', 'kalibracja-druku.html',
];
const VERSIONED_ASSETS = ROOT_ASSETS.filter((name) => /\.(?:css|js)$/.test(name));
const ASSET_VERSIONS = new Map(await Promise.all(VERSIONED_ASSETS.map(async (name) => {
  const digest = createHash('sha256').update(await readFile(path.join(ROOT, name))).digest('hex').slice(0, 12);
  return [name, digest];
})));
const ASSET_REF_RE = new RegExp(`((?:\\.\\.\\/)*)(${VERSIONED_ASSETS.map((name) => name.replaceAll('.', '\\.')).join('|')})(?:\\?v=[^"' ]+)?`, 'g');

function routeFor(lang, page = '') {
  const prefix = lang === 'en' ? '' : `/${lang}`;
  return page ? `${prefix}/${page}` : `${prefix}/`;
}

function canonicalFor(lang, page) {
  return `${BASE}${routeFor(lang, page)}`;
}

function normaliseHtml(html) {
  let output = html
    .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/jsbarcode@[^/'"]+\/dist\/JsBarcode\.all\.min\.js/g, '/vendor/jsbarcode.min.js')
    .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/qrcode-generator@[^/'"]+\/qrcode\.min\.js/g, '/vendor/qrcode-generator.js')
    .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/qrious@[^/'"]+\/dist\/qrious\.min\.js/g, '/vendor/qrcode-generator.js')
    .replace(/\s+integrity="sha384-(?:Kk5SjBOKprEnGfyBWfD2zROFd1Cu8kwOXxG2GIhYPcoDL2rBJS9P8Ud1ZMy4412a|lQXOAyZwHXE55JFyrOMB7nY2Wv\+m5ZWNtJcHrd1rceRQXAYNLak8ukN5TjBTcIwz|Dr98ddmUw2QkdCarNQ\+OL7xLty7cSxgR0T7v1tq4UErS\/qLV0132sBYTolRAFuOV)"\s+crossorigin="anonymous"/g, '')
    .replace(/(href=(['"]))(https:\/\/barcode-generator\.daytodayapps\.com[^'"?#]*)\.html(?=([?#'" ]))/g, '$1$3')
    .replace(/(content=(['"]))(https:\/\/barcode-generator\.daytodayapps\.com[^'"?#]*)\.html(?=([?#'" ]))/g, '$1$3')
    .replace(/href=(['"])((?:\.\.\/)*(?:[a-z]{2}\/)?)(?:index)(?:\.html)?([?#][^'"]*)?\1/g, (_m, q, prefix, suffix = '') => `href=${q}${prefix || './'}${suffix}${q}`)
    .replace(/href=(['"])([^'":#?]+)\.html([?#][^'"]*)?\1/g, (_m, q, target, suffix = '') => `href=${q}${target}${suffix}${q}`)
    .replace(/href=(['"])(?:(?:\.\.\/)+|\/)?polityka-prywatnosci(?:\.html)?\1/g, 'href="/privacy-policy"')
    .replace(/href=(['"])(?:(?:\.\.\/)+|\/)?regulamin(?:\.html)?\1/g, 'href="/terms"')
    .replace(/\s*<link[^>]+https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>/gi, '')
    .replace(/<script(?![^>]*\b(?:defer|async)\b)(?![^>]*type=['"]module['"])([^>]*\bsrc=[^>]*)>/gi, '<script defer$1>')
    .replace(ASSET_REF_RE, (_match, prefix, name) => `${prefix}${name}?v=${ASSET_VERSIONS.get(name)}`);
  const analyticsScript = output.match(/\s*<script defer[^>]*src=["'][^"']*analytics\.js[^"']*["'][^>]*><\/script>/i)?.[0];
  if (analyticsScript) {
    output = output
      .replace(analyticsScript, '')
      .replace(/(<body[^>]*>)/i, `$1\n${analyticsScript.trim()}`);
  }
  if ((output.match(/<h1\b/gi) || []).length > 1) {
    output = output.replace(/<h1>([\s\S]*?)<\/h1>/i, '<div class="brand-heading">$1</div>');
  }
  if (!/rel=["']manifest["']/i.test(output)) {
    output = output.replace(
      '</head>',
      `    <link rel="manifest" href="/manifest.webmanifest">\n    <meta name="theme-color" content="#4f46e5">\n    <meta name="apple-mobile-web-app-capable" content="yes">\n    <meta name="apple-mobile-web-app-status-bar-style" content="default">\n</head>`,
    );
  }
  if (!/appearance\.js/i.test(output)) {
    output = output.replace(
      '</head>',
      `    <script src="/appearance.js?v=${ASSET_VERSIONS.get('appearance.js')}"></script>\n</head>`,
    );
  }
  if (!/pwa-register\.js/i.test(output)) {
    output = output.replace('</body>', `    <script defer src="/pwa-register.js?v=${ASSET_VERSIONS.get('pwa-register.js')}"></script>\n</body>`);
  }
  return output;
}

function normaliseJavaScript(source) {
  return source
    .replaceAll('https://flagcdn.com/20x15/', '/flags/')
    .replace(/https:\/\/flagcdn\.com\/40x30\/\$\{code\}\.png/g, '/flags/${code}@2x.png');
}

function pwaIcon(size) {
  const png = new PNG({ width: size, height: size });
  const setPixel = (x, y, [r, g, b, a = 255]) => {
    const offset = (y * size + x) * 4;
    png.data[offset] = r;
    png.data[offset + 1] = g;
    png.data[offset + 2] = b;
    png.data[offset + 3] = a;
  };
  const fillRect = (x, y, width, height, color) => {
    for (let row = y; row < y + height; row++) {
      for (let col = x; col < x + width; col++) setPixel(col, row, color);
    }
  };
  fillRect(0, 0, size, size, [79, 70, 229]);
  const panelX = Math.round(size * 0.2);
  const panelY = Math.round(size * 0.25);
  const panelW = Math.round(size * 0.6);
  const panelH = Math.round(size * 0.5);
  fillRect(panelX, panelY, panelW, panelH, [255, 255, 255]);
  const bars = [[0.28, 0.032], [0.35, 0.016], [0.405, 0.04], [0.485, 0.016], [0.54, 0.024], [0.605, 0.04], [0.69, 0.016]];
  for (const [x, width] of bars) {
    fillRect(Math.round(size * x), Math.round(size * 0.345), Math.max(2, Math.round(size * width)), Math.round(size * 0.31), [17, 24, 39]);
  }
  return PNG.sync.write(png);
}

function textContent(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function clipDescription(value) {
  if (value.length <= 155) return value;
  return `${value.slice(0, 152).replace(/\s+\S*$/, '')}...`;
}

function formatHreflangCluster(page) {
  return [
    ...LANGS.map((alternate) => `    <link rel="alternate" hreflang="${alternate}" href="${canonicalFor(alternate, `${page}/`)}">`),
    `    <link rel="alternate" hreflang="x-default" href="${canonicalFor('en', `${page}/`)}">`,
  ].join('\n');
}

function improveLandingSeo(html, lang, page) {
  const withoutAlternates = html.replace(
    /\s*<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=["'][^"']+["'])[^>]*>/gi,
    '',
  );
  let output = withoutAlternates
    .replace(/(<link\s+rel=["']canonical["'][^>]*>)/i, `$1\n${formatHreflangCluster(page)}`)
    .replaceAll('{{', '{')
    .replaceAll('}}', '}');
  if (lang === 'en') return output;
  const pick = (regex) => textContent((output.match(regex) || [])[1] || '');
  const title = pick(/<h1>([\s\S]*?)<\/h1>/i);
  const lead = pick(/<p class="landing__lead">([\s\S]*?)<\/p>/i);
  const cta = pick(/<a class="landing__cta"[^>]*>([\s\S]*?)<\/a>/i);
  const sections = [...output.matchAll(/<section class="landing__section[^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>[\s\S]*?<p>([\s\S]*?)<\/p>/gi)]
    .slice(0, 3)
    .map((match) => ({ name: textContent(match[1]), text: textContent(match[2]) }));
  if (!title || !lead || sections.length < 3) return output;

  const description = clipDescription(lead);
  output = output
    .replace(/(<meta name="description" content=")[^"]*(">)/i, `$1${description}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(">)/i, `$1${description}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(">)/i, `$1${description}$2`);

  const howTo = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: title,
    description: lead,
    totalTime: 'PT1M',
    step: [
      { '@type': 'HowToStep', position: 1, name: cta || title, text: lead },
      ...sections.map((section, index) => ({ '@type': 'HowToStep', position: index + 2, ...section })),
    ],
  };
  output = output.replace(
    /(<script type="application\/ld\+json">)\s*\{\s*"@context":\s*"https:\/\/schema\.org",\s*"@type":\s*"HowTo"[\s\S]*?(<\/script>)/i,
    `$1\n${JSON.stringify(howTo, null, 2)}\n    $2`,
  );
  return output;
}

const EAN13_TOOL_CONTENT = {
  en: { title: 'Create an EAN-13 barcode now', label: '12 or 13 digits', hint: 'Enter 12 digits to calculate the check digit automatically, or enter a complete 13-digit EAN.', generate: 'Generate', svg: 'Download SVG', png: 'Download PNG', full: 'Open advanced generator', invalid: 'Enter exactly 12 or 13 digits.', checksum: 'The check digit is incorrect. Expected: {digit}.', ready: 'Valid EAN-13: {value}' },
  pl: { title: 'Utwórz kod EAN-13 teraz', label: '12 lub 13 cyfr', hint: 'Wpisz 12 cyfr, aby automatycznie obliczyć cyfrę kontrolną, albo pełny 13-cyfrowy kod EAN.', generate: 'Generuj', svg: 'Pobierz SVG', png: 'Pobierz PNG', full: 'Otwórz generator zaawansowany', invalid: 'Wpisz dokładnie 12 lub 13 cyfr.', checksum: 'Cyfra kontrolna jest nieprawidłowa. Oczekiwana: {digit}.', ready: 'Poprawny EAN-13: {value}' },
  de: { title: 'EAN-13-Barcode jetzt erstellen', label: '12 oder 13 Ziffern', hint: 'Geben Sie 12 Ziffern ein, um die Prüfziffer automatisch zu berechnen, oder einen vollständigen 13-stelligen EAN.', generate: 'Erstellen', svg: 'SVG herunterladen', png: 'PNG herunterladen', full: 'Erweiterten Generator öffnen', invalid: 'Geben Sie genau 12 oder 13 Ziffern ein.', checksum: 'Die Prüfziffer ist falsch. Erwartet: {digit}.', ready: 'Gültige EAN-13: {value}' },
  fr: { title: 'Créer un code EAN-13 maintenant', label: '12 ou 13 chiffres', hint: 'Saisissez 12 chiffres pour calculer automatiquement la clé de contrôle, ou un EAN complet à 13 chiffres.', generate: 'Générer', svg: 'Télécharger SVG', png: 'Télécharger PNG', full: 'Ouvrir le générateur avancé', invalid: 'Saisissez exactement 12 ou 13 chiffres.', checksum: 'La clé de contrôle est incorrecte. Valeur attendue : {digit}.', ready: 'EAN-13 valide : {value}' },
  es: { title: 'Crea un código EAN-13 ahora', label: '12 o 13 dígitos', hint: 'Introduce 12 dígitos para calcular automáticamente el dígito de control, o un EAN completo de 13 dígitos.', generate: 'Generar', svg: 'Descargar SVG', png: 'Descargar PNG', full: 'Abrir el generador avanzado', invalid: 'Introduce exactamente 12 o 13 dígitos.', checksum: 'El dígito de control es incorrecto. Se esperaba: {digit}.', ready: 'EAN-13 válido: {value}' },
  it: { title: 'Crea subito un codice EAN-13', label: '12 o 13 cifre', hint: 'Inserisci 12 cifre per calcolare automaticamente la cifra di controllo, oppure un EAN completo di 13 cifre.', generate: 'Genera', svg: 'Scarica SVG', png: 'Scarica PNG', full: 'Apri il generatore avanzato', invalid: 'Inserisci esattamente 12 o 13 cifre.', checksum: 'La cifra di controllo non è corretta. Valore atteso: {digit}.', ready: 'EAN-13 valido: {value}' },
  pt: { title: 'Crie um código EAN-13 agora', label: '12 ou 13 dígitos', hint: 'Digite 12 dígitos para calcular automaticamente o dígito de verificação, ou um EAN completo de 13 dígitos.', generate: 'Gerar', svg: 'Baixar SVG', png: 'Baixar PNG', full: 'Abrir gerador avançado', invalid: 'Digite exatamente 12 ou 13 dígitos.', checksum: 'O dígito de verificação está incorreto. Esperado: {digit}.', ready: 'EAN-13 válido: {value}' },
  nl: { title: 'Maak nu een EAN-13-barcode', label: '12 of 13 cijfers', hint: 'Voer 12 cijfers in om het controlecijfer automatisch te berekenen, of een volledige EAN van 13 cijfers.', generate: 'Genereren', svg: 'SVG downloaden', png: 'PNG downloaden', full: 'Geavanceerde generator openen', invalid: 'Voer precies 12 of 13 cijfers in.', checksum: 'Het controlecijfer is onjuist. Verwacht: {digit}.', ready: 'Geldige EAN-13: {value}' },
  cs: { title: 'Vytvořte kód EAN-13 hned', label: '12 nebo 13 číslic', hint: 'Zadejte 12 číslic pro automatický výpočet kontrolní číslice nebo celý 13místný kód EAN.', generate: 'Vygenerovat', svg: 'Stáhnout SVG', png: 'Stáhnout PNG', full: 'Otevřít pokročilý generátor', invalid: 'Zadejte přesně 12 nebo 13 číslic.', checksum: 'Kontrolní číslice není správná. Očekáváno: {digit}.', ready: 'Platný EAN-13: {value}' },
  uk: { title: 'Створіть штрихкод EAN-13 зараз', label: '12 або 13 цифр', hint: 'Введіть 12 цифр для автоматичного обчислення контрольної цифри або повний 13-значний EAN.', generate: 'Створити', svg: 'Завантажити SVG', png: 'Завантажити PNG', full: 'Відкрити розширений генератор', invalid: 'Введіть рівно 12 або 13 цифр.', checksum: 'Контрольна цифра неправильна. Очікується: {digit}.', ready: 'Дійсний EAN-13: {value}' },
};

function addEan13Tool(html, lang) {
  const t = EAN13_TOOL_CONTENT[lang] || EAN13_TOOL_CONTENT.en;
  const advancedRoute = routeFor(lang);
  const tool = `
            <section class="ean13-tool" id="ean13-tool" aria-labelledby="ean13-tool-title"
                data-invalid="${t.invalid}" data-checksum="${t.checksum}" data-ready="${t.ready}">
                <div class="ean13-tool__intro">
                    <h2 id="ean13-tool-title">${t.title}</h2>
                    <p>${t.hint}</p>
                </div>
                <form class="ean13-tool__form" novalidate>
                    <label for="ean13-inline-value">${t.label}</label>
                    <div class="ean13-tool__input-row">
                        <input id="ean13-inline-value" name="ean13" value="590123412345" inputmode="numeric" autocomplete="off" pattern="[0-9]{12,13}" maxlength="13" aria-describedby="ean13-inline-hint ean13-inline-status">
                        <button type="submit">${t.generate}</button>
                    </div>
                    <span id="ean13-inline-hint" class="ean13-tool__hint">${t.hint}</span>
                </form>
                <div class="ean13-tool__result">
                    <div class="ean13-tool__preview"><svg id="ean13-inline-barcode" role="img" aria-label="EAN-13"></svg></div>
                    <p id="ean13-inline-status" class="ean13-tool__status" role="status" aria-live="polite"></p>
                    <div class="ean13-tool__actions">
                        <button type="button" data-download="svg">${t.svg}</button>
                        <button type="button" data-download="png">${t.png}</button>
                        <a href="${advancedRoute}?type=ean13" data-advanced-link>${t.full}</a>
                    </div>
                </div>
            </section>`;
  return html
    .replace(/(<link rel="stylesheet" href="[^"]*styles\.css[^>]*>)/i, `$1\n    <link rel="stylesheet" href="/ean13-inline.css?v=${ASSET_VERSIONS.get('ean13-inline.css')}">`)
    .replace(/<a href="[^"]*\?type=ean13" class="landing__cta" data-cta="hero">/i, '<a href="#ean13-tool" class="landing__cta" data-cta="hero">')
    .replace(/(<section class="landing__hero">[\s\S]*?<\/section>)/i, `$1\n${tool}`)
    .replace('</body>', `    <script defer src="/vendor/jsbarcode.min.js"></script>\n    <script defer src="/ean13-inline.js?v=${ASSET_VERSIONS.get('ean13-inline.js')}"></script>\n</body>`);
}

const FORMAT_TOOL_CONFIG = {
  'code-128': { name: 'Code 128', jsFormat: 'CODE128', appType: 'code128', example: 'ORDER-2026-001', inputMode: 'text', maxLength: 80 },
  'upc-a': { name: 'UPC-A', jsFormat: 'UPC', appType: 'upc', example: '03600029145', inputMode: 'numeric', maxLength: 12 },
  'code-39': { name: 'Code 39', jsFormat: 'CODE39', appType: 'code39', example: 'PRODUCT-2026', inputMode: 'text', maxLength: 48 },
  'itf-14': { name: 'ITF-14', jsFormat: 'ITF14', appType: 'itf14', example: '1001234500001', inputMode: 'numeric', maxLength: 14 },
  codabar: { name: 'Codabar', jsFormat: 'codabar', appType: 'codabar', example: 'A123456B', inputMode: 'text', maxLength: 48 },
  'qr-code': {
    name: 'QR Code',
    jsFormat: 'QR',
    appType: 'qr',
    example: 'https://daytodayapps.com/',
    inputMode: 'text',
    maxLength: 1000,
    multiline: true,
    titles: {
      en: 'Create a QR code now',
      pl: 'Utwórz kod QR teraz',
      de: 'QR-Code jetzt erstellen',
      fr: 'Créer un QR code maintenant',
      es: 'Crea un código QR ahora',
      it: 'Crea subito un codice QR',
      pt: 'Crie um código QR agora',
      nl: 'Maak nu een QR-code',
      cs: 'Vytvořte QR kód hned',
      uk: 'Створіть QR-код зараз',
    },
  },
};

const FORMAT_TOOL_CONTENT = {
  en: { title: 'Create a {format} barcode now', label: 'Barcode value', hint: 'Enter a value compatible with {format}. It is validated locally before export.', generate: 'Generate', svg: 'Download SVG', png: 'Download PNG', full: 'Open advanced generator', invalid: 'Enter a valid value for {format}.', checksum: 'The check digit is incorrect. Expected: {digit}.', ready: 'Valid {format}: {value}' },
  pl: { title: 'Utwórz kod {format} teraz', label: 'Wartość kodu', hint: 'Wpisz wartość zgodną z {format}. Dane są sprawdzane lokalnie przed eksportem.', generate: 'Generuj', svg: 'Pobierz SVG', png: 'Pobierz PNG', full: 'Otwórz generator zaawansowany', invalid: 'Wpisz wartość poprawną dla {format}.', checksum: 'Cyfra kontrolna jest nieprawidłowa. Oczekiwana: {digit}.', ready: 'Poprawny {format}: {value}' },
  de: { title: '{format}-Barcode jetzt erstellen', label: 'Barcode-Wert', hint: 'Geben Sie einen mit {format} kompatiblen Wert ein. Er wird vor dem Export lokal geprüft.', generate: 'Erstellen', svg: 'SVG herunterladen', png: 'PNG herunterladen', full: 'Erweiterten Generator öffnen', invalid: 'Geben Sie einen gültigen Wert für {format} ein.', checksum: 'Die Prüfziffer ist falsch. Erwartet: {digit}.', ready: 'Gültiger {format}: {value}' },
  fr: { title: 'Créer un code {format} maintenant', label: 'Valeur du code', hint: 'Saisissez une valeur compatible avec {format}. Elle est validée localement avant l’export.', generate: 'Générer', svg: 'Télécharger SVG', png: 'Télécharger PNG', full: 'Ouvrir le générateur avancé', invalid: 'Saisissez une valeur valide pour {format}.', checksum: 'La clé de contrôle est incorrecte. Valeur attendue : {digit}.', ready: '{format} valide : {value}' },
  es: { title: 'Crea un código {format} ahora', label: 'Valor del código', hint: 'Introduce un valor compatible con {format}. Se valida localmente antes de exportarlo.', generate: 'Generar', svg: 'Descargar SVG', png: 'Descargar PNG', full: 'Abrir el generador avanzado', invalid: 'Introduce un valor válido para {format}.', checksum: 'El dígito de control es incorrecto. Se esperaba: {digit}.', ready: '{format} válido: {value}' },
  it: { title: 'Crea subito un codice {format}', label: 'Valore del codice', hint: 'Inserisci un valore compatibile con {format}. Viene verificato localmente prima dell’esportazione.', generate: 'Genera', svg: 'Scarica SVG', png: 'Scarica PNG', full: 'Apri il generatore avanzato', invalid: 'Inserisci un valore valido per {format}.', checksum: 'La cifra di controllo non è corretta. Valore atteso: {digit}.', ready: '{format} valido: {value}' },
  pt: { title: 'Crie um código {format} agora', label: 'Valor do código', hint: 'Digite um valor compatível com {format}. Ele é validado localmente antes da exportação.', generate: 'Gerar', svg: 'Baixar SVG', png: 'Baixar PNG', full: 'Abrir gerador avançado', invalid: 'Digite um valor válido para {format}.', checksum: 'O dígito de verificação está incorreto. Esperado: {digit}.', ready: '{format} válido: {value}' },
  nl: { title: 'Maak nu een {format}-barcode', label: 'Barcodewaarde', hint: 'Voer een waarde in die geschikt is voor {format}. Deze wordt lokaal gecontroleerd voor export.', generate: 'Genereren', svg: 'SVG downloaden', png: 'PNG downloaden', full: 'Geavanceerde generator openen', invalid: 'Voer een geldige waarde voor {format} in.', checksum: 'Het controlecijfer is onjuist. Verwacht: {digit}.', ready: 'Geldige {format}: {value}' },
  cs: { title: 'Vytvořte kód {format} hned', label: 'Hodnota kódu', hint: 'Zadejte hodnotu kompatibilní s {format}. Před exportem se ověří přímo v prohlížeči.', generate: 'Vygenerovat', svg: 'Stáhnout SVG', png: 'Stáhnout PNG', full: 'Otevřít pokročilý generátor', invalid: 'Zadejte platnou hodnotu pro {format}.', checksum: 'Kontrolní číslice není správná. Očekáváno: {digit}.', ready: 'Platný {format}: {value}' },
  uk: { title: 'Створіть штрихкод {format} зараз', label: 'Значення коду', hint: 'Введіть значення, сумісне з {format}. Воно перевіряється локально перед експортом.', generate: 'Створити', svg: 'Завантажити SVG', png: 'Завантажити PNG', full: 'Відкрити розширений генератор', invalid: 'Введіть дійсне значення для {format}.', checksum: 'Контрольна цифра неправильна. Очікується: {digit}.', ready: 'Дійсний {format}: {value}' },
};

const FORMAT_NAV_CONTENT = {
  en: ['Generator', 'Scanner', 'CSV batch'], pl: ['Generator', 'Skaner', 'Kody z CSV'],
  de: ['Generator', 'Scanner', 'CSV-Stapel'], fr: ['Générateur', 'Scanner', 'Lot CSV'],
  es: ['Generador', 'Escáner', 'Lote CSV'], it: ['Generatore', 'Scanner', 'Lotto CSV'],
  pt: ['Gerador', 'Scanner', 'Lote CSV'], nl: ['Generator', 'Scanner', 'CSV-batch'],
  cs: ['Generátor', 'Skener', 'Dávka CSV'], uk: ['Генератор', 'Сканер', 'Пакет CSV'],
};

const QR_OPTION_CONTENT = {
  en: ['Error correction', 'L - 7%', 'M - 15% (recommended)', 'Q - 25%', 'H - 30%'],
  pl: ['Korekcja błędów', 'L - 7%', 'M - 15% (zalecane)', 'Q - 25%', 'H - 30%'],
  de: ['Fehlerkorrektur', 'L - 7%', 'M - 15% (empfohlen)', 'Q - 25%', 'H - 30%'],
  fr: ['Correction des erreurs', 'L - 7 %', 'M - 15 % (recommandé)', 'Q - 25 %', 'H - 30 %'],
  es: ['Corrección de errores', 'L - 7%', 'M - 15% (recomendado)', 'Q - 25%', 'H - 30%'],
  it: ['Correzione degli errori', 'L - 7%', 'M - 15% (consigliato)', 'Q - 25%', 'H - 30%'],
  pt: ['Correção de erros', 'L - 7%', 'M - 15% (recomendado)', 'Q - 25%', 'H - 30%'],
  nl: ['Foutcorrectie', 'L - 7%', 'M - 15% (aanbevolen)', 'Q - 25%', 'H - 30%'],
  cs: ['Oprava chyb', 'L - 7%', 'M - 15% (doporučeno)', 'Q - 25%', 'H - 30%'],
  uk: ['Корекція помилок', 'L - 7%', 'M - 15% (рекомендовано)', 'Q - 25%', 'H - 30%'],
};

function addFormatTool(html, lang, format) {
  const config = FORMAT_TOOL_CONFIG[format];
  const content = FORMAT_TOOL_CONTENT[lang] || FORMAT_TOOL_CONTENT.en;
  const formatName = config.name;
  const t = Object.fromEntries(Object.entries(content).map(([key, value]) => [key, value.replaceAll('{format}', formatName)]));
  if (config.titles?.[lang]) t.title = config.titles[lang];
  const advancedRoute = routeFor(lang);
  const [generatorLabel, scannerLabel, bulkLabel] = FORMAT_NAV_CONTENT[lang] || FORMAT_NAV_CONTENT.en;
  const bulkRoute = lang === 'pl' ? '/pl/generator-kodow-z-csv' : '/bulk-barcode-generator';
  const valueControl = config.multiline
    ? `<textarea id="format-inline-value" name="barcode-value" rows="4" inputmode="${config.inputMode}" autocomplete="off" maxlength="${config.maxLength}" aria-describedby="format-inline-hint format-inline-status">${config.example}</textarea>`
    : `<input id="format-inline-value" name="barcode-value" value="${config.example}" inputmode="${config.inputMode}" autocomplete="off" maxlength="${config.maxLength}" aria-describedby="format-inline-hint format-inline-status">`;
  const qrOptions = config.jsFormat === 'QR' ? QR_OPTION_CONTENT[lang] || QR_OPTION_CONTENT.en : null;
  const optionControl = qrOptions ? `<div class="format-tool__option"><label for="format-inline-ecc">${qrOptions[0]}</label><select id="format-inline-ecc" name="error-correction"><option value="L">${qrOptions[1]}</option><option value="M" selected>${qrOptions[2]}</option><option value="Q">${qrOptions[3]}</option><option value="H">${qrOptions[4]}</option></select></div>` : '';
  const header = `
    <header class="format-page-header">
        <div class="format-page-header__identity">
            <a class="format-page-header__brand" href="${advancedRoute}" aria-label="Barcode Generator">
                <span class="format-page-header__mark" aria-hidden="true">▥</span>
                <span>Barcode Generator</span>
            </a>
            <a class="format-page-header__publisher" href="https://daytodayapps.com/">by Day to Day Apps</a>
        </div>
        <nav class="format-page-header__nav" aria-label="${generatorLabel}">
            <a href="${advancedRoute}">${generatorLabel}</a>
            <a href="${routeFor(lang, 'decoder')}">${scannerLabel}</a>
            <a href="${bulkRoute}">${bulkLabel}</a>
        </nav>
    </header>`;
  const tool = `
        <section class="format-tool" id="format-tool" aria-labelledby="format-tool-title"
            data-format="${config.jsFormat}" data-type="${config.appType}" data-name="${formatName}"
            data-invalid="${t.invalid}" data-checksum="${t.checksum}" data-ready="${t.ready}">
            <div class="format-tool__intro">
                <h2 id="format-tool-title">${t.title}</h2>
                <p>${t.hint}</p>
            </div>
            <form class="format-tool__form" novalidate>
                <label for="format-inline-value">${t.label}</label>
                <div class="format-tool__input-row">
                    ${valueControl}
                    <button type="submit">${t.generate}</button>
                </div>
                <span id="format-inline-hint" class="format-tool__hint">${t.hint}</span>
                ${optionControl}
            </form>
            <div class="format-tool__result">
                <div class="format-tool__preview"><svg id="format-inline-barcode" role="img" aria-label="${formatName}"></svg></div>
                <p id="format-inline-status" class="format-tool__status" role="status" aria-live="polite"></p>
                <div class="format-tool__actions">
                    <button type="button" data-download="svg">${t.svg}</button>
                    <button type="button" data-download="png">${t.png}</button>
                    <a href="${advancedRoute}?type=${config.appType}" data-advanced-link>${t.full}</a>
                </div>
            </div>
        </section>`;
  return html
    .replace(/(<link rel="stylesheet" href="[^"]*styles\.css[^>]*>)/i, `$1\n    <link rel="stylesheet" href="/format-inline.css?v=${ASSET_VERSIONS.get('format-inline.css')}">`)
    .replace(/(<body[^>]*>)/i, `$1\n${header}`)
    .replace(/<a class="landing__cta" href="[^"]*">/i, '<a class="landing__cta" href="#format-tool">')
    .replace(/(\s*<section class="landing__section)/i, `\n${tool}\n$1`)
    .replace('</body>', `    <script defer src="/vendor/${config.jsFormat === 'QR' ? 'qrcode-generator.js' : 'jsbarcode.min.js'}"></script>\n    <script defer src="/format-inline.js?v=${ASSET_VERSIONS.get('format-inline.js')}"></script>\n</body>`);
}

const DECODER_CONTENT = {
  en: {
    title: 'Barcode Scanner Online - Scan Images & Camera Free',
    description: 'Scan barcodes online from a photo, image or camera. Read EAN, UPC, Code 128, QR, Data Matrix and PDF417 privately in your browser.',
    kicker: 'Free online barcode reader', heading: 'Scan a barcode from an image or camera',
    lead: 'Use the scanner above to read a barcode without installing an app. Choose a photo, paste an image from the clipboard or open the camera. Decoding happens locally on your device.',
    how: 'How to scan a barcode online',
    steps: ['Choose Scan with camera, upload a JPG, PNG or WebP image, or paste an image with Ctrl+V.', 'Keep the complete barcode sharp, well lit and inside the frame. Avoid glare across the bars or code modules.', 'Copy the decoded value or open it in the generator when you need to recreate and print the barcode.'],
    formats: 'Supported barcode formats', formatText: 'The reader detects common retail, logistics and 2D symbols automatically. You do not need to select the format before scanning.',
    groups: [['Retail', 'EAN-13, EAN-8, UPC-A, UPC-E'], ['Logistics and inventory', 'Code 128, Code 39, ITF, Codabar, RSS'], ['2D codes', 'QR Code, Data Matrix, PDF417, Aztec'], ['Other formats', 'Code 93, MaxiCode and supported ZXing variants']],
    troubleshoot: 'If the barcode cannot be read', tips: ['Crop the image so the barcode occupies more of the frame.', 'Use the original photo instead of a compressed screenshot.', 'Photograph the label straight on and remove reflections or motion blur.', 'Keep the blank quiet zone on both sides of a linear barcode visible.'],
    privacy: 'Private barcode scanning', privacyText: 'Images are processed in your browser and are not uploaded to our server. After the scanner has loaded once, its core image-reading functions can also work offline.',
    related: 'Create or validate a barcode', links: [['Open the barcode generator', '/'], ['Generate barcodes from CSV', '/bulk-barcode-generator'], ['Validate GTIN and GS1 data', '/gs1-barcode-generator'], ['Read the GTIN, EAN and UPC guide', '/guides/gtin-ean-upc']],
  },
  pl: {
    title: 'Skaner kodów kreskowych online - obraz i kamera',
    description: 'Skanuj kody kreskowe online ze zdjęcia, obrazu lub kamery. Odczytuj EAN, UPC, Code 128, QR, Data Matrix i PDF417 prywatnie w przeglądarce.',
    kicker: 'Darmowy czytnik kodów online', heading: 'Skanuj kod kreskowy z obrazu lub kamery',
    lead: 'Użyj skanera powyżej bez instalowania aplikacji. Wybierz zdjęcie, wklej obraz ze schowka albo uruchom kamerę. Odczyt odbywa się lokalnie na Twoim urządzeniu.',
    how: 'Jak zeskanować kod kreskowy online',
    steps: ['Wybierz Skanuj kamerą, prześlij obraz JPG, PNG lub WebP albo wklej go skrótem Ctrl+V.', 'Umieść cały, ostry i dobrze oświetlony kod w kadrze. Unikaj odblasków na kreskach lub modułach.', 'Skopiuj odczytaną wartość albo otwórz ją w generatorze, aby ponownie utworzyć i wydrukować kod.'],
    formats: 'Obsługiwane formaty kodów', formatText: 'Czytnik automatycznie rozpoznaje popularne symbole detaliczne, logistyczne i 2D. Nie musisz wybierać formatu przed skanowaniem.',
    groups: [['Sprzedaż detaliczna', 'EAN-13, EAN-8, UPC-A, UPC-E'], ['Logistyka i magazyn', 'Code 128, Code 39, ITF, Codabar, RSS'], ['Kody 2D', 'QR Code, Data Matrix, PDF417, Aztec'], ['Pozostałe formaty', 'Code 93, MaxiCode i obsługiwane warianty ZXing']],
    troubleshoot: 'Gdy kod nie może zostać odczytany', tips: ['Przytnij obraz tak, aby kod zajmował większą część kadru.', 'Użyj oryginalnego zdjęcia zamiast skompresowanego zrzutu ekranu.', 'Fotografuj etykietę na wprost i usuń odblaski oraz rozmycie ruchu.', 'Pozostaw widoczne jasne pole ochronne po obu stronach kodu liniowego.'],
    privacy: 'Prywatne skanowanie kodów', privacyText: 'Obrazy są przetwarzane w przeglądarce i nie trafiają na nasz serwer. Po pierwszym załadowaniu skanera podstawowe odczytywanie obrazów może działać także offline.',
    related: 'Utwórz lub sprawdź kod', links: [['Otwórz generator kodów', '/pl/'], ['Generuj kody z CSV', '/pl/generator-kodow-z-csv'], ['Sprawdź dane GTIN i GS1', '/pl/generator-kodow-gs1'], ['Przeczytaj poradnik GTIN, EAN i UPC', '/pl/poradniki/gtin-ean-upc']],
  },
  de: { title: 'Barcode Scanner Online - Bild oder Kamera kostenlos', description: 'Barcodes online aus Foto, Bild oder Kamera scannen. EAN, UPC, Code 128, QR, Data Matrix und PDF417 privat im Browser lesen.', kicker: 'Kostenloser Online-Barcode-Leser', heading: 'Barcode aus Bild oder Kamera scannen', lead: 'Lesen Sie Barcodes ohne App-Installation. Laden Sie ein Bild hoch, fügen Sie es aus der Zwischenablage ein oder öffnen Sie die Kamera. Die Verarbeitung erfolgt lokal.', how: 'Barcode online scannen', steps: ['Kamera öffnen, JPG-, PNG- oder WebP-Bild hochladen oder mit Strg+V einfügen.', 'Den vollständigen Barcode scharf, gut beleuchtet und ohne Reflexionen im Bild zeigen.', 'Den gelesenen Wert kopieren oder im Generator neu erstellen.'], formats: 'Unterstützte Barcode-Formate', formatText: 'Der Leser erkennt gängige Handels-, Logistik- und 2D-Symbole automatisch.', groups: [['Handel', 'EAN-13, EAN-8, UPC-A, UPC-E'], ['Logistik', 'Code 128, Code 39, ITF, Codabar, RSS'], ['2D-Codes', 'QR Code, Data Matrix, PDF417, Aztec'], ['Weitere', 'Code 93, MaxiCode und ZXing-Varianten']], troubleshoot: 'Wenn der Barcode nicht erkannt wird', tips: ['Bild eng um den Barcode zuschneiden.', 'Originalfoto statt komprimiertem Screenshot verwenden.', 'Etikett gerade und ohne Bewegungsunschärfe fotografieren.', 'Helle Ruhezonen neben linearen Barcodes sichtbar lassen.'], privacy: 'Privates Scannen', privacyText: 'Bilder werden lokal im Browser verarbeitet und nicht auf unseren Server hochgeladen. Kernfunktionen arbeiten nach dem ersten Laden auch offline.', related: 'Barcode erstellen oder prüfen', links: [['Barcode-Generator öffnen', '/de/'], ['Barcodes aus CSV erstellen', '/bulk-barcode-generator'], ['GTIN und GS1 prüfen', '/gs1-barcode-generator']] },
  fr: { title: 'Scanner de code-barres en ligne - image et caméra', description: 'Scannez un code-barres depuis une photo, une image ou la caméra. Lisez EAN, UPC, Code 128, QR, Data Matrix et PDF417 dans votre navigateur.', kicker: 'Lecteur de codes-barres gratuit', heading: 'Scanner un code-barres depuis une image ou la caméra', lead: "Lisez un code sans installer d'application. Importez une image, collez-la depuis le presse-papiers ou ouvrez la caméra. Le traitement reste sur votre appareil.", how: 'Comment scanner un code-barres en ligne', steps: ['Ouvrez la caméra, importez une image JPG, PNG ou WebP, ou collez-la avec Ctrl+V.', 'Cadrez le code entier, net, bien éclairé et sans reflet.', 'Copiez la valeur lue ou recréez le code dans le générateur.'], formats: 'Formats pris en charge', formatText: 'Le lecteur reconnaît automatiquement les principaux symboles de vente, logistique et 2D.', groups: [['Commerce', 'EAN-13, EAN-8, UPC-A, UPC-E'], ['Logistique', 'Code 128, Code 39, ITF, Codabar, RSS'], ['Codes 2D', 'QR Code, Data Matrix, PDF417, Aztec'], ['Autres', 'Code 93, MaxiCode et variantes ZXing']], troubleshoot: "Si le code n'est pas détecté", tips: ["Recadrez l'image autour du code.", "Utilisez la photo originale plutôt qu'une capture compressée.", "Photographiez l'étiquette de face, sans reflet ni flou.", 'Conservez les zones claires de chaque côté du code linéaire.'], privacy: 'Lecture privée', privacyText: "Les images sont traitées dans le navigateur et ne sont pas envoyées à notre serveur. Les fonctions principales peuvent fonctionner hors connexion après le premier chargement.", related: 'Créer ou vérifier un code', links: [['Ouvrir le générateur', '/fr/'], ['Créer depuis un CSV', '/bulk-barcode-generator'], ['Vérifier GTIN et GS1', '/gs1-barcode-generator']] },
  es: { title: 'Lector de códigos de barras online - imagen y cámara', description: 'Escanea códigos de barras desde una foto, imagen o cámara. Lee EAN, UPC, Code 128, QR, Data Matrix y PDF417 de forma privada.', kicker: 'Lector de códigos gratuito', heading: 'Escanear un código desde una imagen o cámara', lead: 'Lee códigos sin instalar una aplicación. Sube una imagen, pégala desde el portapapeles o abre la cámara. El procesamiento se realiza en tu dispositivo.', how: 'Cómo escanear un código online', steps: ['Abre la cámara, sube un JPG, PNG o WebP, o pega la imagen con Ctrl+V.', 'Muestra el código completo, enfocado, bien iluminado y sin reflejos.', 'Copia el valor leído o vuelve a crear el código en el generador.'], formats: 'Formatos compatibles', formatText: 'El lector detecta automáticamente símbolos comerciales, logísticos y 2D habituales.', groups: [['Comercio', 'EAN-13, EAN-8, UPC-A, UPC-E'], ['Logística', 'Code 128, Code 39, ITF, Codabar, RSS'], ['Códigos 2D', 'QR Code, Data Matrix, PDF417, Aztec'], ['Otros', 'Code 93, MaxiCode y variantes ZXing']], troubleshoot: 'Si no se puede leer el código', tips: ['Recorta la imagen alrededor del código.', 'Usa la foto original en vez de una captura comprimida.', 'Fotografía la etiqueta de frente y sin desenfoque.', 'Mantén visibles las zonas claras laterales del código lineal.'], privacy: 'Escaneo privado', privacyText: 'Las imágenes se procesan en el navegador y no se suben a nuestro servidor. Las funciones principales pueden trabajar sin conexión tras la primera carga.', related: 'Crear o validar un código', links: [['Abrir el generador', '/es/'], ['Generar desde CSV', '/bulk-barcode-generator'], ['Validar GTIN y GS1', '/gs1-barcode-generator']] },
  it: { title: 'Lettore codici a barre online - immagine e fotocamera', description: 'Scansiona codici a barre da foto, immagine o fotocamera. Leggi EAN, UPC, Code 128, QR, Data Matrix e PDF417 privatamente nel browser.', kicker: 'Lettore di codici gratuito', heading: 'Scansiona un codice da immagine o fotocamera', lead: "Leggi un codice senza installare un'app. Carica un'immagine, incollala dagli appunti o apri la fotocamera. L'elaborazione avviene sul dispositivo.", how: 'Come scansionare un codice online', steps: ['Apri la fotocamera, carica un JPG, PNG o WebP oppure incolla con Ctrl+V.', 'Inquadra il codice intero, nitido, ben illuminato e senza riflessi.', 'Copia il valore letto o ricrea il codice nel generatore.'], formats: 'Formati supportati', formatText: 'Il lettore rileva automaticamente i comuni simboli retail, logistici e 2D.', groups: [['Vendita', 'EAN-13, EAN-8, UPC-A, UPC-E'], ['Logistica', 'Code 128, Code 39, ITF, Codabar, RSS'], ['Codici 2D', 'QR Code, Data Matrix, PDF417, Aztec'], ['Altri', 'Code 93, MaxiCode e varianti ZXing']], troubleshoot: 'Se il codice non viene letto', tips: ["Ritaglia l'immagine attorno al codice.", 'Usa la foto originale invece di uno screenshot compresso.', "Fotografa l'etichetta frontalmente e senza sfocature.", 'Mantieni visibili le zone chiare ai lati del codice lineare.'], privacy: 'Scansione privata', privacyText: 'Le immagini sono elaborate nel browser e non vengono caricate sul server. Le funzioni principali possono lavorare offline dopo il primo caricamento.', related: 'Crea o verifica un codice', links: [['Apri il generatore', '/it/'], ['Genera da CSV', '/bulk-barcode-generator'], ['Verifica GTIN e GS1', '/gs1-barcode-generator']] },
  pt: { title: 'Leitor de código de barras online - imagem e câmera', description: 'Leia códigos de barras de foto, imagem ou câmera. Reconheça EAN, UPC, Code 128, QR, Data Matrix e PDF417 com privacidade no navegador.', kicker: 'Leitor de códigos gratuito', heading: 'Leia um código de uma imagem ou câmera', lead: 'Leia códigos sem instalar um aplicativo. Envie uma imagem, cole da área de transferência ou abra a câmera. O processamento ocorre no seu dispositivo.', how: 'Como ler um código online', steps: ['Abra a câmera, envie JPG, PNG ou WebP ou cole com Ctrl+V.', 'Mantenha o código inteiro, nítido, bem iluminado e sem reflexos.', 'Copie o valor lido ou recrie o código no gerador.'], formats: 'Formatos compatíveis', formatText: 'O leitor detecta automaticamente símbolos comuns de varejo, logística e 2D.', groups: [['Varejo', 'EAN-13, EAN-8, UPC-A, UPC-E'], ['Logística', 'Code 128, Code 39, ITF, Codabar, RSS'], ['Códigos 2D', 'QR Code, Data Matrix, PDF417, Aztec'], ['Outros', 'Code 93, MaxiCode e variantes ZXing']], troubleshoot: 'Se o código não for lido', tips: ['Recorte a imagem ao redor do código.', 'Use a foto original em vez de uma captura comprimida.', 'Fotografe a etiqueta de frente e sem desfoque.', 'Mantenha visíveis as zonas claras laterais do código linear.'], privacy: 'Leitura privada', privacyText: 'As imagens são processadas no navegador e não são enviadas ao servidor. As funções principais podem operar offline após o primeiro carregamento.', related: 'Crie ou valide um código', links: [['Abrir o gerador', '/pt/'], ['Gerar a partir de CSV', '/bulk-barcode-generator'], ['Validar GTIN e GS1', '/gs1-barcode-generator']] },
  nl: { title: 'Barcode scanner online - afbeelding en camera gratis', description: 'Scan barcodes uit een foto, afbeelding of camera. Lees EAN, UPC, Code 128, QR, Data Matrix en PDF417 privé in je browser.', kicker: 'Gratis online barcodelezer', heading: 'Scan een barcode uit een afbeelding of camera', lead: 'Lees een barcode zonder app te installeren. Upload of plak een afbeelding of open de camera. De verwerking gebeurt lokaal op je apparaat.', how: 'Een barcode online scannen', steps: ['Open de camera, upload JPG, PNG of WebP of plak met Ctrl+V.', 'Houd de volledige barcode scherp, goed verlicht en zonder reflectie in beeld.', 'Kopieer de gelezen waarde of maak de barcode opnieuw in de generator.'], formats: 'Ondersteunde formaten', formatText: 'De lezer herkent gangbare retail-, logistieke en 2D-symbolen automatisch.', groups: [['Retail', 'EAN-13, EAN-8, UPC-A, UPC-E'], ['Logistiek', 'Code 128, Code 39, ITF, Codabar, RSS'], ['2D-codes', 'QR Code, Data Matrix, PDF417, Aztec'], ['Overig', 'Code 93, MaxiCode en ZXing-varianten']], troubleshoot: 'Als de barcode niet wordt gelezen', tips: ['Snijd de afbeelding dicht rond de barcode bij.', 'Gebruik de originele foto in plaats van een gecomprimeerde screenshot.', 'Fotografeer het etiket recht en zonder bewegingsonscherpte.', 'Laat de lichte zones naast een lineaire barcode zichtbaar.'], privacy: 'Privé scannen', privacyText: 'Afbeeldingen worden in de browser verwerkt en niet naar onze server geüpload. De kernfuncties werken na de eerste keer laden ook offline.', related: 'Maak of controleer een barcode', links: [['Open de generator', '/nl/'], ['Genereer vanuit CSV', '/bulk-barcode-generator'], ['Controleer GTIN en GS1', '/gs1-barcode-generator']] },
  cs: { title: 'Čtečka čárových kódů online - obrázek a kamera', description: 'Skenujte čárové kódy z fotografie, obrázku nebo kamery. Čtěte EAN, UPC, Code 128, QR, Data Matrix a PDF417 soukromě v prohlížeči.', kicker: 'Bezplatná online čtečka kódů', heading: 'Naskenujte kód z obrázku nebo kamery', lead: 'Přečtěte kód bez instalace aplikace. Nahrajte či vložte obrázek nebo otevřete kameru. Zpracování probíhá místně ve vašem zařízení.', how: 'Jak naskenovat kód online', steps: ['Otevřete kameru, nahrajte JPG, PNG či WebP nebo vložte obrázek pomocí Ctrl+V.', 'Zobrazte celý kód ostře, dobře osvětlený a bez odlesků.', 'Zkopírujte přečtenou hodnotu nebo vytvořte kód znovu v generátoru.'], formats: 'Podporované formáty', formatText: 'Čtečka automaticky rozpozná běžné maloobchodní, logistické a 2D symboly.', groups: [['Maloobchod', 'EAN-13, EAN-8, UPC-A, UPC-E'], ['Logistika', 'Code 128, Code 39, ITF, Codabar, RSS'], ['2D kódy', 'QR Code, Data Matrix, PDF417, Aztec'], ['Další', 'Code 93, MaxiCode a varianty ZXing']], troubleshoot: 'Když kód nelze přečíst', tips: ['Ořízněte obrázek těsně kolem kódu.', 'Použijte původní fotografii místo komprimovaného snímku.', 'Foťte štítek zpříma, bez odlesků a rozmazání.', 'Ponechte viditelné světlé zóny po stranách lineárního kódu.'], privacy: 'Soukromé skenování', privacyText: 'Obrázky se zpracovávají v prohlížeči a neodesílají na server. Základní funkce mohou po prvním načtení fungovat offline.', related: 'Vytvořte nebo ověřte kód', links: [['Otevřít generátor', '/cs/'], ['Generovat z CSV', '/bulk-barcode-generator'], ['Ověřit GTIN a GS1', '/gs1-barcode-generator']] },
  uk: { title: 'Сканер штрихкодів онлайн - зображення та камера', description: 'Скануйте штрихкоди з фото, зображення або камери. Розпізнавайте EAN, UPC, Code 128, QR, Data Matrix і PDF417 приватно у браузері.', kicker: 'Безкоштовний онлайн-сканер', heading: 'Скануйте штрихкод із зображення або камери', lead: 'Зчитуйте код без встановлення застосунку. Завантажте чи вставте зображення або відкрийте камеру. Обробка відбувається локально на пристрої.', how: 'Як сканувати штрихкод онлайн', steps: ['Відкрийте камеру, завантажте JPG, PNG чи WebP або вставте зображення через Ctrl+V.', 'Покажіть увесь код чітко, з добрим освітленням і без відблисків.', 'Скопіюйте значення або відтворіть код у генераторі.'], formats: 'Підтримувані формати', formatText: 'Сканер автоматично розпізнає поширені роздрібні, логістичні та 2D-символи.', groups: [['Роздріб', 'EAN-13, EAN-8, UPC-A, UPC-E'], ['Логістика', 'Code 128, Code 39, ITF, Codabar, RSS'], ['2D-коди', 'QR Code, Data Matrix, PDF417, Aztec'], ['Інші', 'Code 93, MaxiCode та варіанти ZXing']], troubleshoot: 'Якщо код не зчитується', tips: ['Обріжте зображення навколо коду.', 'Використайте оригінальне фото замість стисненого знімка.', 'Фотографуйте етикетку прямо, без відблисків і розмиття.', 'Залиште видимими світлі зони з боків лінійного коду.'], privacy: 'Приватне сканування', privacyText: 'Зображення обробляються у браузері й не надсилаються на сервер. Основні функції можуть працювати офлайн після першого завантаження.', related: 'Створіть або перевірте код', links: [['Відкрити генератор', '/uk/'], ['Генерувати з CSV', '/bulk-barcode-generator'], ['Перевірити GTIN і GS1', '/gs1-barcode-generator']] },
};

const DECODER_BATCH_CONTENT = {
  en: ['Find every barcode in this image', 'Use for sheets, cartons or photos with several codes. Processing stays on this device.'],
  pl: ['Znajdź wszystkie kody na tym obrazie', 'Użyj dla arkuszy, kartonów lub zdjęć z kilkoma kodami. Przetwarzanie odbywa się na tym urządzeniu.'],
  de: ['Alle Barcodes in diesem Bild finden', 'Für Bögen, Kartons oder Fotos mit mehreren Codes. Die Verarbeitung erfolgt auf diesem Gerät.'],
  fr: ['Trouver tous les codes-barres de cette image', 'Pour les feuilles, cartons ou photos contenant plusieurs codes. Le traitement reste sur cet appareil.'],
  es: ['Encontrar todos los códigos de esta imagen', 'Para hojas, cajas o fotos con varios códigos. El procesamiento se realiza en este dispositivo.'],
  it: ['Trova tutti i codici a barre nell’immagine', 'Per fogli, scatole o foto con più codici. L’elaborazione avviene su questo dispositivo.'],
  pt: ['Encontrar todos os códigos nesta imagem', 'Use em folhas, caixas ou fotos com vários códigos. O processamento fica neste dispositivo.'],
  nl: ['Alle barcodes in deze afbeelding vinden', 'Voor vellen, dozen of foto’s met meerdere codes. De verwerking blijft op dit apparaat.'],
  cs: ['Najít všechny čárové kódy na obrázku', 'Pro archy, krabice nebo fotografie s více kódy. Zpracování probíhá v tomto zařízení.'],
  uk: ['Знайти всі штрихкоди на цьому зображенні', 'Для аркушів, коробок або фотографій із кількома кодами. Обробка виконується на цьому пристрої.'],
};

function enhanceDecoderHtml(html, lang) {
  const page = DECODER_CONTENT[lang];
  const [batchLabel, batchHint] = DECODER_BATCH_CONTENT[lang];
  const batchOption = `<div class="decoder-batch-option">
                <input type="checkbox" id="batch-image-mode" aria-describedby="batch-image-hint">
                <div><label for="batch-image-mode">${batchLabel}</label><p id="batch-image-hint">${batchHint}</p></div>
            </div>`;
  const guide = `<section class="decoder-guide" aria-labelledby="decoder-guide-title">
    <p class="decoder-guide__kicker">${page.kicker}</p><h2 id="decoder-guide-title">${page.heading}</h2><p class="decoder-guide__lead">${page.lead}</p>
    <div class="decoder-guide__columns"><section><h3>${page.how}</h3><ol>${page.steps.map((step) => `<li>${step}</li>`).join('')}</ol></section><section><h3>${page.formats}</h3><p>${page.formatText}</p><dl class="decoder-format-list">${page.groups.map(([name, formats]) => `<div><dt>${name}</dt><dd>${formats}</dd></div>`).join('')}</dl></section></div>
    <div class="decoder-guide__columns decoder-guide__columns--secondary"><section><h3>${page.troubleshoot}</h3><ul>${page.tips.map((tip) => `<li>${tip}</li>`).join('')}</ul></section><section><h3>${page.privacy}</h3><p>${page.privacyText}</p><h3>${page.related}</h3><nav class="decoder-related" aria-label="${page.related}">${page.links.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</nav></section></div>
  </section>`;
  return html
    .replace(/<title>[^<]*<\/title>/i, `<title>${page.title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(">)/i, `$1${page.description}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(">)/i, `$1${page.title}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(">)/i, `$1${page.description}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(">)/i, `$1${page.title}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(">)/i, `$1${page.description}$2`)
    .replace(/(<label for="file-input" id="drop-area"[\s\S]*?<\/label>)/i, `$1\n            ${batchOption}`)
    .replace(/\s*<footer class="decoder-footer">/i, `\n${guide}\n        <footer class="decoder-footer">`);
}

const TASK_PAGES = [
  {
    en: {
      route: 'avery-label-printing', title: 'Print Barcode Labels on Avery Sheets', description: 'Create precise barcode labels for Avery L7160, L7163, 5160 and 5163 sheets. Validate dimensions and export a print-ready PDF.', h1: 'Print barcode labels on Avery sheets', lead: 'Choose the correct A4 or Letter preset, import product data and generate a PDF that matches the physical label sheet.',
      steps: ['Choose the exact Avery product number', 'Import a CSV or add barcode values', 'Export PDF and print at 100% scale'],
      sections: [
        { title: 'Match the PDF to the physical sheet', paragraphs: ['The product number determines the page size, label dimensions, margins and grid. L7160 and L7163 are A4 products, while 5160 and 5163 use US Letter. Similar names do not make the sheets interchangeable.', 'Select the preset printed on the package instead of estimating dimensions. The generator uses the corresponding geometry and prevents a label grid from extending beyond the selected page.'], table: { headers: ['Avery product', 'Page', 'Label size', 'Sheet layout'], rows: [['L7160', 'A4', '63.5 × 38.1 mm', '3 × 7 (21)'], ['L7163', 'A4', '99.1 × 38.1 mm', '2 × 7 (14)'], ['5160', 'US Letter', '66.675 × 25.4 mm', '3 × 10 (30)'], ['5163', 'US Letter', '101.6 × 50.8 mm', '2 × 5 (10)']] } },
        { title: 'Prepare data and readable symbols', paragraphs: ['Import a CSV with the barcode value, type, product name and number of copies. Use EAN-13 or UPC-A only for valid assigned retail identifiers; Code 128 is usually more flexible for internal references.', 'Keep the value short enough for the available label width. Do not stretch the rendered symbol to fill the cell, and leave the light quiet zones on both sides unobstructed by text, borders or logos.'] },
        { title: 'Test one sheet before a full run', paragraphs: ['Open the PDF in a viewer that can print at actual size. Select 100% scale and disable Fit, Shrink oversized pages and other automatic resizing options. Borderless modes can also shift the printable area.', 'Print the first page on plain paper and place it behind an empty label sheet against a light source. If rows drift progressively, verify the page format and scale. If the whole grid is shifted by a constant amount, use the calibration page and printer offsets.'], bullets: ['Scan labels from the top-left, centre and bottom-right positions.', 'Confirm that text and bars remain inside every label.', 'Store the working preset and printer settings for the next batch.'] },
      ],
      faqs: [['Are Avery 5160 and L7160 the same?', 'No. 5160 uses US Letter with 30 labels; L7160 uses A4 with 21 labels. Their page size, label height and margins are different.'], ['Can I reuse a partially used sheet?', 'Yes, but start the print at the correct unused position and verify the feed direction. Avoid repeatedly passing damaged or lifting labels through a laser printer.'], ['Why do labels drift down the page?', 'Progressive drift usually means the wrong page format or scaling. A constant shift is better corrected with printer calibration offsets.']],
      links: [['Open the bulk generator', '/bulk-barcode-generator'], ['Calibrate your printer', '/kalibracja-druku'], ['EAN-13 guide', '/ean-13/']],
    },
    pl: {
      route: 'drukowanie-etykiet-avery', title: 'Drukowanie kodów na etykietach Avery', description: 'Twórz precyzyjne etykiety z kodami dla arkuszy Avery L7160, L7163, 5160 i 5163. Pobierz gotowy do druku PDF.', h1: 'Drukowanie kodów kreskowych na etykietach Avery', lead: 'Wybierz właściwy format A4 lub Letter, zaimportuj produkty i wygeneruj PDF dopasowany do fizycznego arkusza.',
      steps: ['Wybierz dokładny numer produktu Avery', 'Zaimportuj CSV lub dodaj wartości kodów', 'Pobierz PDF i drukuj w skali 100%'],
      sections: [
        { title: 'Dopasuj PDF do fizycznego arkusza', paragraphs: ['Numer produktu określa format strony, wymiary etykiet, marginesy i układ siatki. L7160 i L7163 są arkuszami A4, natomiast 5160 i 5163 korzystają z formatu US Letter. Podobne nazwy nie oznaczają zgodnych wymiarów.', 'Wybierz preset zgodny z numerem na opakowaniu zamiast ręcznie szacować wymiary. Generator użyje właściwej geometrii i nie pozwoli utworzyć siatki wychodzącej poza wybraną stronę.'], table: { headers: ['Produkt Avery', 'Strona', 'Rozmiar etykiety', 'Układ arkusza'], rows: [['L7160', 'A4', '63,5 × 38,1 mm', '3 × 7 (21)'], ['L7163', 'A4', '99,1 × 38,1 mm', '2 × 7 (14)'], ['5160', 'US Letter', '66,675 × 25,4 mm', '3 × 10 (30)'], ['5163', 'US Letter', '101,6 × 50,8 mm', '2 × 5 (10)']] } },
        { title: 'Przygotuj dane i czytelne symbole', paragraphs: ['Zaimportuj CSV zawierający wartość kodu, typ, nazwę produktu i liczbę kopii. EAN-13 lub UPC-A stosuj wyłącznie dla poprawnych, przydzielonych identyfikatorów detalicznych; Code 128 jest zwykle bardziej elastyczny dla oznaczeń wewnętrznych.', 'Wartość musi mieścić się w dostępnej szerokości. Nie rozciągaj symbolu do krawędzi komórki i pozostaw jasne strefy ciszy po obu stronach, bez tekstu, ramek ani logo.'] },
        { title: 'Sprawdź jeden arkusz przed całą serią', paragraphs: ['Otwórz PDF w programie umożliwiającym druk w rozmiarze rzeczywistym. Ustaw skalę 100% i wyłącz dopasowanie, zmniejszanie dużych stron oraz inne automatyczne przeskalowanie. Tryb bez obramowania także może przesuwać obszar druku.', 'Wydrukuj pierwszą stronę na zwykłym papierze i przyłóż ją pod pusty arkusz etykiet do światła. Narastające przesunięcie kolejnych rzędów oznacza zwykle zły format lub skalę. Stałe przesunięcie całej siatki skoryguj stroną kalibracyjną.'], bullets: ['Zeskanuj etykietę z lewego górnego rogu, środka i prawego dolnego rogu.', 'Sprawdź, czy tekst i kreski pozostają wewnątrz każdej etykiety.', 'Zapisz działający preset i ustawienia drukarki do kolejnej partii.'] },
      ],
      faqs: [['Czy Avery 5160 i L7160 to ten sam format?', 'Nie. 5160 to US Letter z 30 etykietami, a L7160 to A4 z 21 etykietami. Różnią się stroną, wysokością etykiety i marginesami.'], ['Czy można wykorzystać częściowo zużyty arkusz?', 'Tak, ale trzeba rozpocząć wydruk od właściwej wolnej pozycji i sprawdzić kierunek podawania. Nie wkładaj wielokrotnie do drukarki laserowej uszkodzonych lub odklejających się etykiet.'], ['Dlaczego kolejne rzędy coraz bardziej się przesuwają?', 'Narastające przesunięcie wskazuje zwykle zły format strony albo skalowanie. Stałe przesunięcie całego arkusza należy skorygować ustawieniami kalibracji.']],
      links: [['Otwórz generator seryjny', '/pl/generator-kodow-z-csv'], ['Skalibruj drukarkę', '/kalibracja-druku'], ['Poradnik EAN-13', '/pl/ean-13/']],
    },
  },
  {
    en: {
      route: 'warehouse-barcode-labels', title: 'Warehouse Barcode Labels from CSV', description: 'Generate warehouse barcode labels from an inventory CSV. Create Code 128 or ITF-14 labels and export PDF, PNG or SVG packages.', h1: 'Barcode labels for warehouse inventory', lead: 'Turn SKU, location and carton identifiers into consistent labels without sending inventory data to an external server.',
      steps: ['Export products or locations to CSV', 'Validate Code 128 or ITF-14 values', 'Print sheets or thermal labels'],
      sections: [
        { title: 'Choose a barcode for the operational job', paragraphs: ['The best symbol depends on what the label identifies and where it will be scanned. Internal shelf, bin and SKU values usually fit Code 128. Trade-item cartons with an assigned GTIN-14 can use ITF-14. Logistics data such as a shipment identifier, batch or expiry date requires an appropriate GS1 carrier and agreed Application Identifiers.', 'Do not invent retail or logistics identifiers in the generator. It validates and renders values supplied by your business; allocation rules remain with the owner of the numbering system.'], table: { headers: ['Use case', 'Typical choice', 'Important condition'], rows: [['Shelf, bin or internal SKU', 'Code 128', 'Use a unique value from your WMS or ERP'], ['Trade-item carton', 'ITF-14', 'Encode a valid assigned GTIN-14'], ['GTIN plus batch or expiry', 'GS1-128 / GS1 DataMatrix', 'Use defined Application Identifiers'], ['Link to mobile product data', 'QR Code', 'Ensure staff scanners and workflow support URLs']] } },
        { title: 'Build a clean CSV source', paragraphs: ['Keep one row per product, location or handling unit. Map the value, type, name, description and copies columns before generation. The preview marks invalid records so they can be corrected or excluded without stopping the whole batch.', 'Use stable location names such as zone-aisle-bay-level and avoid visually ambiguous characters where operators may type the value manually. Generate copies from the source record instead of duplicating rows; this keeps the error report and later updates easier to audit.'] },
        { title: 'Verify labels in the real workflow', paragraphs: ['Test labels with the handheld scanners, distances and lighting used on site. A barcode that scans from a monitor may still fail when printed too small, covered by glossy film, curved around an edge or damaged by handling.', 'Keep strong dark-on-light contrast and clear quiet zones. Place human-readable text near the symbol so an operator can recover when scanning is unavailable, but never allow the text or a border to enter the barcode area.'], bullets: ['Scan the first and last label from every generated batch.', 'Check receiving, picking and replenishment workflows separately.', 'Record the template, printer, media and successful scale setting.'] },
      ],
      faqs: [['Which barcode works best in a warehouse?', 'Code 128 is a strong general choice for internal SKU and location labels. ITF-14 is intended for trade-item cartons carrying a GTIN-14.'], ['Can I put a batch and expiry date in Code 128?', 'A private Code 128 format can work inside one controlled system. For data exchanged with partners, use an agreed GS1 carrier and Application Identifiers.'], ['Is CSV data uploaded to a server?', 'No. Import, validation and export are performed locally in the browser, so the inventory file does not need to leave the device.']],
      links: [['Generate labels from CSV', '/bulk-barcode-generator'], ['Create a GS1 barcode', '/gs1-barcode-generator'], ['Generate a 2D barcode', '/2d-barcode-generator'], ['Code 128 guide', '/code-128/'], ['ITF-14 guide', '/itf-14/']],
    },
    pl: {
      route: 'etykiety-kreskowe-dla-magazynu', title: 'Etykiety z kodami kreskowymi do magazynu', description: 'Generuj etykiety magazynowe z CSV. Twórz kody Code 128 lub ITF-14 i pobieraj arkusze PDF oraz paczki PNG lub SVG.', h1: 'Etykiety z kodami kreskowymi do magazynu', lead: 'Zamień SKU, lokalizacje i identyfikatory kartonów w spójne etykiety bez wysyłania danych magazynowych na zewnętrzny serwer.',
      steps: ['Wyeksportuj produkty lub lokalizacje do CSV', 'Sprawdź wartości Code 128 albo ITF-14', 'Wydrukuj arkusze lub etykiety termiczne'],
      sections: [
        { title: 'Dobierz kod do zadania operacyjnego', paragraphs: ['Właściwy symbol zależy od tego, co oznacza etykieta i gdzie będzie skanowana. Dla wewnętrznych regałów, lokalizacji i SKU najczęściej sprawdza się Code 128. Karton jednostki handlowej z przydzielonym GTIN-14 może używać ITF-14. Dane logistyczne, takie jak identyfikator wysyłki, partia lub termin ważności, wymagają odpowiedniego nośnika GS1 i uzgodnionych Identyfikatorów Zastosowania.', 'Nie wymyślaj identyfikatorów detalicznych ani logistycznych w generatorze. Narzędzie sprawdza i renderuje wartości dostarczone przez firmę, ale nie zastępuje systemu ich przydzielania.'], table: { headers: ['Zastosowanie', 'Typowy wybór', 'Ważny warunek'], rows: [['Regał, miejsce lub wewnętrzny SKU', 'Code 128', 'Unikalna wartość z WMS lub ERP'], ['Opakowanie zbiorcze', 'ITF-14', 'Poprawny, przydzielony GTIN-14'], ['GTIN z partią lub datą', 'GS1-128 / GS1 DataMatrix', 'Zdefiniowane Identyfikatory Zastosowania'], ['Odnośnik do danych mobilnych', 'QR Code', 'Obsługa adresów URL w skanerach i procesie']] } },
        { title: 'Przygotuj uporządkowane źródło CSV', paragraphs: ['Zachowaj jeden wiersz dla produktu, lokalizacji lub jednostki logistycznej. Przed generowaniem przypisz kolumny wartości, typu, nazwy, opisu i liczby kopii. Podgląd oznacza błędne rekordy, dzięki czemu można je poprawić lub pominąć bez zatrzymywania całej paczki.', 'Stosuj stabilny schemat lokalizacji, na przykład strefa-aleja-sekcja-poziom, i unikaj znaków łatwych do pomylenia podczas ręcznego wpisywania. Liczbę kopii podawaj w rekordzie zamiast powielać wiersze, aby raport błędów i aktualizacje były czytelne.'] },
        { title: 'Sprawdź etykiety w rzeczywistym procesie', paragraphs: ['Testuj etykiety przy użyciu skanerów, odległości i oświetlenia występujących w magazynie. Kod odczytywany z monitora może zawieść po zbyt małym wydruku, oklejeniu błyszczącą folią, zagięciu na krawędzi albo zabrudzeniu.', 'Zachowaj mocny kontrast ciemnego symbolu na jasnym tle i wolne strefy ciszy. Dodaj czytelny opis dla operatora na wypadek awarii skanera, ale nie umieszczaj tekstu ani ramki w obszarze kodu.'], bullets: ['Skanuj pierwszą i ostatnią etykietę z każdej wygenerowanej partii.', 'Osobno sprawdź przyjęcie, kompletację i uzupełnianie lokalizacji.', 'Zapisz użyty szablon, drukarkę, materiał i poprawną skalę.'] },
      ],
      faqs: [['Jaki kod najlepiej sprawdza się w magazynie?', 'Code 128 jest uniwersalny dla wewnętrznych SKU i lokalizacji. ITF-14 służy do oznaczania opakowań zbiorczych z numerem GTIN-14.'], ['Czy w Code 128 można zapisać partię i datę ważności?', 'Wewnętrzny format Code 128 może działać w jednym kontrolowanym systemie. Przy wymianie danych z partnerami użyj uzgodnionego nośnika GS1 i Identyfikatorów Zastosowania.'], ['Czy plik CSV jest wysyłany na serwer?', 'Nie. Import, walidacja i eksport odbywają się lokalnie w przeglądarce, więc plik magazynowy nie musi opuszczać urządzenia.']],
      links: [['Generuj etykiety z CSV', '/pl/generator-kodow-z-csv'], ['Utwórz kod GS1', '/pl/generator-kodow-gs1'], ['Generuj kod 2D', '/pl/generator-kodow-2d'], ['Poradnik Code 128', '/pl/code-128/'], ['Poradnik ITF-14', '/pl/itf-14/']],
    },
  },
  {
    en: {
      route: 'thermal-barcode-label-printing', title: 'Thermal Barcode Label Printing', description: 'Prepare barcode labels for Zebra, Brother, Dymo and 100×150 mm thermal printers. Export exact-size PDFs and calibrate offsets.', h1: 'Print barcode labels on a thermal printer', lead: 'Use exact media dimensions, a 100% print scale and calibration offsets to produce reliable labels for common thermal printers.',
      steps: ['Choose the physical label size', 'Generate and preview the barcode batch', 'Print at 100% scale and calibrate offsets'],
      sections: [
        { title: 'Start with the media, not only the printer model', paragraphs: ['A thermal printer can accept several roll widths and label lengths, so the model name alone is not a complete preset. Measure or read the media specification and select the exact physical label size used in the loaded roll.', 'The generated PDF page must match one label. A 100 × 150 mm shipping label is not interchangeable with a 102 × 152 mm preset, and a continuous roll needs a defined cut length before a fixed PDF can be prepared.'], table: { headers: ['Label size', 'Typical use', 'Check before printing'], rows: [['58 × 40 mm', 'Products and small bins', 'Barcode width and readable text'], ['62 × 29 mm', 'Brother-style address media', 'Exact roll type and sensor mode'], ['100 × 50 mm', 'Cartons and warehouse locations', 'Feed direction and quiet zones'], ['100 × 150 mm', 'Shipping and logistics', 'Carrier layout and printer page size']] } },
        { title: 'Configure the driver consistently', paragraphs: ['Set the same width and height in the printer driver, PDF viewer and generator. Print at actual size or 100%; Fit to page introduces scaling even when the preview appears correct.', 'Select the correct gap, mark or continuous-media sensor mode. Calibrate the media in the printer after changing a roll. Darkness and speed should produce solid bars without spreading them into narrow spaces; start with the manufacturer defaults and adjust using a scan test.'] },
        { title: 'Calibrate position and verify readability', paragraphs: ['Use the calibration page to check a 100 mm line and 50 mm square before compensating for label offsets. Correct the driver scale first. Apply horizontal or vertical offsets only when dimensions are accurate but the whole design is displaced by a constant amount.', 'Test exported labels with the actual scanner. Preserve light quiet zones, avoid low-contrast colour combinations and keep the symbol away from curved edges, seams and reflective tape. For demanding GS1 or logistics workflows, confirm the required symbol and dimensions with the receiving specification.'], bullets: ['Print one label after every media or driver change.', 'Scan at the shortest and longest expected working distance.', 'Save a named printer profile only after the test passes.'] },
      ],
      faqs: [['Should I select Fit to page?', 'No. Use actual size or 100% scale; automatic fitting changes barcode and label dimensions.'], ['Why does the printer skip labels?', 'The driver may use the wrong page length or sensor mode, or the printer may need media calibration after a roll change.'], ['Does higher darkness always improve scanning?', 'No. Excessive heat can widen bars and close narrow spaces. Use the lowest setting that produces complete, consistent bars on the selected material.']],
      links: [['Create a thermal PDF', '/bulk-barcode-generator'], ['Open calibration page', '/kalibracja-druku'], ['Code 39 guide', '/code-39/']],
    },
    pl: {
      route: 'druk-kodow-na-drukarce-termicznej', title: 'Druk kodów na drukarce termicznej', description: 'Przygotuj kody dla drukarek Zebra, Brother, Dymo i etykiet 100×150 mm. Pobierz PDF w dokładnym rozmiarze i skalibruj przesunięcia.', h1: 'Druk kodów kreskowych na drukarce termicznej', lead: 'Ustaw fizyczny rozmiar nośnika, skalę 100% i przesunięcia kalibracyjne, aby uzyskać powtarzalne etykiety termiczne.',
      steps: ['Wybierz fizyczny rozmiar etykiety', 'Wygeneruj i sprawdź paczkę kodów', 'Drukuj w skali 100% i skalibruj przesunięcia'],
      sections: [
        { title: 'Zacznij od materiału, nie tylko modelu drukarki', paragraphs: ['Drukarka termiczna może obsługiwać kilka szerokości rolek i długości etykiet, dlatego sama nazwa modelu nie definiuje presetu. Zmierz etykietę lub odczytaj specyfikację materiału i wybierz dokładny rozmiar fizyczny założonej rolki.', 'Strona wygenerowanego PDF musi odpowiadać jednej etykiecie. Format wysyłkowy 100 × 150 mm nie jest tym samym co 102 × 152 mm, a rolka ciągła wymaga określenia długości odcięcia przed utworzeniem PDF.'], table: { headers: ['Rozmiar etykiety', 'Typowe zastosowanie', 'Co sprawdzić'], rows: [['58 × 40 mm', 'Produkty i małe lokalizacje', 'Szerokość kodu i czytelny opis'], ['62 × 29 mm', 'Materiały adresowe Brother', 'Dokładny typ rolki i tryb czujnika'], ['100 × 50 mm', 'Kartony i lokalizacje', 'Kierunek podawania i strefy ciszy'], ['100 × 150 mm', 'Wysyłki i logistyka', 'Układ przewoźnika i format sterownika']] } },
        { title: 'Ustaw spójną konfigurację sterownika', paragraphs: ['Wprowadź identyczną szerokość i wysokość w sterowniku drukarki, przeglądarce PDF i generatorze. Drukuj w rozmiarze rzeczywistym lub skali 100%; dopasowanie do strony wprowadza skalowanie nawet wtedy, gdy podgląd wygląda poprawnie.', 'Wybierz właściwy tryb czujnika przerwy, znacznika lub materiału ciągłego. Po zmianie rolki wykonaj kalibrację nośnika. Temperatura i prędkość powinny dawać pełne kreski bez zalewania wąskich odstępów; zacznij od ustawień producenta i koryguj na podstawie próby skanowania.'] },
        { title: 'Skalibruj położenie i sprawdź odczyt', paragraphs: ['Użyj strony kalibracyjnej z linią 100 mm i kwadratem 50 mm, zanim wprowadzisz przesunięcia etykiety. Najpierw skoryguj skalę sterownika. Przesunięcie poziome lub pionowe stosuj dopiero wtedy, gdy wymiary są poprawne, a cały projekt jest przesunięty o stałą wartość.', 'Testuj etykiety właściwym skanerem. Zachowaj jasne strefy ciszy, unikaj słabego kontrastu i nie umieszczaj kodu na zaokrągleniach, szwach ani pod odblaskową taśmą. W procesach GS1 lub logistycznych potwierdź wymagany symbol i rozmiary w specyfikacji odbiorcy.'], bullets: ['Po każdej zmianie materiału lub sterownika wydrukuj jedną etykietę próbną.', 'Skanuj z najmniejszej i największej przewidywanej odległości.', 'Zapisz nazwany profil drukarki dopiero po udanej próbie.'] },
      ],
      faqs: [['Czy należy włączyć opcję Dopasuj do strony?', 'Nie. Użyj rozmiaru rzeczywistego lub skali 100%, ponieważ dopasowanie zmienia wymiary kodu i etykiety.'], ['Dlaczego drukarka pomija etykiety?', 'Sterownik może używać złej długości strony lub trybu czujnika, albo drukarka wymaga kalibracji materiału po zmianie rolki.'], ['Czy większa temperatura zawsze poprawia odczyt?', 'Nie. Zbyt duża ilość ciepła poszerza kreski i może zamknąć wąskie odstępy. Użyj najniższego ustawienia dającego pełny, równy wydruk.']],
      links: [['Utwórz PDF termiczny', '/pl/generator-kodow-z-csv'], ['Otwórz kalibrację', '/kalibracja-druku'], ['Poradnik Code 39', '/pl/code-39/']],
    },
  },
];

const GUIDE_PAGES = [
  {
    en: {
      route: 'guides/gtin-ean-upc',
      title: 'GTIN vs EAN vs UPC: Practical Barcode Guide',
      description: 'Understand GTIN, EAN and UPC, choose the right retail barcode, validate check digits and open the correct free barcode generator.',
      h1: 'GTIN, EAN and UPC: what is the difference?',
      lead: 'GTIN is the product identifier; EAN-13, UPC-A and EAN-8 are barcode symbols that carry specific GTIN lengths. Use this guide to choose the correct format before creating a label.',
      cta: ['Validate a GTIN or create a GS1 barcode', '/gs1-barcode-generator'],
      labels: {
        kicker: 'Retail barcode guide',
        comparison: 'Quick comparison',
        choose: 'Choose the right barcode',
        examples: 'Examples and check digits',
        mistakes: 'Common mistakes to avoid',
        faq: 'Frequently asked questions',
        sources: 'Official references',
        related: 'Related tools and guides',
      },
      table: [
        ['Name', 'Meaning', 'Typical use', 'Digits', 'Barcode symbol'],
        ['GTIN-13', 'Global Trade Item Number', 'Retail products in Europe and many other markets', '13', 'EAN-13'],
        ['GTIN-12', 'Global Trade Item Number', 'Retail products commonly sold in North America', '12', 'UPC-A'],
        ['GTIN-8', 'Global Trade Item Number', 'Very small retail items when GTIN-13 will not fit', '8', 'EAN-8'],
        ['GTIN-14', 'Global Trade Item Number', 'Cases and higher packaging levels, not retail POS items', '14', 'ITF-14 or GS1-128'],
      ],
      choices: [
        ['A product scanned at a retail checkout', 'Use EAN-13 for a GTIN-13, UPC-A for a GTIN-12 or EAN-8 for an assigned GTIN-8. Confirm the identifier and symbol with your trading partner.'],
        ['A carton or case moving through distribution', 'Use GTIN-14 in ITF-14 or GS1-128 where the receiving and logistics specification supports it. GTIN-14 is not intended for retail checkout.'],
        ['A label that also needs batch, expiry or serial data', 'A plain EAN/UPC symbol carries only the GTIN. Use GS1-128, GS1 DataMatrix or another approved GS1 carrier for Application Identifier data.'],
        ['An internal SKU or location that never leaves your company', 'A non-GS1 format such as Code 128 can be suitable when your own systems control allocation and scanning.'],
      ],
      examples: [
        ['EAN-13 / GTIN-13', '5901234123457', 'The final digit 7 is the check digit. The generator validates it before rendering.'],
        ['UPC-A / GTIN-12', '036000291452', 'A 12-digit identifier normally rendered as a UPC-A symbol.'],
        ['ITF-14 / GTIN-14', '10012345678902', 'The first digit may represent a packaging level; the last digit is still a check digit.'],
      ],
      mistakes: [
        'Inventing a retail GTIN in a barcode generator. A generator encodes a number; it does not assign a globally unique product identifier.',
        'Treating the final check digit as part of the item reference. It is calculated from the preceding digits and detects common data-entry errors.',
        'Using GTIN-14 for a consumer unit scanned at retail checkout.',
        'Putting batch, expiry or serial data into EAN-13. Use a GS1 carrier designed for Application Identifiers instead.',
      ],
      faq: [
        ['Is an EAN number the same as a GTIN?', 'EAN commonly refers to GTIN-13 and to the EAN-13 barcode symbol. GTIN is the identifier itself; EAN-13 is one way of representing it in a barcode.'],
        ['Can a UPC be used outside North America?', 'GTIN-12 identifiers are globally valid, although GTIN-13 and EAN-13 are more common in many markets outside North America. Confirm acceptance with the retailer or marketplace.'],
        ['Can this site give me a new retail barcode number?', 'No. It validates and renders identifiers you provide. For a globally unique retail GTIN, obtain the identifier from GS1 or your local GS1 Member Organisation.'],
        ['Why does a valid-looking number fail validation?', 'Fixed-length numeric GS1 identifiers include a calculated final check digit. A wrong digit, omitted leading zero or incorrect total length will fail validation.'],
      ],
      links: [
        ['EAN-13 generator', '/ean-13/'],
        ['UPC-A generator', '/upc-a/'],
        ['ITF-14 generator', '/itf-14/'],
        ['GS1 generator', '/gs1-barcode-generator'],
        ['Bulk CSV generator', '/bulk-barcode-generator'],
      ],
      sources: [
        ['GS1: GTIN, barcode, EAN and UPC explained', 'https://support.gs1.org/support/solutions/articles/43000734124-what-is-the-difference-between-a-gs1-gtin-a-barcode-an-ean-and-a-upc-'],
        ['GS1: get a barcode and GTIN', 'https://www.gs1.org/standards/get-barcodes'],
        ['GS1: check digit calculator', 'https://www.gs1.org/services/check-digit-calculator'],
      ],
    },
    pl: {
      route: 'poradniki/gtin-ean-upc',
      title: 'GTIN, EAN i UPC - czym się różnią?',
      description: 'Poznaj różnice między GTIN, EAN i UPC, wybierz właściwy kod dla produktu, sprawdź cyfrę kontrolną i otwórz odpowiedni generator.',
      h1: 'GTIN, EAN i UPC: czym się różnią?',
      lead: 'GTIN jest identyfikatorem produktu, natomiast EAN-13, UPC-A i EAN-8 to symbole kodów kreskowych zapisujące określone długości GTIN. Ten poradnik pomaga dobrać format przed przygotowaniem etykiety.',
      cta: ['Sprawdź GTIN lub utwórz kod GS1', '/pl/generator-kodow-gs1'],
      labels: {
        kicker: 'Poradnik kodów detalicznych',
        comparison: 'Szybkie porównanie',
        choose: 'Wybierz właściwy kod',
        examples: 'Przykłady i cyfry kontrolne',
        mistakes: 'Częste błędy',
        faq: 'Najczęstsze pytania',
        sources: 'Oficjalne źródła',
        related: 'Powiązane narzędzia i poradniki',
      },
      table: [
        ['Nazwa', 'Znaczenie', 'Typowe zastosowanie', 'Cyfry', 'Symbol kodu'],
        ['GTIN-13', 'Globalny Numer Jednostki Handlowej', 'Produkty detaliczne w Europie i wielu innych krajach', '13', 'EAN-13'],
        ['GTIN-12', 'Globalny Numer Jednostki Handlowej', 'Produkty detaliczne, najczęściej w Ameryce Północnej', '12', 'UPC-A'],
        ['GTIN-8', 'Globalny Numer Jednostki Handlowej', 'Bardzo małe produkty, gdy GTIN-13 się nie mieści', '8', 'EAN-8'],
        ['GTIN-14', 'Globalny Numer Jednostki Handlowej', 'Kartony i wyższe poziomy opakowania, nie kasa detaliczna', '14', 'ITF-14 lub GS1-128'],
      ],
      choices: [
        ['Produkt skanowany przy kasie', 'Użyj EAN-13 dla GTIN-13, UPC-A dla GTIN-12 albo EAN-8 dla przydzielonego GTIN-8. Potwierdź identyfikator i symbol z odbiorcą handlowym.'],
        ['Karton lub opakowanie zbiorcze w dystrybucji', 'Użyj GTIN-14 w symbolu ITF-14 lub GS1-128, jeśli obsługuje go specyfikacja odbiorcy. GTIN-14 nie służy do skanowania jednostki konsumenckiej przy kasie.'],
        ['Etykieta z partią, datą ważności lub numerem seryjnym', 'Zwykły EAN/UPC przenosi tylko GTIN. Dla danych z Identyfikatorami Zastosowania użyj GS1-128, GS1 DataMatrix lub innego zatwierdzonego nośnika GS1.'],
        ['Wewnętrzny SKU lub lokalizacja magazynowa', 'Code 128 może być odpowiedni, jeśli numeracja i skanowanie pozostają wyłącznie w systemach Twojej firmy.'],
      ],
      examples: [
        ['EAN-13 / GTIN-13', '5901234123457', 'Ostatnia cyfra 7 jest cyfrą kontrolną. Generator sprawdza ją przed utworzeniem symbolu.'],
        ['UPC-A / GTIN-12', '036000291452', 'Dwunastocyfrowy identyfikator zapisywany zazwyczaj jako symbol UPC-A.'],
        ['ITF-14 / GTIN-14', '10012345678902', 'Pierwsza cyfra może oznaczać poziom opakowania, a ostatnia nadal jest cyfrą kontrolną.'],
      ],
      mistakes: [
        'Wymyślanie numeru GTIN dla sprzedaży w generatorze. Generator koduje numer, ale nie przydziela globalnie unikalnego identyfikatora produktu.',
        'Traktowanie ostatniej cyfry jako części numeru produktu. Cyfra kontrolna jest obliczana z wcześniejszych cyfr i wykrywa częste pomyłki.',
        'Używanie GTIN-14 dla produktu konsumenckiego skanowanego przy kasie.',
        'Umieszczanie partii, daty ważności lub numeru seryjnego w EAN-13 zamiast użycia właściwego nośnika GS1.',
      ],
      faq: [
        ['Czy numer EAN jest tym samym co GTIN?', 'EAN często oznacza GTIN-13 oraz symbol EAN-13. GTIN jest samym identyfikatorem, a EAN-13 jednym ze sposobów zapisania go w kodzie kreskowym.'],
        ['Czy kod UPC może być używany poza Ameryką Północną?', 'Identyfikatory GTIN-12 są globalnie ważne, chociaż w wielu krajach częściej spotyka się GTIN-13 i EAN-13. Akceptację należy potwierdzić ze sprzedawcą lub platformą.'],
        ['Czy ta strona przydzieli mi nowy numer detaliczny?', 'Nie. Strona sprawdza i renderuje podane identyfikatory. Globalnie unikalny GTIN do handlu otrzymasz od GS1 lub lokalnej organizacji członkowskiej GS1.'],
        ['Dlaczego poprawnie wyglądający numer nie przechodzi walidacji?', 'Numeryczne klucze GS1 o stałej długości mają obliczaną ostatnią cyfrę kontrolną. Błędna cyfra, pominięte zero wiodące albo zła długość powodują błąd.'],
      ],
      links: [
        ['Generator EAN-13', '/pl/ean-13/'],
        ['Generator UPC-A', '/pl/upc-a/'],
        ['Generator ITF-14', '/pl/itf-14/'],
        ['Generator GS1', '/pl/generator-kodow-gs1'],
        ['Generator paczek CSV', '/pl/generator-kodow-z-csv'],
      ],
      sources: [
        ['GS1: różnice między GTIN, kodem kreskowym, EAN i UPC', 'https://support.gs1.org/support/solutions/articles/43000734124-what-is-the-difference-between-a-gs1-gtin-a-barcode-an-ean-and-a-upc-'],
        ['GS1: uzyskanie kodu i numeru GTIN', 'https://www.gs1.org/standards/get-barcodes'],
        ['GS1: kalkulator cyfry kontrolnej', 'https://www.gs1.org/services/check-digit-calculator'],
      ],
    },
  },
  ...ADDITIONAL_GUIDE_PAGES,
];

function taskPageHtml(page, lang, alternate) {
  const canonical = `${BASE}/${lang === 'pl' ? `pl/${page.route}` : page.route}`;
  const altUrl = `${BASE}/${lang === 'pl' ? alternate.route : `pl/${alternate.route}`}`;
  const toolLabel = lang === 'pl' ? 'Narzędzie' : 'Tool';
  const howLabel = lang === 'pl' ? 'Jak to zrobić' : 'How it works';
  const faqLabel = lang === 'pl' ? 'Najczęstsze pytania' : 'Frequently asked questions';
  const relatedLabel = lang === 'pl' ? 'Powiązane narzędzia' : 'Related tools';
  const skipLabel = lang === 'pl' ? 'Przejdź do treści' : 'Skip to content';
  const faqs = page.faqs || [];
  const sections = page.sections.map((section) => {
    const table = section.table ? `<div class="task-table-wrap"><table class="task-table"><thead><tr>${section.table.headers.map((header) => `<th scope="col">${header}</th>`).join('')}</tr></thead><tbody>${section.table.rows.map((row) => `<tr>${row.map((cell, index) => index === 0 ? `<th scope="row">${cell}</th>` : `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
    const bullets = section.bullets ? `<ul class="task-checklist">${section.bullets.map((item) => `<li>${item}</li>`).join('')}</ul>` : '';
    return `<section class="task-copy"><h2>${section.title}</h2>${section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('')}${table}${bullets}</section>`;
  }).join('');
  const json = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebPage', name: page.h1, description: page.description, url: canonical, inLanguage: lang, author: { '@type': 'Organization', name: 'Day to Day Apps', url: 'https://daytodayapps.com/' } },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: toolLabel, item: `${BASE}/${lang === 'pl' ? 'pl/' : ''}` }, { '@type': 'ListItem', position: 2, name: page.h1, item: canonical }] },
      { '@type': 'HowTo', name: page.h1, step: page.steps.map((text, index) => ({ '@type': 'HowToStep', position: index + 1, name: text, text })) },
      { '@type': 'FAQPage', mainEntity: faqs.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) },
    ],
  };
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${page.title}</title><meta name="description" content="${page.description}"><meta name="robots" content="index, follow"><link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="${lang}" href="${canonical}"><link rel="alternate" hreflang="${lang === 'pl' ? 'en' : 'pl'}" href="${altUrl}"><link rel="alternate" hreflang="x-default" href="${lang === 'en' ? canonical : altUrl}"><meta property="og:title" content="${page.title}"><meta property="og:description" content="${page.description}"><meta property="og:url" content="${canonical}"><meta property="og:type" content="article"><meta property="og:image" content="${BASE}/og-image.svg"><link rel="icon" href="${lang === 'pl' ? '../' : ''}favicon.svg"><link rel="stylesheet" href="${lang === 'pl' ? '../' : ''}styles.css"><script type="application/ld+json">${JSON.stringify(json)}</script></head><body class="bulk-page task-page"><a class="skip-link" href="#task-content">${skipLabel}</a><header class="bulk-header"><a class="bulk-brand" href="/${lang === 'pl' ? 'pl/' : ''}">Barcode Generator</a><nav aria-label="${lang === 'pl' ? 'Główna' : 'Primary'}"><a href="${page.links[0][1]}">${toolLabel}</a><a href="/${lang === 'pl' ? 'pl/' : ''}decoder">Decoder</a><a href="${altUrl}">${lang === 'pl' ? 'EN' : 'PL'}</a></nav></header><main class="task-shell" id="task-content"><p class="task-kicker">${lang === 'pl' ? 'Poradnik i narzędzie' : 'Guide and tool'}</p><h1>${page.h1}</h1><p class="task-lead">${page.lead}</p><a class="btn-primary task-cta" href="${page.links[0][1]}">${page.links[0][0]}</a><section><h2>${howLabel}</h2><ol class="task-steps">${page.steps.map((step) => `<li><strong>${step}</strong></li>`).join('')}</ol></section>${sections}<section class="task-faq"><h2>${faqLabel}</h2>${faqs.map(([question, answer], index) => `<details${index === 0 ? ' open' : ''}><summary>${question}</summary><p>${answer}</p></details>`).join('')}</section><nav class="task-links" aria-label="${relatedLabel}">${page.links.slice(1).map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</nav></main><footer class="footer"><p class="footer-links">© 2026 Barcode Generator · <a href="/${lang === 'pl' ? 'pl/polityka-prywatnosci' : 'privacy-policy'}">${lang === 'pl' ? 'Prywatność' : 'Privacy'}</a> · <a href="https://daytodayapps.com/narzedzia/">Day to Day Apps</a></p></footer><script src="${lang === 'pl' ? '../' : ''}analytics.js" defer></script></body></html>`;
}

function guidePageHtml(page, lang, alternate) {
  const isPolish = lang === 'pl';
  const canonical = `${BASE}/${isPolish ? `pl/${page.route}` : page.route}`;
  const altUrl = `${BASE}/${isPolish ? alternate.route : `pl/${alternate.route}`}`;
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Article', 'TechArticle'],
        headline: page.h1,
        description: page.description,
        url: canonical,
        inLanguage: lang,
        datePublished: page.datePublished || '2026-07-21',
        dateModified: new Date().toISOString().slice(0, 10),
        author: { '@type': 'Organization', name: 'Day to Day Apps', url: 'https://daytodayapps.com/' },
        publisher: { '@type': 'Organization', name: 'Day to Day Apps', url: 'https://daytodayapps.com/' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Barcode Generator', item: `${BASE}/${isPolish ? 'pl/' : ''}` },
          { '@type': 'ListItem', position: 2, name: page.labels.kicker, item: canonical },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: page.faq.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })),
      },
    ],
  };
  const table = page.table;
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${page.title}</title>
  <meta name="description" content="${page.description}"><meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="en" href="${isPolish ? altUrl : canonical}"><link rel="alternate" hreflang="pl" href="${isPolish ? canonical : altUrl}"><link rel="alternate" hreflang="x-default" href="${isPolish ? altUrl : canonical}">
  <meta property="og:title" content="${page.title}"><meta property="og:description" content="${page.description}"><meta property="og:url" content="${canonical}"><meta property="og:type" content="article"><meta property="og:image" content="${BASE}/og-image.svg">
  <link rel="icon" href="/${isPolish ? '' : ''}favicon.svg"><link rel="stylesheet" href="/bulk.css">
  <script type="application/ld+json">${JSON.stringify(graph)}</script>
</head>
<body class="bulk-page guide-page">
  <a class="skip-link" href="#guide-content">${isPolish ? 'Przejdź do treści' : 'Skip to content'}</a>
  <header class="bulk-header"><a class="bulk-brand" href="/${isPolish ? 'pl/' : ''}">Barcode Generator</a><nav aria-label="${isPolish ? 'Główna' : 'Primary'}"><a href="${page.cta[1]}">${isPolish ? 'GS1' : 'GS1 tool'}</a><a href="/${isPolish ? 'pl/' : ''}decoder">Decoder</a><a href="${altUrl}">${isPolish ? 'EN' : 'PL'}</a></nav></header>
  <main id="guide-content" class="task-shell guide-shell">
    <p class="task-kicker">${page.labels.kicker}</p><h1>${page.h1}</h1><p class="task-lead">${page.lead}</p><a class="btn-primary task-cta" href="${page.cta[1]}">${page.cta[0]}</a>
    <section aria-labelledby="comparison-heading"><h2 id="comparison-heading">${page.labels.comparison}</h2><div class="guide-table-wrap"><table class="guide-table"><thead><tr>${table[0].map((cell) => `<th scope="col">${cell}</th>`).join('')}</tr></thead><tbody>${table.slice(1).map((row) => `<tr>${row.map((cell, index) => index === 0 ? `<th scope="row">${cell}</th>` : `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>
    <section aria-labelledby="choose-heading"><h2 id="choose-heading">${page.labels.choose}</h2><div class="guide-choice-grid">${page.choices.map(([title, text]) => `<article><h3>${title}</h3><p>${text}</p></article>`).join('')}</div></section>
    <section aria-labelledby="examples-heading"><h2 id="examples-heading">${page.labels.examples}</h2><div class="guide-examples">${page.examples.map(([title, value, text]) => `<article><h3>${title}</h3><code>${value}</code><p>${text}</p></article>`).join('')}</div></section>
    <section aria-labelledby="mistakes-heading"><h2 id="mistakes-heading">${page.labels.mistakes}</h2><ul class="guide-checklist">${page.mistakes.map((text) => `<li>${text}</li>`).join('')}</ul></section>
    <section aria-labelledby="faq-heading"><h2 id="faq-heading">${page.labels.faq}</h2><div class="guide-faq">${page.faq.map(([question, answer]) => `<details><summary>${question}</summary><p>${answer}</p></details>`).join('')}</div></section>
    <section aria-labelledby="sources-heading"><h2 id="sources-heading">${page.labels.sources}</h2><ul class="guide-sources">${page.sources.map(([label, href]) => `<li><a href="${href}" rel="noopener noreferrer">${label}</a></li>`).join('')}</ul></section>
    <nav class="task-links" aria-label="${page.labels.related}">${page.links.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</nav>
  </main>
  <footer class="footer"><p class="footer-links">© 2026 Barcode Generator · <a href="/${isPolish ? 'pl/polityka-prywatnosci' : 'privacy-policy'}">${isPolish ? 'Prywatność' : 'Privacy'}</a> · <a href="https://daytodayapps.com/narzedzia/">Day to Day Apps</a></p></footer><script src="/analytics.js" defer></script>
</body></html>`;
}

function localisePrivateHtml(source, lang, page) {
  const privateUi = {
    en: { privacy: 'Privacy', terms: 'Terms', primary: 'Primary', accountActions: 'Account actions' },
    pl: { privacy: 'Prywatność', terms: 'Regulamin', primary: 'Główna', accountActions: 'Akcje konta' },
    de: { privacy: 'Datenschutz', terms: 'Nutzungsbedingungen', primary: 'Hauptnavigation', accountActions: 'Kontoaktionen' },
    fr: { privacy: 'Confidentialité', terms: 'Conditions', primary: 'Navigation principale', accountActions: 'Actions du compte' },
    es: { privacy: 'Privacidad', terms: 'Términos', primary: 'Navegación principal', accountActions: 'Acciones de cuenta' },
    it: { privacy: 'Privacy', terms: 'Termini', primary: 'Navigazione principale', accountActions: 'Azioni account' },
    pt: { privacy: 'Privacidade', terms: 'Termos', primary: 'Navegação principal', accountActions: 'Ações da conta' },
    nl: { privacy: 'Privacy', terms: 'Voorwaarden', primary: 'Hoofdnavigatie', accountActions: 'Accountacties' },
    cs: { privacy: 'Soukromí', terms: 'Podmínky', primary: 'Hlavní navigace', accountActions: 'Akce účtu' },
    uk: { privacy: 'Конфіденційність', terms: 'Умови', primary: 'Основна навігація', accountActions: 'Дії облікового запису' },
  }[lang];
  const prefix = lang === 'en' ? '' : '../';
  let html = source
    .replace(/<html lang=(['"])[^'"]+\1/, `<html lang="${lang}"`)
    .replace(/<link rel="canonical" href="[^"]+">/, `<link rel="canonical" href="${canonicalFor(lang, page)}">`)
    .replaceAll('aria-label="Primary"', `aria-label="${privateUi.primary}"`)
    .replaceAll('aria-label="Account actions"', `aria-label="${privateUi.accountActions}"`)
    .replaceAll('>Privacy</a>', `>${privateUi.privacy}</a>`)
    .replaceAll('>Terms</a>', `>${privateUi.terms}</a>`);

  if (lang !== 'en') {
    const assets = [
      'favicon.svg', 'styles.css', 'i18n.js', 'analytics.js', 'account-page.js', 'nav-enhance.js',
      'label-renderer.js', 'reset-password-page.js',
    ];
    for (const asset of assets) {
      html = html.replaceAll(`href="${asset}`, `href="${prefix}${asset}`)
        .replaceAll(`src="${asset}`, `src="${prefix}${asset}`);
    }
    html = html.replaceAll("from './", "from '../");
  }

  const privacy = lang === 'pl' ? '/pl/polityka-prywatnosci' : '/privacy-policy';
  const terms = lang === 'pl' ? '/pl/regulamin' : '/terms';
  html = html
    .replace(/href=(['"])(?:\.\.\/)?(?:polityka-prywatnosci|privacy-policy)(?:\.html)?\1/g, `href="${privacy}"`)
    .replace(/href=(['"])(?:\.\.\/)?(?:regulamin|terms)(?:\.html)?\1/g, `href="${terms}"`)
    .replace(/href=(['"])(?:\.\.\/)?kalibracja-druku(?:\.html)?\1/g, 'href="/kalibracja-druku"');
  return normaliseHtml(html);
}

async function copyFile(name) {
  const from = path.join(ROOT, name);
  if (!existsSync(from)) throw new Error(`Missing production asset: ${name}`);
  const to = path.join(OUT, name);
  await mkdir(path.dirname(to), { recursive: true });
  if (name.endsWith('.html')) {
    await writeFile(to, normaliseHtml(await readFile(from, 'utf8')), 'utf8');
  } else if (name.endsWith('.js')) {
    await writeFile(to, normaliseJavaScript(await readFile(from, 'utf8')), 'utf8');
  } else {
    await cp(from, to);
  }
}

async function copyPublicDirectory(name) {
  await cp(path.join(ROOT, name), path.join(OUT, name), {
    recursive: true,
    filter(source) {
      const rel = path.relative(path.join(ROOT, name), source);
      if (!rel) return true;
      return !/(^|[\\/])(konto|moje-kody|szablony|drukarki|wydruk|historia-wydrukow|reset-hasla)\.html$/.test(rel);
    },
  });
  const htmlFiles = [];
  async function walk(dir) {
    const { readdir } = await import('node:fs/promises');
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(target);
      else if (entry.name.endsWith('.html')) htmlFiles.push(target);
    }
  }
  await walk(path.join(OUT, name));
  for (const file of htmlFiles) await writeFile(file, normaliseHtml(await readFile(file, 'utf8')), 'utf8');
  for (const file of htmlFiles) {
    const rel = path.relative(OUT, file).split(path.sep);
    const lang = LOCALE_DIRS.includes(rel[0]) ? rel[0] : 'en';
    const isLanding = FORMATS.includes(rel.at(-2));
    let html = await readFile(file, 'utf8');
    if (lang === 'pl') {
      html = html
        .replaceAll('href="/privacy-policy"', 'href="/pl/polityka-prywatnosci"')
        .replaceAll('href="/terms"', 'href="/pl/regulamin"');
    }
    if (isLanding) html = improveLandingSeo(html, lang, rel.at(-2));
    if (rel.at(-2) === 'ean-13') html = addEan13Tool(html, lang);
    if (FORMAT_TOOL_CONFIG[rel.at(-2)]) html = addFormatTool(html, lang, rel.at(-2));
    await writeFile(file, html, 'utf8');
  }
}

function sitemapXml() {
  const today = new Date().toISOString().slice(0, 10);
  const groups = [
    { page: '', priority: '1.0' },
    { page: 'decoder', priority: '0.9' },
    ...FORMATS.map((page) => ({ page: `${page}/`, priority: '0.7' })),
  ];
  const rows = [];
  for (const group of groups) {
    for (const lang of LANGS) {
      rows.push('  <url>');
      rows.push(`    <loc>${canonicalFor(lang, group.page)}</loc>`);
      for (const alternate of LANGS) {
        rows.push(`    <xhtml:link rel="alternate" hreflang="${alternate}" href="${canonicalFor(alternate, group.page)}"/>`);
      }
      rows.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${canonicalFor('en', group.page)}"/>`);
      rows.push(`    <lastmod>${today}</lastmod>`);
      rows.push(`    <priority>${group.priority}</priority>`);
      rows.push('  </url>');
    }
  }
  const taskGroups = [
    ['bulk-barcode-generator', 'generator-kodow-z-csv'],
    ['avery-label-printing', 'drukowanie-etykiet-avery'],
    ['warehouse-barcode-labels', 'etykiety-kreskowe-dla-magazynu'],
    ['thermal-barcode-label-printing', 'druk-kodow-na-drukarce-termicznej'],
    ['gs1-barcode-generator', 'generator-kodow-gs1'],
    ['2d-barcode-generator', 'generator-kodow-2d'],
    ...GUIDE_PAGES.map((group) => [group.en.route, group.pl.route]),
  ];
  for (const [english, polish] of taskGroups) {
    const alternatives = { en: `${BASE}/${english}`, pl: `${BASE}/pl/${polish}` };
    for (const lang of ['en', 'pl']) {
      rows.push('  <url>');
      rows.push(`    <loc>${alternatives[lang]}</loc>`);
      rows.push(`    <xhtml:link rel="alternate" hreflang="en" href="${alternatives.en}"/>`);
      rows.push(`    <xhtml:link rel="alternate" hreflang="pl" href="${alternatives.pl}"/>`);
      rows.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${alternatives.en}"/>`);
      rows.push(`    <lastmod>${today}</lastmod>`);
      rows.push('    <priority>0.8</priority>');
      rows.push('  </url>');
    }
  }
  const legalGroups = [
    ['privacy-policy', 'polityka-prywatnosci'],
    ['terms', 'regulamin'],
  ];
  for (const [english, polish] of legalGroups) {
    const alternatives = { en: `${BASE}/${english}`, pl: `${BASE}/pl/${polish}` };
    for (const lang of ['en', 'pl']) {
      rows.push('  <url>');
      rows.push(`    <loc>${alternatives[lang]}</loc>`);
      rows.push(`    <xhtml:link rel="alternate" hreflang="en" href="${alternatives.en}"/>`);
      rows.push(`    <xhtml:link rel="alternate" hreflang="pl" href="${alternatives.pl}"/>`);
      rows.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${alternatives.en}"/>`);
      rows.push(`    <lastmod>${today}</lastmod>`);
      rows.push('    <priority>0.3</priority>');
      rows.push('  </url>');
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${rows.join('\n')}\n</urlset>\n`;
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const asset of ROOT_ASSETS) await copyFile(asset);
await cp(path.join(ROOT, 'flags'), path.join(OUT, 'flags'), { recursive: true });
await writeFile(path.join(OUT, 'pwa-icon-192.png'), pwaIcon(192));
await writeFile(path.join(OUT, 'pwa-icon-512.png'), pwaIcon(512));
await mkdir(path.join(OUT, 'vendor'), { recursive: true });
await cp(path.join(ROOT, 'node_modules/pdf-lib/dist/pdf-lib.min.js'), path.join(OUT, 'vendor/pdf-lib.min.js'));
await cp(path.join(ROOT, 'node_modules/jszip/dist/jszip.min.js'), path.join(OUT, 'vendor/jszip.min.js'));
await cp(path.join(ROOT, 'node_modules/jsbarcode/dist/JsBarcode.all.min.js'), path.join(OUT, 'vendor/jsbarcode.min.js'));
await cp(path.join(ROOT, 'node_modules/qrcode-generator/qrcode.js'), path.join(OUT, 'vendor/qrcode-generator.js'));
await cp(path.join(ROOT, 'node_modules/bwip-js/dist/bwip-js-min.js'), path.join(OUT, 'vendor/bwip-js-min.js'));
await cp(path.join(ROOT, 'node_modules/@zxing/library/umd/index.min.js'), path.join(OUT, 'vendor/zxing.min.js'));
await cp(path.join(ROOT, 'node_modules/@undecaf/zbar-wasm/dist/index.js'), path.join(OUT, 'vendor/zbar-wasm.js'));
await cp(path.join(ROOT, 'node_modules/@undecaf/zbar-wasm/dist/zbar.wasm'), path.join(OUT, 'vendor/zbar.wasm'));
const barcodeDetectorPolyfill = await readFile(path.join(ROOT, 'node_modules/@undecaf/barcode-detector-polyfill/dist/index.js'), 'utf8');
await writeFile(path.join(OUT, 'vendor/barcode-detector-polyfill.js'), `${barcodeDetectorPolyfill}\nwindow.barcodeDetectorPolyfill = barcodeDetectorPolyfill;\n`, 'utf8');
await mkdir(path.join(OUT, 'licenses'), { recursive: true });
await cp(path.join(ROOT, 'node_modules/@undecaf/zbar-wasm/LICENSE'), path.join(OUT, 'licenses/zbar-wasm-LICENSE.txt'));
await cp(path.join(ROOT, 'node_modules/@undecaf/barcode-detector-polyfill/LICENSE'), path.join(OUT, 'licenses/barcode-detector-polyfill-LICENSE.txt'));
await writeFile(path.join(OUT, 'bulk-barcode-generator.html'), normaliseHtml(await readFile(path.join(ROOT, 'bulk.html'), 'utf8')), 'utf8');
await mkdir(path.join(OUT, 'pl'), { recursive: true });
await writeFile(path.join(OUT, 'pl', 'generator-kodow-z-csv.html'), normaliseHtml(await readFile(path.join(ROOT, 'bulk-pl.html'), 'utf8')), 'utf8');
await writeFile(path.join(OUT, 'gs1-barcode-generator.html'), normaliseHtml(await readFile(path.join(ROOT, 'gs1.html'), 'utf8')), 'utf8');
await writeFile(path.join(OUT, 'pl', 'generator-kodow-gs1.html'), normaliseHtml(await readFile(path.join(ROOT, 'gs1-pl.html'), 'utf8')), 'utf8');
await writeFile(path.join(OUT, '2d-barcode-generator.html'), normaliseHtml(await readFile(path.join(ROOT, 'two-d.html'), 'utf8')), 'utf8');
await writeFile(path.join(OUT, 'pl', 'generator-kodow-2d.html'), normaliseHtml(await readFile(path.join(ROOT, 'two-d-pl.html'), 'utf8')), 'utf8');
for (const dir of [...SOURCE_FORMATS, ...LOCALE_DIRS]) await copyPublicDirectory(dir);
for (const lang of LANGS) {
  const target = path.join(OUT, ...(lang === 'en' ? [] : [lang]), 'qr-code', 'index.html');
  await mkdir(path.dirname(target), { recursive: true });
  let html = normaliseHtml(qrPageHtml({ lang, langs: LANGS, base: BASE, routeFor, canonicalFor }));
  html = addFormatTool(html, lang, 'qr-code');
  await writeFile(target, html, 'utf8');
}

for (const lang of LANGS) {
  const decoderPath = lang === 'en' ? path.join(OUT, 'decoder.html') : path.join(OUT, lang, 'decoder.html');
  const decoderHtml = await readFile(decoderPath, 'utf8');
  await writeFile(
    decoderPath,
    enhanceDecoderHtml(decoderHtml, lang)
      .replace(/\s*<link[^>]+href=["'][^"']*zxing[^"']*["'][^>]*>/i, '')
      .replace(/\s*<script[^>]+src=["'][^"']*zxing[^"']*["'][^>]*><\/script>/i, ''),
    'utf8',
  );
}

const decoderI18nContext = { window: {} };
runInNewContext(await readFile(path.join(ROOT, 'i18n.js'), 'utf8'), decoderI18nContext);
const decoderTranslations = Object.fromEntries(LANGS.map((lang) => [
  lang,
  Object.fromEntries(Object.entries(decoderI18nContext.window.BARCODE_I18N[lang] || {})
    .filter(([key]) => key.startsWith('decoder_'))),
]));
const decoderI18n = `window.BARCODE_I18N=${JSON.stringify(decoderTranslations)};`;
const decoderI18nVersion = createHash('sha256').update(decoderI18n).digest('hex').slice(0, 12);
await writeFile(path.join(OUT, 'decoder-i18n.js'), decoderI18n, 'utf8');

const decoderContent = [
  path.join(OUT, 'decoder.html'),
  ...LOCALE_DIRS.map((lang) => path.join(OUT, lang, 'decoder.html')),
  'decoder.js', 'analytics.js',
];
const [{ css: decoderCss }] = await new PurgeCSS().purge({
  content: decoderContent,
  css: ['styles.css'],
  keyframes: true,
  fontFace: true,
  variables: true,
  safelist: {
    standard: ['active', 'copied', 'drag-over', 'loading', 'open', 'scanning', 'visible'],
    deep: [/^camera-/, /^cookie-/, /^decoder-/, /^drop-/, /^error-/, /^flag-/, /^lang-/, /^preview-/, /^result-/, /^scan-/, /^spinner/, /^theme-/],
  },
});
const decoderCssVersion = createHash('sha256').update(decoderCss).digest('hex').slice(0, 12);
await writeFile(path.join(OUT, 'decoder.css'), decoderCss, 'utf8');
for (const lang of LANGS) {
  const decoderPath = lang === 'en' ? path.join(OUT, 'decoder.html') : path.join(OUT, lang, 'decoder.html');
  const prefix = lang === 'en' ? '' : '../';
  const html = (await readFile(decoderPath, 'utf8'))
    .replace(new RegExp(`${prefix.replaceAll('.', '\\.') }styles\\.css\\?v=[a-f0-9]+`, 'g'), `${prefix}decoder.css?v=${decoderCssVersion}`)
    .replace(new RegExp(`${prefix.replaceAll('.', '\\.') }i18n\\.js\\?v=[a-f0-9]+`, 'g'), `${prefix}decoder-i18n.js?v=${decoderI18nVersion}`);
  await writeFile(decoderPath, html, 'utf8');
}

for (const group of TASK_PAGES) {
  await writeFile(path.join(OUT, `${group.en.route}.html`), normaliseHtml(taskPageHtml(group.en, 'en', group.pl).replace('styles.css', 'bulk.css')), 'utf8');
  await writeFile(path.join(OUT, 'pl', `${group.pl.route}.html`), normaliseHtml(taskPageHtml(group.pl, 'pl', group.en).replace('styles.css', 'bulk.css')), 'utf8');
}

for (const group of GUIDE_PAGES) {
  for (const [lang, page, alternate] of [['en', group.en, group.pl], ['pl', group.pl, group.en]]) {
    const target = path.join(OUT, lang === 'pl' ? 'pl' : '', `${page.route}.html`);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, normaliseHtml(guidePageHtml(page, lang, alternate)), 'utf8');
  }
}

for (const lang of LANGS) {
  const targetDir = lang === 'en' ? OUT : path.join(OUT, lang);
  await mkdir(targetDir, { recursive: true });
  for (const page of PRIVATE_PAGES) {
    const localizedSource = path.join(ROOT, `${page}.html`);
    const source = await readFile(localizedSource, 'utf8');
    await writeFile(path.join(targetDir, `${page}.html`), localisePrivateHtml(source, lang, page), 'utf8');
  }
}

const resetSource = await readFile(path.join(ROOT, 'reset-hasla.html'), 'utf8');
for (const lang of LOCALE_DIRS) {
  await writeFile(path.join(OUT, lang, 'reset-hasla.html'), localisePrivateHtml(resetSource, lang, 'reset-hasla'), 'utf8');
}

const polishLegal = [
  ['polityka-prywatnosci.html', 'polityka-prywatnosci.html'],
  ['regulamin.html', 'regulamin.html'],
];
for (const [source, target] of polishLegal) {
  const html = normaliseHtml(await readFile(path.join(ROOT, source), 'utf8'));
  await writeFile(path.join(OUT, 'pl', target), html.replace(/href="index(?:\.html)?"/g, 'href="/pl/"'), 'utf8');
}

const landingContent = [
  'index.html',
  ...LOCALE_DIRS.map((lang) => `${lang}/index.html`),
  ...['app.js', 'i18n.js', 'label-renderer.js', 'analytics.js', 'appearance.js', 'auth-ui.js', 'db-codes.js', 'supabase-client.js']
    .map((name) => name),
];
const [{ css: purgedLandingCss }] = await new PurgeCSS().purge({
  content: landingContent,
  css: ['styles.css'],
  keyframes: true,
  fontFace: true,
  variables: true,
  safelist: {
    standard: ['active', 'copied', 'error', 'hidden', 'light', 'loading', 'show', 'success', 'visible'],
    deep: [/^ad-/, /^cookie-/, /^has-/, /^is-/, /^modal/, /^print/, /^qr-/, /^toast/],
  },
});
const cssResult = new CleanCSS({ level: 1, rebase: false }).minify(purgedLandingCss);
if (cssResult.errors.length) throw new Error(`Could not minify landing CSS: ${cssResult.errors.join('; ')}`);
const landingCss = cssResult.styles;
const landingCssVersion = createHash('sha256').update(landingCss).digest('hex').slice(0, 12);
await writeFile(path.join(OUT, 'landing.css'), landingCss, 'utf8');
const appSource = normaliseJavaScript(await readFile(path.join(ROOT, 'app.js'), 'utf8'));
const prefillSource = await readFile(path.join(ROOT, 'generator-prefill.js'), 'utf8');
const landingAppBase = appSource.replace(
  /    \/\/ The gallery sits below the generator on mobile,[\s\S]*?    }\r?\n\r?\n    syncTypeUI\(\);/,
  `    // Render previews as soon as the browser is idle, without delaying them long enough to leave visible empty cards.\n    addEventListener('load', () => {\n        if ('requestIdleCallback' in window) requestIdleCallback(renderPopularPreviews, { timeout: 800 });\n        else setTimeout(renderPopularPreviews, 200);\n    }, { once: true });\n\n    syncTypeUI();`,
);
if (landingAppBase === appSource) throw new Error('Could not create deferred landing app bundle.');
const immediateLandingApp = landingAppBase
  .replace(/^document\.addEventListener\('DOMContentLoaded', \(\) => \{/, '(() => {')
  .replace(/\}\);\s*$/, '})();');
if (immediateLandingApp === landingAppBase) throw new Error('Could not create immediate landing app initializer.');
const landingAppSource = [
  await readFile(path.join(ROOT, 'node_modules/jsbarcode/dist/JsBarcode.all.min.js'), 'utf8'),
  await readFile(path.join(ROOT, 'node_modules/qrcode-generator/qrcode.js'), 'utf8'),
  await readFile(path.join(ROOT, 'i18n.js'), 'utf8'),
  "window.dispatchEvent(new Event('barcode:i18n-ready'));",
  await readFile(path.join(ROOT, 'label-renderer.js'), 'utf8'),
  immediateLandingApp,
  prefillSource,
].join('\n');
const minifiedLandingApp = await minify(landingAppSource, {
  compress: { passes: 2 },
  mangle: true,
  format: { comments: false },
});
if (!minifiedLandingApp.code) throw new Error('Could not minify landing app bundle.');
const landingApp = minifiedLandingApp.code;
const landingAppVersion = createHash('sha256').update(landingApp).digest('hex').slice(0, 12);
await writeFile(path.join(OUT, 'app-landing.js'), landingApp, 'utf8');
const landingLoader = `(function(){function load(){var s=document.createElement('script');s.src='/app-landing.js?v=${landingAppVersion}';document.body.appendChild(s)}function ready(){requestAnimationFrame(load)}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',ready,{once:true})}else{ready()}})();`;
const landingLoaderVersion = createHash('sha256').update(landingLoader).digest('hex').slice(0, 12);
await writeFile(path.join(OUT, 'landing-loader.js'), landingLoader, 'utf8');
const criticalThemeControl = `<script>(function(){var b=document.getElementById('theme-toggle');if(!b)return;b.addEventListener('click',function(e){e.stopImmediatePropagation();var d=document.documentElement,c=d.getAttribute('data-theme'),n=c==='dark'?'light':'dark';d.setAttribute('data-theme',n);try{localStorage.setItem('barcode-theme',n)}catch(_){}})})();</script>`;
const qrDiscoveryLabels = {
  en: 'Learn more about QR codes', pl: 'Więcej o kodach QR', de: 'Mehr über QR-Codes',
  fr: 'En savoir plus sur les QR codes', es: 'Más sobre códigos QR', it: 'Scopri di più sui codici QR',
  pt: 'Saiba mais sobre códigos QR', nl: 'Meer over QR-codes', cs: 'Více o QR kódech', uk: 'Докладніше про QR-коди',
};
for (const lang of LANGS) {
  const landingPath = lang === 'en' ? path.join(OUT, 'index.html') : path.join(OUT, lang, 'index.html');
  const prefix = lang === 'en' ? '' : '../';
  let html = (await readFile(landingPath, 'utf8'))
    .replace(/\s*<script defer src="\/vendor\/(?:jsbarcode\.min|qrcode-generator)\.js"><\/script>/g, '')
    .replace(new RegExp(`\\s*<script defer src="${prefix.replaceAll('.', '\\.')}(?:i18n|label-renderer)\\.js\\?v=[a-f0-9]+"><\\/script>`, 'g'), '')
    .replace(new RegExp(`${prefix.replaceAll('.', '\\.') }app\\.js\\?v=[a-f0-9]+`, 'g'), `${prefix}landing-loader.js?v=${landingLoaderVersion}`);
  html = html.replace(
    `<script defer src="${prefix}landing-loader.js?v=${landingLoaderVersion}"></script>`,
    `${criticalThemeControl}<script defer src="${prefix}landing-loader.js?v=${landingLoaderVersion}"></script>`,
  );
  if (lang === 'en') {
    html = html.replace('</head>', '    <meta name="google-site-verification" content="rU82pkm5jXvVq8joqzYzgD_fHJrA1SbdmtGTAjDScLE">\n</head>');
  }
  const qrRoute = routeFor(lang, 'qr-code/');
  const qrLink = `<a class="popular-card__more" href="${qrRoute}">${qrDiscoveryLabels[lang]}</a>`;
  const wrappedQr = /(<div class="popular-card-wrap"><button type="button" class="popular-card" data-format="QR"[\s\S]*?<\/button>)(<\/div>)/;
  const bareQr = /(<button type="button" class="popular-card" data-format="QR"[\s\S]*?<\/button>)/;
  html = wrappedQr.test(html)
    ? html.replace(wrappedQr, `$1${qrLink}$2`)
    : html.replace(bareQr, `<div class="popular-card-wrap">$1${qrLink}</div>`);
  await writeFile(
    landingPath,
    html.replace(new RegExp(`${prefix.replaceAll('.', '\\.') }styles\\.css\\?v=[a-f0-9]+`, 'g'), `${prefix}landing.css?v=${landingCssVersion}`),
    'utf8',
  );
}

await writeFile(path.join(OUT, 'sitemap.xml'), sitemapXml(), 'utf8');
const precache = [
  '/', '/pl/', '/decoder', '/pl/decoder',
  '/bulk-barcode-generator', '/pl/generator-kodow-z-csv',
  '/gs1-barcode-generator', '/pl/generator-kodow-gs1',
  '/2d-barcode-generator', '/pl/generator-kodow-2d',
  ...GUIDE_PAGES.flatMap((group) => [`/${group.en.route}`, `/pl/${group.pl.route}`]),
  '/qr-code/', '/pl/qr-code/',
  '/manifest.webmanifest', '/pwa-icon-192.png', '/pwa-icon-512.png', '/favicon.svg',
  '/landing.css', '/decoder.css', '/ean13-inline.css', '/format-inline.css', '/styles.css', '/bulk.css', '/gs1.css', '/two-d.css',
  '/app-landing.js', '/landing-loader.js', '/app.js', '/decoder.js', '/decoder-i18n.js', '/ean13-inline.js', '/format-inline.js', '/i18n.js', '/label-renderer.js', '/analytics.js', '/appearance.js',
  '/pwa-register.js', '/auth-ui.js', '/supabase-client.js', '/supabase-config.js', '/db-codes.js',
  '/account-dialogs.js', '/bulk.js', '/bulk-export.js', '/bulk-job-state.js', '/csv-import.js', '/csv-worker.js',
  '/db-jobs.js', '/gs1.js', '/gs1-generator.js', '/two-d-generator.js', '/specialized-save.js',
  '/vendor/jsbarcode.min.js', '/vendor/qrcode-generator.js', '/vendor/zxing.min.js',
  '/vendor/zbar-wasm.js', '/vendor/zbar.wasm', '/vendor/barcode-detector-polyfill.js',
  '/vendor/pdf-lib.min.js', '/vendor/jszip.min.js', '/vendor/bwip-js-min.js',
  ...FLAG_CODES.flatMap((code) => [`/flags/${code}.png`, `/flags/${code}@2x.png`]),
];
const serviceWorkerTemplate = await readFile(path.join(ROOT, 'service-worker.template.js'), 'utf8');
const serviceWorkerTemplateVersion = createHash('sha256').update(serviceWorkerTemplate).digest('hex').slice(0, 12);
const pwaVersion = createHash('sha256')
  .update(JSON.stringify([...ASSET_VERSIONS, landingCssVersion, landingAppVersion, landingLoaderVersion, serviceWorkerTemplateVersion, precache]))
  .digest('hex')
  .slice(0, 12);
const serviceWorker = serviceWorkerTemplate
  .replace('__PWA_VERSION__', pwaVersion)
  .replace('__PRECACHE__', JSON.stringify(precache, null, 4));
await writeFile(path.join(OUT, 'service-worker.js'), serviceWorker, 'utf8');
console.log(`Built production site in ${OUT} (${(sitemapXml().match(/<loc>/g) || []).length} sitemap URLs).`);
