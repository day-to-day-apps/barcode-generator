import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'dist');
const BASE = 'https://barcode-generator.daytodayapps.com';
const LANGS = ['en', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'cs', 'uk'];
const LOCALE_DIRS = LANGS.filter((lang) => lang !== 'en');
const FORMATS = ['ean-13', 'code-128', 'upc-a', 'code-39', 'itf-14', 'codabar'];
const PRIVATE_PAGES = ['konto', 'moje-kody', 'szablony', 'drukarki', 'wydruk', 'historia-wydrukow'];
const ROOT_ASSETS = [
  '404.html', '_headers', '_redirects', 'ads.txt', 'robots.txt', 'favicon.svg', 'og-image.svg',
  'analytics.js', 'app.js', 'auth-email-password.js', 'auth-ui.js', 'account-page.js',
  'csv-import.js', 'csv-worker.js', 'dashboard-stats.js', 'db-codes.js', 'db-jobs.js',
  'db-printers.js', 'db-templates.js', 'decoder.js', 'i18n.js', 'label-renderer.js',
  'nav-enhance.js', 'print-builder.js', 'printer-presets.json', 'reset-password-page.js',
  'styles.css', 'supabase-client.js', 'supabase-config.js',
  'index.html', 'decoder.html', 'konto.html', 'moje-kody.html', 'szablony.html',
  'drukarki.html', 'wydruk.html', 'historia-wydrukow.html', 'reset-hasla.html',
  'privacy-policy.html', 'terms.html', 'kalibracja-druku.html',
];

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
    .replace(/href=(['"])(?:\.\.\/)?regulamin\1/g, 'href="/terms"');
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
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${rows.join('\n')}\n</urlset>\n`;
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const asset of ROOT_ASSETS) await copyFile(asset);
for (const dir of [...FORMATS, ...LOCALE_DIRS]) await copyPublicDirectory(dir);

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

await writeFile(path.join(OUT, 'sitemap.xml'), sitemapXml(), 'utf8');
console.log(`Built production site in ${OUT} (80 sitemap URLs).`);
