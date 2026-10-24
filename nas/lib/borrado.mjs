// Borrado "seguro": los archivos no se eliminan, se mueven a <datos>/papelera/<fecha>/ y un trabajo
// nocturno purga lo que lleva más de 30 días. Es la red de seguridad contra borrados accidentales.
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

async function mover(datos, rel) {
  const origen = path.resolve(datos, rel);
  const base = path.resolve(datos);
  if (!origen.startsWith(base + path.sep)) return false;
  try { await fs.promises.stat(origen); } catch { return false; }
  let destino = path.resolve(datos, 'papelera', hoy(), rel);
  await fs.promises.mkdir(path.dirname(destino), { recursive: true, mode: 0o750 });
  try { await fs.promises.access(destino); destino += `.${crypto.randomBytes(3).toString('hex')}`; } catch { /* libre */ }
  await fs.promises.rename(origen, destino);
  return true;
}

export async function borrarFotos(datos, rutas) {
  let movidos = 0, omitidas = 0;
  for (const ruta of rutas.slice(0, 5000)) {
    const ks = claves(ruta);
    if (!ks) { omitidas++; continue; }
    for (const k of ks) if (await mover(datos, k)) movidos++;
  }
  return { movidos, omitidas };
}

export async function borrarColeccion(datos, prefijo) {
  const p = limpiarRuta(prefijo);
  if (!p || p.includes('/')) return { movidos: 0, error: 'prefijo inválido' };
  let movidos = 0;
  for (const dir of ['originales', 'watermarks', 'miniaturas']) {
    if (await mover(datos, `${dir}/${p}`)) movidos++;
  }
  return { movidos };
}

// Elimina de verdad lo que lleva más de `dias` en la papelera. Devuelve cuántas carpetas de día se purgaron.
export async function purgarPapelera(datos, dias = 30, ahora = Date.now()) {
  const raiz = path.resolve(datos, 'papelera');
  let purgadas = 0;
  let entradas = [];
  try { entradas = await fs.promises.readdir(raiz); } catch { return 0; }
  for (const d of entradas) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    const t = Date.parse(d + 'T00:00:00Z');
    if (Number.isFinite(t) && ahora - t > dias * 86400_000) {
      await fs.promises.rm(path.join(raiz, d), { recursive: true, force: true });
      purgadas++;
    }
  }
  return purgadas;
}
