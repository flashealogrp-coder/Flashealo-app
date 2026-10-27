import test from 'node:test';
import assert from 'node:assert/strict';
import { separarPortada, unirPortada, resolverPortada } from './portada.js';

const cfg = { dominioFotos: 'https://fotos.ejemplo.do/', supabaseUrl: 'https://db.ejemplo.do/' };

test('separa la ruta del encuadre y acota los valores', () => {
  assert.deepEqual(separarPortada('portadas/a.jpg'), { ruta: 'portadas/a.jpg', x: 50, y: 50 });
  assert.deepEqual(separarPortada('o/e/f.jpg@20,80'), { ruta: 'o/e/f.jpg', x: 20, y: 80 });
  assert.deepEqual(separarPortada('o/e/f.jpg@900,-5'), { ruta: 'o/e/f.jpg', x: 100, y: 0 });
  assert.deepEqual(separarPortada('o/e/f.jpg@abc,def'), { ruta: 'o/e/f.jpg', x: 50, y: 50 });
  assert.deepEqual(separarPortada(''), { ruta: '', x: 50, y: 50 });
  assert.deepEqual(separarPortada(null), { ruta: '', x: 50, y: 50 });
});

test('une ruta y encuadre redondeando', () => {
  assert.equal(unirPortada('o/e/f.jpg', 33.6, 70.2), 'o/e/f.jpg@34,70');
  assert.equal(unirPortada('portadas/a.jpg'), 'portadas/a.jpg@50,50');
});

test('portada subida desde el panel va al bucket assets', () => {
  const r = resolverPortada('portadas/17_portada.jpg@10,90', cfg);
  assert.equal(r.src, 'https://db.ejemplo.do/storage/v1/object/public/assets/portadas/17_portada.jpg');
  assert.equal(r.pos, '10% 90%');
});

test('foto de la colección se muestra con marca de agua, nunca el original', () => {
  const r = resolverPortada('o/evento1/img1.jpg@50,30', cfg);
  assert.equal(r.src, 'https://fotos.ejemplo.do/watermarks/evento1/img1.jpg.jpg');
  assert.ok(!r.src.includes('/o/'));
  assert.equal(r.pos, '50% 30%');
});

test('URL completa, vacío y rutas antiguas', () => {
  assert.equal(resolverPortada('https://x.test/a.jpg', cfg).src, 'https://x.test/a.jpg');
  assert.equal(resolverPortada('', cfg).src, null);
  assert.equal(resolverPortada('evento/foto.jpg', cfg).src, 'https://db.ejemplo.do/storage/v1/object/public/fotos/evento/foto.jpg');
});
