import test from 'node:test';
import assert from 'node:assert/strict';
import { lineaDelHost, hostPrincipal, urlDeLinea, urlPrincipal } from './anfitrion.js';

test('reconoce la línea por el subdominio', () => {
  assert.equal(lineaDelHost('sport.flashealo.do'), 'sport');
  assert.equal(lineaDelHost('sport.beta.flashealo.do'), 'sport');
  assert.equal(lineaDelHost('SPORT.flashealo.do:443'), 'sport');
});

test('la empresa y el resto no son una línea', () => {
  assert.equal(lineaDelHost('flashealo.do'), null);
  assert.equal(lineaDelHost('www.flashealo.do'), null);
  assert.equal(lineaDelHost('beta.flashealo.do'), null);
  assert.equal(lineaDelHost('fotos.flashealo.do'), null);
  assert.equal(lineaDelHost('sport.do'), null);
  assert.equal(lineaDelHost(''), null);
  assert.equal(lineaDelHost(undefined), null);
});

test('en desarrollo (localhost o IP) no hay líneas por subdominio', () => {
  assert.equal(lineaDelHost('localhost:5173'), null);
  assert.equal(lineaDelHost('192.168.1.10'), null);
  assert.equal(lineaDelHost('sport.localhost'), null);
});

test('direcciones de la empresa y de cada línea', () => {
  assert.equal(hostPrincipal('sport.beta.flashealo.do'), 'beta.flashealo.do');
  assert.equal(hostPrincipal('www.flashealo.do'), 'flashealo.do');
  assert.equal(urlDeLinea('sport', 'beta.flashealo.do', '/sport'), 'https://sport.beta.flashealo.do');
  assert.equal(urlDeLinea('sport', 'www.flashealo.do', '/sport'), 'https://sport.flashealo.do');
  assert.equal(urlDeLinea('sport', 'localhost:5173', '/sport'), '/sport');
  assert.equal(urlPrincipal('sport.beta.flashealo.do'), 'https://beta.flashealo.do');
  assert.equal(urlPrincipal('localhost'), '/');
});
