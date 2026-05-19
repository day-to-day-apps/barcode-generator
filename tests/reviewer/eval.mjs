#!/usr/bin/env node
// Niezależny ewaluator: deterministyczne checki + delegacja do LLM-recenzenta.
// Operuje WYŁĄCZNIE na tests/artifacts/ i tests/reviewer/.

import { readFileSync, readdirSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const ARTIFACTS = join(ROOT, 'tests', 'artifacts');
const REVIEWER_DIR = join(ROOT, 'tests', 'reviewer');

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

function loadJsonl(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

function loadJson(file) {
  if (!existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
}

const files = walk(ARTIFACTS);
const metaFiles = files.filter((f) => f.endsWith('meta.json'));

const summary = {
  scenarios: metaFiles.length,
  a11yCritical: 0,
  a11ySerious: 0,
  consoleErrors: 0,
  pageErrors: 0,
  networkErrors: 0,
  missingArtifacts: [],
};

const issues = [];
const auditLog = [];

for (const metaPath of metaFiles) {
  const dir = dirname(metaPath);
  const rel = relative(ROOT, dir).replace(/\\/g, '/');
  auditLog.push(`${rel}/meta.json`);

  const axe = loadJson(join(dir, 'axe.json'));
  if (!axe) summary.missingArtifacts.push(`${rel}/axe.json`);
  else {
    auditLog.push(`${rel}/axe.json`);
    const violations = axe.violations || [];
    for (const v of violations) {
      if (v.impact === 'critical') summary.a11yCritical += 1;
      else if (v.impact === 'serious') summary.a11ySerious += 1;
      if (v.impact === 'critical' || v.impact === 'serious') {
        issues.push({ severity: v.impact, path: `${rel}/axe.json`, suggestion: `Fix axe rule ${v.id}: ${v.help}` });
      }
    }
  }

  const consoleEntries = loadJsonl(join(dir, 'console.jsonl'));
  if (consoleEntries.length) auditLog.push(`${rel}/console.jsonl`);
  for (const e of consoleEntries) {
    if (e.type === 'error') { summary.consoleErrors += 1; issues.push({ severity: 'high', path: `${rel}/console.jsonl`, suggestion: `Console error: ${(e.text || '').slice(0, 200)}` }); }
    if (e.type === 'pageerror') { summary.pageErrors += 1; issues.push({ severity: 'critical', path: `${rel}/console.jsonl`, suggestion: `Uncaught: ${(e.text || '').slice(0, 200)}` }); }
  }

  const netEntries = loadJsonl(join(dir, 'network-errors.jsonl'));
  if (netEntries.length) auditLog.push(`${rel}/network-errors.jsonl`);
  for (const e of netEntries) {
    summary.networkErrors += 1;
    if (e.status >= 500) issues.push({ severity: 'high', path: `${rel}/network-errors.jsonl`, suggestion: `5xx on ${e.url}` });
  }

  if (!existsSync(join(dir, 'full-page.png'))) summary.missingArtifacts.push(`${rel}/full-page.png`);
}

// Score (deterministic baseline; LLM may refine)
function clamp(v) { return Math.max(0, Math.min(25, v)); }
const a11y = clamp(25 - summary.a11yCritical * 8 - summary.a11ySerious * 2);
const consoleScore = clamp(25 - summary.pageErrors * 12 - summary.consoleErrors * 4 - Math.max(0, summary.networkErrors - 2) * 2);
const visual = clamp(25 - summary.missingArtifacts.length * 3);
const locale = 25; // pełna ocena językowa wymaga LLM — domyślnie max, recenzent koryguje
const total = a11y + consoleScore + visual + locale;
const verdict = total >= 70 ? 'PASS' : 'FAIL';

issues.sort((a, b) => ({ critical: 0, high: 1, serious: 2, moderate: 3, minor: 4 }[a.severity] ?? 9) - ({ critical: 0, high: 1, serious: 2, moderate: 3, minor: 4 }[b.severity] ?? 9));
const top5 = issues.slice(0, 5);

const timestamp = new Date().toISOString();

const reviewJson = {
  timestamp,
  verdict,
  total,
  scores: { a11y, console: consoleScore, visual, locale },
  summary,
  top5,
  auditLog: Array.from(new Set(auditLog)).sort(),
};

writeFileSync(join(REVIEWER_DIR, 'REVIEW.json'), JSON.stringify(reviewJson, null, 2), 'utf8');

const md = `# Review — ${timestamp}

## Werdykt: ${verdict} (${total}/100)

## Wyniki
- A. A11y: ${a11y}/25 — critical=${summary.a11yCritical}, serious=${summary.a11ySerious}
- B. Konsola + sieć: ${consoleScore}/25 — console.error=${summary.consoleErrors}, pageerror=${summary.pageErrors}, network=${summary.networkErrors}
- C. Wizualna: ${visual}/25 — missing artifacts=${summary.missingArtifacts.length}
- D. Lokalna spójność: ${locale}/25 — (wymaga LLM-recenzenta dla pełnej oceny)

## TOP-5 problemów
${top5.length ? top5.map((i, idx) => `${idx + 1}. [${i.severity}] ${i.suggestion} — \`${i.path}\``).join('\n') : 'Brak.'}

## Brakujące artefakty
${summary.missingArtifacts.length ? summary.missingArtifacts.map((p) => `- \`${p}\``).join('\n') : 'Brak.'}

## Audit Log
${reviewJson.auditLog.map((p) => `- \`${p}\``).join('\n')}

---
_Recenzja deterministyczna. Dla pełnej oceny osi D (lokalna spójność) uruchom LLM-recenzenta z \`reviewer-prompt.md\`._
`;

writeFileSync(join(REVIEWER_DIR, 'REVIEW.md'), md, 'utf8');

console.log(`Review complete: ${verdict} (${total}/100)`);
console.log(`  → ${relative(ROOT, join(REVIEWER_DIR, 'REVIEW.md'))}`);
console.log(`  → ${relative(ROOT, join(REVIEWER_DIR, 'REVIEW.json'))}`);
process.exit(verdict === 'PASS' ? 0 : 1);
