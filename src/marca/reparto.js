// Reparto automático de una subida grande en sets de hasta N fotos.
export const MAX_POR_SET = 500;

const coleccion = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
// Orden natural por ruta/nombre (IMG_2 antes que IMG_10; las subcarpetas quedan agrupadas) para respetar la secuencia de la cámara.
export const ordenarPorNombre = (archivos) => [...archivos].sort((a, b) => coleccion.compare(a.webkitRelativePath || a.name, b.webkitRelativePath || b.name));

// Siguiente nombre libre "Set N" (continúa la numeración de los sets que ya existen).
export function siguienteNombreSet(nombresExistentes, ya = []) {
  const usados = new Set([...nombresExistentes, ...ya].map((n) => String(n).trim().toLowerCase()));
  let max = 0;
  for (const n of usados) { const m = /^set (\d+)$/.exec(n); if (m) max = Math.max(max, Number(m[1])); }
  let k = max + 1;
  while (usados.has(`set ${k}`)) k++;
  return `Set ${k}`;
}

// Devuelve [{ destino: 'actual' | 'existente' | 'nuevo', nombre?, carpetaId?, archivos }].
// Orden: se llena el set actual; luego los sets que ya existen y tienen cupo (setsExistentes, en el orden en que deben usarse,
// con { id, nombre, cantidad }); y solo cuando no queda cupo se crean sets nuevos.
export function planificarReparto({ archivos, yaEnSetActual = 0, nombresExistentes = [], max = MAX_POR_SET, setsExistentes = [] }) {
  const tope = Math.max(1, Math.min(MAX_POR_SET, Math.floor(max) || MAX_POR_SET));
  const lista = ordenarPorNombre(archivos);
  const tramos = [];
  let i = 0;
  const cupoActual = Math.max(0, tope - yaEnSetActual);
  if (cupoActual > 0 && lista.length) { tramos.push({ destino: 'actual', archivos: lista.slice(0, cupoActual) }); i = Math.min(cupoActual, lista.length); }
  for (const c of setsExistentes) {
    if (i >= lista.length) break;
    const cupo = Math.max(0, tope - (c.cantidad || 0));
    if (cupo <= 0) continue;
    tramos.push({ destino: 'existente', carpetaId: c.id, nombre: c.nombre, archivos: lista.slice(i, i + cupo) });
    i += cupo;
  }
  const nombres = [];
  while (i < lista.length) {
    const nombre = siguienteNombreSet(nombresExistentes, nombres);
    nombres.push(nombre);
    tramos.push({ destino: 'nuevo', nombre, archivos: lista.slice(i, i + tope) });
    i += tope;
  }
  return tramos;
}
