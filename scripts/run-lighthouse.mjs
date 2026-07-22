import { mkdir, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const mode = process.argv[2];
if (!['mobile', 'desktop'].includes(mode)) throw new Error('Usage: node scripts/run-lighthouse.mjs <mobile|desktop>');

const ROOT = process.cwd();
const config = path.join(ROOT, `lighthouserc-${mode}.cjs`);

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: ROOT, windowsHide: true, ...options });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => { stdout += chunk; if (options.echo !== false) process.stdout.write(chunk); });
    child.stderr?.on('data', (chunk) => { stderr += chunk; if (options.echo !== false) process.stderr.write(chunk); });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

if (process.platform !== 'win32') {
  const cli = path.join(ROOT, 'node_modules', '@lhci', 'cli', 'src', 'cli.js');
  const result = await run(process.execPath, [cli, 'autorun', `--config=${config}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  process.exit(result.code || 0);
}

const port = mode === 'mobile' ? 8766 : 8767;
const urls = ['/', '/decoder', '/es/ean-13/', '/code-128/', '/qr-code/', '/bulk-barcode-generator'];
const thresholds = { performance: mode === 'mobile' ? 0.85 : 0.90, accessibility: 0.95, 'best-practices': 0.95, seo: 0.95 };
const outputDir = path.join(ROOT, '.lighthouseci', mode);
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const server = spawn(process.execPath, ['scripts/serve.mjs', '--port', String(port)], {
  cwd: ROOT,
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Preview server did not start in time')), 15000);
  server.stdout.on('data', (chunk) => {
    if (String(chunk).includes('Production preview')) {
      clearTimeout(timer);
      resolve();
    }
  });
  server.once('exit', (code) => reject(new Error(`Preview server exited early (${code})`)));
});

let failed = false;
try {
  for (const route of urls) {
    const slug = route === '/' ? 'home' : route.slice(1).replaceAll('/', '-');
    const lighthouseCli = path.join(ROOT, 'node_modules', 'lighthouse', 'cli', 'index.js');
    const validReports = [];
    for (let attempt = 1; attempt <= 5 && validReports.length < 3; attempt++) {
      const reportPath = path.join(outputDir, `${slug}-${attempt}.report.json`);
      const args = [
        lighthouseCli,
        `http://127.0.0.1:${port}${route}`,
        '--quiet',
        '--output=json',
        `--output-path=${reportPath}`,
        '--only-categories=performance,accessibility,best-practices,seo',
        '--chrome-flags=--headless --no-sandbox',
      ];
      if (mode === 'mobile') {
        args.push('--form-factor=mobile', '--screen-emulation.mobile=true', '--screen-emulation.width=390', '--screen-emulation.height=844', '--screen-emulation.deviceScaleFactor=2.75');
      } else {
        args.push('--preset=desktop');
      }

      const result = await run(process.execPath, args, { echo: false });
      let report;
      try { report = JSON.parse(await readFile(reportPath, 'utf8')); } catch (_) { /* retry below */ }
      const cleanupOnlyFailure = result.code !== 0 && /EPERM[\s\S]*lighthouse\./i.test(result.stderr) && report?.categories;
      if (result.code === 0 || cleanupOnlyFailure) {
        if (report?.categories) validReports.push(report);
      } else {
        console.warn(`${route}: Lighthouse attempt ${attempt} did not complete; retrying.`);
      }
    }
    if (validReports.length < 3) throw new Error(`Lighthouse produced only ${validReports.length}/3 valid reports for ${route}`);

    const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
    const scores = Object.fromEntries(Object.keys(thresholds).map((key) => [key, median(validReports.map((report) => report.categories[key].score))]));
    const summary = Object.entries(scores).map(([key, value]) => `${key}=${Math.round(value * 100)}`).join(' ');
    const performanceRuns = validReports.map((report) => Math.round(report.categories.performance.score * 100)).join('/');
    console.log(`${route} ${summary} (performance runs: ${performanceRuns})`);
    for (const [key, minimum] of Object.entries(thresholds)) {
      if (scores[key] < minimum) {
        failed = true;
        console.error(`${route}: ${key} expected >= ${Math.round(minimum * 100)}, found ${Math.round(scores[key] * 100)}`);
      }
    }
  }
} finally {
  server.kill('SIGTERM');
}

if (failed) process.exit(1);
