// Tokens firmados (HMAC-SHA256) para las subidas: llevan la ruta, el tipo, el tamaño máximo y la caducidad.
import crypto from 'node:crypto';

const b64u = (b) => Buffer.from(b).toString('base64url');

export function firmar(payload, secret) {
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verificar(token, secret, ahora = Date.now()) {
  if (typeof token !== 'string' || token.length > 2000) return null;
  const partes = token.split('.');
  if (partes.length !== 2) return null;
  const [body, sig] = partes;
  const esperado = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(esperado);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let p;
  try { p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return null; }
  if (!p || typeof p.e !== 'number' || p.e < ahora) return null;
  return p;
}
