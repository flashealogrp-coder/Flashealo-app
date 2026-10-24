// Genera, a partir del original, la versión web con marca de agua y la miniatura.
// El original nunca se modifica ni se sirve al público.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

export const AJUSTES = { webPx: 1600, thumbPx: 480, calidadWeb: 80, calidadThumb: 72, opacidadMarca: 0.34 };

// o/<resto>  ->  watermarks/<resto>.jpg  y  miniaturas/<resto>.jpg
export function rutasDerivadas(urlOriginal) {
  if (typeof urlOriginal !== 'string' || !urlOriginal.startsWith('o/')) return null;
  const resto = urlOriginal.slice(2);
  if (!resto || resto.includes('..') || !/^[a-zA-Z0-9\-_/.]+$/.test(resto)) return null;
  return { rel: resto, web: `watermarks/${resto}.jpg`, thumb: `miniaturas/${resto}.jpg` };
}

async function prepararMarca(marcaPng, anchoImagen, opacidad) {
  const w = Math.max(90, Math.round(anchoImagen * 0.30));
  const { data, info } = await sharp(marcaPng).resize({ width: w }).ensureAlpha()
    .rotate(-25, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer({ resolveWithObject: true });
  // opacidad: se multiplica solo el canal alfa
  const raw = await sharp(data).ensureAlpha().raw().toBuffer();
  for (let i = 3; i < raw.length; i += 4) raw[i] = Math.round(raw[i] * opacidad);
  const marca = await sharp(raw, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  return { marca, w: info.width, h: info.height };
}

export async function generarDerivadas(origen, marcaPng, ajustes = AJUSTES) {
  const base = sharp(origen, { failOn: 'error', limitInputPixels: 500_000_000 }).rotate();
  const { data: redim, info } = await base
    .resize({ width: ajustes.webPx, height: ajustes.webPx, fit: 'inside', withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });

  const { marca, w, h } = await prepararMarca(marcaPng, info.width, ajustes.opacidadMarca);
  // Rejilla escalonada: recortar la foto no elimina la marca.
  const colocar = [];
  const filas = 3, cols = 3;
  for (let r = 0; r < filas; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = ((c + (r % 2 ? 0.0 : 0.5)) / cols) * info.width + (r % 2 ? info.width / (cols * 2) : 0);
      const cy = ((r + 0.5) / filas) * info.height;
      const left = Math.min(Math.max(0, Math.round(cx - w / 2)), Math.max(0, info.width - w));
      const top = Math.min(Math.max(0, Math.round(cy - h / 2)), Math.max(0, info.height - h));
      colocar.push({ input: marca, left, top });
    }
  }
  const conMarca = await sharp(redim).composite(colocar).jpeg({ quality: ajustes.calidadWeb, mozjpeg: true, progressive: true }).toBuffer();
  const thumb = await sharp(conMarca).resize({ width: ajustes.thumbPx, height: ajustes.thumbPx, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: ajustes.calidadThumb, mozjpeg: true }).toBuffer();
  return { web: conMarca, thumb, ancho: info.width, alto: info.height };
}

export async function escribirAtomico(destino, buffer) {
  await fs.promises.mkdir(path.dirname(destino), { recursive: true, mode: 0o755 });
  const tmp = `${destino}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  await fs.promises.writeFile(tmp, buffer, { mode: 0o644 });
  const fh = await fs.promises.open(tmp, 'r');
  try { await fh.sync(); } finally { await fh.close(); }
  await fs.promises.rename(tmp, destino);
}
