// /api/ia (solo admin): 'miniaturas' avisa al servicio local de derivadas; 'ia' reenvía al motor en Modal
// añadiendo una clave compartida que el navegador nunca ve.
const json = (res, code, obj) => {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
};
import { borrarFotos, borrarColeccion } from './borrado.mjs';
import { firmarUrlsFotos, listarFotosEvento } from './fotosIA.mjs';
const ACCIONES_IA = new Set(['ia']);
// ¿la ruta guardada en la base (o/<slug>/…, watermarks/<slug>/…, miniaturas/<slug>/…) está dentro de la carpeta del fotógrafo?
const rutaDe = (r, slug) => new RegExp(`^(o|watermarks|miniaturas)/${slug}/`).test(String(r).trim().replace(/^\/+/, '')) && !String(r).includes('..');

export function manejadorIA(cfg, ctx, fetchFn = fetch, cuotas = null) {
  return async function (req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
    const c = await ctx.contexto(req);
    if (!c || !c.permitido) return json(res, 401, { error: 'No autorizado' });
    const { evento_id, accion, tipo_reconocimiento, rutas, prefijo, slugs } = req.body || {};

    // Espacio que ocupa cada fotógrafo en el NAS (solo superadmin; lo usa el panel de fotógrafos).
    if (accion === 'uso_fotografos') {
      if (!c.admin) return json(res, 403, { error: 'Solo el superadministrador' });
      if (!cuotas || !Array.isArray(slugs)) return json(res, 400, { error: 'Datos inválidos' });
      const uso = {};
      for (const sl of slugs.slice(0, 200)) if (typeof sl === 'string' && /^[a-z0-9][a-z0-9-]{2,30}$/.test(sl)) uso[sl] = await cuotas.uso(sl);
      return json(res, 200, { uso });
    }

    // Borrado físico: lo hace el propio NAS (se elimina del disco), no el motor externo.
    if (accion === 'eliminar_fotos') {
      if (!Array.isArray(rutas) || rutas.some((r) => typeof r !== 'string')) return json(res, 400, { error: 'rutas inválidas' });
      // Un fotógrafo solo borra dentro de su carpeta.
      if (!c.admin && !rutas.every((r) => rutaDe(r, c.slug))) return json(res, 403, { error: 'Esas fotos no son tuyas' });
      return json(res, 200, { ok: true, ...(await borrarFotos(cfg.datos, rutas, { papelera: cfg.papeleraDias > 0 })) });
    }
    if (accion === 'eliminar_coleccion') {
      if (typeof prefijo !== 'string') return json(res, 400, { error: 'prefijo inválido' });
      const r = await borrarColeccion(cfg.datos, prefijo, { papelera: cfg.papeleraDias > 0, base: c.admin ? '' : c.slug });
      return json(res, r.error ? 400 : 200, { ok: !r.error, ...r });
    }

    if (typeof evento_id !== 'string' || !/^[0-9a-fA-F-]{36}$/.test(evento_id)) return json(res, 400, { error: 'evento_id inválido' });

    // Procesar o analizar una colección solo lo puede pedir su dueño.
    if ((accion === 'miniaturas' || ACCIONES_IA.has(accion)) && !(await ctx.esDueno(req, evento_id))) return json(res, 403, { error: 'Esa colección no es tuya' });

    if (accion === 'miniaturas') {
      if (!cfg.derivadasUrl) return json(res, 503, { error: 'Servicio de derivadas no configurado' });
      try {
        const r = await fetchFn(`${cfg.derivadasUrl}/despertar`, { method: 'POST', headers: { 'X-Interno': cfg.tokenInterno }, signal: AbortSignal.timeout(5000) });
        return json(res, r.ok ? 202 : 502, { ok: r.ok });
      } catch { return json(res, 502, { error: 'No se pudo avisar al servicio de derivadas' }); }
    }

    if (ACCIONES_IA.has(accion)) {
      if (!cfg.iaUrl) return json(res, 503, { error: 'Motor de IA no configurado todavía' });
      // Si hay dirección pública, el motor recibe también un enlace temporal por cada foto del NAS (campo `fotos`).
      let fotos;
      if (cfg.webPublica && cfg.uploadSecret) {
        try {
          const jwt = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
          fotos = firmarUrlsFotos(cfg, await listarFotosEvento(cfg, jwt, evento_id, fetchFn));
        } catch (e) { console.error(JSON.stringify({ nivel: 'error', msg: 'no se pudieron preparar los enlaces de fotos para la IA', error: String(e.message) })); }
      }
      try {
        const r = await fetchFn(cfg.iaUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Flashealo-Key': cfg.iaClave },
          body: JSON.stringify({ evento_id, accion, tipo_reconocimiento, ...(fotos ? { fotos } : {}) }),
          signal: AbortSignal.timeout(20000),
        });
        return json(res, r.ok ? 202 : 502, { ok: r.ok, estado: r.status });
      } catch { return json(res, 502, { error: 'No se pudo contactar al motor de IA' }); }
    }
    return json(res, 400, { error: 'Acción no permitida' });
  };
}
