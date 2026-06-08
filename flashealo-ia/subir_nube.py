import cv2
from insightface.app import FaceAnalysis
from supabase import create_client, Client

# ==========================================
# 1. TUS CREDENCIALES DE SUPABASE
# ==========================================
SUPABASE_URL = "https://muvzhnnsdnztlhynuipd.supabase.co/"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11dnpobm5zZG56dGxoeW51aXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTYyNjgsImV4cCI6MjA5NjIzMjI2OH0.zec3LdfU3i0gdcCEDeHaIlMz1xSNTydpth50obaGesU"

print("🔌 Conectando a Supabase...")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ==========================================
# 2. INICIAR IA FACIAL
# ==========================================
print("⏳ Cargando motor biométrico...")
app = FaceAnalysis(name='buffalo_l')
app.prepare(ctx_id=0, det_size=(640, 640))

# ==========================================
# 3. ANALIZAR FOTO Y SUBIR A LA NUBE
# ==========================================
ruta_foto = "jugadores_recortados/jugador_1.jpg"
img = cv2.imread(ruta_foto)

if img is None:
    print(f"❌ Error: No encontré la foto {ruta_foto}")
else:
    rostros = app.get(img)
    
    if len(rostros) == 0:
        print("⚠️ No hay cara visible en la foto.")
    else:
        # Extraemos el vector
        embedding = rostros[0].embedding
        
        # ¡TRUCO VITAL! Convertimos el array de numpy a una lista normal de Python 
        # para que Supabase y pgvector lo puedan entender.
        vector_lista = embedding.tolist()
        
        print(f"✅ Huella extraída. Subiendo vector a Supabase...")
        
        try:
            # 1. Primero creamos una Identidad "en blanco"
            nueva_identidad = supabase.table('identities').insert({
                "display_name": "Jugador Desconocido",
                "avatar_url": ruta_foto
            }).execute()
            
            id_identidad = nueva_identidad.data[0]['id']
            
            # 2. Guardamos la detección de la cara vinculada a esa identidad
            respuesta = supabase.table('face_detections').insert({
                "photo_url": ruta_foto,
                "identity_id": id_identidad,
                "embedding": vector_lista # Aquí va la magia de 512 números
            }).execute()
            
            print("🎉 ¡ÉXITO TOTAL!")
            print(f"El jugador fue guardado en la nube con el ID: {id_identidad}")
            
        except Exception as e:
            print(f"🔴 Error al subir a Supabase: {e}")