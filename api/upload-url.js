import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { fileName, fileType, carpetaR2 } = req.body;

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
    return res.status(500).json({ error: error.message });
  }
}