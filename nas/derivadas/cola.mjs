// Cliente mínimo de PostgREST con el rol "derivadas" (solo puede leer la cola y poner url_watermark/ancho/alto).
export function crearCola({ url, token, fetchFn = fetch }) {
  const base = url.replace(/\/$/, '');
  const cab = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const llamar = async (ruta, opciones = {}) => {
    const r = await fetchFn(base + ruta, { ...opciones, headers: { ...cab, ...(opciones.headers || {}) }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`PostgREST ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r;
  };
  return {
    async pendientes(limite = 10) {
      const r = await llamar(`/fotografias?select=id,url_original,evento_id&url_watermark=is.null&url_original=like.o/*&order=created_at.asc&limit=${limite}`);
      return r.json();
    },
    async contarPendientes() {
      const r = await llamar('/fotografias?select=id&url_watermark=is.null&url_original=like.o/*', { headers: { Prefer: 'count=exact', Range: '0-0', 'Range-Unit': 'items' } });
      const m = /\/(\d+)$/.exec(r.headers.get('content-range') || '');
      return m ? Number(m[1]) : null;
    },
    async marcar(id, { url_watermark, ancho, alto }) {
      await llamar(`/fotografias?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ url_watermark, ancho, alto }) });
    },
    async conDerivada({ eventoId, limite = 500 } = {}) {
      const filtro = eventoId ? `&evento_id=eq.${encodeURIComponent(eventoId)}` : '';
      const r = await llamar(`/fotografias?select=id,url_original&url_watermark=not.is.null&url_original=like.o/*${filtro}&order=created_at.asc&limit=${limite}`);
      return r.json();
    },
    async limpiar(id) {
      await llamar(`/fotografias?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ url_watermark: null }) });
    },
  };
}
