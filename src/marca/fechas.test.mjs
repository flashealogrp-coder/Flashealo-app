import test from 'node:test';
import assert from 'node:assert/strict';
import { leerISO, formatoISO, semanasDelMes, mesMas, sumarDias, textoLargo, diasEnMes, hoyISO } from './fechas.js';

test('leerISO valida fechas reales', () => {
  assert.deepEqual(leerISO('2026-10-27'), { a: 2026, m: 9, d: 27 });
  assert.equal(leerISO('2026-02-30'), null);
  assert.equal(leerISO(''), null);
  assert.equal(leerISO('27/10/2026'), null);
});
test('octubre 2026 empieza en jueves y la semana empieza el lunes', () => {
  const s = semanasDelMes(2026, 9);
  assert.deepEqual(s[0], [null, null, null, 1, 2, 3, 4]);
  assert.equal(s.at(-1).includes(31), true);
  assert.ok(s.every((w) => w.length === 7));
});
test('febrero bisiesto', () => { assert.equal(diasEnMes(2028, 1), 29); assert.equal(diasEnMes(2026, 1), 28); });
test('mesMas cruza años', () => {
  assert.deepEqual(mesMas(2026, 11, 1), { a: 2027, m: 0 });
  assert.deepEqual(mesMas(2026, 0, -1), { a: 2025, m: 11 });
});
test('sumarDias', () => { assert.equal(sumarDias('2026-10-31', 1), '2026-11-01'); assert.equal(sumarDias('2026-01-01', -1), '2025-12-31'); });
test('textoLargo y hoyISO', () => {
  assert.equal(textoLargo('2026-10-27'), '27 de octubre de 2026');
  assert.equal(formatoISO(2026, 9, 5), '2026-10-05');
  assert.equal(hoyISO(new Date(2026, 9, 27, 23, 59)), '2026-10-27');
});
