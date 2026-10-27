// "Descargar toda la colección" en un zip, solo si el evento tiene encendido el interruptor "permitir_descarga_zip".
//  POST /api/descarga-zip {evento_id, clave?} -> comprueba permisos y devuelve un enlace firmado de 2 minutos.
//  GET  /api/descarga-zip/<token>             -> entrega el zip en streaming (memoria constante).
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { firmar, verificar } from './tokens.mjs';
import { generarZip } from './zip.mjs';

const TTL_MS = 120_000;
const MAX_SIMULTANEOS = 2;
const PAGINA = 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const secreto = (cfg) => 'dz:' + cfg.uploadSecret;

const limpiar = (s) => String(s).replace(/[^a-zA-Z0-9\-_.]/g, '_').slice(0, 80) || 'coleccion';

export function manejadorZipSolicitud(cfg, fetchFn = fetch) {
  const visitas = new Map();
  const permitido = (ip, ahora) => {
    const v = visitas.get(ip);
    if (!v || ahora - v.desde > 60_000) { visitas.set(ip, { n: 1, desde: ahora }); if (visitas.size > 5000) visitas.clear(); return true; }
    return ++v.n <= 10;
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
    if (!permitido(ip, Date.now())) return json(res, 429, { error: 'Demasiados intentos. Espera un minuto.' });
    const id = String((req.body || {}).evento_id || '');
    if (!UUID.test(id)) return json(res, 400, { error: 'Colección no válida' });
    try {
      const eventos = await get(`/rest/v1/eventos?select=nombre,permitir_descarga_zip,tiene_clave&id=eq.${id}&limit=1`);
      const ev = eventos[0];
      if (!ev) return json(res, 404, { error: 'Colección no encontrada' });
      if (ev.permitir_descarga_zip !== true) return json(res, 403, { error: 'La descarga completa no está habilitada para esta colección.' });
      if (ev.tiene_clave) {
        const r = await fetchFn(`${cfg.supabaseUrl}/rest/v1/rpc/verificar_clave_evento`, {
          method: 'POST', headers: { ...cab, 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_evento: id, p_clave: String((req.body || {}).clave || '') }), signal: AbortSignal.timeout(10000),
        });
        if (!r.ok || (await r.json()) !== true) return json(res, 403, { error: 'Escribe la clave de la colección para descargar.' });
      }
      const token = firmar({ ev: id, n: limpiar(ev.nombre), p: 'dz', e: Date.now() + TTL_MS }, secreto(cfg));
      return json(res, 200, { url: `/api/descarga-zip/${token}` });
    } catch (e) {
      console.error(JSON.stringify({ nivel: 'error', ruta: '/api/descarga-zip', msg: String(e && e.message) }));
      return json(res, 502, { error: 'No se pudo preparar la descarga. Inténtalo de nuevo.' });
    }
  };
}

// Lista las fotos del NAS del evento (con permisos públicos: un evento oculto no devuelve nada) y las ubica en disco.
export async function listarEntradas(cfg, eventoId, fetchFn = fetch) {
  const base = path.resolve(cfg.datos, 'originales');
  const cab = { apikey: cfg.supabaseKey, Authorization: `Bearer ${cfg.supabaseKey}`, 'Range-Unit': 'items' };
  const filas = [];
  for (let desde = 0; desde < 200_000; desde += PAGINA) {
    const r = await fetchFn(`${cfg.supabaseUrl}/rest/v1/fotografias?select=url_original&evento_id=eq.${eventoId}&url_original=like.o/*&order=url_original`, {
      headers: { ...cab, Range: `${desde}-${desde + PAGINA - 1}` }, signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error(`listar fotos: HTTP ${r.status}`);
    const lote = await r.json();
    filas.push(...lote);
    if (lote.length < PAGINA) break;
  }
  const usados = new Set();
  const entradas = [];
  for (const f of filas) {
    const rel = String(f.url_original || '').slice(2);
    if (!rel || rel.includes('..') || !/^[a-zA-Z0-9\-_/.]+$/.test(rel)) continue;
    const ruta = path.resolve(base, rel);
    if (!ruta.startsWith(base + path.sep)) continue;
    let st; try { st = await fs.promises.stat(ruta); } catch { continue; }
    if (!st.isFile()) continue;
    // dentro del zip: <set>/<archivo> (se quita la carpeta del evento y el prefijo numérico del archivo)
    const partes = rel.split('/');
    const archivo = partes.pop().replace(/^\d{10,}_/, '');
    const carpeta = partes.slice(1).join('/');
    let nombre = carpeta ? `${carpeta}/${archivo}` : archivo;
    for (let i = 2; usados.has(nombre.toLowerCase()); i++) nombre = (carpeta ? carpeta + '/' : '') + archivo.replace(/(\.[^.]*)?$/, `_${i}$1`);
    usados.add(nombre.toLowerCase());
    entradas.push({ nombre, ruta, size: st.size, mtimeMs: st.mtimeMs });
  }
  return entradas;
}

export function manejadorZipArchivo(cfg, fetchFn = fetch) {
  let activos = 0;
  return async function (req, res, token) {
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    const p = cfg.uploadSecret ? verificar(token, secreto(cfg)) : null;
    if (!p || p.p !== 'dz' || !UUID.test(String(p.ev))) { res.writeHead(401, { 'Content-Type': 'application/json' }).end('{"error":"Enlace inválido o vencido"}'); return; }
    if (activos >= MAX_SIMULTANEOS) { res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '30' }).end('{"error":"Hay otras descargas en curso. Inténtalo en un momento."}'); return; }
    let entradas;
    try { entradas = await listarEntradas(cfg, p.ev, fetchFn); } catch { res.writeHead(502, { 'Content-Type': 'application/json' }).end('{"error":"No se pudo preparar la descarga."}'); return; }
    if (!entradas.length) { res.writeHead(404, { 'Content-Type': 'application/json' }).end('{"error":"Esta colección no tiene fotos para descargar."}'); return; }
    activos++;
    const fin = () => { if (activos > 0) { activos--; } };
    res.writeHead(200, {
      'Content-Type': 'application/zip', 'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="${limpiar(p.n)}.zip"`,
    });
    const flujo = Readable.from(generarZip(entradas));
    let cerrado = false;
    const cerrar = () => { if (!cerrado) { cerrado = true; fin(); } };
    res.on('close', () => { flujo.destroy(); cerrar(); });
    flujo.on('error', (e) => { console.error(JSON.stringify({ nivel: 'error', ruta: '/api/descarga-zip', msg: String(e && e.message) })); res.destroy(); });
    flujo.pipe(res);
  };
}
