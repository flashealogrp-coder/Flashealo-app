// /api/selfie (público: lo usan los atletas). Reenvía la selfie al servicio interno de rostros del NAS
// (flashealo-selfie). Protecciones: solo POST, tamaño máximo, límite de intentos por IP y tiempo máximo.
const json = (res, code, obj) => {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
};

const MAX_BYTES = 4 * 1024 * 1024;        // la web redimensiona antes de enviar; esto es solo un tope
const POR_MINUTO = 8;
const POR_HORA = 60;

export function limitadorPorIp(ahora = () => Date.now()) {
  const marcas = new Map(); // ip -> [timestamps]
  return function permitido(ip) {
    const t = ahora();
    const lista = (marcas.get(ip) || []).filter((x) => t - x < 3600_000);
    const ultimoMin = lista.filter((x) => t - x < 60_000).length;
    if (ultimoMin >= POR_MINUTO || lista.length >= POR_HORA) { marcas.set(ip, lista); return false; }
    lista.push(t); marcas.set(ip, lista);
    if (marcas.size > 5000) for (const [k, v] of marcas) if (!v.some((x) => t - x < 3600_000)) marcas.delete(k);
    return true;
  };
}

export const ipDe = (req) => String(req.headers['x-real-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || '').trim();

export function manejadorSelfie(cfg, fetchFn = fetch, permitido = limitadorPorIp()) {
  return async function (req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
    if (!cfg.selfieUrl) return json(res, 503, { error: 'La búsqueda por selfie no está disponible por ahora.' });
    if (!permitido(ipDe(req))) return json(res, 429, { error: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.' });

    let cuerpo = '';
    try {
      for await (const c of req) { cuerpo += c; if (cuerpo.length > MAX_BYTES) return json(res, 413, { error: 'La imagen es demasiado grande.' }); }
    } catch { return json(res, 400, { error: 'Solicitud inválida' }); }
    let imagen;
    try { imagen = JSON.parse(cuerpo).imagen_base64; } catch { /* abajo */ }
    if (typeof imagen !== 'string' || imagen.length < 100 || !/^(data:image\/[a-z+]+;base64,)?[A-Za-z0-9+/=\s]+$/.test(imagen)) return json(res, 400, { error: 'Imagen inválida' });

    try {
      const r = await fetchFn(`${cfg.selfieUrl}/vectorizar-selfie/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Interno': cfg.tokenInterno },
        body: JSON.stringify({ imagen_base64: imagen }),
        signal: AbortSignal.timeout(25000),
      });
      const datos = await r.json().catch(() => ({}));
      if (r.status === 422 || r.status === 400) return json(res, 400, { error: datos.detail || 'No pudimos leer la imagen.' });
      if (!r.ok || !Array.isArray(datos.vector)) return json(res, 502, { error: 'No se pudo procesar la selfie. Inténtalo de nuevo.' });
      return json(res, 200, { vector: datos.vector });
    } catch {
      return json(res, 502, { error: 'No se pudo procesar la selfie. Inténtalo de nuevo.' });
    }
  };
}
