// Portadas de evento. El valor guardado es una ruta, con encuadre opcional: "ruta@x,y" (x e y en porcentaje).
// Rutas posibles: "portadas/..." (subidas desde el panel), "o/..." (foto de la propia colección), o una URL completa.
// El público nunca ve originales: una foto de la colección se muestra con su versión con marca de agua.

export function separarPortada(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return { ruta: '', x: 50, y: 50 };
  const i = texto.lastIndexOf('@');
  if (i === -1) return { ruta: texto, x: 50, y: 50 };
  const [sx, sy] = texto.slice(i + 1).split(',');
  const x = Number(sx);
  const y = Number(sy);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { ruta: texto.slice(0, i), x: 50, y: 50 };
  return { ruta: texto.slice(0, i), x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) };
}

export function unirPortada(ruta, x = 50, y = 50) {
  const c = (n) => Math.round(Math.min(100, Math.max(0, Number(n) || 0)));
  return `${ruta}@${c(x)},${c(y)}`;
}

export function resolverPortada(valor, { dominioFotos = '', supabaseUrl = '' } = {}) {
  const { ruta: cruda, x, y } = separarPortada(valor);
  const pos = `${x}% ${y}%`;
  const ruta = cruda.replace(/^\/+/, '');
  if (!ruta) return { src: null, pos };
  if (/^https?:\/\//i.test(ruta)) return { src: ruta, pos };
  const dominio = String(dominioFotos).replace(/\/+$/, '');
  const supa = String(supabaseUrl).replace(/\/+$/, '');
  if (/^(portadas|logos)\//.test(ruta)) return { src: `${supa}/storage/v1/object/public/assets/${ruta}`, pos };
  if (dominio && /^(o|watermarks|miniaturas)\//.test(ruta)) {
    const publica = ruta.startsWith('o/') ? `watermarks/${ruta.slice(2)}.jpg` : ruta;
    return { src: `${dominio}/${publica}`, pos };
  }
  return { src: `${supa}/storage/v1/object/public/fotos/${ruta}`, pos };
}
