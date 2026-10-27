// Espacio que usa cada fotógrafo en el NAS (originales + versiones web + miniaturas de su carpeta).
// Se mide recorriendo el disco y se guarda unos minutos; lo que se aprueba entre mediciones se suma aparte.
import fs from 'node:fs';
import path from 'node:path';

async function tamanoDir(dir) {
  let total = 0;
  let entradas;
  try { entradas = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { return 0; }
  for (const e of entradas) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) total += await tamanoDir(p);
    else if (e.isFile()) { try { total += (await fs.promises.stat(p)).size; } catch { /* desapareció */ } }
  }
  return total;
}

export function crearCuotas(cfg, ttlMs = 120_000) {
  const cache = new Map();
  async function uso(slug) {
    const hit = cache.get(slug);
    if (hit && hit.hasta > Date.now()) return hit.bytes;
    let bytes = 0;
    for (const d of ['originales', 'watermarks', 'miniaturas']) bytes += await tamanoDir(path.join(cfg.datos, d, slug));
    cache.set(slug, { bytes, hasta: Date.now() + ttlMs });
    return bytes;
  }
  return {
    uso,
    // ¿cabe `extra` bytes más en la cuota? Si cabe, los reserva en la medición en curso.
    async reservar(slug, cuota, extra = 0) {
      if (cuota == null) return { ok: true };
      const usado = await uso(slug);
      if (usado + extra > cuota) return { ok: false, usado, cuota };
      const hit = cache.get(slug);
      if (hit) hit.bytes += extra;
      return { ok: true, usado: usado + extra, cuota };
    },
    olvidar(slug) { cache.delete(slug); },
  };
}
