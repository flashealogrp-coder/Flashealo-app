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
    // Ni siquiera el superadministrador entra en colecciones ajenas: la base de datos decide quién es el dueño.
    const jwt = token(req);
    const k = `d:${hash(jwt)}:${eventoId}`;
    const hit = leer(k);
    if (hit) return hit.v;
    let ok = false;
    try { ok = (await rpc(jwt, 'es_dueno_evento', { p_evento: String(eventoId) })) === true; } catch { ok = false; }
    return guardar(k, ok, ok ? ttlMs : 5000);
  }

  // ¿La carpeta (o su primer tramo) es la de OTRO fotógrafo? Si no se puede comprobar, se trata como ajena.
  async function carpetaAjena(req, texto) {
    const seg = String(texto || '').trim().replace(/^\/+/, '').replace(/^(o|watermarks|miniaturas)\//, '').split('/')[0].toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{2,30}$/.test(seg)) return false; // no puede ser la carpeta de un fotógrafo
    const jwt = token(req);
    const k = `a:${hash(jwt)}:${seg}`;
    const hit = leer(k);
    if (hit) return hit.v;
    let r = null;
    try { r = await rpc(jwt, 'carpeta_ajena', { p_segmento: seg }); } catch { r = null; }
    const ajena = r !== false;
    return guardar(k, ajena, ajena ? 5000 : ttlMs);
  }

  return { contexto, esDueno, carpetaAjena };
}
