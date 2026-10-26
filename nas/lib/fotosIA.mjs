// Enlaces temporales para que el motor de IA (Modal, en la nube) lea las fotos del NAS sin pasar por el 2FA.
// Cada enlace sirve UNA foto, caduca (por defecto 3 h) y está firmado con una clave derivada distinta de la de las subidas.
import fs from 'node:fs';
import path from 'node:path';
import { firmar, verificar } from './tokens.mjs';

const TIPOS = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.heic': 'image/heic', '.gif': 'image/gif' };
const MAX_FOTOS = 100_000;
const PAGINA = 1000;

const secretoIA = (cfg) => 'ia:' + cfg.uploadSecret;

export function firmarUrlsFotos(cfg, fotos, ahora = Date.now()) {
  const salida = [];
  for (const f of fotos) {
    const ruta = String(f.url_original || '');
    if (!ruta.startsWith('o/') || ruta.includes('..') || ruta.includes('\0')) continue;
    const token = firmar({ k: ruta.slice(2), p: 'ia', e: ahora + cfg.iaUrlTtlMs }, secretoIA(cfg));
    salida.push({ id: f.id, ruta, url: `${cfg.webPublica}/api/foto-ia/${token}` });
  }
  return salida;
}

// Lee (con la sesión del administrador, o sea con sus permisos RLS) las fotos del NAS de un evento.
export async function listarFotosEvento(cfg, jwt, eventoId, fetchFn = fetch) {
  const todas = [];
  for (let desde = 0; desde < MAX_FOTOS; desde += PAGINA) {
    const r = await fetchFn(`${cfg.supabaseUrl}/rest/v1/fotografias?select=id,url_original&evento_id=eq.${eventoId}&url_original=like.o/*&order=id`, {
      headers: { apikey: cfg.supabaseKey, Authorization: `Bearer ${jwt}`, 'Range-Unit': 'items', Range: `${desde}-${desde + PAGINA - 1}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error(`listar fotos: HTTP ${r.status}`);
    const lote = await r.json();
    todas.push(...lote);
    if (lote.length < PAGINA) break;
  }
  return todas;
}

export function manejadorFotoIA(cfg) {
  const base = path.resolve(cfg.datos, 'originales');
  return async function (req, res, token) {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    const p = cfg.uploadSecret ? verificar(token, secretoIA(cfg)) : null;
    if (!p || p.p !== 'ia' || typeof p.k !== 'string') { res.writeHead(401, { 'Content-Type': 'application/json' }).end('{"error":"Enlace inválido o vencido"}'); return; }
    const destino = path.resolve(base, p.k);
    if (!destino.startsWith(base + path.sep)) { res.writeHead(400).end(); return; }
    let st;
    try { st = await fs.promises.stat(destino); if (!st.isFile()) throw new Error('x'); } catch { res.writeHead(404).end(); return; }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(destino).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(destino).on('error', () => res.destroy()).pipe(res);
  };
}
