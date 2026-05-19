// @ts-check
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_ROOT = path.resolve(process.cwd(), 'tests', 'artifacts');

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
}
