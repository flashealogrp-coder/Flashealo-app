import os
import cv2
import numpy as np
import json
from ultralytics import YOLO
from insightface.app import FaceAnalysis
from supabase import create_client, Client

# ==========================================
# 1. CONFIGURACIÓN Y CONEXIONES (ÚNICA VEZ)
# ==========================================
SUPABASE_URL = "https://muvzhnnsdnztlhynuipd.supabase.co/"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11dnpobm5zZG56dGxoeW51aXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTYyNjgsImV4cCI6MjA5NjIzMjI2OH0.zec3LdfU3i0gdcCEDeHaIlMz1xSNTydpth50obaGesU"

print("🔌 Conectando a la nube de Supabase...")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("⏳ Cargando Red Neuronal YOLOv8...")
modelo_yolo = YOLO('yolov8n.pt')

print("⏳ Cargando Motor Biométrico InsightFace...")
app_caras = FaceAnalysis(name='buffalo_l')
app_caras.prepare(ctx_id=0, det_size=(640, 640))

CARPETA_FOTOS = "fotos_entrada"

# ==========================================
# 2. FUNCIONES DE APOYO
# ==========================================
def obtener_evento_activo():
    print("\n--- Buscando eventos disponibles ---")
    response = supabase.table('eventos').select('id, nombre').execute()
    eventos = response.data
    
    if not eventos:
        print("❌ No se encontraron eventos en la base de datos.")
        exit()
        
    for i, e in enumerate(eventos):
        print(f"{i}: {e['nombre']}")
    
    idx = int(input("Ingresa el número del evento: "))
    return eventos[idx]['id']

def calcular_match_hibrido(nueva_huella, conf_cara, identidad_db):
    if nueva_huella is None or not identidad_db.get('embedding_promedio'):
        return 0.0

    emb_db_raw = identidad_db['embedding_promedio']
    if isinstance(emb_db_raw, str):
        emb_db_raw = json.loads(emb_db_raw)
        
    huella_db = np.array(emb_db_raw, dtype=float)
    sim_facial = np.dot(nueva_huella, huella_db) / (np.linalg.norm(nueva_huella) * np.linalg.norm(huella_db))
    peso_cara = 0.85 if conf_cara > 0.6 else 0.4
    return sim_facial * peso_cara

# ==========================================
# 3. PROCESADOR BATCH PROFESIONAL
# ==========================================
def procesar_carpeta(EVENTO_ID):
    if not os.path.exists(CARPETA_FOTOS):
        print(f"❌ Crea la carpeta '{CARPETA_FOTOS}' y pon fotos ahí.")
        return

    fotos = [f for f in os.listdir(CARPETA_FOTOS) if f.endswith(('.jpg', '.jpeg', '.png'))]
    print(f"\n🚀 ¡Iniciando pipeline para el evento [{EVENTO_ID}] con {len(fotos)} fotos!\n")

    for nombre_foto in fotos:
        ruta_foto = os.path.join(CARPETA_FOTOS, nombre_foto)
        print(f"\n📸 [{nombre_foto}] -------------------------------")
        
        # --- SUBIR FOTO ORIGINAL ---
        ruta_nube_original = f"{EVENTO_ID}/originales/{nombre_foto}"
        try:
            with open(ruta_foto, 'rb') as f:
                supabase.storage.from_('fotos').upload(
                    path=ruta_nube_original,
                    file=f,
                    file_options={"content-type": "image/jpeg"}
                )
        except Exception: pass

        img = cv2.imread(ruta_foto)
        if img is None: continue
            
        resultados = modelo_yolo(img, classes=[0], verbose=False)
        
        for idx, box in enumerate(resultados[0].boxes):
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            recorte_jugador = img[y1:y2, x1:x2]
            if recorte_jugador.shape[0] < 50 or recorte_jugador.shape[1] < 50: continue

            rostros = app_caras.get(recorte_jugador)
            if len(rostros) > 0:
                rostro = rostros[0]
                huella = rostro.embedding
                confianza = rostro.det_score
                
                try:
                    res_db = supabase.table('identities').select('*').eq('evento_id', EVENTO_ID).execute()
                    identidades_existentes = res_db.data
                    
                    mejor_match_id = None
                    mejor_puntaje = 0.0
                    
                    for identidad in identidades_existentes:
                        if identidad.get('embedding_promedio'):
                            puntaje = calcular_match_hibrido(huella, confianza, identidad)
                            if puntaje > mejor_puntaje:
                                mejor_puntaje = puntaje
                                mejor_match_id = identidad['id']
                    
                    if mejor_puntaje > 0.40:
                        id_asignado = mejor_match_id
                    else:
                        # Recorte inteligente de cara
                        fx1, fy1, fx2, fy2 = map(int, rostro.bbox)
                        alto_img, ancho_img = recorte_jugador.shape[:2]
                        recorte_cara = recorte_jugador[max(0, fy1-30):min(alto_img, fy2+30), max(0, fx1-30):min(ancho_img, fx2+30)]
                        
                        nombre_avatar = f"{EVENTO_ID}/avatares/avatar_{len(identidades_existentes) + 1}_{nombre_foto}"
                        _, buffer_img = cv2.imencode('.jpg', recorte_cara)
                        supabase.storage.from_('fotos').upload(path=nombre_avatar, file=buffer_img.tobytes())

                        nueva_id = supabase.table('identities').insert({
                            "display_name": f"Jugador_{len(identidades_existentes) + 1}",
                            "avatar_url": nombre_avatar,
                            "embedding_promedio": huella.tolist(),
                            "evento_id": EVENTO_ID
                        }).execute()
                        id_asignado = nueva_id.data[0]['id']
                    
                    bbox_data = {"x": (x1/img.shape[1])*100, "y": (y1/img.shape[0])*100, "w": ((x2-x1)/img.shape[1])*100, "h": ((y2-y1)/img.shape[0])*100}
                    supabase.table('face_detections').insert({
                        "photo_url": ruta_nube_original,
                        "identity_id": id_asignado,
                        "embedding": huella.tolist(),
                        "evento_id": EVENTO_ID,
                        "bbox": bbox_data
                    }).execute()
                    
                except Exception as e: print(f"🔴 Error BD: {e}")
            
    print("\n🏁 ¡PROCESAMIENTO TERMINADO!")

if __name__ == "__main__":
    ID = obtener_evento_activo()
    procesar_carpeta(ID)