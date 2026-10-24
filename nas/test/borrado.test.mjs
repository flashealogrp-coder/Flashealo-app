import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { claves, borrarFotos, borrarColeccion, purgarPapelera } from '../lib/borrado.mjs';
import { crearServidor } from '../server.mjs';
import { leerConfig } from '../lib/config.mjs';

const hoy = new Date().toISOString().slice(0, 10);
function datos() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'bor-'));
  for (const [dir, f] of [['originales', 'fiesta/a/1_x.png'], ['watermarks', 'fiesta/a/1_x.png.jpg'], ['miniaturas', 'fiesta/a/1_x.png.jpg'], ['originales', 'fiesta/a/2_y.jpg'], ['originales', 'otra/b/3_z.jpg'], ['watermarks', 'otra/b/3_z.jpg.jpg']]) {
    fs.mkdirSync(path.dirname(path.join(d, dir, f)), { recursive: true }); fs.writeFileSync(path.join(d, dir, f), 'datos');
  }
  return d;
}

test('claves: acepta o/, watermarks/ y miniaturas/; rechaza lo ajeno', () => {
  const esperado = ['originales/fiesta/a/1_x.png', 'watermarks/fiesta/a/1_x.png.jpg', 'miniaturas/fiesta/a/1_x.png.jpg'];
  assert.deepEqual(claves('o/fiesta/a/1_x.png'), esperado);
  assert.deepEqual(claves('watermarks/fiesta/a/1_x.png.jpg'), esperado);
  assert.deepEqual(claves('/miniaturas/fiesta/a/1_x.png.jpg'), esperado);
  for (const m of ['', null, 'avatares/a.jpg', 'o/../../etc/passwd', 'o/a b', 'https://x/o/a', 'watermarks/a.png', 'o/']) assert.equal(claves(m), null, String(m));
});

test('borrarFotos: manda original y derivadas a la papelera, no las elimina', async () => {
  const d = datos();
  const r = await borrarFotos(d, ['o/fiesta/a/1_x.png', 'avatares/x.jpg', 'o/no/existe.jpg']);
  assert.equal(r.movidos, 3); assert.equal(r.omitidas, 1);
  assert.ok(!fs.existsSync(path.join(d, 'originales/fiesta/a/1_x.png')));
  assert.ok(!fs.existsSync(path.join(d, 'watermarks/fiesta/a/1_x.png.jpg')));
  assert.equal(fs.readFileSync(path.join(d, 'papelera', hoy, 'originales/fiesta/a/1_x.png'), 'utf8'), 'datos');
  assert.ok(fs.existsSync(path.join(d, 'originales/fiesta/a/2_y.jpg')), 'las demás fotos no se tocan');
  // borrar dos veces el mismo nombre no pierde nada
  fs.writeFileSync(path.join(d, 'originales/fiesta/a/1_x.png'), 'nuevo');
  await borrarFotos(d, ['o/fiesta/a/1_x.png']);
  assert.equal(fs.readdirSync(path.join(d, 'papelera', hoy, 'originales/fiesta/a')).length, 2);
});

test('borrarColeccion: mueve la carpeta del evento completa y valida el prefijo', async () => {
  const d = datos();
  const r = await borrarColeccion(d, 'fiesta');
  assert.equal(r.movidos, 3);
  assert.ok(!fs.existsSync(path.join(d, 'originales/fiesta')));
  assert.ok(fs.existsSync(path.join(d, 'originales/otra/b/3_z.jpg')));
  assert.ok(fs.existsSync(path.join(d, 'papelera', hoy, 'originales/fiesta/a/2_y.jpg')));
  for (const malo of ['', '../otra', 'a/b', '/']) assert.ok((await borrarColeccion(d, malo)).error, malo);
  assert.equal((await borrarColeccion(d, '..')).movidos, 0);   // se sanea a '-' y no existe
  assert.ok(fs.existsSync(path.join(d, 'originales/otra')));
});

test('purgarPapelera: elimina solo días de más de 30 días', async () => {
  const d = datos();
  for (const dia of ['2020-01-01', hoy, '2025-13-99', 'texto']) fs.mkdirSync(path.join(d, 'papelera', dia), { recursive: true });
  const n = await purgarPapelera(d, 30);
  assert.equal(n, 1);
  assert.ok(!fs.existsSync(path.join(d, 'papelera/2020-01-01')));
  assert.ok(fs.existsSync(path.join(d, 'papelera', hoy)));
  assert.equal(await purgarPapelera(path.join(d, 'no-hay'), 30), 0);
});

test('API /api/ia eliminar_*: solo admin y sin tocar nada si no lo es', async () => {
  const d = datos();
  const supa = http.createServer((req, res) => { res.end((req.headers.authorization || '') === 'Bearer admin' ? 'true' : 'false'); });
  await new Promise((r) => supa.listen(0, '127.0.0.1', r));
  const cfg = leerConfig({ DIST_DIR: d, DATA_DIR: d, SUPABASE_URL: `http://127.0.0.1:${supa.address().port}`, SUPABASE_KEY: 'k', UPLOAD_SECRET: 'x'.repeat(40) });
  const srv = crearServidor(cfg);
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const post = (body, t) => fetch(base + '/api/ia', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify(body) });
  try {
    assert.equal((await post({ accion: 'eliminar_fotos', rutas: ['o/fiesta/a/1_x.png'] })).status, 401);
    assert.equal((await post({ accion: 'eliminar_fotos', rutas: ['o/fiesta/a/1_x.png'] }, 'otro')).status, 401);
    assert.ok(fs.existsSync(path.join(d, 'originales/fiesta/a/1_x.png')));
    assert.equal((await post({ accion: 'eliminar_fotos', rutas: 'texto' }, 'admin')).status, 400);
    const r = await post({ accion: 'eliminar_fotos', rutas: ['o/fiesta/a/1_x.png'] }, 'admin');
    assert.equal(r.status, 200); assert.equal((await r.json()).movidos, 3);
    assert.equal((await post({ accion: 'eliminar_coleccion', prefijo: '../x' }, 'admin')).status, 400);
    assert.equal((await (await post({ accion: 'eliminar_coleccion', prefijo: 'otra' }, 'admin')).json()).movidos, 2);
  } finally { srv.closeAllConnections?.(); srv.close(); supa.closeAllConnections?.(); supa.close(); }
});
