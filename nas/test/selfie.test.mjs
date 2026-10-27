import test from 'node:test';
import assert from 'node:assert/strict';
import { manejadorSelfie, limitadorPorIp } from '../lib/selfie.mjs';
import { Readable } from 'node:stream';

const B64 = 'A'.repeat(200);
function pedir(handler, { metodo = 'POST', cuerpo = { imagen_base64: B64 }, ip = '1.1.1.1' } = {}) {
  const req = Readable.from([typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)]);
  req.method = metodo; req.headers = { 'x-real-ip': ip }; req.socket = {};
  return new Promise((resolve) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { resolve({ code: this.statusCode, body: JSON.parse(b) }); } };
    handler(req, res);
  });
}
const cfg = { selfieUrl: 'http://selfie:8000', tokenInterno: 'tok' };

test('reenvía la selfie al servicio interno con su token y devuelve solo el vector', async () => {
  let visto;
  const f = async (url, o) => { visto = { url, token: o.headers['X-Interno'] }; return { status: 200, ok: true, json: async () => ({ vector: [0.1, 0.2] }) }; };
  const r = await pedir(manejadorSelfie(cfg, f));
  assert.equal(r.code, 200); assert.deepEqual(r.body, { vector: [0.1, 0.2] });
  assert.equal(visto.url, 'http://selfie:8000/vectorizar-selfie/'); assert.equal(visto.token, 'tok');
});

test('rechaza métodos, imágenes inválidas y servicio no configurado', async () => {
  const f = async () => { throw new Error('no debe llamarse'); };
  assert.equal((await pedir(manejadorSelfie(cfg, f), { metodo: 'GET' })).code, 405);
  assert.equal((await pedir(manejadorSelfie(cfg, f), { cuerpo: { imagen_base64: 'corta' } })).code, 400);
  assert.equal((await pedir(manejadorSelfie(cfg, f), { cuerpo: '{no json' })).code, 400);
  assert.equal((await pedir(manejadorSelfie(cfg, f), { cuerpo: { imagen_base64: '<script>' + 'a'.repeat(200) } })).code, 400);
  assert.equal((await pedir(manejadorSelfie({ ...cfg, selfieUrl: '' }, f))).code, 503);
});

test('sin rostro → 400 con mensaje; servicio caído → 502 sin detalles internos', async () => {
  const sinCara = async () => ({ status: 400, ok: false, json: async () => ({ detail: 'No se detectó ninguna cara en la foto.' }) });
  const r = await pedir(manejadorSelfie(cfg, sinCara));
  assert.equal(r.code, 400); assert.match(r.body.error, /cara/);
  const caido = async () => { throw new Error('ECONNREFUSED 10.0.0.5'); };
  const r2 = await pedir(manejadorSelfie(cfg, caido));
  assert.equal(r2.code, 502); assert.doesNotMatch(JSON.stringify(r2.body), /ECONNREFUSED|10\.0/);
});

test('límite por IP: 8 por minuto y libera con el tiempo', async () => {
  let t = 0; const p = limitadorPorIp(() => t);
  for (let i = 0; i < 8; i++) assert.equal(p('a'), true);
  assert.equal(p('a'), false); assert.equal(p('b'), true);
  t += 61_000; assert.equal(p('a'), true);
});
