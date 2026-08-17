import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  acquireProfileLock,
  createDistSnapshot,
  createRunPaths,
  findAvailablePort,
  run,
} from '../scripts/run-lighthouse.mjs';

async function withTemporaryRoot(callback) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lighthouse-runner-'));
  try {
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('uses unique run directories without deleting another run', async () => {
  await withTemporaryRoot(async (root) => {
    const first = createRunPaths(root, 'mobile', 'run-one');
    const second = createRunPaths(root, 'mobile', 'run-two');
    assert.notEqual(first.outputDir, second.outputDir);
    assert.equal(first.lockPath, second.lockPath);
    assert.equal(first.outputDir, path.join(root, '.lighthouseci', 'runs', 'run-one', 'mobile'));
  });
});

test('rejects a concurrent live profile lock with a readable error', async () => {
  await withTemporaryRoot(async (root) => {
    const paths = createRunPaths(root, 'mobile', 'run-one');
    const release = await acquireProfileLock(
      paths.lockPath,
      { token: 'first', pid: 111, profile: 'mobile', runId: 'run-one' },
      () => true,
    );
    await assert.rejects(
      acquireProfileLock(
        paths.lockPath,
        { token: 'second', pid: 222, profile: 'mobile', runId: 'run-two' },
        () => true,
      ),
      /profile "mobile" is already running \(PID 111, run run-one\)/,
    );
    await release();
  });
});

test('recovers an invalid or dead stale lock', async () => {
  await withTemporaryRoot(async (root) => {
    const paths = createRunPaths(root, 'desktop', 'fresh-run');
    await mkdir(path.dirname(paths.lockPath), { recursive: true });
    await writeFile(paths.lockPath, '{broken json');
    const staleTime = new Date(Date.now() - 60_000);
    await utimes(paths.lockPath, staleTime, staleTime);
    const release = await acquireProfileLock(
      paths.lockPath,
      { token: 'fresh', pid: 333, profile: 'desktop', runId: 'fresh-run' },
      () => false,
    );
    assert.equal(JSON.parse(await readFile(paths.lockPath, 'utf8')).token, 'fresh');
    await release();
    await assert.rejects(readFile(paths.lockPath, 'utf8'), { code: 'ENOENT' });
  });
});

test('keeps a snapshot unchanged when the source dist changes', async () => {
  await withTemporaryRoot(async (root) => {
    const source = path.join(root, 'dist');
    const snapshot = path.join(root, 'run', 'dist');
    await mkdir(source, { recursive: true });
    await writeFile(path.join(source, 'index.html'), 'before');
    await createDistSnapshot(source, snapshot);
    await writeFile(path.join(source, 'index.html'), 'after');
    assert.equal(await readFile(path.join(snapshot, 'index.html'), 'utf8'), 'before');
  });
});

test('allocates a currently available dynamic port', async () => {
  const port = await findAvailablePort();
  assert.ok(port > 0 && port <= 65535);
});

test('persists a structured failure report and releases its lock', async () => {
  await withTemporaryRoot(async (root) => {
    await assert.rejects(run('mobile', root), /Build output is missing/);
    const runIds = await readdir(path.join(root, '.lighthouseci', 'runs'));
    assert.equal(runIds.length, 1);
    const failurePath = path.join(root, '.lighthouseci', 'runs', runIds[0], 'mobile', 'failure.json');
    const failure = JSON.parse(await readFile(failurePath, 'utf8'));
    assert.equal(failure.profile, 'mobile');
    assert.equal(failure.completedRoutes, 0);
    assert.match(failure.error.message, /Build output is missing/);
    assert.match(failure.error.stack, /createDistSnapshot/);
    await assert.rejects(readFile(path.join(root, '.lighthouseci', 'locks', 'mobile.lock')), { code: 'ENOENT' });
  });
});

test('persists partial summaries after completed routes', async () => {
  const source = await readFile(path.join(process.cwd(), 'scripts', 'run-lighthouse.mjs'), 'utf8');
  assert.match(source, /'partial-summary\.json'/);
  assert.match(source, /routeResults\.push[\s\S]*partial-summary\.json/);
  assert.doesNotMatch(source, /rm\(outputDir, \{ recursive: true/);
});
