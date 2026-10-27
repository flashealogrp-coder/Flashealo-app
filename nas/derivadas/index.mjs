// Servicio de derivadas: cada pocos segundos busca fotos sin versión web, las procesa y las registra.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generarDerivadas, escribirAtomico, rutasDerivadas, AJUSTES } from './procesar.mjs';
import { crearCola } from './cola.mjs';

const log = (nivel, msg, extra = {}) => console.log(JSON.stringify({ t: new Date().toISOString(), nivel, msg, ...extra }));
const existe = (p) => fs.promises.stat(p).then((s) => s.isFile() && s.size > 0, () => false);

export function crearServicio({ datos, cola, marcaPng, intervaloMs = 20000, concurrencia = 2, loteMax = 10, reintentos = 3, olvidarMs = 3600_000, ajustes }) {
  const dirOriginales = path.resolve(datos, 'originales');
  const fallos = new Map();         // id -> {n, ultimo, error}
  const estado = { procesadas: 0, ultimoOk: null, ultimoError: null, enCurso: false };
  let timer = null;

  async function procesarUna(f) {
    const rutas = rutasDerivadas(f.url_original);
    if (!rutas) throw new Error(`ruta de original no válida: ${f.url_original}`);
    const origen = path.resolve(dirOriginales, rutas.rel);
    if (!origen.startsWith(dirOriginales + path.sep)) throw new Error('ruta fuera de originales');
    const web = path.resolve(datos, rutas.web), thumb = path.resolve(datos, rutas.thumb);

    let ancho = null, alto = null;
    if (!(await existe(web)) || !(await existe(thumb))) {
      const d = await generarDerivadas(origen, marcaPng, ajustes);
      ancho = d.ancho; alto = d.alto;
      await escribirAtomico(thumb, d.thumb);
      await escribirAtomico(web, d.web);     // la versión web se publica al final
    }
    await cola.marcar(f.id, { url_watermark: rutas.web, ancho, alto });
  }

  async function ciclo() {
    if (estado.enCurso) return;
    estado.enCurso = true;
    try {
      for (;;) {
        let lote;
        try { lote = await cola.pendientes(loteMax); } catch (e) { estado.ultimoError = String(e.message); log('error', 'no se pudo leer la cola', { error: estado.ultimoError }); break; }
        const ahora = Date.now();
        lote = lote.filter((f) => { const x = fallos.get(f.id); return !x || x.n < reintentos || ahora - x.ultimo > olvidarMs; });
        if (!lote.length) break;
        const cola_ = [...lote];
        await Promise.all(Array.from({ length: Math.min(concurrencia, cola_.length) }, async () => {
          while (cola_.length) {
            const f = cola_.shift();
            try {
              await procesarUna(f);
              fallos.delete(f.id); estado.procesadas++; estado.ultimoOk = new Date().toISOString();
            } catch (e) {
              const x = fallos.get(f.id) || { n: 0 };
              fallos.set(f.id, { n: x.n + 1, ultimo: Date.now(), error: String(e.message).slice(0, 200) });
              estado.ultimoError = `${f.id}: ${String(e.message).slice(0, 200)}`;
              log('error', 'falló una foto', { id: f.id, original: f.url_original, intento: x.n + 1, error: String(e.message).slice(0, 200) });
            }
          }
        }));
        // si el lote entero falló, no insistir en bucle cerrado
        if (lote.every((f) => fallos.has(f.id))) break;
      }
    } finally { estado.enCurso = false; }
  }

  async function regenerar(eventoId) {
    let borradas = 0;
    for (;;) {
      // las filas ya limpiadas dejan de aparecer, por eso el offset es siempre 0
      const filas = await cola.conDerivada({ eventoId, limite: 500 });
      if (!filas.length) break;
      for (const f of filas) {
        const r = rutasDerivadas(f.url_original);
        if (r) for (const p of [r.web, r.thumb]) await fs.promises.unlink(path.resolve(datos, p)).catch(() => {});
        await cola.limpiar(f.id); borradas++;
      }
      if (borradas > 500000) break;
    }
    ciclo().catch(() => {});
    return borradas;
  }

  return {
    estado, fallos, ciclo, regenerar,
    iniciar() { timer = setInterval(() => ciclo().catch(() => {}), intervaloMs); ciclo().catch(() => {}); },
    detener() { clearInterval(timer); },
    async resumen() {
      let pendientes = null; try { pendientes = await cola.contarPendientes(); } catch { /* BD no disponible */ }
      return { pendientes, fallidas: [...fallos.entries()].filter(([, v]) => v.n >= reintentos).length, procesadas: estado.procesadas, ultimo_ok: estado.ultimoOk, ultimo_error: estado.ultimoError, en_curso: estado.enCurso };
    },
  };
}

export function crearHttp(servicio, tokenInterno) {
  return http.createServer(async (req, res) => {
    const json = (c, o) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    const ruta = new URL(req.url, 'http://x').pathname;
    if (ruta === '/healthz') return json(200, { ok: true });
    if (!tokenInterno || req.headers['x-interno'] !== tokenInterno) return json(401, { error: 'no autorizado' });
    if (ruta === '/estado' && req.method === 'GET') return json(200, await servicio.resumen());
    if (ruta === '/despertar' && req.method === 'POST') { servicio.ciclo().catch(() => {}); return json(202, { ok: true }); }
    if (ruta === '/regenerar' && req.method === 'POST') {
      let body = ''; for await (const c of req) { body += c; if (body.length > 1e4) return json(413, {}); }
      let ev; try { ev = JSON.parse(body || '{}').evento_id; } catch { ev = undefined; }
      if (ev !== undefined && !/^[0-9a-fA-F-]{36}$/.test(ev)) return json(400, { error: 'evento_id inválido' });
      try { return json(200, { reiniciadas: await servicio.regenerar(ev) }); } catch (e) { return json(500, { error: String(e.message) }); }
    }
    json(404, { error: 'no existe' });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const env = process.env;
  const datos = env.DATA_DIR || '/datos';
  const cola = crearCola({ url: env.REST_URL || 'http://rest:3000', token: env.DERIVADAS_JWT || '' });
  if (!env.DERIVADAS_JWT) { log('error', 'falta DERIVADAS_JWT'); process.exit(1); }
  const marcaPng = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'marca.png'));
  const sharpMod = (await import('sharp')).default;
  sharpMod.concurrency(Number(env.SHARP_HILOS || 2));
  sharpMod.cache({ memory: 128, files: 0, items: 50 });
  const servicio = crearServicio({ datos, cola, marcaPng, intervaloMs: Number(env.INTERVALO_S || 20) * 1000, concurrencia: Number(env.CONCURRENCIA || 2), ajustes: { ...AJUSTES, marcaAgua: env.MARCA_AGUA === '1' } });
  const srv = crearHttp(servicio, env.INTERNAL_TOKEN || '');
  srv.listen(Number(env.PORT || 3100), () => log('info', 'derivadas escuchando'));
  servicio.iniciar();
  for (const s of ['SIGTERM', 'SIGINT']) process.on(s, () => { servicio.detener(); srv.close(() => process.exit(0)); });
}
