import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: "auto",
  forcePathStyle: !!process.env.S3_PATH_STYLE, // MinIO en el NAS
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const TIPOS_PERMITIDOS = /^(image|video)\/[a-zA-Z0-9.+\-]+$/;
const limpiarRuta = (r) => String(r || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\-_/]/g, '-').replace(/\.\.+/g, '-').replace(/^\/+/, '').slice(0, 200);

// Verifica que quien llama es el admin: valida su JWT de Supabase y llama a public.is_admin() con ese mismo JWT.
async function esAdmin(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const base = process.env.SUPABASE_URL;
  const apikey = process.env.SUPABASE_KEY;
  const r = await fetch(`${base}/rest/v1/rpc/is_admin`, {
    method: 'POST',
    headers: { apikey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!r.ok) return false;
  return (await r.json()) === true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    if (!(await esAdmin(req))) return res.status(401).json({ error: 'No autorizado' });

    const { fileName, fileType } = req.body || {};
    const carpetaR2 = limpiarRuta(req.body && req.body.carpetaR2);
    if (typeof fileName !== 'string' || !TIPOS_PERMITIDOS.test(fileType || '') || !carpetaR2) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    // Limpiamos el nombre y armamos la ruta exacta (Ej. /boda-juan/ceremonia/foto1.jpg)
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const finalPath = `${carpetaR2}/${Date.now()}_${cleanFileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: finalPath,
      ContentType: fileType,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Ahora devolvemos la URL de subida Y la ruta final para guardarla en Supabase
    return res.status(200).json({ url, path: finalPath });
    
  } catch (error) {
    console.error("Error generando URL:", error);
    return res.status(500).json({ error: 'Error generando URL' });
  }
}