import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const port = Number(process.env.PORT || 8765);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.xml': 'application/xml', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath).replace(/\\/g, '/');
  const normalized = path.posix.normalize(decoded).replace(/^\.\.(\/|$)/, '');
  return path.join(root, normalized);
}

http.createServer(async (request, response) => {
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
    response.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch (_error) {
    const body = await readFile(path.join(root, '404.html')).catch(() => Buffer.from('Not found'));
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(request.method === 'HEAD' ? undefined : body);
  }
}).listen(port, '127.0.0.1', () => console.log(`Production preview: http://127.0.0.1:${port}`));
