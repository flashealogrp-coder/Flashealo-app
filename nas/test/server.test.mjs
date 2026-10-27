import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { crearServidor } from '../server.mjs';
import { leerConfig } from '../lib/config.mjs';
import { firmar, verificar } from '../lib/tokens.mjs';

const escuchar = (srv) => new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv.address().port)));
const cerrar = (srv) => new Promise((r) => { srv.closeAllConnections?.(); srv.close(r); });

async function entorno(extra = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fl-'));
  const dist = path.join(tmp, 'dist'); fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'index.html'), '<html>spa</html>');
  fs.writeFileSync(path.join(dist, 'assets', 'app.js'), 'console.log(1)');
  fs.writeFileSync(path.join(tmp, 'secreto.txt'), 'NO');
  const datos = path.join(tmp, 'datos'); fs.mkdirSync(datos);

  const llamadas = { modal: [], desp: [] };
  // Simula Supabase: mi_contexto() y es_dueno_evento() según el "token" de cada prueba.
  const PERFILES = {
    admin: { es_admin: true, estado: null, slug: null },
    ana: { es_admin: false, estado: 'activo', slug: 'ana', fotografo_id: 'f-ana', cuota_bytes: null },
    chica: { es_admin: false, estado: 'activo', slug: 'chica', fotografo_id: 'f-chica', cuota_bytes: 1000 },
    pendiente: { es_admin: false, estado: 'pendiente', slug: 'pend', fotografo_id: 'f-pend', cuota_bytes: null },
  };
  const supa = http.createServer(async (req, res) => {
    const t = (req.headers.authorization || '').replace('Bearer ', '');
    let b = ''; for await (const c of req) b += c;
    res.setHeader('Content-Type', 'application/json');
    if (req.url.endsWith('/rpc/mi_contexto')) return res.end(JSON.stringify(PERFILES[t] || { es_admin: false, estado: null, slug: null }));
    if (req.url.endsWith('/rpc/es_dueno_evento')) {
      const ev = JSON.parse(b || '{}').p_evento;
      return res.end(JSON.stringify(t === 'admin' || (t === 'ana' && ev === '11111111-1111-1111-1111-111111111111')));
    }
    res.statusCode = 404; res.end('{}');
  });
  const modal = http.createServer(async (req, res) => {
    let b = ''; for await (const c of req) b += c;
    llamadas.modal.push({ clave: req.headers['x-flashealo-key'], body: JSON.parse(b) });
    res.end('{}');
  });
  const desp = http.createServer((req, res) => { llamadas.desp.push(req.headers['x-interno']); res.end('{}'); });
  const [ps, pm, pd] = await Promise.all([escuchar(supa), escuchar(modal), escuchar(desp)]);

  const cfg = leerConfig({
    DIST_DIR: dist, DATA_DIR: datos, SUPABASE_URL: `http://127.0.0.1:${ps}`, SUPABASE_KEY: 'anon',
    UPLOAD_SECRET: 'x'.repeat(40), MIN_FREE_PCT: '0', IMG_MAX_MB: '1',
    IA_MODAL_URL: `http://127.0.0.1:${pm}/ia`, IA_SHARED_KEY: 'clave-ia', DERIVADAS_URL: `http://127.0.0.1:${pd}`, INTERNAL_TOKEN: 'interno',
    ...extra,
  });
  const srv = crearServidor(cfg);
  const port = await escuchar(srv);
  const base = `http://127.0.0.1:${port}`;
  return { base, cfg, datos, tmp, llamadas, async fin() { await Promise.all([cerrar(srv), cerrar(supa), cerrar(modal), cerrar(desp)]); fs.rmSync(tmp, { recursive: true, force: true }); } };
}
const post = (base, p, body, token) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
const pedir = async (e, token = 'admin', extra = {}) => (await post(e.base, '/api/upload-url', { fileName: 'IMG 001.jpg', fileType: 'image/jpeg', carpetaR2: 'fiesta-ana/Cumpleaños', ...extra }, token));

test('tokens: firmar, verificar, manipulación y caducidad', () => {
  const t = firmar({ k: 'a', e: Date.now() + 1000 }, 's'.repeat(32));
  assert.equal(verificar(t, 's'.repeat(32)).k, 'a');
  assert.equal(verificar(t, 'otra'.repeat(8)), null);
  assert.equal(verificar(t.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')), 's'.repeat(32)), null);
  assert.equal(verificar(firmar({ k: 'a', e: Date.now() - 1 }, 's'.repeat(32)), 's'.repeat(32)), null);
  assert.equal(verificar('basura', 's'), null);
  assert.equal(verificar(undefined, 's'), null);
});

test('upload-url: exige admin', async () => {
  const e = await entorno();
  try {
    assert.equal((await pedir(e, null)).status, 401);
    assert.equal((await pedir(e, 'otro')).status, 401);
    const r = await pedir(e, 'admin');
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.match(j.path, /^o\/fiesta-ana\/Cumpleanos\/\d+_[0-9a-f]{6}_IMG001\.jpg$/);
    assert.match(j.url, /^\/api\/subir\//);
  } finally { await e.fin(); }
});

test('upload-url: valida datos y bloquea rutas peligrosas', async () => {
  const e = await entorno();
  try {
    assert.equal((await pedir(e, 'admin', { fileType: 'application/x-sh' })).status, 400);
    assert.equal((await pedir(e, 'admin', { fileName: undefined })).status, 400);
    assert.equal((await pedir(e, 'admin', { carpetaR2: '' })).status, 400);
    const r = await pedir(e, 'admin', { carpetaR2: '../../etc/cron.d' });
    const j = await r.json();
    assert.ok(!j.path.includes('..'), j.path);
    assert.equal((await fetch(e.base + '/api/upload-url')).status, 405);
  } finally { await e.fin(); }
});

test('subida completa: PUT guarda el original en disco y no se puede repetir', async () => {
  const e = await entorno();
  try {
    const { url, path: p } = await (await pedir(e)).json();
    const contenido = Buffer.from('JPEGDATA'.repeat(1000));
    const r = await fetch(e.base + url, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: contenido });
    assert.equal(r.status, 200);
    const guardado = fs.readFileSync(path.join(e.datos, 'originales', p.slice(2)));
    assert.deepEqual(guardado, contenido);
    // sin archivos temporales
    const restos = fs.readdirSync(path.dirname(path.join(e.datos, 'originales', p.slice(2)))).filter((f) => f.endsWith('.parte'));
    assert.deepEqual(restos, []);
    // el mismo enlace no puede pisar el original
    const r2 = await fetch(e.base + url, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: Buffer.from('OTRO') });
    assert.equal(r2.status, 409);
    assert.deepEqual(fs.readFileSync(path.join(e.datos, 'originales', p.slice(2))), contenido);
  } finally { await e.fin(); }
});

test('subida: rechaza token falso, vencido, tipo distinto y archivo demasiado grande', async () => {
  const e = await entorno();
  try {
    const put = (u, ct = 'image/jpeg', body = 'x') => fetch(e.base + u, { method: 'PUT', headers: { 'Content-Type': ct }, body });
    assert.equal((await put('/api/subir/falso.token')).status, 401);
    const vencido = firmar({ k: 'a/b.jpg', t: 'image/jpeg', m: 100, e: Date.now() - 5 }, e.cfg.uploadSecret);
    assert.equal((await put('/api/subir/' + vencido)).status, 401);
    const { url } = await (await pedir(e)).json();
    assert.equal((await put(url, 'image/png')).status, 415);
    // IMG_MAX_MB=1 -> 2 MB debe fallar y no dejar nada
    const grande = Buffer.alloc(2 * 1024 * 1024, 1);
    const r = await put(url, 'image/jpeg', grande);
    assert.equal(r.status, 413);
    const hay = (d) => fs.existsSync(d) ? fs.readdirSync(d, { recursive: true }).filter((f) => !fs.statSync(path.join(d, f)).isDirectory()) : [];
    assert.deepEqual(hay(path.join(e.datos, 'originales')), []);
    // el token con ruta que intenta salir de la carpeta se rechaza
    const malo = firmar({ k: '../../secreto.txt', t: 'image/jpeg', m: 100, e: Date.now() + 1e5 }, e.cfg.uploadSecret);
    assert.equal((await put('/api/subir/' + malo)).status, 400);
    assert.equal(fs.readFileSync(path.join(e.tmp, 'secreto.txt'), 'utf8'), 'NO');
  } finally { await e.fin(); }
});

test('subida: el límite se aplica aunque el cliente no declare el tamaño (chunked)', async () => {
  const e = await entorno();
  try {
    const { url } = await (await pedir(e)).json();
    const u = new URL(e.base + url);
    const estado = await new Promise((resolve, reject) => {
      const rq = http.request({ host: u.hostname, port: u.port, path: u.pathname, method: 'PUT', headers: { 'Content-Type': 'image/jpeg', 'Transfer-Encoding': 'chunked' } }, (r) => { r.resume(); resolve(r.statusCode); });
      rq.on('error', (err) => (err.code === 'ECONNRESET' || err.code === 'EPIPE' ? resolve(413) : reject(err)));
      const trozo = Buffer.alloc(512 * 1024, 7);
      rq.write(trozo); rq.write(trozo); rq.write(trozo); rq.end();
    });
    assert.equal(estado, 413);
    const restos = fs.existsSync(path.join(e.datos, 'originales')) ? fs.readdirSync(path.join(e.datos, 'originales'), { recursive: true }).filter((f) => !fs.statSync(path.join(e.datos, 'originales', f)).isDirectory()) : [];
    assert.deepEqual(restos, []);
  } finally { await e.fin(); }
});

test('subida abortada a mitad no deja archivos a medias', async () => {
  const e = await entorno();
  try {
    const { url } = await (await pedir(e)).json();
    const u = new URL(e.base + url);
    await new Promise((resolve) => {
      const rq = http.request({ host: u.hostname, port: u.port, path: u.pathname, method: 'PUT', headers: { 'Content-Type': 'image/jpeg', 'Content-Length': '500000' } });
      rq.on('error', () => resolve());
      rq.write(Buffer.alloc(1000, 1));
      setTimeout(() => { rq.destroy(); resolve(); }, 100);
    });
    await new Promise((r) => setTimeout(r, 300));
    const restos = fs.existsSync(path.join(e.datos, 'originales')) ? fs.readdirSync(path.join(e.datos, 'originales'), { recursive: true }).filter((f) => !fs.statSync(path.join(e.datos, 'originales', f)).isDirectory()) : [];
    assert.deepEqual(restos, []);
  } finally { await e.fin(); }
});

test('disco casi lleno: se rechaza antes de subir', async () => {
  const e = await entorno({ MIN_FREE_PCT: '101' });
  try {
    assert.equal((await pedir(e)).status, 507);
    const t = firmar({ k: 'a/b.jpg', t: 'image/jpeg', m: 1e6, e: Date.now() + 1e5 }, e.cfg.uploadSecret);
    const r = await fetch(e.base + '/api/subir/' + t, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: 'x' });
    assert.equal(r.status, 507);
  } finally { await e.fin(); }
});

test('/api/ia: solo admin; miniaturas despierta al servicio local; ia reenvía con clave', async () => {
  const e = await entorno();
  try {
    const ev = '123e4567-e89b-12d3-a456-426614174000';
    assert.equal((await post(e.base, '/api/ia', { evento_id: ev, accion: 'ia' })).status, 401);
    assert.equal((await post(e.base, '/api/ia', { evento_id: ev, accion: 'ia' }, 'otro')).status, 401);
    assert.equal((await post(e.base, '/api/ia', { evento_id: 'malo', accion: 'ia' }, 'admin')).status, 400);
    assert.equal((await post(e.base, '/api/ia', { evento_id: ev, accion: 'borrar_todo' }, 'admin')).status, 400);
    assert.equal((await post(e.base, '/api/ia', { evento_id: ev, accion: 'miniaturas' }, 'admin')).status, 202);
    assert.deepEqual(e.llamadas.desp, ['interno']);
    assert.equal((await post(e.base, '/api/ia', { evento_id: ev, accion: 'ia', tipo_reconocimiento: 'rostro' }, 'admin')).status, 202);
    assert.equal(e.llamadas.modal[0].clave, 'clave-ia');
    assert.equal(e.llamadas.modal[0].body.evento_id, ev);
  } finally { await e.fin(); }
});

test('/api/ia sin motor configurado responde 503 claro', async () => {
  const e = await entorno({ IA_MODAL_URL: '' });
  try {
    assert.equal((await post(e.base, '/api/ia', { evento_id: '123e4567-e89b-12d3-a456-426614174000', accion: 'ia' }, 'admin')).status, 503);
  } finally { await e.fin(); }
});

test('estáticos: SPA, 404 de assets, sin salir de dist, cabeceras', async () => {
  const e = await entorno();
  try {
    let r = await fetch(e.base + '/');
    assert.equal(await r.text(), '<html>spa</html>');
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.match(r.headers.get('permissions-policy'), /camera=\(self\)/);
    assert.equal(await (await fetch(e.base + '/g/mi-evento')).text(), '<html>spa</html>');
    r = await fetch(e.base + '/assets/app.js');
    assert.match(r.headers.get('cache-control'), /immutable/);
    assert.equal((await fetch(e.base + '/assets/no-existe.js')).status, 404);
    const raw = await new Promise((resolve) => {
      http.get({ host: '127.0.0.1', port: new URL(e.base).port, path: '/..%2f..%2fsecreto.txt' }, (rs) => { let d = ''; rs.on('data', (c) => (d += c)); rs.on('end', () => resolve({ s: rs.statusCode, d })); });
    });
    assert.ok(!raw.d.includes('NO'), 'no debe servir archivos fuera de dist');
    r = await fetch(e.base + '/healthz');
    assert.equal((await r.json()).ok, true);
    assert.equal((await fetch(e.base + '/api/otra')).status, 404);
  } finally { await e.fin(); }
});

test('IA: enlaces temporales de fotos para el motor, y el enlace sirve solo esa foto', async () => {
  // Supabase simulado: is_admin y listado de fotografías
  const pedidos = [];
  const supa2 = http.createServer((req, res) => {
    pedidos.push(req.url);
    res.setHeader('Content-Type', 'application/json');
    if (req.url.includes('mi_contexto')) return res.end(JSON.stringify({ es_admin: true, estado: null, slug: null }));
    res.end(JSON.stringify([{ id: 'f1', url_original: 'o/ev/a.jpg' }, { id: 'f2', url_original: 'o/ev/../../secreto.txt' }, { id: 'f3', url_original: 'watermarks/x.jpg' }]));
  });
  const p2 = await escuchar(supa2);
  const e = await entorno({ SUPABASE_URL: `http://127.0.0.1:${p2}`, WEB_PUBLIC_URL: 'https://www.flashealo.do/' });
  // reconstruir servidor con cfg que apunta a supa2 (entorno ya lo hizo con SUPABASE_URL=extra)
  fs.mkdirSync(path.join(e.datos, 'originales', 'ev'), { recursive: true });
  fs.writeFileSync(path.join(e.datos, 'originales', 'ev', 'a.jpg'), 'JPEGDATA');
  fs.writeFileSync(path.join(e.datos, 'originales', 'otra.jpg'), 'OTRA');
  const ev = '11111111-1111-1111-1111-111111111111';
  const r = await post(e.base, '/api/ia', { evento_id: ev, accion: 'ia', tipo_reconocimiento: 'hibrido' }, 'admin');
  assert.equal(r.status, 202);
  const enviado = e.llamadas.modal[0].body;
  assert.equal(enviado.fotos.length, 1);                              // solo la válida: sin '..' y sin rutas que no son del NAS
  assert.match(enviado.fotos[0].url, /^https:\/\/www\.flashealo\.do\/api\/foto-ia\//);
  const token = enviado.fotos[0].url.split('/api/foto-ia/')[1];
  const ok = await fetch(`${e.base}/api/foto-ia/${token}`);
  assert.equal(ok.status, 200); assert.equal(await ok.text(), 'JPEGDATA'); assert.equal(ok.headers.get('content-type'), 'image/jpeg');
  assert.equal((await fetch(`${e.base}/api/foto-ia/${token}x`)).status, 401);
  // un token de SUBIDA no sirve como enlace de IA (claves separadas)
  const subida = firmar({ k: 'otra.jpg', t: 'image/jpeg', m: 1, e: Date.now() + 5000 }, e.cfg.uploadSecret);
  assert.equal((await fetch(`${e.base}/api/foto-ia/${subida}`)).status, 401);
  // un token de IA caducado no sirve
  const viejo = firmar({ k: 'ev/a.jpg', p: 'ia', e: Date.now() - 1 }, 'ia:' + e.cfg.uploadSecret);
  assert.equal((await fetch(`${e.base}/api/foto-ia/${viejo}`)).status, 401);
  // intento de salir de la carpeta con un token válido pero ruta maliciosa
  const malo = firmar({ k: '../../secreto.txt', p: 'ia', e: Date.now() + 5000 }, 'ia:' + e.cfg.uploadSecret);
  assert.equal((await fetch(`${e.base}/api/foto-ia/${malo}`)).status, 400);
  assert.ok(pedidos.some((u) => u.includes(`evento_id=eq.${ev}`)));
  await cerrar(supa2); await e.fin();
});

test('fotógrafos: solo escriben en su carpeta, cuentas pendientes no entran y la cuota se respeta', async () => {
  const e = await entorno();
  const sube = (token, carpetaR2, extra = {}) => post(e.base, '/api/upload-url', { fileName: 'a.jpg', fileType: 'image/jpeg', carpetaR2, ...extra }, token);
  assert.equal((await sube('ana', 'ana/boda/novios')).status, 200);               // su carpeta
  assert.equal((await sube('ana', 'ana')).status, 200);
  assert.equal((await sube('ana', 'chica/boda')).status, 403);                     // carpeta de otra persona
  assert.equal((await sube('ana', 'anabanana/x')).status, 403);                    // prefijo parecido, no igual
  assert.equal((await sube('ana', 'boda/novios')).status, 403);                    // sin su carpeta
  assert.equal((await sube('pendiente', 'pend/x')).status, 401);                   // cuenta sin aprobar
  assert.equal((await sube('admin', 'cualquiera/x')).status, 200);                 // superadmin sin restricción
  // cuota de 1000 bytes: ya hay 900 guardados y se pide subir 200 más
  fs.mkdirSync(path.join(e.datos, 'originales', 'chica', 'ev'), { recursive: true });
  fs.writeFileSync(path.join(e.datos, 'originales', 'chica', 'ev', 'x.jpg'), Buffer.alloc(900));
  assert.equal((await sube('chica', 'chica/ev', { fileSize: 200 })).status, 507);
  assert.equal((await sube('chica', 'chica/ev', { fileSize: 50 })).status, 200);
  await e.fin();
});

test('fotógrafos: /api/ia borra solo lo suyo y solo procesa colecciones propias', async () => {
  const e = await entorno();
  const ia = (token, body) => post(e.base, '/api/ia', body, token);
  const suya = '11111111-1111-1111-1111-111111111111', ajena = '22222222-2222-2222-2222-222222222222';
  for (const rel of ['ana/ev/a.jpg', 'otro/ev/b.jpg']) {
    for (const d of ['originales', 'watermarks', 'miniaturas']) {
      fs.mkdirSync(path.dirname(path.join(e.datos, d, rel)), { recursive: true });
      fs.writeFileSync(path.join(e.datos, d, rel + (d === 'originales' ? '' : '.jpg')), 'x');
    }
  }
  assert.equal((await ia('ana', { accion: 'eliminar_fotos', rutas: ['o/otro/ev/b.jpg'] })).status, 403);
  assert.equal((await ia('ana', { accion: 'eliminar_fotos', rutas: ['o/ana/ev/a.jpg', 'o/otro/ev/b.jpg'] })).status, 403);
  assert.equal((await ia('ana', { accion: 'eliminar_fotos', rutas: ['o/ana/../otro/ev/b.jpg'] })).status, 403);
  assert.ok(fs.existsSync(path.join(e.datos, 'originales', 'otro', 'ev', 'b.jpg')));
  assert.equal((await ia('ana', { accion: 'eliminar_fotos', rutas: ['o/ana/ev/a.jpg'] })).status, 200);
  assert.ok(!fs.existsSync(path.join(e.datos, 'originales', 'ana', 'ev', 'a.jpg')));
  // eliminar colección: el prefijo se resuelve DENTRO de la carpeta del fotógrafo
  fs.mkdirSync(path.join(e.datos, 'originales', 'ev'), { recursive: true });
  fs.writeFileSync(path.join(e.datos, 'originales', 'ev', 'raiz.jpg'), 'x');
  assert.equal((await ia('ana', { accion: 'eliminar_coleccion', prefijo: 'ev' })).status, 200);
  assert.ok(fs.existsSync(path.join(e.datos, 'originales', 'ev', 'raiz.jpg')), 'no debe tocar la raíz ni a otros');
  assert.ok(fs.existsSync(path.join(e.datos, 'originales', 'otro', 'ev', 'b.jpg')));
  assert.equal((await ia('ana', { accion: 'eliminar_coleccion', prefijo: '../otro' })).status, 400);
  // procesar / IA solo de colecciones propias
  assert.equal((await ia('ana', { evento_id: ajena, accion: 'miniaturas' })).status, 403);
  assert.equal((await ia('ana', { evento_id: suya, accion: 'miniaturas' })).status, 202);
  assert.equal((await ia('ana', { evento_id: ajena, accion: 'ia' })).status, 403);
  assert.equal((await ia('pendiente', { evento_id: suya, accion: 'miniaturas' })).status, 401);
  assert.equal((await ia('admin', { evento_id: ajena, accion: 'miniaturas' })).status, 202);
  await e.fin();
});
