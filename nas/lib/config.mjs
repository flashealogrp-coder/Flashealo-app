// Configuración por variables de entorno (con valores seguros por defecto).
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };

export function leerConfig(env = process.env) {
  return {
    puerto: num(env.PORT, 3000),
    dist: env.DIST_DIR || 'dist',
    datos: env.DATA_DIR || '/datos',                   // contiene originales/, watermarks/, miniaturas/
    supabaseUrl: (env.SUPABASE_URL || '').replace(/\/$/, ''),
    supabaseKey: env.SUPABASE_KEY || '',
    uploadSecret: env.UPLOAD_SECRET || '',
    tokenTtlMs: num(env.TOKEN_TTL_S, 3600) * 1000,
    maxImagen: num(env.IMG_MAX_MB, 150) * 1024 * 1024,
    maxVideo: num(env.VIDEO_MAX_MB, 4096) * 1024 * 1024,
    minLibrePct: Number(env.MIN_FREE_PCT ?? 5),
    derivadasUrl: (env.DERIVADAS_URL || '').replace(/\/$/, ''),
    tokenInterno: env.INTERNAL_TOKEN || '',
    iaUrl: env.IA_MODAL_URL || '',
    iaClave: env.IA_SHARED_KEY || '',
  };
}
