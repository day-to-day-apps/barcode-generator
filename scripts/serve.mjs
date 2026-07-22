import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { brotliCompress, gzip } from 'node:zlib';
import { promisify } from 'node:util';

const root = path.resolve('dist');
const portFlagIndex = process.argv.indexOf('--port');
const requestedPort = portFlagIndex >= 0 ? process.argv[portFlagIndex + 1] : process.env.PORT;
const port = Number(requestedPort || 8765);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid preview port: ${requestedPort}`);
}
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8' };
const compressBrotli = promisify(brotliCompress);
const compressGzip = promisify(gzip);

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath).replace(/\\/g, '/');
  const normalized = path.posix.normalize(decoded).replace(/^\.\.(\/|$)/, '');
  return path.join(root, normalized);
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname.endsWith('.html') && url.pathname !== '/404.html') {
      response.writeHead(308, { Location: url.pathname.slice(0, -5) + url.search });
      return response.end();
    }
    let target = safePath(url.pathname);
    const info = await stat(target).catch(() => null);
    if (info?.isDirectory()) target = path.join(target, 'index.html');
    else if (!info && !path.extname(target)) target += '.html';
    const data = await readFile(target);
    const contentType = types[path.extname(target)] || 'application/octet-stream';
    const headers = { 'Content-Type': contentType, Vary: 'Accept-Encoding' };
    let body = data;
    if (data.length > 1024 && /^(text\/|application\/(javascript|json|xml)|image\/svg\+xml)/.test(contentType)) {
      const accepted = request.headers['accept-encoding'] || '';
      if (/\bbr\b/.test(accepted)) {
        body = await compressBrotli(data);
        headers['Content-Encoding'] = 'br';
      } else if (/\bgzip\b/.test(accepted)) {
        body = await compressGzip(data);
        headers['Content-Encoding'] = 'gzip';
      }
    }
    headers['Content-Length'] = body.length;
    response.writeHead(200, headers);
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (_error) {
    const body = await readFile(path.join(root, '404.html')).catch(() => Buffer.from('Not found'));
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(request.method === 'HEAD' ? undefined : body);
  }
});

server.listen(port, '127.0.0.1', () => console.log(`Production preview: http://127.0.0.1:${port}`));

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 2000).unref();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
