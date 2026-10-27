// Borrado: por decisión de Flashealo, lo que se elimina se borra DE VERDAD del disco (original, versión web y miniatura).
// Opcional: con PAPELERA_DIAS > 0 los archivos van a <datos>/papelera/<fecha>/ y se purgan pasados esos días.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { limpiarRuta } from './subidas.mjs';

const hoy = () => new Date().toISOString().slice(0, 10);
const seguro = /^[a-zA-Z0-9\-_/.]+$/;

// ruta guardada en la base  ->  claves relativas de original y derivadas (o null si no es nuestra)
export function claves(ruta) {
  let r = String(ruta || '').trim().replace(/^\/+/, '');
  if (!r || r.includes('..') || !seguro.test(r)) return null;
  let rel;
  if (r.startsWith('o/')) rel = r.slice(2);
  else if ((r.startsWith('watermarks/') || r.startsWith('miniaturas/')) && r.endsWith('.jpg')) rel = r.replace(/^(watermarks|miniaturas)\//, '').slice(0, -4);
  else return null;
  if (!rel) return null;
  return [`originales/${rel}`, `watermarks/${rel}.jpg`, `miniaturas/${rel}.jpg`];
}

const TOPES = new Set(['originales', 'watermarks', 'miniaturas']);

// Quita las carpetas que quedaron vacías (sin tocar originales/, watermarks/ ni miniaturas/).
async function limpiarVacios(datos, rel) {
  const base = path.resolve(datos);
  let dir = path.dirname(path.resolve(datos, rel));
  while (dir.startsWith(base + path.sep) && !TOPES.has(path.relative(base, dir))) {
    try { await fs.promises.rmdir(dir); } catch { break; }   // rmdir solo funciona si está vacía
    dir = path.dirname(dir);
  }
}

async function quitar(datos, rel, papelera) {
  const origen = path.resolve(datos, rel);
  const base = path.resolve(datos);
  if (!origen.startsWith(base + path.sep)) return false;
  try { await fs.promises.stat(origen); } catch { return false; }
  if (!papelera) {
    await fs.promises.rm(origen, { recursive: true, force: true });
  } else {
    let destino = path.resolve(datos, 'papelera', hoy(), rel);
    await fs.promises.mkdir(path.dirname(destino), { recursive: true, mode: 0o750 });
    try { await fs.promises.access(destino); destino += `.${crypto.randomBytes(3).toString('hex')}`; } catch { /* libre */ }
    await fs.promises.rename(origen, destino);
  }
  await limpiarVacios(datos, rel);
  return true;
}

export async function borrarFotos(datos, rutas, { papelera = false } = {}) {
  let movidos = 0, omitidas = 0;
  for (const ruta of rutas.slice(0, 5000)) {
    const ks = claves(ruta);
    if (!ks) { omitidas++; continue; }
    for (const k of ks) if (await quitar(datos, k, papelera)) movidos++;
  }
  return { movidos, omitidas };
}

export async function borrarColeccion(datos, prefijo, { papelera = false } = {}) {
  const p = limpiarRuta(prefijo);
  if (!p || p.includes('/')) return { movidos: 0, error: 'prefijo inválido' };
  let movidos = 0;
  for (const dir of ['originales', 'watermarks', 'miniaturas']) {
    if (await quitar(datos, `${dir}/${p}`, papelera)) movidos++;
  }
  return { movidos };
}

// Elimina de verdad lo que lleva más de `dias` en la papelera (con dias = 0 vacía toda la papelera).
// Devuelve cuántas carpetas de día se purgaron.
export async function purgarPapelera(datos, dias = 30, ahora = Date.now()) {
  const raiz = path.resolve(datos, 'papelera');
  let purgadas = 0;
  let entradas = [];
  try { entradas = await fs.promises.readdir(raiz); } catch { return 0; }
  for (const d of entradas) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    const t = Date.parse(d + 'T00:00:00Z');
    if (Number.isFinite(t) && (dias <= 0 ? ahora >= t : ahora - t > dias * 86400_000)) {
      await fs.promises.rm(path.join(raiz, d), { recursive: true, force: true });
      purgadas++;
    }
  }
  return purgadas;
}
