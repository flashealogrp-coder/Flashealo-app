import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// 1. Configuramos el cliente con tus llaves secretas
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// 2. Esta es la función mágica de Vercel
export default async function handler(req, res) {
  // Solo permitimos peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // 3. Recibimos el nombre y tipo de archivo desde tu web
    const { fileName, fileType } = req.body;

    // 4. Preparamos la orden para guardar la foto
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: `test-eventos/${Date.now()}-${fileName}`, // Le pone la fecha para no pisar fotos con el mismo nombre
      ContentType: fileType,
    });

    // 5. Generamos el "Ticket de permiso" válido por 1 hora
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // 6. Le enviamos la URL lista a tu página web
    return res.status(200).json({ url });
    
  } catch (error) {
    console.error("Error generando URL:", error);
    return res.status(500).json({ error: error.message });
  }
}