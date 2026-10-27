import test from 'node:test';
import assert from 'node:assert/strict';
import { planificarReparto, siguienteNombreSet, ordenarPorNombre, MAX_POR_SET } from './reparto.js';
import { leerTodo } from './paginar.js';

const fotos = (n) => Array.from({ length: n }, (_, i) => ({ name: `IMG_${String(i + 1).padStart(4, '0')}.jpg` }));

test('reparto: 3200 fotos en un set vacío -> Principales 500 + Set 1..6', () => {
  const t = planificarReparto({ archivos: fotos(3200), yaEnSetActual: 0, nombresExistentes: ['Principales'] });
  assert.deepEqual(t.map((x) => x.archivos.length), [500, 500, 500, 500, 500, 500, 200]);
  assert.deepEqual(t.map((x) => x.nombre || 'actual'), ['actual', 'Set 1', 'Set 2', 'Set 3', 'Set 4', 'Set 5', 'Set 6']);
  assert.equal(t.reduce((a, x) => a + x.archivos.length, 0), 3200);
});

test('reparto: llena primero lo que falta del set actual y continúa la numeración', () => {
  const t = planificarReparto({ archivos: fotos(700), yaEnSetActual: 450, nombresExistentes: ['Principales', 'Set 1', 'Set 2'] });
  assert.deepEqual(t.map((x) => [x.nombre || 'actual', x.archivos.length]), [['actual', 50], ['Set 3', 500], ['Set 4', 150]]);
});

test('reparto: set actual lleno crea solo sets nuevos; tope máximo 500', () => {
  const t = planificarReparto({ archivos: fotos(10), yaEnSetActual: 500, nombresExistentes: [], max: 9999 });
  assert.deepEqual(t.map((x) => x.nombre), ['Set 1']);
  assert.equal(MAX_POR_SET, 500);
  assert.equal(planificarReparto({ archivos: fotos(5), max: 2 }).length, 3);
});

test('reparto: orden natural y nombres de set sin choques', () => {
  assert.deepEqual(ordenarPorNombre([{ name: 'IMG_10.jpg' }, { name: 'IMG_2.jpg' }, { name: 'IMG_1.jpg' }]).map((f) => f.name), ['IMG_1.jpg', 'IMG_2.jpg', 'IMG_10.jpg']);
  assert.equal(siguienteNombreSet(['set 1', 'SET 3']), 'Set 4');
  assert.equal(siguienteNombreSet([]), 'Set 1');
  assert.deepEqual(planificarReparto({ archivos: [] }), []);
});

test('leerTodo: junta las páginas hasta que una viene incompleta', async () => {
  const filas = Array.from({ length: 2500 }, (_, i) => ({ id: i }));
  const r = await leerTodo(async (d, h) => ({ data: filas.slice(d, h + 1), error: null }));
  assert.equal(r.length, 2500);
  await assert.rejects(() => leerTodo(async () => ({ data: null, error: new Error('x') })));
});

test('reparto: con carpetas, ordena por ruta relativa (subcarpetas agrupadas)', () => {
  const f = (rel) => ({ name: rel.split('/').pop(), webkitRelativePath: rel });
  const r = ordenarPorNombre([f('E/101/IMG_1.jpg'), f('E/100/IMG_9.jpg'), f('E/100/IMG_10.jpg')]).map((x) => x.webkitRelativePath);
  assert.deepEqual(r, ['E/100/IMG_9.jpg', 'E/100/IMG_10.jpg', 'E/101/IMG_1.jpg']);
});
