// @ts-check
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const HISTORICAL_FILES = new Set([
  'SEO-INDEXING-FIX-2026-07-07.md',
]);
const TECHNICAL_HOST_CHECK_FILES = new Set([
  'scripts/check-production.mjs',
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
      if (TECHNICAL_HOST_CHECK_FILES.has(rel)) continue;

      const text = fs.readFileSync(file, 'utf8');
      for (const pattern of legacyPatterns) {
        if (pattern.test(text)) offenders.push(`${rel} :: ${pattern}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  test('production monitor verifies the exact Pages technical host redirect', () => {
    const monitor = fs.readFileSync(path.join(ROOT, 'scripts/check-production.mjs'), 'utf8');

    expect(monitor).toContain(
      "const technicalBase = 'https://barcode-generator-5ee.pages.dev';",
    );
    expect(monitor).toContain("const redirectPath = '/code-128/?monitor=1';");
    expect(monitor).toContain("assert.equal(technicalResponse.status, 301");
    expect(monitor).toContain(
      "assert.equal(technicalResponse.headers.get('location'), `${base}${redirectPath}`",
    );
    expect(monitor.match(/pages\.dev/gi)).toHaveLength(1);
    expect(monitor).not.toMatch(/workers\.dev/i);
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

  test('content security policy permits first-party WebAssembly without unsafe eval', () => {
    const headers = fs.readFileSync(path.join(ROOT, '_headers'), 'utf8');

    expect(headers).toContain("script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'");
    expect(headers).not.toMatch(/script-src[^\n]*'unsafe-eval'/);
  });

  test('authentication emails use final extensionless routes', () => {
    const authFiles = [
      'auth-email-password.js',
      'account-page.js',
      'reset-password-page.js',
      'auth-ui.js',
    ];
    const activeAuth = authFiles
      .map((file) => fs.readFileSync(path.join(ROOT, file), 'utf8'))
      .join('\n');

    expect(activeAuth).not.toMatch(/\/(?:konto|reset-hasla)\.html/);
    expect(activeAuth).toContain("redirectPath = '/konto'");
    expect(activeAuth).toContain("redirectPath = '/reset-hasla'");
  });

  test('Lighthouse profiles use isolated preview ports', () => {
    const runner = fs.readFileSync(path.join(ROOT, 'scripts/run-lighthouse.mjs'), 'utf8');
    const previewServer = fs.readFileSync(path.join(ROOT, 'scripts/serve.mjs'), 'utf8');

    expect(runner).toMatch(/mobile:[\s\S]*port: 8766/);
    expect(runner).toMatch(/desktop:[\s\S]*port: 8767/);
    expect(runner).toContain('const runsPerRoute = 3');
    expect(runner).toContain("aggregation: 'median'");
    expect(runner).toContain("'/qr-code/'");
    expect(runner).toContain("path.join(root, '.lighthouseci', mode)");
    expect(previewServer).toContain("process.argv.indexOf('--port')");
  });

  test('Playwright global setup owns one deterministic preview process', () => {
    const config = fs.readFileSync(path.join(ROOT, 'playwright.config.js'), 'utf8');
    const preview = fs.readFileSync(path.join(ROOT, 'scripts/preview.mjs'), 'utf8');
    const setup = fs.readFileSync(path.join(ROOT, 'tests/comprehensive/_helpers/global-setup.js'), 'utf8');

    expect(config).not.toContain('webServer:');
    expect(preview).toContain("import('./build.mjs')");
    expect(preview).toContain("import('./serve.mjs')");
    expect(setup).toContain("spawn(process.execPath, ['scripts/preview.mjs', '--port', '8765']");
    expect(setup).toContain("preview.kill('SIGTERM')");
    expect(setup).toContain("preview.kill('SIGKILL')");
  });
});
