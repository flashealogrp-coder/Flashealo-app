import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { generarZip } from '../lib/zip.mjs';
import { crearServidor } from '../server.mjs';
import { leerConfig } from '../lib/config.mjs';

const escuchar = (srv) => new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv.address().port)));
const cerrar = (srv) => new Promise((r) => { srv.closeAllConnections?.(); srv.close(r); });
const juntar = async (gen) => { const t = []; for await (const c of gen) t.push(c); return Buffer.concat(t); };

function validar(buf, tmp) {
  const f = path.join(tmp, 'v.zip'); fs.writeFileSync(f, buf);
  const py = `import zipfile,sys\nz=zipfile.ZipFile(sys.argv[1])\nassert z.testzip() is None\nprint('|'.join(sorted(z.namelist())))\nfor i in z.infolist():\n    assert i.compress_type==0\n`;
  return execFileSync('python3', ['-I', '-c', py, f]).toString().trim();
}

test('zip: archivos válidos en modo normal y en ZIP64, con contenido intacto', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-'));
  try {
    const a = path.join(tmp, 'a.jpg'), b = path.join(tmp, 'b.jpg'), c = path.join(tmp, 'c.jpg');
    fs.writeFileSync(a, Buffer.alloc(700_000, 7)); fs.writeFileSync(b, 'hola'); fs.writeFileSync(c, '');
    const entradas = [a, b, c].map((r, i) => ({ nombre: ['Principales/a.jpg', 'Principales/b.jpg', 'vacia.jpg'][i], ruta: r, size: fs.statSync(r).size, mtimeMs: Date.now() }));
    for (const forzar of [false, true]) {
      const buf = await juntar(generarZip(entradas, { forzarZip64: forzar }));
      assert.equal(validar(buf, tmp), 'Principales/a.jpg|Principales/b.jpg|vacia.jpg', `zip64=${forzar}`);
      const ext = path.join(tmp, 'ext' + forzar); fs.mkdirSync(ext);
      execFileSync('python3', ['-I', '-c', 'import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', path.join(tmp, 'v.zip'), ext]);
      assert.equal(fs.readFileSync(path.join(ext, 'Principales', 'b.jpg'), 'utf8'), 'hola');
      assert.equal(fs.statSync(path.join(ext, 'Principales', 'a.jpg')).size, 700_000);
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

async function entorno({ zip = true, clave = false, fotos = true } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dz-'));
  const dist = path.join(tmp, 'dist'); fs.mkdirSync(dist); fs.writeFileSync(path.join(dist, 'index.html'), 'x');
  const datos = path.join(tmp, 'datos'); const dir = path.join(datos, 'originales', 'ev1', 'Principales'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '1793104804765_aa_IMG1.jpg'), 'UNO'); fs.writeFileSync(path.join(dir, '1793104804766_bb_IMG2.jpg'), 'DOS');
  const EV = '11111111-2222-3333-4444-555555555555';
  const supa = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const u = decodeURIComponent(req.url);
    if (u.startsWith('/rest/v1/fotografias')) return res.end(JSON.stringify(fotos ? [{ url_original: 'o/ev1/Principales/1793104804765_aa_IMG1.jpg' }, { url_original: 'o/ev1/Principales/1793104804766_bb_IMG2.jpg' }, { url_original: 'o/ev1/Principales/no_existe.jpg' }] : []));
    if (u.startsWith('/rest/v1/eventos')) return res.end(JSON.stringify(u.includes(EV) ? [{ nombre: 'Canada 2026', permitir_descarga_zip: zip, tiene_clave: clave }] : []));
    if (u.startsWith('/rest/v1/rpc/verificar_clave_evento')) { let b = ''; for await (const c of req) b += c; return res.end(JSON.stringify(JSON.parse(b).p_clave === 'secreta')); }
    res.statusCode = 404; res.end('{}');
  });
  const ps = await escuchar(supa);
  const cfg = leerConfig({ DIST_DIR: dist, DATA_DIR: datos, SUPABASE_URL: `http://127.0.0.1:${ps}`, SUPABASE_KEY: 'anon', UPLOAD_SECRET: 'x'.repeat(40) });
  const srv = crearServidor(cfg); const port = await escuchar(srv);
  return { base: `http://127.0.0.1:${port}`, EV, tmp, async fin() { await Promise.all([cerrar(srv), cerrar(supa)]); fs.rmSync(tmp, { recursive: true, force: true }); } };
}
const pedir = (base, body) => fetch(base + '/api/descarga-zip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('descarga-zip: entrega el zip con los sets y nombres limpios', async () => {
  const e = await entorno();
  try {
    const r = await pedir(e.base, { evento_id: e.EV });
    assert.equal(r.status, 200);
    const { url } = await r.json();
    const z = await fetch(e.base + url);
    assert.equal(z.status, 200);
    assert.equal(z.headers.get('content-type'), 'application/zip');
    assert.match(z.headers.get('content-disposition'), /^attachment; filename="Canada_2026\.zip"$/);
    assert.equal(validar(Buffer.from(await z.arrayBuffer()), e.tmp), 'Principales/aa_IMG1.jpg|Principales/bb_IMG2.jpg');
  } finally { await e.fin(); }
});

test('descarga-zip: apagada, id inválido, sin fotos o clave mala se rechazan', async () => {
  let e = await entorno({ zip: false });
  try {
    assert.equal((await pedir(e.base, { evento_id: e.EV })).status, 403);
    assert.equal((await pedir(e.base, { evento_id: 'malo' })).status, 400);
    assert.equal((await fetch(e.base + '/api/descarga-zip/basura')).status, 401);
  } finally { await e.fin(); }
  e = await entorno({ fotos: false });
  try { const { url } = await (await pedir(e.base, { evento_id: e.EV })).json(); assert.equal((await fetch(e.base + url)).status, 404); } finally { await e.fin(); }
  e = await entorno({ clave: true });
  try {
    assert.equal((await pedir(e.base, { evento_id: e.EV })).status, 403);
    assert.equal((await pedir(e.base, { evento_id: e.EV, clave: 'secreta' })).status, 200);
  } finally { await e.fin(); }
});
