import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { generarDerivadas, rutasDerivadas } from '../derivadas/procesar.mjs';
import { crearCola } from '../derivadas/cola.mjs';
import { crearServicio, crearHttp } from '../derivadas/index.mjs';

const MARCA = fs.readFileSync(new URL('../derivadas/marca.png', import.meta.url));
const escuchar = (srv) => new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv.address().port)));
const cerrar = (srv) => new Promise((r) => { srv.closeAllConnections?.(); srv.close(r); });

async function jpeg(w, h, orient) {
  let s = sharp({ create: { width: w, height: h, channels: 3, background: { r: 40, g: 90, b: 160 } } }).jpeg({ quality: 90 });
  if (orient) s = s.withMetadata({ orientation: orient });
  return s.toBuffer();
}

test('rutasDerivadas: mapea o/... y rechaza lo raro', () => {
  assert.deepEqual(rutasDerivadas('o/fiesta/a/1_x.png'), { rel: 'fiesta/a/1_x.png', web: 'watermarks/fiesta/a/1_x.png.jpg', thumb: 'miniaturas/fiesta/a/1_x.png.jpg' });
  for (const malo of [null, '', 'fiesta/a.jpg', 'o/../x.jpg', 'o/a b.jpg', 'https://x/o/a.jpg', 'watermarks/a.jpg']) assert.equal(rutasDerivadas(malo), null, String(malo));
});

test('generarDerivadas: tamaños, marca visible y metadatos eliminados', async () => {
  const origen = await jpeg(4000, 3000);
  const d = await generarDerivadas(origen, MARCA);
  const mw = await sharp(d.web).metadata(), mt = await sharp(d.thumb).metadata();
  assert.equal(mw.width, 1600); assert.equal(mw.height, 1200);
  assert.equal(mt.width, 480); assert.equal(mt.height, 360);
  assert.equal(d.ancho, 1600); assert.equal(d.alto, 1200);
  assert.equal(mw.exif, undefined);
  // sin marca sería un color casi plano; con marca la desviación estándar sube claramente
  const plano = await sharp(await sharp(origen).resize(1600).jpeg().toBuffer()).stats();
  const marcada = await sharp(d.web).stats();
  assert.ok(marcada.channels[0].stdev > plano.channels[0].stdev + 8, `stdev ${marcada.channels[0].stdev} vs ${plano.channels[0].stdev}`);
  // las miniaturas también llevan marca
  const st = await sharp(d.thumb).stats();
  assert.ok(st.channels[0].stdev > 5);
  assert.ok(d.web.length < origen.length * 3);
});

test('generarDerivadas: respeta la orientación EXIF y no agranda fotos pequeñas', async () => {
  const girada = await generarDerivadas(await jpeg(3000, 2000, 6), MARCA);   // 6 = girar 90°
  const m = await sharp(girada.web).metadata();
  assert.ok(m.height > m.width, `${m.width}x${m.height}`);
  assert.equal(m.height, 1600);
  const chica = await generarDerivadas(await jpeg(800, 600), MARCA);
  const mc = await sharp(chica.web).metadata();
  assert.equal(mc.width, 800);
});

test('generarDerivadas: un archivo corrupto falla con error claro', async () => {
  await assert.rejects(() => generarDerivadas(Buffer.from('esto no es una imagen'), MARCA));
});

async function entorno({ filas, fallarMarcar = false }) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'der-'));
  const datos = path.join(tmp, 'datos'); fs.mkdirSync(path.join(datos, 'originales', 'fiesta', 'a'), { recursive: true });
  const parches = [];
  const rest = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    if (req.headers.authorization !== 'Bearer jwt-derivadas') { res.statusCode = 401; return res.end('{}'); }
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET' && u.searchParams.get('url_watermark') === 'is.null') {
      if ((req.headers.prefer || '').includes('count=exact')) { res.setHeader('Content-Range', `0-0/${filas.filter((f) => !f.url_watermark).length}`); return res.end('[]'); }
      return res.end(JSON.stringify(filas.filter((f) => !f.url_watermark).slice(0, Number(u.searchParams.get('limit')))));
    }
    if (req.method === 'GET' && u.searchParams.get('url_watermark') === 'not.is.null') return res.end(JSON.stringify(filas.filter((f) => f.url_watermark)));
    if (req.method === 'PATCH') {
      let b = ''; for await (const c of req) b += c;
      const id = u.searchParams.get('id').replace('eq.', '');
      if (fallarMarcar) { res.statusCode = 503; return res.end('{"message":"caída"}'); }
      const cambios = JSON.parse(b); parches.push({ id, ...cambios });
      const f = filas.find((x) => x.id === id); if (f) f.url_watermark = cambios.url_watermark;
      res.statusCode = 204; return res.end();
    }
    res.statusCode = 400; res.end('{}');
  });
  const puerto = await escuchar(rest);
  const cola = crearCola({ url: `http://127.0.0.1:${puerto}`, token: 'jwt-derivadas' });
  const servicio = crearServicio({ datos, cola, marcaPng: MARCA, concurrencia: 2, loteMax: 5, reintentos: 2 });
  return { tmp, datos, parches, cola, servicio, filas, async fin() { await cerrar(rest); fs.rmSync(tmp, { recursive: true, force: true }); } };
}

test('servicio: procesa la cola, escribe archivos, registra rutas y no repite trabajo', async () => {
  const filas = [1, 2, 3, 4, 5, 6, 7].map((i) => ({ id: `id${i}`, url_original: `o/fiesta/a/${i}_f.jpg`, url_watermark: null }));
  const e = await entorno({ filas });
  try {
    for (const f of filas) fs.writeFileSync(path.join(e.datos, 'originales', f.url_original.slice(2)), await jpeg(2400, 1600));
    await e.servicio.ciclo();
    assert.equal(e.parches.length, 7);
    for (const p of e.parches) {
      assert.match(p.url_watermark, /^watermarks\/fiesta\/a\/\d+_f\.jpg\.jpg$/);
      assert.equal(p.ancho, 1600);
      assert.ok(fs.existsSync(path.join(e.datos, p.url_watermark)));
      assert.ok(fs.existsSync(path.join(e.datos, p.url_watermark.replace('watermarks/', 'miniaturas/'))));
    }
    // los originales siguen intactos
    assert.equal((await sharp(path.join(e.datos, 'originales', 'fiesta', 'a', '1_f.jpg')).metadata()).width, 2400);
    // sin restos temporales
    const restos = fs.readdirSync(e.datos, { recursive: true }).filter((f) => String(f).endsWith('.tmp'));
    assert.deepEqual(restos, []);
    e.parches.length = 0;
    await e.servicio.ciclo();
    assert.equal(e.parches.length, 0);
    assert.equal((await e.servicio.resumen()).pendientes, 0);
    assert.equal(e.servicio.estado.procesadas, 7);
  } finally { await e.fin(); }
});

test('servicio: una foto mala no frena a las demás y se deja de reintentar', async () => {
  const filas = [{ id: 'bien', url_original: 'o/fiesta/a/1_ok.jpg', url_watermark: null }, { id: 'mala', url_original: 'o/fiesta/a/2_rota.jpg', url_watermark: null }, { id: 'falta', url_original: 'o/fiesta/a/3_no_existe.jpg', url_watermark: null }];
  const e = await entorno({ filas });
  try {
    fs.writeFileSync(path.join(e.datos, 'originales/fiesta/a/1_ok.jpg'), await jpeg(1000, 700));
    fs.writeFileSync(path.join(e.datos, 'originales/fiesta/a/2_rota.jpg'), 'basura');
    await e.servicio.ciclo();
    assert.deepEqual(e.parches.map((p) => p.id), ['bien']);
    assert.equal(e.servicio.fallos.get('mala').n, 2);          // reintentos = 2
    assert.equal(e.servicio.fallos.get('falta').n, 2);
    const r = await e.servicio.resumen();
    assert.equal(r.pendientes, 2); assert.equal(r.fallidas, 2);
    assert.match(r.ultimo_error, /mala|falta/);
    const n = e.servicio.fallos.get('mala').n;
    await e.servicio.ciclo();
    assert.equal(e.servicio.fallos.get('mala').n, n, 'no debe seguir reintentando');
  } finally { await e.fin(); }
});

test('servicio: si la base de datos cae al registrar, el siguiente ciclo reutiliza los archivos', async () => {
  const filas = [{ id: 'a1', url_original: 'o/fiesta/a/1_x.jpg', url_watermark: null }];
  const e = await entorno({ filas, fallarMarcar: true });
  try {
    fs.writeFileSync(path.join(e.datos, 'originales/fiesta/a/1_x.jpg'), await jpeg(1800, 1200));
    await e.servicio.ciclo();
    assert.ok(fs.existsSync(path.join(e.datos, 'watermarks/fiesta/a/1_x.jpg.jpg')));
    assert.equal(e.parches.length, 0);
  } finally { await e.fin(); }
});

test('http interno: exige token, /despertar y /regenerar', async () => {
  const filas = [{ id: 'a1', url_original: 'o/fiesta/a/1_x.jpg', url_watermark: null }];
  const e = await entorno({ filas });
  const srv = crearHttp(e.servicio, 'tok');
  const puerto = await escuchar(srv); const base = `http://127.0.0.1:${puerto}`;
  try {
    fs.writeFileSync(path.join(e.datos, 'originales/fiesta/a/1_x.jpg'), await jpeg(1200, 800));
    assert.equal((await fetch(base + '/healthz')).status, 200);
    assert.equal((await fetch(base + '/estado')).status, 401);
    assert.equal((await fetch(base + '/estado', { headers: { 'X-Interno': 'mal' } })).status, 401);
    const h = { 'X-Interno': 'tok' };
    assert.equal((await fetch(base + '/despertar', { method: 'POST', headers: h })).status, 202);
    for (let i = 0; i < 50 && !filas[0].url_watermark; i++) await new Promise((r) => setTimeout(r, 100));
    assert.ok(filas[0].url_watermark);
    const w = path.join(e.datos, filas[0].url_watermark);
    assert.ok(fs.existsSync(w));
    // regenerar: borra derivadas y vuelve a procesar
    const antes = fs.statSync(w).mtimeMs;
    await new Promise((r) => setTimeout(r, 20));
    const r = await fetch(base + '/regenerar', { method: 'POST', headers: h, body: '{}' });
    assert.equal((await r.json()).reiniciadas, 1);
    for (let i = 0; i < 50 && !(fs.existsSync(w) && fs.statSync(w).mtimeMs > antes); i++) await new Promise((r2) => setTimeout(r2, 100));
    assert.ok(fs.statSync(w).mtimeMs > antes);
    assert.equal((await fetch(base + '/regenerar', { method: 'POST', headers: h, body: '{"evento_id":"malo"}' })).status, 400);
  } finally { await cerrar(srv); await e.fin(); }
});
