import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { PurgeCSS } from 'purgecss';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'dist');
const BASE = 'https://barcode-generator.daytodayapps.com';
const LANGS = ['en', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'cs', 'uk'];
const LOCALE_DIRS = LANGS.filter((lang) => lang !== 'en');
const FORMATS = ['ean-13', 'code-128', 'upc-a', 'code-39', 'itf-14', 'codabar'];
const PRIVATE_PAGES = ['konto', 'moje-kody', 'szablony', 'drukarki', 'wydruk', 'historia-wydrukow'];
const ROOT_ASSETS = [
  '404.html', '_headers', '_redirects', 'ads.txt', 'robots.txt', 'favicon.svg', 'og-image.svg',
  'googlec18ae46a3db92f98.html',
  'analytics.js', 'app.js', 'auth-email-password.js', 'auth-ui.js', 'account-page.js',
  'bulk.js', 'bulk-export.js', 'bulk.css',
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
    .replace(/(href=(['"]))(https:\/\/barcode-generator\.daytodayapps\.com[^'"?#]*)\.html(?=([?#'" ]))/g, '$1$3')
    .replace(/(content=(['"]))(https:\/\/barcode-generator\.daytodayapps\.com[^'"?#]*)\.html(?=([?#'" ]))/g, '$1$3')
    .replace(/href=(['"])([^'":#?]+)\.html([?#][^'"]*)?\1/g, (_m, q, target, suffix = '') => `href=${q}${target}${suffix}${q}`)
    .replace(/href=(['"])(?:\.\.\/)?polityka-prywatnosci\1/g, 'href="/privacy-policy"')
    .replace(/href=(['"])(?:\.\.\/)?regulamin\1/g, 'href="/terms"')
    .replace(/\s*<link[^>]+https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>/gi, '')
    .replace(/<script(?![^>]*\b(?:defer|async)\b)(?![^>]*type=['"]module['"])([^>]*\bsrc=[^>]*)>/gi, '<script defer$1>')
    .replace(ASSET_REF_RE, (_match, prefix, name) => `${prefix}${name}?v=${ASSET_VERSIONS.get(name)}`)
    .replace(/<script type="module" src="([^"]*auth-ui\.js\?v=[^"]+)"\s*><\/script>/gi, (_match, source) => {
      const moduleUrl = source.startsWith('.') || source.startsWith('/') ? source : `./${source}`;
      return `<script type="module">addEventListener("load",()=>setTimeout(()=>import("${moduleUrl}"),10000),{once:true});</script>`;
    });
  const analyticsScript = output.match(/\s*<script defer[^>]*src=["'][^"']*analytics\.js[^"']*["'][^>]*><\/script>/i)?.[0];
  if (analyticsScript) {
    output = output
      .replace(analyticsScript, '')
      .replace(/(<body[^>]*>)/i, `$1\n${analyticsScript.trim()}`);
  }
  if ((output.match(/<h1\b/gi) || []).length > 1) {
    output = output.replace(/<h1>([\s\S]*?)<\/h1>/i, '<div class="brand-heading">$1</div>');
  }
  return output;
}

function textContent(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function clipDescription(value) {
  if (value.length <= 155) return value;
  return `${value.slice(0, 152).replace(/\s+\S*$/, '')}...`;
}

function improveLandingSeo(html, lang) {
  let output = html.replaceAll('{{', '{').replaceAll('}}', '}');
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

const TASK_PAGES = [
  {
    en: { route: 'avery-label-printing', title: 'Print Barcode Labels on Avery Sheets', description: 'Create precise barcode labels for Avery L7160, L7163, 5160 and 5163 sheets. Validate dimensions and export a print-ready PDF.', h1: 'Print barcode labels on Avery sheets', lead: 'Choose the correct A4 or Letter preset, import product data and generate a PDF that matches the physical label sheet.', steps: ['Choose the exact Avery product number', 'Import a CSV or add barcode values', 'Export PDF and print at 100% scale'], faq: ['Are Avery 5160 and L7160 the same?', 'No. 5160 uses US Letter with 30 labels; L7160 uses A4 with 21 labels.'], links: [['Open the bulk generator', '/bulk-barcode-generator'], ['Calibrate your printer', '/kalibracja-druku'], ['EAN-13 guide', '/ean-13/']] },
    pl: { route: 'drukowanie-etykiet-avery', title: 'Drukowanie kodów na etykietach Avery', description: 'Twórz precyzyjne etykiety z kodami dla arkuszy Avery L7160, L7163, 5160 i 5163. Pobierz gotowy do druku PDF.', h1: 'Drukowanie kodów kreskowych na etykietach Avery', lead: 'Wybierz właściwy format A4 lub Letter, zaimportuj produkty i wygeneruj PDF dopasowany do fizycznego arkusza.', steps: ['Wybierz dokładny numer produktu Avery', 'Zaimportuj CSV lub dodaj wartości kodów', 'Pobierz PDF i drukuj w skali 100%'], faq: ['Czy Avery 5160 i L7160 to ten sam format?', 'Nie. 5160 to Letter z 30 etykietami, a L7160 to A4 z 21 etykietami.'], links: [['Otwórz generator seryjny', '/pl/generator-kodow-z-csv'], ['Skalibruj drukarkę', '/kalibracja-druku'], ['Poradnik EAN-13', '/pl/ean-13/']] },
  },
  {
    en: { route: 'warehouse-barcode-labels', title: 'Warehouse Barcode Labels from CSV', description: 'Generate warehouse barcode labels from an inventory CSV. Create Code 128 or ITF-14 labels and export PDF, PNG or SVG packages.', h1: 'Barcode labels for warehouse inventory', lead: 'Turn SKU, location and carton identifiers into consistent labels without sending inventory data to an external server.', steps: ['Export products or locations to CSV', 'Validate Code 128 or ITF-14 values', 'Print sheets or thermal labels'], faq: ['Which barcode works best in a warehouse?', 'Code 128 is a strong general choice for SKU and location labels. ITF-14 is intended for trade item cartons.'], links: [['Generate labels from CSV', '/bulk-barcode-generator'], ['Code 128 guide', '/code-128/'], ['ITF-14 guide', '/itf-14/']] },
    pl: { route: 'etykiety-kreskowe-dla-magazynu', title: 'Etykiety z kodami kreskowymi do magazynu', description: 'Generuj etykiety magazynowe z CSV. Twórz kody Code 128 lub ITF-14 i pobieraj arkusze PDF oraz paczki PNG lub SVG.', h1: 'Etykiety z kodami kreskowymi do magazynu', lead: 'Zamień SKU, lokalizacje i identyfikatory kartonów w spójne etykiety bez wysyłania danych magazynowych na zewnętrzny serwer.', steps: ['Wyeksportuj produkty lub lokalizacje do CSV', 'Sprawdź wartości Code 128 albo ITF-14', 'Wydrukuj arkusze lub etykiety termiczne'], faq: ['Jaki kod najlepiej sprawdza się w magazynie?', 'Code 128 jest uniwersalny dla SKU i lokalizacji. ITF-14 służy do oznaczania opakowań zbiorczych.'], links: [['Generuj etykiety z CSV', '/pl/generator-kodow-z-csv'], ['Poradnik Code 128', '/pl/code-128/'], ['Poradnik ITF-14', '/pl/itf-14/']] },
  },
  {
    en: { route: 'thermal-barcode-label-printing', title: 'Thermal Barcode Label Printing', description: 'Prepare barcode labels for Zebra, Brother, Dymo and 100×150 mm thermal printers. Export exact-size PDFs and calibrate offsets.', h1: 'Print barcode labels on a thermal printer', lead: 'Use exact media dimensions, a 100% print scale and calibration offsets to produce reliable labels for common thermal printers.', steps: ['Choose the physical label size', 'Generate and preview the barcode batch', 'Print at 100% scale and calibrate offsets'], faq: ['Should I select Fit to page?', 'No. Use actual size or 100% scale; automatic fitting changes barcode and label dimensions.'], links: [['Create a thermal PDF', '/bulk-barcode-generator'], ['Open calibration page', '/kalibracja-druku'], ['Code 39 guide', '/code-39/']] },
    pl: { route: 'druk-kodow-na-drukarce-termicznej', title: 'Druk kodów na drukarce termicznej', description: 'Przygotuj kody dla drukarek Zebra, Brother, Dymo i etykiet 100×150 mm. Pobierz PDF w dokładnym rozmiarze i skalibruj przesunięcia.', h1: 'Druk kodów kreskowych na drukarce termicznej', lead: 'Ustaw fizyczny rozmiar nośnika, skalę 100% i przesunięcia kalibracyjne, aby uzyskać powtarzalne etykiety termiczne.', steps: ['Wybierz fizyczny rozmiar etykiety', 'Wygeneruj i sprawdź paczkę kodów', 'Drukuj w skali 100% i skalibruj przesunięcia'], faq: ['Czy należy włączyć opcję Dopasuj do strony?', 'Nie. Użyj rozmiaru rzeczywistego lub skali 100%, ponieważ dopasowanie zmienia wymiary kodu i etykiety.'], links: [['Utwórz PDF termiczny', '/pl/generator-kodow-z-csv'], ['Otwórz kalibrację', '/kalibracja-druku'], ['Poradnik Code 39', '/pl/code-39/']] },
  },
];

function taskPageHtml(page, lang, alternate) {
  const canonical = `${BASE}/${lang === 'pl' ? `pl/${page.route}` : page.route}`;
  const altUrl = `${BASE}/${lang === 'pl' ? alternate.route : `pl/${alternate.route}`}`;
  const languageName = lang === 'pl' ? 'Polski' : 'English';
  const toolLabel = lang === 'pl' ? 'Narzędzie' : 'Tool';
  const howLabel = lang === 'pl' ? 'Jak to zrobić' : 'How it works';
  const faqLabel = lang === 'pl' ? 'Najczęstsze pytanie' : 'Common question';
  const json = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebPage', name: page.h1, description: page.description, url: canonical, inLanguage: lang },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: toolLabel, item: `${BASE}/${lang === 'pl' ? 'pl/' : ''}` }, { '@type': 'ListItem', position: 2, name: page.h1, item: canonical }] },
      { '@type': 'HowTo', name: page.h1, step: page.steps.map((text, index) => ({ '@type': 'HowToStep', position: index + 1, name: text, text })) },
      { '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: page.faq[0], acceptedAnswer: { '@type': 'Answer', text: page.faq[1] } }] },
    ],
  };
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${page.title}</title><meta name="description" content="${page.description}"><link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="${lang}" href="${canonical}"><link rel="alternate" hreflang="${lang === 'pl' ? 'en' : 'pl'}" href="${altUrl}"><link rel="alternate" hreflang="x-default" href="${lang === 'en' ? canonical : altUrl}"><meta property="og:title" content="${page.title}"><meta property="og:description" content="${page.description}"><meta property="og:url" content="${canonical}"><meta property="og:type" content="article"><meta property="og:image" content="${BASE}/og-image.svg"><link rel="icon" href="${lang === 'pl' ? '../' : ''}favicon.svg"><link rel="stylesheet" href="${lang === 'pl' ? '../' : ''}styles.css"><script type="application/ld+json">${JSON.stringify(json)}</script></head><body class="bulk-page task-page"><header class="bulk-header"><a class="bulk-brand" href="/${lang === 'pl' ? 'pl/' : ''}">Barcode Generator</a><nav aria-label="${lang === 'pl' ? 'Główna' : 'Primary'}"><a href="${page.links[0][1]}">${toolLabel}</a><a href="/${lang === 'pl' ? 'pl/' : ''}decoder">Decoder</a><a href="${altUrl}">${languageName === 'Polski' ? 'EN' : 'PL'}</a></nav></header><main class="task-shell"><p class="task-kicker">${lang === 'pl' ? 'Poradnik i narzędzie' : 'Guide and tool'}</p><h1>${page.h1}</h1><p class="task-lead">${page.lead}</p><a class="btn-primary task-cta" href="${page.links[0][1]}">${page.links[0][0]}</a><section><h2>${howLabel}</h2><ol class="task-steps">${page.steps.map((step) => `<li><strong>${step}</strong></li>`).join('')}</ol></section><section><h2>${faqLabel}</h2><details open><summary>${page.faq[0]}</summary><p>${page.faq[1]}</p></details></section><nav class="task-links" aria-label="Related">${page.links.slice(1).map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</nav></main><footer class="footer"><p class="footer-links">© 2026 Barcode Generator · <a href="/${lang === 'pl' ? 'pl/polityka-prywatnosci' : 'privacy-policy'}">Privacy</a> · <a href="https://daytodayapps.com/narzedzia/">Day to Day Apps</a></p></footer><script src="${lang === 'pl' ? '../' : ''}analytics.js" defer></script></body></html>`;
}

function localisePrivateHtml(source, lang, page) {
  const prefix = lang === 'en' ? '' : '../';
  let html = source
    .replace(/<html lang=(['"])[^'"]+\1/, `<html lang="${lang}"`)
    .replace(/<link rel="canonical" href="[^"]+">/, `<link rel="canonical" href="${canonicalFor(lang, page)}">`);

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
    if (isLanding) html = improveLandingSeo(html, lang);
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
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${rows.join('\n')}\n</urlset>\n`;
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const asset of ROOT_ASSETS) await copyFile(asset);
await mkdir(path.join(OUT, 'vendor'), { recursive: true });
await cp(path.join(ROOT, 'node_modules/pdf-lib/dist/pdf-lib.min.js'), path.join(OUT, 'vendor/pdf-lib.min.js'));
await cp(path.join(ROOT, 'node_modules/jszip/dist/jszip.min.js'), path.join(OUT, 'vendor/jszip.min.js'));
await cp(path.join(ROOT, 'node_modules/jsbarcode/dist/JsBarcode.all.min.js'), path.join(OUT, 'vendor/jsbarcode.min.js'));
await writeFile(path.join(OUT, 'bulk-barcode-generator.html'), normaliseHtml(await readFile(path.join(ROOT, 'bulk.html'), 'utf8')), 'utf8');
await mkdir(path.join(OUT, 'pl'), { recursive: true });
await writeFile(path.join(OUT, 'pl', 'generator-kodow-z-csv.html'), normaliseHtml(await readFile(path.join(ROOT, 'bulk-pl.html'), 'utf8')), 'utf8');
for (const dir of [...FORMATS, ...LOCALE_DIRS]) await copyPublicDirectory(dir);

for (const group of TASK_PAGES) {
  await writeFile(path.join(OUT, `${group.en.route}.html`), normaliseHtml(taskPageHtml(group.en, 'en', group.pl).replace('styles.css', 'bulk.css')), 'utf8');
  await writeFile(path.join(OUT, 'pl', `${group.pl.route}.html`), normaliseHtml(taskPageHtml(group.pl, 'pl', group.en).replace('styles.css', 'bulk.css')), 'utf8');
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
  ...['app.js', 'i18n.js', 'label-renderer.js', 'analytics.js', 'auth-ui.js', 'db-codes.js', 'supabase-client.js']
    .map((name) => name),
];
const [{ css: landingCss }] = await new PurgeCSS().purge({
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
const landingCssVersion = createHash('sha256').update(landingCss).digest('hex').slice(0, 12);
await writeFile(path.join(OUT, 'landing.css'), landingCss, 'utf8');
const appSource = await readFile(path.join(ROOT, 'app.js'), 'utf8');
const landingApp = appSource.replace(
  /    \/\/ The gallery sits below the generator on mobile,[\s\S]*?    }\r?\n\r?\n    syncTypeUI\(\);/,
  `    // Decorative previews are outside the critical rendering path.\n    addEventListener('load', () => setTimeout(renderPopularPreviews, 10000), { once: true });\n\n    syncTypeUI();`,
);
if (landingApp === appSource) throw new Error('Could not create deferred landing app bundle.');
const landingAppVersion = createHash('sha256').update(landingApp).digest('hex').slice(0, 12);
await writeFile(path.join(OUT, 'app-landing.js'), landingApp, 'utf8');
for (const lang of LANGS) {
  const landingPath = lang === 'en' ? path.join(OUT, 'index.html') : path.join(OUT, lang, 'index.html');
  const prefix = lang === 'en' ? '' : '../';
  let html = (await readFile(landingPath, 'utf8'))
    .replace(new RegExp(`${prefix.replaceAll('.', '\\.') }app\\.js\\?v=[a-f0-9]+`, 'g'), `${prefix}app-landing.js?v=${landingAppVersion}`);
  if (lang === 'en') {
    html = html.replace('</head>', '    <meta name="google-site-verification" content="rU82pkm5jXvVq8joqzYzgD_fHJrA1SbdmtGTAjDScLE">\n</head>');
  }
  await writeFile(
    landingPath,
    html.replace(new RegExp(`${prefix.replaceAll('.', '\\.') }styles\\.css\\?v=[a-f0-9]+`, 'g'), `${prefix}landing.css?v=${landingCssVersion}`),
    'utf8',
  );
}

await writeFile(path.join(OUT, 'sitemap.xml'), sitemapXml(), 'utf8');
console.log(`Built production site in ${OUT} (88 sitemap URLs).`);
