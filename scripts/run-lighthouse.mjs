import { copyFile, cp, mkdir, open, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import * as chromeLauncher from 'chrome-launcher';

const profiles = {
  mobile: {
    minimums: { performance: 0.85, accessibility: 0.95, 'best-practices': 0.95, seo: 0.95 },
    settings: {
      formFactor: 'mobile',
      screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2.75, disabled: false },
    },
  },
  desktop: {
    minimums: { performance: 0.9, accessibility: 0.95, 'best-practices': 0.95, seo: 0.95 },
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
const incompleteLockGraceMs = 30_000;
const maximumLockAgeMs = 12 * 60 * 60 * 1_000;

function routeSlug(route) {
  return route === '/' ? 'home' : route.slice(1).replaceAll('/', '-').replace(/-$/, '');
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

function runId(now = new Date(), pid = process.pid) {
  return `${now.toISOString().replace(/[:.]/g, '-')}-${pid}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createRunPaths(root, mode, id = runId()) {
  const lighthouseRoot = path.join(root, '.lighthouseci');
  const runRoot = path.join(lighthouseRoot, 'runs', id);
  return {
    id,
    lockPath: path.join(lighthouseRoot, 'locks', `${mode}.lock`),
    runRoot,
    outputDir: path.join(runRoot, mode),
    snapshotDir: path.join(runRoot, 'dist'),
  };
}

async function readLock(lockPath) {
  try {
    return JSON.parse(await readFile(lockPath, 'utf8'));
  } catch {
    return null;
  }
}

export async function acquireProfileLock(lockPath, details, isAlive = processIsAlive) {
  await mkdir(path.dirname(lockPath), { recursive: true });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const handle = await open(lockPath, 'wx');
      try {
        await handle.writeFile(`${JSON.stringify(details, null, 2)}\n`);
      } catch (error) {
        await handle.close().catch(() => {});
        await rm(lockPath, { force: true });
        throw error;
      }
      await handle.close();
      return async () => {
        const current = await readLock(lockPath);
        if (current?.token === details.token) await rm(lockPath, { force: true });
      };
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      const existing = await readLock(lockPath);
      const lockInfo = await stat(lockPath).catch(() => null);
      const lockAgeMs = lockInfo ? Date.now() - lockInfo.mtimeMs : 0;
      const createdAtMs = Date.parse(existing?.createdAt || '');
      const recordedAgeMs = Number.isFinite(createdAtMs) ? Date.now() - createdAtMs : lockAgeMs;
      if (existing && isAlive(existing.pid) && recordedAgeMs < maximumLockAgeMs) {
        throw new Error(
          `Lighthouse profile "${details.profile}" is already running (PID ${existing.pid}, run ${existing.runId || 'unknown'}).`,
        );
      }
      if (!existing && lockAgeMs < incompleteLockGraceMs) {
        throw new Error(`Lighthouse profile "${details.profile}" is already starting (lock is being initialized).`);
      }
      // Invalid locks and locks whose process no longer exists are stale.
      await rm(lockPath, { force: true });
    }
  }
  throw new Error(`Could not acquire Lighthouse profile lock: ${lockPath}`);
}

export async function findAvailablePort(host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.once('error', reject);
    probe.listen(0, host, () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : null;
      probe.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

export async function createDistSnapshot(sourceDir, snapshotDir) {
  const source = await stat(sourceDir).catch(() => null);
  if (!source?.isDirectory()) {
    throw new Error(`Build output is missing: ${sourceDir}. Run npm run build first.`);
  }
  await mkdir(path.dirname(snapshotDir), { recursive: true });
  await cp(sourceDir, snapshotDir, { recursive: true, force: false, errorOnExist: true });
}

async function writeJson(filePath, value) {
  const temporary = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rm(filePath, { force: true });
  await copyFile(temporary, filePath);
  await rm(temporary, { force: true });
}

async function waitForServer(server, url, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Preview server exited early (${server.exitCode})`);
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

function summaryData(mode, profile, routeResults, failures = []) {
  return {
    profile: mode,
    generatedAt: new Date().toISOString(),
    aggregation: 'median',
    runsPerRoute,
    minimums: profile.minimums,
    completedRoutes: routeResults.length,
    totalRoutes: routes.length,
    routes: routeResults,
    failures,
  };
}

export async function run(mode, root = process.cwd()) {
  const profile = profiles[mode];
  if (!profile) throw new Error('Usage: node scripts/run-lighthouse.mjs <mobile|desktop>');

  const paths = createRunPaths(root, mode);
  let releaseLock = async () => {};
  let server;
  let chrome;
  const routeResults = [];

  try {
    releaseLock = await acquireProfileLock(paths.lockPath, {
      token: `${process.pid}-${Math.random().toString(36).slice(2)}`,
      pid: process.pid,
      profile: mode,
      runId: paths.id,
      createdAt: new Date().toISOString(),
    });
    await mkdir(paths.outputDir, { recursive: true });
    await createDistSnapshot(path.join(root, 'dist'), paths.snapshotDir);
    const port = await findAvailablePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    await writeJson(path.join(paths.outputDir, 'partial-summary.json'), summaryData(mode, profile, routeResults));

    server = spawn(process.execPath, [path.join(root, 'scripts', 'serve.mjs'), '--port', String(port)], {
      cwd: paths.runRoot,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    server.stdout.on('data', (chunk) => process.stdout.write(chunk));
    server.stderr.on('data', (chunk) => process.stderr.write(chunk));
    await waitForServer(server, baseUrl);

    chrome = await chromeLauncher.launch({
      chromePath: process.env.CHROME_PATH || undefined,
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    });

    for (const route of routes) {
      const validRuns = [];
      for (let attempt = 1; attempt <= maxAttemptsPerRoute && validRuns.length < runsPerRoute; attempt += 1) {
        try {
          const result = await lighthouse(
            `${baseUrl}${route}`,
            { port: chrome.port, output: ['json', 'html'], logLevel: 'error', onlyCategories: categories, ...profile.settings },
            profile.config,
          );
          if (!result) throw new Error('Lighthouse returned no result');
          const reportRun = validRuns.length + 1;
          const scores = Object.fromEntries(categories.map((category) => [category, result.lhr.categories[category].score]));
          validRuns.push({ run: reportRun, attempt, scores });
          const [jsonReport, htmlReport] = result.report;
          const slug = routeSlug(route);
          await Promise.all([
            writeFile(path.join(paths.outputDir, `${slug}-run-${reportRun}.json`), jsonReport),
            writeFile(path.join(paths.outputDir, `${slug}-run-${reportRun}.html`), htmlReport),
          ]);
        } catch (error) {
          console.warn(`${route}: attempt ${attempt} failed (${error.message}); retrying.`);
        }
      }
      if (validRuns.length < runsPerRoute) {
        throw new Error(`Lighthouse produced only ${validRuns.length}/${runsPerRoute} reports for ${route}`);
      }
      const scores = Object.fromEntries(
        categories.map((category) => [category, median(validRuns.map((result) => result.scores[category]))]),
      );
      routeResults.push({ route, aggregation: 'median', scores, runs: validRuns });
      await writeJson(path.join(paths.outputDir, 'partial-summary.json'), summaryData(mode, profile, routeResults));
      console.log(
        `${mode.padEnd(7)} ${route.padEnd(36)} ${categories.map((category) => `${category}=${Math.round(scores[category] * 100)}`).join(' ')}`,
      );
    }

    const failures = routeResults.flatMap(({ route, scores }) =>
      categories
        .filter((category) => scores[category] < profile.minimums[category])
        .map((category) => `${route} ${category}: ${scores[category].toFixed(2)} < ${profile.minimums[category].toFixed(2)}`),
    );
    await writeJson(path.join(paths.outputDir, 'summary.json'), summaryData(mode, profile, routeResults, failures));
    if (failures.length) throw new Error(`Lighthouse quality gates failed:\n${failures.join('\n')}`);
    console.log(`Reports: ${paths.outputDir}`);
    return paths;
  } catch (error) {
    await mkdir(paths.outputDir, { recursive: true });
    await writeJson(path.join(paths.outputDir, 'failure.json'), {
      profile: mode,
      failedAt: new Date().toISOString(),
      runId: paths.id,
      completedRoutes: routeResults.length,
      totalRoutes: routes.length,
      error: { name: error?.name || 'Error', message: error?.message || String(error), stack: error?.stack || null },
    });
    console.error(`Failure report: ${path.join(paths.outputDir, 'failure.json')}`);
    throw error;
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
    await releaseLock();
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  run(process.argv[2]).catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = error?.message?.startsWith('Usage:') ? 2 : 1;
  });
}
