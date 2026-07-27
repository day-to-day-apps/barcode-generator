import { mkdir, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import * as chromeLauncher from 'chrome-launcher';

const profiles = {
  mobile: {
    port: 8766,
    minimums: {
      performance: 0.85,
      accessibility: 0.95,
      'best-practices': 0.95,
      seo: 0.95,
    },
    settings: {
      formFactor: 'mobile',
      screenEmulation: {
        mobile: true,
        width: 390,
        height: 844,
        deviceScaleFactor: 2.75,
        disabled: false,
      },
    },
  },
  desktop: {
    port: 8767,
    minimums: {
      performance: 0.9,
      accessibility: 0.95,
      'best-practices': 0.95,
      seo: 0.95,
    },
    config: desktopConfig,
  },
};

const routes = [
  '/',
  '/decoder',
  '/es/ean-13/',
  '/code-128/',
  '/qr-code/',
  '/bulk-barcode-generator',
  '/pl/drukowanie-etykiet-avery',
];
const categories = ['performance', 'accessibility', 'best-practices', 'seo'];
const runsPerRoute = 3;
const maxAttemptsPerRoute = 5;
const mode = process.argv[2];
const profile = profiles[mode];

if (!profile) {
  console.error('Usage: node scripts/run-lighthouse.mjs <mobile|desktop>');
  process.exit(2);
}

const root = process.cwd();
const baseUrl = `http://127.0.0.1:${profile.port}`;
const outputDir = path.join(root, '.lighthouseci', mode);
let server;
let chrome;

function routeSlug(route) {
  return route === '/' ? 'home' : route.slice(1).replaceAll('/', '-').replace(/-$/, '');
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

async function waitForServer(url, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Preview server exited early (${server.exitCode})`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server may still be binding its port.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Preview server did not start at ${url}`);
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

try {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  server = spawn(
    process.execPath,
    ['scripts/serve.mjs', '--port', String(profile.port)],
    {
      cwd: root,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  server.stdout.on('data', (chunk) => process.stdout.write(chunk));
  server.stderr.on('data', (chunk) => process.stderr.write(chunk));
  await waitForServer(baseUrl);

  chrome = await chromeLauncher.launch({
    chromePath: process.env.CHROME_PATH || undefined,
    chromeFlags: [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ],
  });

  const routeResults = [];
  for (const route of routes) {
    const validRuns = [];
    for (
      let attempt = 1;
      attempt <= maxAttemptsPerRoute && validRuns.length < runsPerRoute;
      attempt += 1
    ) {
      try {
        const result = await lighthouse(
          `${baseUrl}${route}`,
          {
            port: chrome.port,
            output: ['json', 'html'],
            logLevel: 'error',
            onlyCategories: categories,
            ...profile.settings,
          },
          profile.config,
        );
        if (!result) throw new Error('Lighthouse returned no result');

        const run = validRuns.length + 1;
        const scores = Object.fromEntries(
          categories.map((category) => [category, result.lhr.categories[category].score]),
        );
        validRuns.push({ run, attempt, scores });
        const [jsonReport, htmlReport] = result.report;
        const slug = routeSlug(route);
        await Promise.all([
          writeFile(path.join(outputDir, `${slug}-run-${run}.json`), jsonReport),
          writeFile(path.join(outputDir, `${slug}-run-${run}.html`), htmlReport),
        ]);
      } catch (error) {
        console.warn(`${route}: attempt ${attempt} failed (${error.message}); retrying.`);
      }
    }

    if (validRuns.length < runsPerRoute) {
      throw new Error(`Lighthouse produced only ${validRuns.length}/${runsPerRoute} reports for ${route}`);
    }

    const scores = Object.fromEntries(
      categories.map((category) => [
        category,
        median(validRuns.map((result) => result.scores[category])),
      ]),
    );
    routeResults.push({ route, aggregation: 'median', scores, runs: validRuns });
    console.log(
      `${mode.padEnd(7)} ${route.padEnd(36)} ${categories
        .map((category) => `${category}=${Math.round(scores[category] * 100)}`)
        .join(' ')}`,
    );
  }

  const failures = routeResults.flatMap(({ route, scores }) =>
    categories
      .filter((category) => scores[category] < profile.minimums[category])
      .map(
        (category) =>
          `${route} ${category}: ${scores[category].toFixed(2)} < ${profile.minimums[
            category
          ].toFixed(2)}`,
      ),
  );
  await writeFile(
    path.join(outputDir, 'summary.json'),
    `${JSON.stringify(
      {
        profile: mode,
        generatedAt: new Date().toISOString(),
        aggregation: 'median',
        runsPerRoute,
        minimums: profile.minimums,
        routes: routeResults,
        failures,
      },
      null,
      2,
    )}\n`,
  );

  if (failures.length) {
    throw new Error(`Lighthouse quality gates failed:\n${failures.join('\n')}`);
  }
} finally {
  if (chrome) {
    try {
      await chrome.kill();
    } catch (error) {
      if (process.platform !== 'win32' || error?.code !== 'EPERM') throw error;
      console.warn(`Chrome stopped, but Windows kept its temporary profile locked: ${error.path}`);
    }
  }
  await stopProcess(server);
}
