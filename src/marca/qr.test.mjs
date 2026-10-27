import test from 'node:test';
import assert from 'node:assert/strict';
import { generarQR, qrComoSvg, capacidadBytes } from './qr.js';

test('el tamaño crece con el texto (versión 1 = 21 módulos)', () => {
  assert.equal(generarQR('hola').length, 21);
  assert.equal(generarQR('https://www.flashealo.do/g/un-dia-en-canada-4vl').length, 33);
});

test('tiene los tres patrones de esquina y el módulo oscuro fijo', () => {
  const m = generarQR('https://www.flashealo.do/g/prueba');
  const n = m.length;
  for (const [x, y] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
    for (let i = 0; i < 7; i++) { assert.equal(m[y][x + i], true); assert.equal(m[y + 6][x + i], true); assert.equal(m[y + i][x], true); assert.equal(m[y + i][x + 6], true); }
    assert.equal(m[y + 3][x + 3], true);
    assert.equal(m[y + 1][x + 1], false);
  }
  assert.equal(m[n - 8][8], true);
});

test('es determinista y distingue textos', () => {
  assert.deepEqual(generarQR('a'), generarQR('a'));
  assert.notDeepEqual(generarQR('a'), generarQR('b'));
});

test('rechaza textos que no caben', () => {
  assert.throws(() => generarQR('x'.repeat(capacidadBytes(10) + 1)), /demasiado largo/);
  assert.doesNotThrow(() => generarQR('x'.repeat(capacidadBytes(10))));
});

test('el SVG es autónomo y tiene zona de silencio', () => {
  const s = qrComoSvg('hola', { escala: 4 });
  assert.match(s, /^<svg [^>]*viewBox="0 0 29 29"/);
  assert.match(s, /<rect width="29" height="29" fill="#fff"\/>/);
});
