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

// La home de la empresa vive en www (el nombre sin www pertenece al hosting y no sirve la web).
export function urlPrincipal(host) {
  if (esDireccionIP(host)) return '/';
  return `https://www.${hostPrincipal(host)}`;
}

// Un solo panel de administración, en la dirección principal (www.flashealo.do/admin).
// El panel vive solo en www.flashealo.do/admin; en sport.* y demás líneas redirige allí.
export const ADMIN_EN_PRINCIPAL = true;

export function urlAdminPrincipal(host) {
  if (esDireccionIP(host)) return '/admin';
  return `https://www.${hostPrincipal(host)}/admin`;
}

// Portal de reservas de un fotógrafo: reservas.flashealo.do/<carpeta> (la empresa, en la raíz).
// Sin dominio real (desarrollo) devuelve null.
export function urlReservas(host, slug, admin = false) {
  if (esDireccionIP(host)) return null;
  const ruta = slug && slug !== 'flashealo' ? `/${slug}` : '';
  return `https://reservas.${hostPrincipal(host)}${ruta}${admin ? '/admin' : ''}`;
}
