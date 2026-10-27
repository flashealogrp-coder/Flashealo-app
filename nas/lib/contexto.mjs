// Quién llama y qué puede hacer. Reenvía su sesión (JWT) a Supabase:
//   public.mi_contexto()          -> { es_admin, fotografo_id, slug, estado, cuota_bytes, ... }
//   public.es_dueno_evento(texto) -> ¿la colección es suya (o es superadmin)?
// Los resultados se guardan en memoria unos segundos para no consultar en cada foto durante subidas masivas.
import crypto from 'node:crypto';

const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');
const token = (req) => (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

export function crearContexto(cfg, fetchFn = fetch, ttlMs = 60_000) {
  const cache = new Map();
  const guardar = (k, v, ms) => { if (cache.size > 800) cache.clear(); cache.set(k, { v, hasta: Date.now() + ms }); return v; };
  const leer = (k) => { const h = cache.get(k); return h && h.hasta > Date.now() ? h : null; };

  async function rpc(jwt, nombre, cuerpo) {
    const r = await fetchFn(`${cfg.supabaseUrl}/rest/v1/rpc/${nombre}`, {
      method: 'POST',
      headers: { apikey: cfg.supabaseKey, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo || {}),
      signal: AbortSignal.timeout(8000),
    });
    return r.ok ? r.json() : null;
  }

  // Devuelve null si no hay sesión válida; si la hay, { admin, permitido, slug, cuota_bytes, fotografo_id }.
  async function contexto(req) {
    const jwt = token(req);
    if (!jwt) return null;
    const k = 'c:' + hash(jwt);
    const hit = leer(k);
    if (hit) return hit.v;
    let c = null;
    try {
      const d = await rpc(jwt, 'mi_contexto');
      if (d && typeof d === 'object') {
        const admin = d.es_admin === true;
        const activo = d.estado === 'activo' && typeof d.slug === 'string' && /^[a-z0-9][a-z0-9-]{2,30}$/.test(d.slug);
        c = { admin, permitido: admin || activo, slug: activo ? d.slug : null, fotografo_id: d.fotografo_id || null,
              cuota_bytes: d.cuota_bytes == null ? null : Number(d.cuota_bytes) };
      }
    } catch { c = null; }
    return guardar(k, c, c ? ttlMs : 5000);
  }

  async function esDueno(req, eventoId) {
    const c = await contexto(req);
    if (!c || !c.permitido) return false;
    if (c.admin) return true;
    const jwt = token(req);
    const k = `d:${hash(jwt)}:${eventoId}`;
    const hit = leer(k);
    if (hit) return hit.v;
    let ok = false;
    try { ok = (await rpc(jwt, 'es_dueno_evento', { p_evento: String(eventoId) })) === true; } catch { ok = false; }
    return guardar(k, ok, ok ? ttlMs : 5000);
  }

  return { contexto, esDueno };
}
