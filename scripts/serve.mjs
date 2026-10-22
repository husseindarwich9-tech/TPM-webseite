// Kleiner statischer Server für dist/ mit gzip und Cache-Headern – verhält sich wie der spätere
// Produktionsserver (nginx). Aufruf: node scripts/serve.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const PORT = Number(process.argv[2] || 4322);
const ROOT = path.resolve(process.env.SERVE_DIR || 'dist');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json', '.json': 'application/json',
};
const COMPRESS = new Set(['.html', '.js', '.css', '.svg', '.xml', '.txt', '.webmanifest', '.json']);

http
  .createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    let file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) return res.writeHead(403).end();
    let status = 200;
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      if (fs.existsSync(file + '/index.html')) {
        res.writeHead(301, { Location: p + '/' }).end();
        return;
      }
      file = path.join(ROOT, '404.html');
      status = 404;
    }
    const ext = path.extname(file);
    const headers = {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': p.startsWith('/_astro/') || p.startsWith('/fonts/') ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    };
    let body = fs.readFileSync(file);
    if (COMPRESS.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      body = zlib.gzipSync(body, { level: 9 });
      headers['Content-Encoding'] = 'gzip';
      headers['Vary'] = 'Accept-Encoding';
    }
    res.writeHead(status, headers).end(body);
  })
  .listen(PORT, () => console.log(`Vorschau (wie Produktion): http://localhost:${PORT}`));
