// Comprueba que quien llama es admin: reenvía su JWT a public.is_admin() de Supabase.
// Guarda el resultado 60 s para no consultar en cada foto durante subidas masivas.
import crypto from 'node:crypto';

export function crearEsAdmin(cfg, fetchFn = fetch, ttlMs = 60_000) {
  const cache = new Map();
  return async function esAdmin(req) {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return false;
    const clave = crypto.createHash('sha256').update(token).digest('hex');
    const hit = cache.get(clave);
    if (hit && hit.hasta > Date.now()) return hit.ok;
    let ok = false;
    try {
      const r = await fetchFn(`${cfg.supabaseUrl}/rest/v1/rpc/is_admin`, {
        method: 'POST',
        headers: { apikey: cfg.supabaseKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(8000),
      });
      ok = r.ok && (await r.json()) === true;
    } catch { ok = false; }
    if (cache.size > 500) cache.clear();
    cache.set(clave, { ok, hasta: Date.now() + (ok ? ttlMs : 5000) });
    return ok;
  };
}
