import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { analizarImagen, puntuar, elegirMejores, recomendarPlantilla, distanciaHash, extraerJson, normalizarBio, validarEntradaBio, manejadorPaginaIA } from '../lib/paginaIA.mjs';
import { leerConfig } from '../lib/config.mjs';
import { IDS_PLANTILLA } from '../../src/marca/plantillas.js';

// Imágenes sintéticas: tablero fino (mucho detalle), el mismo desenfocado, y colores lisos.
const tablero = (paso, c1, c2, tam = 240) => {
  const raw = Buffer.alloc(tam * tam * 3);
  for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) { const c = ((Math.floor(x / paso) + Math.floor(y / paso)) % 2) ? c1 : c2; raw.set(c, (y * tam + x) * 3); }
  return sharp(raw, { raw: { width: tam, height: tam, channels: 3 } });
};
const jpg = (s) => s.jpeg({ quality: 90 }).toBuffer();

test('una foto nítida puntúa más que la misma desenfocada', async () => {
  const nitida = await analizarImagen(await jpg(tablero(4, [200, 200, 200], [50, 50, 50])));
  const movida = await analizarImagen(await jpg(tablero(4, [200, 200, 200], [50, 50, 50]).blur(6)));
  assert.ok(nitida.nitidez > movida.nitidez * 4, `${nitida.nitidez} vs ${movida.nitidez}`);
  assert.ok(puntuar(nitida).puntaje > puntuar(movida).puntaje + 15);
  assert.ok(puntuar(nitida).motivos.includes('nítida'));
});

test('penaliza fotos muy oscuras o quemadas', async () => {
  const buena = puntuar(await analizarImagen(await jpg(tablero(6, [190, 170, 150], [60, 60, 60]))));
  const negra = puntuar(await analizarImagen(await jpg(tablero(6, [12, 12, 12], [4, 4, 4]))));
  const blanca = puntuar(await analizarImagen(await jpg(tablero(6, [255, 255, 255], [250, 250, 250]))));
  assert.ok(buena.puntaje > negra.puntaje && buena.puntaje > blanca.puntaje);
  assert.ok(negra.motivos.includes('muy oscura'));
});

test('la huella detecta repetidas y distingue fotos distintas', async () => {
  // Degradados con una mancha: A, A reducido y recomprimido (la "misma" foto), y B con el degradado invertido.
  const rampa = (invertir, tam = 240) => {
    const raw = Buffer.alloc(tam * tam * 3);
    for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
      let v = Math.round(20 + 200 * (invertir ? 1 - x / tam : x / tam));
      if ((x - 120) ** 2 + (y - 90) ** 2 < 1600) v = Math.min(255, v + 40);
      raw.set([v, Math.round(v * 0.8), Math.round(v * 0.6)], (y * tam + x) * 3);
    }
    return sharp(raw, { raw: { width: tam, height: tam, channels: 3 } });
  };
  const a = await analizarImagen(await jpg(rampa(false)));
  const reenc = await analizarImagen(await sharp(await jpg(rampa(false))).resize(180).jpeg({ quality: 60 }).toBuffer());
  const otra = await analizarImagen(await jpg(rampa(true)));
  assert.ok(distanciaHash(a.hash, reenc.hash) <= 8, `repetida: ${distanciaHash(a.hash, reenc.hash)}`);
  assert.ok(distanciaHash(a.hash, otra.hash) > 30, `distinta: ${distanciaHash(a.hash, otra.hash)}`);
  assert.equal(distanciaHash(a.hash, a.hash), 0);
});

test('elegirMejores quita repetidas, respeta el máximo y deja fuera las malas', () => {
  const it = (ruta, puntaje, hash) => ({ ruta, puntaje, hash });
  const lista = [it('a', 90, 0n), it('a-copia', 88, 1n), it('b', 80, 0xFFFFFFFFn), it('c', 70, 0xFFFFFFFF00000000n), it('mala', 10, 0xF0F0F0F0F0F0F0F0n)];
  const r = elegirMejores(lista, 12);
  assert.deepEqual(r.map((x) => x.ruta).sort(), ['a', 'b', 'c']);
  assert.equal(elegirMejores(lista, 2).length, 2);
  assert.equal(elegirMejores(lista, 2)[0].ruta, 'a');
});

test('recomienda plantilla según luz, color y contraste', () => {
  const lote = (o, n = 6) => Array.from({ length: n }, () => ({ luz: 120, saturacion: 0.3, contraste: 45, ...o }));
  assert.equal(recomendarPlantilla(lote({ luz: 60 })).id, 'oscura');
  assert.equal(recomendarPlantilla(lote({ luz: 170, saturacion: 0.15 })).id, 'minimal');
  assert.equal(recomendarPlantilla(lote({ saturacion: 0.5, contraste: 60 })).id, 'revista');
  assert.equal(recomendarPlantilla(lote({})).id, 'editorial');
  assert.equal(recomendarPlantilla([]), null);
  assert.ok(IDS_PLANTILLA.includes(recomendarPlantilla(lote({})).id));
});

test('los ids de plantilla del servidor coinciden con los de la web', async () => {
  const { IDS_PLANTILLA: serv } = await import('../lib/paginaIA.mjs');
  assert.deepEqual([...serv].sort(), [...IDS_PLANTILLA].sort());
});

test('extraerJson y normalizarBio toleran texto alrededor y recortan', () => {
  const t = 'Claro, aquí está:\n{"bio":"' + 'Hola '.repeat(200) + '","servicios":[{"nombre":"Cumpleaños","detalle":"Cobertura del evento"},{"nombre":"","detalle":"x"}]}\nListo.';
  const o = normalizarBio(extraerJson(t));
  assert.ok(o.bio.length <= 600);
  assert.equal(o.servicios.length, 1);
  assert.equal(extraerJson('sin json'), null);
  assert.equal(normalizarBio({ bio: 'corta' }), null);
});

test('validarEntradaBio exige ciudad, estilo y tipos, y limpia el texto', () => {
  assert.ok(validarEntradaBio({ ciudad: '', estilo: 'x', tipos: ['a'] }).error);
  const v = validarEntradaBio({ ciudad: 'Santo Domingo', estilo: 'Natural\u0000 y cálido', tipos: ['Cumpleaños', '', 'Retratos'], tono: 'raro' });
  assert.equal(v.e.tono, 'cercano');
  assert.deepEqual(v.e.tipos, ['Cumpleaños', 'Retratos']);
  assert.ok(!v.e.estilo.includes('\u0000'));
});

// ───────── Manejador HTTP con dependencias simuladas ─────────
const respuesta = () => { const r = { headers: {}, setHeader(k, v) { r.headers[k] = v; }, end(t) { r.cuerpo = t ? JSON.parse(t) : null; } }; return r; };
async function entorno({ clave = 'k', permitido = true } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pia-'));
  const datos = path.join(tmp, 'datos');
  const poner = async (rel, buf) => { const f = path.join(datos, 'miniaturas', `${rel}.jpg`); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, buf); };
  await poner('ana/ev1/nitida1', await jpg(tablero(4, [200, 190, 180], [50, 50, 60])));
  await poner('ana/ev1/nitida2', await jpg(tablero(3, [80, 200, 120], [20, 30, 20])));
  await poner('ana/ev1/movida', await jpg(tablero(4, [200, 190, 180], [50, 50, 60]).blur(8)));
  await poner('otra/ev9/ajena', await jpg(tablero(4, [200, 190, 180], [50, 50, 60])));
  const llamadas = [];
  const fetchFn = async (url, opts = {}) => {
    llamadas.push({ url: String(url), opts });
    const u = String(url);
    const ok = (obj) => ({ ok: true, status: 200, json: async () => obj });
    if (u.includes('/rest/v1/eventos')) return ok([{ id: 'ev1' }]);
    if (u.includes('/rest/v1/fotografias')) return ok([{ url_original: 'o/ana/ev1/nitida1' }, { url_original: 'o/ana/ev1/nitida2' }, { url_original: 'o/ana/ev1/movida' }, { url_original: 'o/otra/ev9/ajena' }]);
    if (u.includes('/v1/messages')) return ok({ content: [{ type: 'text', text: 'Aquí va: {"bio":"Soy fotógrafo en Santo Domingo y cuento historias con luz natural.","servicios":[{"nombre":"Cumpleaños","detalle":"Cobertura completa del evento"}]}' }] });
    return { ok: false, status: 404, json: async () => ({}) };
  };
  const ctx = { contexto: async () => (permitido ? { permitido: true, admin: false, slug: 'ana', fotografo_id: 'f-ana' } : null) };
  const cfg = { ...leerConfig({ DATA_DIR: datos, SUPABASE_URL: 'http://supa', SUPABASE_KEY: 'anon', ANTHROPIC_API_KEY: clave }) };
  const h = manejadorPaginaIA(cfg, ctx, fetchFn);
  const llamar = async (body) => { const res = respuesta(); await h({ method: 'POST', headers: { authorization: 'Bearer jwt' }, body }, res); return res; };
  return { llamar, llamadas, h };
}

test('sin sesión válida responde 401 y con GET 405', async () => {
  const { llamar, h } = await entorno({ permitido: false });
  assert.equal((await llamar({ accion: 'bio' })).statusCode, 401);
  const r = respuesta(); await h({ method: 'GET', headers: {} }, r); assert.equal(r.statusCode, 405);
});

test('bio: sin clave de IA responde 503; con clave devuelve bio y servicios', async () => {
  const sin = await entorno({ clave: '' });
  assert.equal((await sin.llamar({ accion: 'bio', ciudad: 'SD', estilo: 'natural', tipos: ['Cumpleaños'] })).statusCode, 503);
  const e = await entorno();
  const r = await e.llamar({ accion: 'bio', ciudad: 'Santo Domingo', estilo: 'natural', tipos: ['Cumpleaños'] });
  assert.equal(r.statusCode, 200);
  assert.match(r.cuerpo.bio, /Santo Domingo/);
  assert.equal(r.cuerpo.servicios[0].nombre, 'Cumpleaños');
  const llamada = e.llamadas.find((l) => l.url.includes('/v1/messages'));
  assert.equal(llamada.opts.headers['x-api-key'], 'k');
  assert.equal((await e.llamar({ accion: 'bio', ciudad: '', estilo: 'x', tipos: [] })).statusCode, 400);
});

test('fotos: elige solo fotos propias, deja la desenfocada para el final y recomienda plantilla', async () => {
  const e = await entorno();
  const r = await e.llamar({ accion: 'fotos' });
  assert.equal(r.statusCode, 200);
  const rutas = r.cuerpo.fotos.map((f) => f.ruta);
  assert.ok(!rutas.includes('o/otra/ev9/ajena'), 'nunca fotos de otra carpeta');
  assert.ok(rutas.includes('o/ana/ev1/nitida1') && rutas.includes('o/ana/ev1/nitida2'));
  assert.ok(rutas.indexOf('o/ana/ev1/movida') === -1 || rutas.indexOf('o/ana/ev1/movida') > rutas.indexOf('o/ana/ev1/nitida1'));
  assert.ok(IDS_PLANTILLA.includes(r.cuerpo.plantilla.id));
  // Consulta la lista de colecciones con la sesión del fotógrafo y solo las que no tienen contraseña.
  const q = e.llamadas.find((l) => l.url.includes('/rest/v1/eventos'));
  assert.match(q.url, /tiene_clave=eq\.false/);
  assert.equal(q.opts.headers.Authorization, 'Bearer jwt');
});

test('plantilla: ignora rutas que no son suyas', async () => {
  const e = await entorno();
  assert.equal((await e.llamar({ accion: 'plantilla', rutas: ['o/otra/ev9/ajena'] })).statusCode, 400);
  const r = await e.llamar({ accion: 'plantilla', rutas: ['o/ana/ev1/nitida1', 'o/otra/ev9/ajena', '../../etc/passwd'] });
  assert.equal(r.statusCode, 200);
  assert.ok(IDS_PLANTILLA.includes(r.cuerpo.plantilla.id));
});

test('limita el uso a 8 por hora y fotógrafo', async () => {
  const e = await entorno();
  for (let i = 0; i < 8; i++) assert.equal((await e.llamar({ accion: 'bio', ciudad: 'SD', estilo: 'x', tipos: ['a'] })).statusCode, 200);
  assert.equal((await e.llamar({ accion: 'bio', ciudad: 'SD', estilo: 'x', tipos: ['a'] })).statusCode, 429);
});
