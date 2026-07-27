import assert from 'node:assert/strict';

const base = 'https://barcode-generator.daytodayapps.com';
const technicalBase = 'https://barcode-generator-5ee.pages.dev';
const requestTimeoutMs = 15_000;
const concurrency = 8;

async function request(url, options = {}) {
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(requestTimeoutMs),
    ...options,
    headers: {
      'cache-control': 'no-cache',
      'user-agent': 'daytodayapps-production-monitor/1.0',
      ...options.headers,
    },
  });
  return response;
}

function sitemapLocations(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function canonicalFrom(html) {
  return html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<link\s+href=["']([^"']+)["']\s+rel=["']canonical["']/i)?.[1];
}

async function inBatches(items, worker) {
  let next = 0;
  const failures = [];
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      try {
        await worker(items[index], index);
      } catch (error) {
        failures.push(`${items[index]}: ${error.message}`);
      }
    }
  }));
  assert.deepEqual(failures, [], failures.join('\n'));
}

const sitemapResponse = await request(`${base}/sitemap.xml`);
assert.equal(sitemapResponse.status, 200, 'sitemap.xml must return 200');
assert.match(sitemapResponse.headers.get('content-type') ?? '', /xml/i);
const sitemap = await sitemapResponse.text();
const locations = sitemapLocations(sitemap);
assert.equal(locations.length, 112, `expected 112 sitemap URLs, received ${locations.length}`);
assert.equal(new Set(locations).size, locations.length, 'sitemap URLs must be unique');

for (const url of locations) {
  assert.equal(new URL(url).origin, base, `${url}: non-canonical origin`);
  assert.doesNotMatch(url, /\.html(?:$|[?#])/, `${url}: extensionful route`);
  assert.doesNotMatch(url, /\/(?:konto|moje-kody|szablony|drukarki|wydruk|historia-wydrukow|reset-hasla)(?:\/|$)/, `${url}: private route in sitemap`);
}

await inBatches(locations, async (url) => {
  const response = await request(url);
  assert.equal(response.status, 200, 'must return a direct 200');
  assert.match(response.headers.get('content-type') ?? '', /text\/html/i, 'must return HTML');
  const html = await response.text();
  assert.equal(canonicalFrom(html), url, 'canonical must match the sitemap URL');
  assert.equal((html.match(/<h1(?:\s|>)/gi) ?? []).length, 1, 'must contain exactly one H1');
  assert.doesNotMatch(html, /<meta\s+name=["']robots["'][^>]+content=["'][^"']*noindex/i, 'must be indexable');
  assert.doesNotMatch(html, /(?:pages|workers)\.dev/i, 'must not expose a legacy host');
});

const rootResponse = await request(`${base}/`);
assert.equal(rootResponse.headers.get('x-content-type-options'), 'nosniff');
assert.match(rootResponse.headers.get('strict-transport-security') ?? '', /max-age=31536000/);
assert.match(rootResponse.headers.get('content-security-policy') ?? '', /default-src 'self'/);

for (const asset of ['robots.txt', 'ads.txt']) {
  const response = await request(`${base}/${asset}`);
  assert.equal(response.status, 200, `${asset} must return 200`);
  assert.ok((await response.text()).trim().length > 0, `${asset} must not be empty`);
}

const missingResponse = await request(`${base}/monitor-definitely-missing-404`);
assert.equal(missingResponse.status, 404, 'unknown routes must return 404');
assert.match(await missingResponse.text(), /noindex/i, '404 page must be noindex');

const redirectPath = '/code-128/?monitor=1';
const technicalResponse = await request(`${technicalBase}${redirectPath}`);
assert.equal(technicalResponse.status, 301, 'technical Pages host must return 301');
assert.equal(technicalResponse.headers.get('location'), `${base}${redirectPath}`, 'technical redirect must preserve path and query');

console.log(`Production monitor passed: ${locations.length} canonical pages, assets, headers, 404 and Pages redirect.`);
