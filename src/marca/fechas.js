// Utilidades de fechas para el selector de fecha. Siempre "YYYY-MM-DD", sin zonas horarias (no se usa Date.parse).
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const DIAS_CORTOS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']; // la semana empieza el lunes

const dosDig = (n) => String(n).padStart(2, '0');

export function formatoISO(a, m, d) { return `${a}-${dosDig(m + 1)}-${dosDig(d)}`; } // m: 0-11

export function leerISO(iso) {
  const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!r) return null;
  const a = +r[1], m = +r[2] - 1, d = +r[3];
  const f = new Date(Date.UTC(a, m, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m && f.getUTCDate() === d ? { a, m, d } : null;
}

export function diasEnMes(a, m) { return new Date(Date.UTC(a, m + 1, 0)).getUTCDate(); }

// Semanas del mes (lunes a domingo); los huecos fuera del mes son null.
export function semanasDelMes(a, m) {
  const primero = (new Date(Date.UTC(a, m, 1)).getUTCDay() + 6) % 7; // 0 = lunes
  const celdas = Array(primero).fill(null);
  for (let d = 1; d <= diasEnMes(a, m); d++) celdas.push(d);
  while (celdas.length % 7) celdas.push(null);
  const semanas = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));
  return semanas;
}

export function mesMas(a, m, delta) { const t = a * 12 + m + delta; return { a: Math.floor(t / 12), m: ((t % 12) + 12) % 12 }; }

export function sumarDias(iso, n) {
  const f = leerISO(iso); if (!f) return iso;
  const x = new Date(Date.UTC(f.a, f.m, f.d + n));
  return formatoISO(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
}

export function textoLargo(iso) {
  const f = leerISO(iso);
  return f ? `${f.d} de ${MESES[f.m]} de ${f.a}` : '';
}

export function hoyISO(ahora = new Date()) { return formatoISO(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()); }
