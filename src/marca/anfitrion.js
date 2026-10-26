// Qué línea de negocio corresponde a la dirección desde la que se visita la web.
//   sport.flashealo.do       → 'sport'
//   sport.beta.flashealo.do  → 'sport'
//   flashealo.do, beta.flashealo.do, localhost → null (la home de la empresa)
// Para sumar una línea nueva: agregar su subdominio a LINEAS y su fila en servicios.js.

export const LINEAS = ['sport'];

function limpio(host) {
  return String(host || '').toLowerCase().split(':')[0];
}

export function esDireccionIP(host) {
  const h = limpio(host);
  return h === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes('[') || h.endsWith('.localhost');
}

export function lineaDelHost(host) {
  const h = limpio(host);
  if (esDireccionIP(h)) return null;
  const primera = h.split('.')[0];
  return h.split('.').length >= 3 && LINEAS.includes(primera) ? primera : null;
}

// Dirección de la empresa a partir de una línea: sport.beta.flashealo.do → beta.flashealo.do
export function hostPrincipal(host) {
  const h = limpio(host);
  return lineaDelHost(h) ? h.split('.').slice(1).join('.') : h.replace(/^www\./, '');
}

// Dirección completa de una línea desde cualquier lugar. Sin dominio real (desarrollo), cae a una ruta interna.
export function urlDeLinea(linea, host, rutaInterna) {
  if (esDireccionIP(host)) return rutaInterna;
  return `https://${linea}.${hostPrincipal(host)}`;
}

export function urlPrincipal(host) {
  if (esDireccionIP(host)) return '/';
  return `https://${hostPrincipal(host)}`;
}

// Un solo panel de administración, en la dirección principal (www.flashealo.do/admin).
// Mientras la home no se haya movido a la NAS (www sigue en Vercel), se deja en false para poder
// administrar desde sport.*; el día del cambio de www se pone en true.
export const ADMIN_EN_PRINCIPAL = false;

export function urlAdminPrincipal(host) {
  if (esDireccionIP(host)) return '/admin';
  return `https://www.${hostPrincipal(host)}/admin`;
}
