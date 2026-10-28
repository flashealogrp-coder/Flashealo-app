import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANTILLAS, IDS_PLANTILLA, normalizarPlantilla, PLANTILLA_INICIAL } from './plantillas.js';

test('hay 4 plantillas con id único y paleta de 3 colores', () => {
  assert.equal(PLANTILLAS.length, 4);
  assert.equal(new Set(IDS_PLANTILLA).size, 4);
  PLANTILLAS.forEach((p) => { assert.equal(p.paleta.length, 3); p.paleta.forEach((c) => assert.match(c, /^#[0-9A-F]{6}$/i)); assert.ok(p.nombre && p.descripcion); });
});

test('un id desconocido cae en la plantilla inicial', () => {
  assert.equal(normalizarPlantilla('oscura'), 'oscura');
  assert.equal(normalizarPlantilla('<script>'), PLANTILLA_INICIAL);
  assert.equal(normalizarPlantilla(undefined), PLANTILLA_INICIAL);
});
