import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { crearServidor } from '../server.mjs';
import { leerConfig } from '../lib/config.mjs';
import { rutaOriginal, nombreDescarga } from '../lib/descargas.mjs';

const escuchar = (srv) => new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv.address().port)));
const cerrar = (srv) => new Promise((r) => { srv.closeAllConnections?.(); srv.close(r); });

async function entorno({ permitir = true, clave = false } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-'));
  const dist = path.join(tmp, 'dist'); fs.mkdirSync(dist);
  fs.writeFileSync(path.join(dist, 'index.html'), 'x');
  const datos = path.join(tmp, 'datos'); fs.mkdirSync(path.join(datos, 'originales', 'ev1'), { recursive: true });
  fs.writeFileSync(path.join(datos, 'originales', 'ev1', '1793104804765_abc_IMG1.jpg'), 'ORIGINAL-COMPLETO');
  fs.writeFileSync(path.join(tmp, 'secreto.txt'), 'NO');
  const supa = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const u = decodeURIComponent(req.url);
    if (u.startsWith('/rest/v1/fotografias')) return res.end(JSON.stringify(u.includes('url_original=eq.o/ev1/1793104804765_abc_IMG1.jpg') ? [{ evento_id: 'e-1' }] : []));
    if (u.startsWith('/rest/v1/eventos')) return res.end(JSON.stringify([{ permitir_descarga: permitir, tiene_clave: clave }]));
    if (u.startsWith('/rest/v1/rpc/verificar_clave_evento')) { let b = ''; for await (const c of req) b += c; return res.end(JSON.stringify(JSON.parse(b).p_clave === 'secreta')); }
    res.statusCode = 404; res.end('{}');
  });
  const ps = await escuchar(supa);
  const cfg = leerConfig({ DIST_DIR: dist, DATA_DIR: datos, SUPABASE_URL: `http://127.0.0.1:${ps}`, SUPABASE_KEY: 'anon', UPLOAD_SECRET: 'x'.repeat(40) });
  const srv = crearServidor(cfg);
  const port = await escuchar(srv);
  const base = `http://127.0.0.1:${port}`;
  return { base, async fin() { await Promise.all([cerrar(srv), cerrar(supa)]); fs.rmSync(tmp, { recursive: true, force: true }); } };
}
const pedir = (base, body) => fetch(base + '/api/descarga', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const P = 'watermarks/ev1/1793104804765_abc_IMG1.jpg.jpg';

test('rutaOriginal y nombreDescarga', () => {
  assert.equal(rutaOriginal(P), 'ev1/1793104804765_abc_IMG1.jpg');
  assert.equal(rutaOriginal('miniaturas/ev1/a.png.jpg'), 'ev1/a.png');
  assert.equal(rutaOriginal('o/ev1/a.jpg'), 'ev1/a.jpg');
  for (const m of [null, '', 'portadas/a.jpg', 'o/../x.jpg', 'watermarks/../x.jpg.jpg', 'o/a b.jpg', 42]) assert.equal(rutaOriginal(m), null, String(m));
  assert.equal(nombreDescarga('ev1/1793104804765_abc_IMG1.jpg'), 'abc_IMG1.jpg');
});

test('descarga: con el interruptor encendido entrega el original como adjunto', async () => {
  const e = await entorno();
  try {
    const r = await pedir(e.base, { p: P });
    assert.equal(r.status, 200);
    const { url } = await r.json();
    const f = await fetch(e.base + url);
    assert.equal(f.status, 200);
    assert.match(f.headers.get('content-disposition'), /^attachment; filename="abc_IMG1\.jpg"$/);
    assert.equal(await f.text(), 'ORIGINAL-COMPLETO');
  } finally { await e.fin(); }
});

test('descarga: apagada, foto inexistente o enlace manipulado se rechazan', async () => {
  const e = await entorno({ permitir: false });
  try {
    assert.equal((await pedir(e.base, { p: P })).status, 403);
    assert.equal((await pedir(e.base, { p: 'watermarks/ev1/otra.jpg.jpg' })).status, 404);
    assert.equal((await pedir(e.base, { p: '../etc/passwd' })).status, 400);
    assert.equal((await fetch(e.base + '/api/descarga/basura')).status, 401);
    assert.equal((await fetch(e.base + '/api/descarga', { method: 'GET' })).status, 405);
  } finally { await e.fin(); }
});

test('descarga: un evento con clave exige la clave correcta', async () => {
  const e = await entorno({ clave: true });
  try {
    assert.equal((await pedir(e.base, { p: P })).status, 403);
    assert.equal((await pedir(e.base, { p: P, clave: 'mala' })).status, 403);
    assert.equal((await pedir(e.base, { p: P, clave: 'secreta' })).status, 200);
  } finally { await e.fin(); }
});
