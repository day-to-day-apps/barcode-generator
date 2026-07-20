// @ts-check
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const HISTORICAL_FILES = new Set([
  'SEO-INDEXING-FIX-2026-07-07.md',
]);
const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'playwright-report',
  'test-results',
  '_devshots',
]);
const TEXT_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.txt',
  '.xml',
]);

function relative(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, '/');
}

function listTextFiles(dir = ROOT) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) files.push(...listTextFiles(fullPath));
      continue;
    }
    if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

test.describe('Domain and ads configuration guardrails', () => {
  test('active files do not reference legacy production hosts', () => {
    const legacyPatterns = [
      /barcode-generator-5ee\.pages\.dev/i,
      /barcode-generator\.daytodayapps-contact\.workers\.dev/i,
      /\bworkers\.dev\b/i,
      /\bpages\.dev\b/i,
    ];
    const offenders = [];

    for (const file of listTextFiles()) {
      const rel = relative(file);
      if (rel === 'tests/domain-ads-config.spec.js') continue;
      if (HISTORICAL_FILES.has(rel)) continue;

      const text = fs.readFileSync(file, 'utf8');
      for (const pattern of legacyPatterns) {
        if (pattern.test(text)) offenders.push(`${rel} :: ${pattern}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  test('_redirects leaves canonical host enforcement to Cloudflare Bulk Redirects', () => {
    const redirects = fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8');

    expect(redirects).toContain('Cloudflare Bulk Redirects');
    expect(redirects).not.toMatch(/pages\.dev|workers\.dev/i);
  });

  test('AdSense bootstrap has no fake slot IDs or broken consent callback', () => {
    const analytics = fs.readFileSync(path.join(ROOT, 'analytics.js'), 'utf8');

    expect(analytics).toContain("ADSENSE_PUBLISHER_ID = 'ca-pub-2527047257613855'");
    expect(analytics).not.toMatch(/000000000\d/);
    expect(analytics).not.toContain(['inject', 'SidebarAds'].join(''));
    expect(analytics).toContain("slot.dataset.adSkipped = 'missing-ad-slot'");
    expect(analytics).toContain("'sticky-bottom': { id: '', enabled: false");
  });

  test('mobile sticky ad is hidden until JavaScript marks it ready', () => {
    const styles = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');

    expect(styles).toContain('.ad-sticky-bottom.is-ready');
    expect(styles).not.toMatch(/@media\s*\(max-width:\s*900px\)\s*{\s*\.ad-sticky-bottom\s*{/);
  });

  test('Lighthouse profiles use isolated preview ports', () => {
    const mobile = fs.readFileSync(path.join(ROOT, 'lighthouserc-mobile.cjs'), 'utf8');
    const desktop = fs.readFileSync(path.join(ROOT, 'lighthouserc-desktop.cjs'), 'utf8');
    const previewServer = fs.readFileSync(path.join(ROOT, 'scripts/serve.mjs'), 'utf8');

    expect(mobile).toContain("scripts/serve.mjs --port 8766");
    expect(mobile).toContain('http://127.0.0.1:8766/');
    expect(desktop).toContain("scripts/serve.mjs --port 8767");
    expect(desktop).toContain('http://127.0.0.1:8767/');
    expect(previewServer).toContain("process.argv.indexOf('--port')");
  });
});
