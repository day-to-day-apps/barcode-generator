// @ts-check
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_ROOT = path.resolve(process.cwd(), 'tests', 'artifacts');

function walkMeta(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMeta(full, out);
    else if (entry.isFile() && entry.name === 'meta.json') {
      try {
        const meta = JSON.parse(fs.readFileSync(full, 'utf-8'));
        meta._path = path.relative(ARTIFACTS_ROOT, path.dirname(full)).replace(/\\/g, '/');
        out.push(meta);
      } catch (_) { /* ignore corrupt */ }
    }
  }
  return out;
}

function renderIndexHtml(metas) {
  const rows = metas.map((m) => `
    <article class="card">
      <header><strong>${m.scenario}</strong> · ${m.lang}/${m.theme}/${m.viewport}</header>
      <img loading="lazy" src="${m._path}/full-page.png" alt="${m.scenario} ${m.lang} ${m.theme}" />
      <footer>axe:${m.axeViolations} · console:${m.consoleErrors} · net:${m.networkErrors} · ${m.status}</footer>
    </article>`).join('');
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Artifacts index</title>
<style>body{font:14px system-ui;margin:1rem;background:#0a0a0a;color:#eee}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem}
.card{background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:.5rem}
.card img{width:100%;height:auto;display:block;border-radius:4px}
.card header,.card footer{font-size:12px;padding:.25rem 0}
.card footer{color:#aaa}</style></head>
<body><h1>Artifacts (${metas.length})</h1><div class="grid">${rows}</div></body></html>`;
}

export default async function globalTeardown() {
  const metas = walkMeta(ARTIFACTS_ROOT);
  fs.writeFileSync(path.join(ARTIFACTS_ROOT, 'INDEX.json'), JSON.stringify(metas, null, 2), 'utf-8');
  fs.writeFileSync(path.join(ARTIFACTS_ROOT, 'INDEX.html'), renderIndexHtml(metas), 'utf-8');
  // eslint-disable-next-line no-console
  console.log(`\n[artifacts] indexed ${metas.length} entries → tests/artifacts/INDEX.{json,html}`);
}
