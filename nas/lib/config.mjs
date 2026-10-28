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
    selfieUrl: (env.SELFIE_URL || '').replace(/\/$/, ''),            // servicio interno de rostros (flashealo-selfie)
    webPublica: (env.WEB_PUBLIC_URL || '').replace(/\/$/, ''),          // p. ej. https://www.flashealo.do (para los enlaces que recibe la IA)
    papeleraDias: Math.max(0, Number(env.PAPELERA_DIAS) || 0),          // 0 = borrar de verdad; >0 = papelera esos días
    anthropicKey: env.ANTHROPIC_API_KEY || '',                           // opcional: activa «Escribir con IA» en Mi página
    anthropicUrl: (env.ANTHROPIC_URL || 'https://api.anthropic.com').replace(/\/$/, ''),
    modeloTexto: env.PAGINA_IA_MODELO || 'claude-sonnet-5-5',
    iaUrlTtlMs: num(env.IA_URL_TTL_S, 10800) * 1000,
  };
}
