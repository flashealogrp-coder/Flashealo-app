// GET/POST /api/mi-espacio: cuánto espacio usa y cuánto le queda al fotógrafo que llama (por su sesión).
// El superadministrador no tiene cuota: responde { admin: true }.
export function manejadorMiEspacio(ctx, cuotas) {
  const json = (res, code, obj) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(obj));
  };
  return async function (req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
    const c = await ctx.contexto(req);
    if (!c || !c.permitido) return json(res, 401, { error: 'No autorizado' });
    if (c.admin || !c.slug) return json(res, 200, { admin: true });
    const usado = await cuotas.uso(c.slug);
    const cuota = c.cuota_bytes == null ? null : Number(c.cuota_bytes);
    return json(res, 200, { usado_bytes: usado, cuota_bytes: cuota, libre_bytes: cuota == null ? null : Math.max(0, cuota - usado) });
  };
}
