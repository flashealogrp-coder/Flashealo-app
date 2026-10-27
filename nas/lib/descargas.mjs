// Descarga del original en tamaño real por parte del cliente, solo si el evento lo permite.
//  1) POST /api/descarga {p, clave?}  -> comprueba (con permisos públicos, o sea RLS) que la foto existe en un evento visible,
//                                        que el evento tiene "permitir_descarga" y, si tiene clave, que la clave es correcta.
//                                        Responde con un enlace firmado que caduca en 2 minutos.
//  2) GET  /api/descarga/<token>      -> entrega el original como archivo adjunto.
// El original nunca queda abierto: sin permiso del evento no se entrega, y el enlace sirve para UNA foto.
import fs from 'node:fs';
import path from 'node:path';
import { firmar, verificar } from './tokens.mjs';

const TIPOS = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.heic': 'image/heic', '.gif': 'image/gif' };
const TTL_MS = 120_000;
const LIMITE_POR_MIN = 40;
const secreto = (cfg) => 'dl:' + cfg.uploadSecret;

// Ruta pública (watermarks/x.jpg, miniaturas/x.jpg) u original (o/x.jpg) -> ruta relativa dentro de originales/
export function rutaOriginal(p) {
  if (typeof p !== 'string' || p.length > 400) return null;
  let m = /^o\/(.+)$/.exec(p);
  let rest = m ? m[1] : null;
  if (!rest) { m = /^(?:watermarks|miniaturas)\/(.+)\.jpg$/.exec(p); rest = m ? m[1] : null; }
  if (!rest || rest.includes('..') || !/^[a-zA-Z0-9\-_/.]+$/.test(rest)) return null;
  return rest;
}

export function nombreDescarga(rest) {
  const base = path.posix.basename(rest).replace(/^\d{10,}_/, '').replace(/[^a-zA-Z0-9\-_.]/g, '_');
  return base || 'foto.jpg';
}

export function manejadorDescargaSolicitud(cfg, fetchFn = fetch) {
  const visitas = new Map();   // ip -> {n, desde}
  const permitido = (ip, ahora) => {
    const v = visitas.get(ip);
    if (!v || ahora - v.desde > 60_000) { visitas.set(ip, { n: 1, desde: ahora }); if (visitas.size > 5000) visitas.clear(); return true; }
    return ++v.n <= LIMITE_POR_MIN;
  };
  const cab = { apikey: cfg.supabaseKey, Authorization: `Bearer ${cfg.supabaseKey}` };
  const get = async (ruta) => {
    const r = await fetchFn(cfg.supabaseUrl + ruta, { headers: cab, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };
  const json = (res, c, o) => res.writeHead(c, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify(o));

  return async function (req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
    if (!cfg.uploadSecret) return json(res, 503, { error: 'Descargas no disponibles' });
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (!permitido(ip, Date.now())) return json(res, 429, { error: 'Demasiadas descargas seguidas. Espera un minuto.' });
    const rest = rutaOriginal((req.body || {}).p);
    if (!rest) return json(res, 400, { error: 'Foto no válida' });
    try {
      const fotos = await get(`/rest/v1/fotografias?select=evento_id&url_original=eq.${encodeURIComponent('o/' + rest)}&limit=1`);
      if (!fotos.length) return json(res, 404, { error: 'Foto no encontrada' });
      const eventos = await get(`/rest/v1/eventos?select=permitir_descarga,tiene_clave&id=eq.${encodeURIComponent(fotos[0].evento_id)}&limit=1`);
      const ev = eventos[0];
      if (!ev) return json(res, 404, { error: 'Foto no encontrada' });
      if (ev.permitir_descarga !== true) return json(res, 403, { error: 'La descarga no está habilitada para esta colección.' });
      if (ev.tiene_clave) {
        const r = await fetchFn(`${cfg.supabaseUrl}/rest/v1/rpc/verificar_clave_evento`, {
          method: 'POST', headers: { ...cab, 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_evento: fotos[0].evento_id, p_clave: String((req.body || {}).clave || '') }), signal: AbortSignal.timeout(10000),
        });
        if (!r.ok || (await r.json()) !== true) return json(res, 403, { error: 'Escribe la clave de la colección para descargar.' });
      }
      const token = firmar({ k: rest, p: 'dl', e: Date.now() + TTL_MS }, secreto(cfg));
      return json(res, 200, { url: `/api/descarga/${token}` });
    } catch (e) {
      console.error(JSON.stringify({ nivel: 'error', ruta: '/api/descarga', msg: String(e && e.message) }));
      return json(res, 502, { error: 'No se pudo preparar la descarga. Inténtalo de nuevo.' });
    }
  };
}

export function manejadorDescargaArchivo(cfg) {
  const base = path.resolve(cfg.datos, 'originales');
  return async function (req, res, token) {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    const p = cfg.uploadSecret ? verificar(token, secreto(cfg)) : null;
    if (!p || p.p !== 'dl' || typeof p.k !== 'string') { res.writeHead(401, { 'Content-Type': 'application/json' }).end('{"error":"Enlace inválido o vencido"}'); return; }
    const destino = path.resolve(base, p.k);
    if (!destino.startsWith(base + path.sep)) { res.writeHead(400).end(); return; }
    let st;
    try { st = await fs.promises.stat(destino); if (!st.isFile()) throw new Error('x'); } catch { res.writeHead(404).end(); return; }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(destino).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size, 'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="${nombreDescarga(p.k)}"`,
    });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(destino).on('error', () => res.destroy()).pipe(res);
  };
}
