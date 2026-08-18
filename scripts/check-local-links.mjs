import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'dist');
const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:8765';
const htmlFiles = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(target);
    else if (entry.name.endsWith('.html')) htmlFiles.push(target);
  }
}

await walk(root);
const internalUrls = new Set();
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const relative = path.relative(root, file).split(path.sep).join('/');
  const base = new URL(`/${relative}`, origin);
  for (const match of html.matchAll(/href=["']([^"']+)["']/g)) {
    try {
      const target = new URL(match[1], base);
      if (target.origin !== origin || /\.(?:css|js|png|svg|webmanifest|txt|xml|pdf|zip)$/i.test(target.pathname)) continue;
      internalUrls.add(`${target.pathname}${target.search}`);
    } catch {
      // Invalid hrefs are covered by the HTML/SEO tests.
    }
  }
}

const failures = [];
for (const url of internalUrls) {
  const response = await fetch(new URL(url, origin), { redirect: 'manual' });
  if (response.status >= 400) failures.push({ url, status: response.status });
}

console.log(JSON.stringify({ htmlFiles: htmlFiles.length, internalUrls: internalUrls.size, failures }, null, 2));
if (failures.length) process.exitCode = 1;
