import test from 'node:test';
import assert from 'node:assert/strict';
import { SERVICIOS, visibles, whatsappUrl, CONTACTO } from './servicios.js';

test('las líneas apagadas no aparecen en la home', () => {
  const ids = visibles().map((s) => s.id);
  assert.ok(!ids.includes('estudio'));
  assert.ok(ids.includes('eventos') && ids.includes('colegios'));
});

test('apagar una línea la quita y encenderla la devuelve', () => {
  const copia = SERVICIOS.map((s) => (s.id === 'deportes' ? { ...s, estado: 'apagada' } : s));
  assert.ok(!visibles(copia).some((s) => s.id === 'deportes'));
  const encendida = copia.map((s) => (s.id === 'deportes' ? { ...s, estado: 'activa' } : s));
  assert.ok(visibles(encendida).some((s) => s.id === 'deportes'));
});

test('una línea activa tiene enlace y una próximamente no', () => {
  for (const s of SERVICIOS) {
    if (s.estado === 'activa') assert.ok(s.href, `${s.id} activa sin enlace`);
    if (s.estado === 'proximamente') assert.equal(s.href, null, `${s.id} no debe enlazar`);
  }
});

test('los precios publicados coinciden con la oferta de reservas', () => {
  const por = Object.fromEntries(SERVICIOS.map((s) => [s.id, s]));
  assert.equal(por.eventos.desde, 'RD$8,000');
  assert.equal(por.sesiones.desde, 'RD$5,000');
});

test('el enlace de WhatsApp lleva el número y el mensaje codificado', () => {
  const url = whatsappUrl('Hola, quiero reservar');
  assert.ok(url.startsWith(`https://wa.me/${CONTACTO.whatsapp}?text=`));
  assert.ok(url.includes(encodeURIComponent('Hola, quiero reservar')));
});

test('los ids de las líneas no se repiten', () => {
  const ids = SERVICIOS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});
