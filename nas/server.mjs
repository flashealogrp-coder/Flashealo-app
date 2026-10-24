// Sirve el frontend (SPA) y la API de subida /api/upload-url (misma lógica que en Vercel).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import handler from './api/upload-url.js';
const DIST = path.resolve('dist');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.ico':'image/x-icon', '.json':'application/json', '.woff2':'font/woff2', '.webp':'image/webp' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/upload-url') {
    let body = ''; for await (const c of req) { body += c; if (body.length > 1e5) return res.writeHead(413).end(); }
    try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = {}; }
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(o)); };
    return handler(req, res);
  }
  let f = path.join(DIST, path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
  const ext = path.extname(f);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': f.includes('/assets/') ? 'public,max-age=31536000,immutable' : 'no-cache', 'X-Content-Type-Options':'nosniff' });
  fs.createReadStream(f).pipe(res);
}).listen(process.env.PORT || 3000);
