// Subida de originales directamente al disco del NAS.
//   POST /api/upload-url  (admin)  -> { url: "/api/subir/<token>", path: "o/<ruta>" }
//   PUT  /api/subir/<token>        -> escribe el archivo en <datos>/originales/<ruta>
// El contrato con el frontend es el mismo que tenía R2: pide una URL, sube con PUT y guarda `path`.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { firmar, verificar } from './tokens.mjs';

const TIPOS = /^(image|video)\/[a-zA-Z0-9.+\-]+$/;

export const limpiarRuta = (r) => String(r || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-zA-Z0-9\-_/]/g, '-').replace(/\.\.+/g, '-').replace(/\/{2,}/g, '/').replace(/^\/+/, '').replace(/\/+$/, '').slice(0, 200);
export const limpiarNombre = (n) => String(n || '').replace(/[^a-zA-Z0-9.\-_]/g, '').replace(/^\.+/, '').slice(-120);

export async function espacio(dir) {
  const s = await fs.promises.statfs(dir);
  const total = s.blocks * s.bsize, libre = s.bavail * s.bsize;
  return { total, libre, libre_pct: total ? (libre / total) * 100 : 0 };
}

const json = (res, code, obj) => {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
};

export function manejadorUploadUrl(cfg, esAdmin) {
  return async function (req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
    if (!cfg.uploadSecret) return json(res, 503, { error: 'Servidor sin UPLOAD_SECRET' });
    if (!(await esAdmin(req))) return json(res, 401, { error: 'No autorizado' });

    const { fileName, fileType } = req.body || {};
    const carpeta = limpiarRuta(req.body && req.body.carpetaR2);
    const nombre = typeof fileName === 'string' ? limpiarNombre(fileName) : '';
    if (!nombre || !TIPOS.test(fileType || '') || !carpeta) return json(res, 400, { error: 'Datos inválidos' });

    try {
      const e = await espacio(cfg.datos);
      if (e.libre_pct < cfg.minLibrePct) return json(res, 507, { error: 'Disco casi lleno: libera espacio antes de subir' });
    } catch { /* si no se puede medir, el PUT lo volverá a comprobar */ }

    const clave = `${carpeta}/${Date.now()}_${crypto.randomBytes(3).toString('hex')}_${nombre}`;
    const max = fileType.startsWith('video/') ? cfg.maxVideo : cfg.maxImagen;
    const token = firmar({ k: clave, t: fileType, m: max, e: Date.now() + cfg.tokenTtlMs }, cfg.uploadSecret);
    return json(res, 200, { url: `/api/subir/${token}`, path: `o/${clave}` });
  };
}

export function manejadorSubir(cfg) {
  const base = path.resolve(cfg.datos, 'originales');
  return async function (req, res, token) {
    if (req.method !== 'PUT') return json(res, 405, { error: 'Método no permitido' });
    const p = cfg.uploadSecret ? verificar(token, cfg.uploadSecret) : null;
    if (!p) return json(res, 401, { error: 'Enlace de subida inválido o vencido' });

    const tipo = String(req.headers['content-type'] || '').split(';')[0].trim();
    if (tipo !== p.t) return json(res, 415, { error: 'Tipo de archivo distinto al solicitado' });

    const declarado = Number(req.headers['content-length']);
    if (Number.isFinite(declarado) && declarado > p.m) return json(res, 413, { error: 'Archivo demasiado grande' });

    const destino = path.resolve(base, p.k);
    if (!destino.startsWith(base + path.sep)) return json(res, 400, { error: 'Ruta inválida' });

    try {
      const e = await espacio(cfg.datos);
      if (e.libre_pct < cfg.minLibrePct || (Number.isFinite(declarado) && declarado > e.libre)) {
        return json(res, 507, { error: 'Disco casi lleno' });
      }
    } catch { /* continuar */ }

    await fs.promises.mkdir(path.dirname(destino), { recursive: true, mode: 0o750 });
    const tmp = `${destino}.${crypto.randomBytes(4).toString('hex')}.parte`;
    let bytes = 0;
    const limitador = new Transform({
      transform(chunk, _enc, cb) {
        bytes += chunk.length;
        if (bytes > p.m) return cb(Object.assign(new Error('grande'), { codigo: 413 }));
        cb(null, chunk);
      },
    });
    try {
      await pipeline(req, limitador, fs.createWriteStream(tmp, { flags: 'wx', mode: 0o640 }));
      // fsync desde otro descriptor: el contenido queda en disco antes de publicar el archivo
      const fh = await fs.promises.open(tmp, 'r');
      try { await fh.sync(); } finally { await fh.close(); }
      // link falla si ya existe: nunca se pisa un original.
      await fs.promises.link(tmp, destino);
      await fs.promises.unlink(tmp);
      return json(res, 200, { ok: true, path: `o/${p.k}`, bytes });
    } catch (err) {
      await fs.promises.unlink(tmp).catch(() => {});
      if (err.code === 'EEXIST') return json(res, 409, { error: 'Ese archivo ya fue subido' });
      if (err.codigo === 413) { res.setHeader('Connection', 'close'); return json(res, 413, { error: 'Archivo demasiado grande' }); }
      if (err.code === 'ENOSPC') return json(res, 507, { error: 'Disco lleno' });
      if (!res.headersSent && !req.destroyed) return json(res, 500, { error: 'Error al guardar' });
    }
  };
}
