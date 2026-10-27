// Copia limpia (sin marca de agua) de una foto de la colección para usarla de portada pública.
// El original solo lo puede leer el administrador (Authelia); aquí se reduce a un JPEG liviano
// y se sube a Supabase Storage (bucket "assets", público). El original nunca sale del NAS.
export const MAX_LADO_PORTADA = 2200;

export async function crearPortadaLimpia(urlOriginal, { maxLado = MAX_LADO_PORTADA, calidad = 0.86 } = {}) {
  const resp = await fetch(urlOriginal, { credentials: 'include' });
  if (!resp.ok) throw new Error(`No se pudo leer la foto original (${resp.status}).`);
  const blob = await resp.blob();
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
  if (bmp.close) bmp.close();
  const out = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', calidad));
  if (!out) throw new Error('No se pudo preparar la imagen.');
  return out;
}
