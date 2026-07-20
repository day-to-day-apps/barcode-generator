// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ARTIFACTS_ROOT = path.resolve(process.cwd(), 'tests', 'artifacts');
const PREVIEW_URL = 'http://127.0.0.1:8765/';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function previewIsReady() {
  try {
    const response = await fetch(PREVIEW_URL, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch (_error) {
    return false;
  }
}

export default async function globalSetup() {
  fs.mkdirSync(ARTIFACTS_ROOT, { recursive: true });
  // Wyczyść poprzednie artefakty (poza .gitkeep)
  for (const entry of fs.readdirSync(ARTIFACTS_ROOT)) {
    if (entry === '.gitkeep') continue;
    fs.rmSync(path.join(ARTIFACTS_ROOT, entry), { recursive: true, force: true });
  }
  // Wygeneruj fixture EAN-13 PNG dla dekodera (deterministycznie)
  const fixtureDir = path.resolve(process.cwd(), 'tests', '_fixtures');
  fs.mkdirSync(fixtureDir, { recursive: true });
  // 1x1 PNG placeholder (dekoder otrzyma własną grafikę wygenerowaną w scenariuszu)
  const placeholder = Buffer.from(
    '89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C636060606000000005000150D80B380000000049454E44AE426082',
    'hex',
  );
  fs.writeFileSync(path.join(fixtureDir, 'test-ean13.png'), placeholder);

  if (await previewIsReady()) {
    throw new Error(`Preview port is already in use: ${PREVIEW_URL}`);
  }

  const preview = spawn(process.execPath, ['scripts/preview.mjs', '--port', '8765'], {
    cwd: process.cwd(),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  preview.stdout.on('data', (chunk) => { output += chunk.toString(); });
  preview.stderr.on('data', (chunk) => { output += chunk.toString(); });
  const exited = new Promise((resolve) => preview.once('exit', resolve));

  const deadline = Date.now() + 30_000;
  while (!(await previewIsReady())) {
    if (preview.exitCode !== null) {
      throw new Error(`Preview server exited before becoming ready.\n${output}`);
    }
    if (Date.now() >= deadline) {
      preview.kill('SIGKILL');
      throw new Error(`Preview server did not become ready.\n${output}`);
    }
    await delay(250);
  }

  return async () => {
    if (preview.exitCode !== null) return;
    preview.kill('SIGTERM');
    await Promise.race([exited, delay(3000)]);
    if (preview.exitCode === null) preview.kill('SIGKILL');
  };
}
