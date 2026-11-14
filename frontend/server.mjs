import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Serve the compiled Angular SPA; never expose the Angular development server on Railway.
const appRoot = dirname(fileURLToPath(import.meta.url));
const staticRoot = resolve(appRoot, 'dist', 'knowyourfam', 'browser');
const indexFile = join(staticRoot, 'index.html');
const rawPort = process.env.PORT ?? '8080';
const port = Number(rawPort);

if (!existsSync(indexFile)) {
  console.error('[startup] Angular build missing at ' + indexFile + '. Run npm run build before npm start.');
  process.exit(1);
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('[startup] Invalid PORT value: ' + rawPort);
  process.exit(1);
}

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

function reply(res, status, message) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(message);
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return reply(res, 405, 'Method not allowed');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  } catch {
    return reply(res, 400, 'Invalid URL');
  }
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(req.method === 'HEAD' ? undefined : '{"status":"ok"}');
  }
  if (pathname.includes('\0')) return reply(res, 400, 'Invalid path');

  let filePath = resolve(staticRoot, '.' + pathname);
  if (filePath !== staticRoot && !filePath.startsWith(staticRoot + sep)) {
    return reply(res, 403, 'Forbidden');
  }
  let fileInfo = await stat(filePath).catch(() => null);
  if (fileInfo?.isDirectory()) {
    filePath = join(filePath, 'index.html');
    fileInfo = await stat(filePath).catch(() => null);
  }
  if (!fileInfo?.isFile()) {
    // Client-side paths such as /developer load the Angular app shell.
    // Unknown .js, .css etc. must return 404 instead of HTML.
    if (extname(pathname)) return reply(res, 404, 'Asset not found');
    filePath = indexFile;
    fileInfo = await stat(filePath);
  }

  const ext = extname(filePath).toLowerCase();
  const isHtml = ext === '.html';
  res.writeHead(200, {
    'Content-Type': mime[ext] ?? 'application/octet-stream',
    'Content-Length': String(fileInfo.size),
    'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff'
  });
  if (req.method === 'HEAD') return res.end();
  const stream = createReadStream(filePath);
  stream.on('error', (err) => { if (!res.destroyed) res.destroy(err); });
  stream.pipe(res);
});

server.listen(port, '0.0.0.0', () => {
  console.info('[startup] KnowYourFam Angular static server listening on 0.0.0.0:' + port);
});
