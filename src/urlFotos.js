// Dónde viven las fotos que ve el público.
//  - Con VITE_FOTOS_DOMINIO (NAS): las versiones con marca de agua se sirven desde ese dominio.
//    Si la base guarda la ruta del original ("o/...") se muestra siempre su versión con marca: el público nunca ve originales.
//  - Sin esa variable (despliegue antiguo): Supabase Storage, como siempre.
const DOMINIO = (import.meta.env.VITE_FOTOS_DOMINIO || '').replace(/\/+$/, '');
const SUPABASE = (import.meta.env.VITE_SUPABASE_URL || 'https://muvzhnnsdnztlhynuipd.supabase.co').replace(/\/+$/, '');

export const rutaPublica = (p) => {
  const ruta = String(p || '').trim().replace(/^\/+/, '');
  if (ruta.startsWith('o/')) return `watermarks/${ruta.slice(2)}.jpg`;
  return ruta;
};

export const urlFotoPublica = (p) => {
  const ruta = String(p || '').trim().replace(/^\/+/, '');
  if (/^https?:\/\//i.test(ruta)) return ruta;
  if (DOMINIO && /^(o|watermarks|miniaturas)\//.test(ruta)) return `${DOMINIO}/${rutaPublica(ruta)}`;
  return `${SUPABASE}/storage/v1/object/public/fotos/${ruta}`;
};

// Solo panel de administración. Con VITE_FOTOS_DOMINIO devuelve la URL en el NAS:
//   original=true  -> fotos.<dominio>/o/<ruta>   (el NAS la protege con Authelia + 2FA)
//   original=false -> versión con marca de agua / miniatura
// Si la ruta no es del NAS (o no hay dominio) devuelve null y el código antiguo sigue igual.
export const urlAdmin = (p, original = false) => {
  const ruta = String(p || '').trim().replace(/^\/+/, '');
  if (!DOMINIO || !/^(o|watermarks|miniaturas)\//.test(ruta)) return null;
  if (ruta.startsWith('o/')) return original ? `${DOMINIO}/${ruta}` : `${DOMINIO}/${rutaPublica(ruta)}`;
  return `${DOMINIO}/${ruta}`;
};
