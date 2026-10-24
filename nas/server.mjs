// Servidor de la web de Flashealo en el NAS: sirve la SPA y la API de subida / IA.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerConfig } from './lib/config.mjs';
import { crearEsAdmin } from './lib/admin.mjs';
import { manejadorUploadUrl, manejadorSubir, espacio } from './lib/subidas.mjs';
import { manejadorIA } from './lib/ia.mjs';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.webp': 'image/webp', '.txt': 'text/plain' };
const CABECERAS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
};

async function leerJson(req, limite = 1e5) {
  let body = '';
  for await (const c of req) { body += c; if (body.length > limite) throw Object.assign(new Error('grande'), { codigo: 413 }); }
  try { return body ? JSON.parse(body) : {}; } catch { return {}; }
}

export function crearServidor(cfg = leerConfig(), deps = {}) {
  const esAdmin = deps.esAdmin || crearEsAdmin(cfg);
  const uploadUrl = manejadorUploadUrl(cfg, esAdmin);
  const subir = manejadorSubir(cfg);
  const ia = manejadorIA(cfg, esAdmin, deps.fetch || fetch);
  const DIST = path.resolve(cfg.dist);

  return http.createServer(async (req, res) => {
    for (const [k, v] of Object.entries(CABECERAS)) res.setHeader(k, v);
    let url;
    try { url = new URL(req.url, 'http://x'); } catch { return res.writeHead(400).end(); }
    const ruta = url.pathname;

    try {
      if (ruta === '/healthz') {
        let disco = null;
        try { disco = await espacio(cfg.datos); } catch { /* sin datos montados */ }
        res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
        return res.end(JSON.stringify({ ok: true, libre_pct: disco ? Math.round(disco.libre_pct * 10) / 10 : null }));
      }
      if (ruta === '/api/upload-url' || ruta === '/api/ia') {
        try { req.body = await leerJson(req); } catch { return res.writeHead(413).end(); }
        return (ruta === '/api/ia' ? ia : uploadUrl)(req, res);
      }
      if (ruta.startsWith('/api/subir/')) return subir(req, res, ruta.slice('/api/subir/'.length));
      if (ruta.startsWith('/api/')) return res.writeHead(404, { 'Content-Type': 'application/json' }).end('{"error":"No existe"}');

      if (req.method !== 'GET' && req.method !== 'HEAD') return res.writeHead(405).end();
      let decodificada;
      try { decodificada = decodeURIComponent(ruta); } catch { return res.writeHead(400).end(); }
      let f = path.resolve(DIST, '.' + path.posix.normalize('/' + decodificada));
      const dentro = f === DIST || f.startsWith(DIST + path.sep);
      const existe = dentro && fs.existsSync(f) && fs.statSync(f).isFile();
      if (!existe) {
        // Un archivo con extensión que no existe es un 404 real; una ruta de la SPA devuelve index.html.
        if (path.extname(decodificada) && !decodificada.endsWith('.html')) return res.writeHead(404).end('No encontrado');
        f = path.join(DIST, 'index.html');
      }
      const ext = path.extname(f);
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': f.includes(`${path.sep}assets${path.sep}`) ? 'public,max-age=31536000,immutable' : 'no-cache',
      });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(f).pipe(res);
    } catch (err) {
      console.error(JSON.stringify({ nivel: 'error', ruta, msg: String(err && err.message) }));
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end('{"error":"Error interno"}');
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cfg = leerConfig();
  if (!cfg.uploadSecret) console.warn(JSON.stringify({ nivel: 'aviso', msg: 'UPLOAD_SECRET vacío: las subidas están desactivadas' }));
  const srv = crearServidor(cfg);
  srv.requestTimeout = 0;            // las subidas de video pueden tardar
  srv.headersTimeout = 30_000;
  srv.listen(cfg.puerto, () => console.log(JSON.stringify({ nivel: 'info', msg: `web escuchando en ${cfg.puerto}` })));
  for (const s of ['SIGTERM', 'SIGINT']) process.on(s, () => srv.close(() => process.exit(0)));
}
