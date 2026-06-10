import os
import cv2
import numpy as np
import json
import time
import uuid
import torch
import torchvision.transforms as T
from torchvision import models
from ultralytics import YOLO
from insightface.app import FaceAnalysis
from supabase import create_client, Client
import easyocr

# ==========================================
# 1. CONFIGURACIÓN Y CONEXIONES
# ==========================================
SUPABASE_URL = "https://muvzhnnsdnztlhynuipd.supabase.co/"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11dnpobm5zZG56dGxoeW51aXBkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY1NjI2OCwiZXhwIjoyMDk2MjMyMjY4fQ.GmcoKarV7ETQyKYPwVajJFgy2nmuJV9ECcN3kzqiHMU"

print("🔌 Conectando a Supabase...")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("⏳ Cargando YOLO General (Personas)...")
modelo_yolo_general = YOLO('yolov8n_openvino_model')

print("⏳ Cargando YOLO Especializado (Dorsales)...")
modelo_yolo_dorsales = YOLO('yolov8s_dorsales_openvino_model') 

print("⏳ Cargando Motor OCR (EasyOCR)...")
lector_ocr = easyocr.Reader(['en'], gpu=False)

print("⏳ Cargando Motor ReID (Huellas de Ropa)...")
resnet = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
modelo_reid = torch.nn.Sequential(*(list(resnet.children())[:-1]))
modelo_reid.eval()

transform_reid = T.Compose([
    T.ToPILImage(),
    T.Resize((256, 128)),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

print("⏳ Cargando InsightFace (Facial)...")
app_caras = FaceAnalysis(name='buffalo_s')
app_caras.prepare(ctx_id=1, det_size=(640, 640), det_thresh=0.25)

CARPETA_FOTOS = "fotos_entrada"
os.makedirs(CARPETA_FOTOS, exist_ok=True)

# ==========================================
# 2. FUNCIONES DE APOYO
# ==========================================
def obtener_evento_activo():
    print("\n--- Buscando eventos disponibles ---")
    response = supabase.table('eventos').select('id, nombre, tipo_reconocimiento').execute()
    eventos = response.data
    if not eventos:
        print("❌ No se encontraron eventos.")
        exit()
    for i, e in enumerate(eventos):
        print(f"[{i}] {e['nombre']} (Tipo: {e['tipo_reconocimiento']})")
    idx = int(input("Ingresa el número del evento: "))
    return eventos[idx]

def ejecutar_con_reintento(operacion_supabase, max_reintentos=3):
    for intento in range(max_reintentos):
        try:
            return operacion_supabase.execute()
        except Exception as e:
            if '10054' in str(e) or 'ConnectError' in str(e):
                print(f"   ⚠️ Conexión cortada. Reintentando ({intento + 1}/{max_reintentos})...")
                time.sleep(2)
            else:
                raise e
    return None

def extraer_huella_ropa(recorte_bgr):
    img_rgb = cv2.cvtColor(recorte_bgr, cv2.COLOR_BGR2RGB)
    img_t = transform_reid(img_rgb).unsqueeze(0)
    with torch.no_grad():
        vector = modelo_reid(img_t).flatten().numpy()
    return vector

def calcular_similitud(emb1, emb2):
    if emb1 is None or emb2 is None: return 0.0
    e1, e2 = np.array(emb1), np.array(emb2)
    return np.dot(e1, e2) / (np.linalg.norm(e1) * np.linalg.norm(e2))

def es_dorsal_valido(texto):
    texto_limpio = ''.join(e for e in texto if e.isdigit())
    if 1 <= len(texto_limpio) <= 8:
        return True, texto_limpio
    return False, ""

def caja_adentro(caja_pequena, caja_grande):
    cx = (caja_pequena[0] + caja_pequena[2]) / 2
    cy = (caja_pequena[1] + caja_pequena[3]) / 2
    return (caja_grande[0] <= cx <= caja_grande[2]) and (caja_grande[1] <= cy <= caja_grande[3])

# ==========================================
# 3. PROCESADOR BATCH PRINCIPAL
# ==========================================
def procesar_carpeta(evento):
    EVENTO_ID = evento['id']
    TIPO_RECONOCIMIENTO = evento['tipo_reconocimiento']
    
    fotos = [f for f in os.listdir(CARPETA_FOTOS) if f.endswith(('.jpg', '.jpeg', '.png'))]
    if not fotos: return

    print(f"\n🚀 ¡Iniciando pipeline dinámico [{TIPO_RECONOCIMIENTO.upper()}] con {len(fotos)} fotos!\n")

    cache_entidades = []
    tabla_entidad = 'corredores' if TIPO_RECONOCIMIENTO == 'ocr' else 'identities'
    print(f"🔍 Cargando caché de {tabla_entidad}...")
    res_db = ejecutar_con_reintento(supabase.table(tabla_entidad).select('*').eq('evento_id', EVENTO_ID))
    if res_db: cache_entidades = res_db.data

    for nombre_foto in fotos:
        ruta_foto = os.path.join(CARPETA_FOTOS, nombre_foto)
        nombre_seguro = nombre_foto.replace(" ", "_")
        ruta_nube_original = f"{EVENTO_ID}/originales/{nombre_seguro}"
        
        op_check = supabase.table('etiquetas_fotos').select('id').eq('photo_url', ruta_nube_original).limit(1)
        if ejecutar_con_reintento(op_check).data:
            print(f"⏩ [{nombre_foto}] ya procesada. Saltando...")
            continue
            
        print(f"\n📸 [{nombre_foto}] -------------------------------")
        
        foto_id = None
        try:
            with open(ruta_foto, 'rb') as f:
                supabase.storage.from_('fotos').upload(ruta_nube_original, f, file_options={"content-type": "image/jpeg", "upsert": "true"})
            op_insert = supabase.table('fotografias').insert({"evento_id": EVENTO_ID, "url_original": ruta_nube_original})
            insert_foto = ejecutar_con_reintento(op_insert)
            if insert_foto: foto_id = insert_foto.data[0]['id']
        except Exception as e:
            print(f"🔴 Error subiendo original: {e}")
            pass

        img = cv2.imread(ruta_foto)
        if img is None: continue
        
        # ⚠️ ELIMINADO: img = cv2.resize(img, (1280, 720))
        # Tomamos las dimensiones reales y matemáticas de la foto original
        alto_img = img.shape[0]
        ancho_img = img.shape[1]

        # =========================================================
        # SUB-PIPELINE MODO OCR
        # =========================================================
        if TIPO_RECONOCIMIENTO == 'ocr':
            res_personas = modelo_yolo_general(img, classes=[0], conf=0.25, verbose=False)
            cajas_personas = res_personas[0].boxes
            
            res_dorsales = modelo_yolo_dorsales(img, classes=[0], imgsz=640, conf=0.3, iou=0.4, verbose=False)
            cajas_dorsales = res_dorsales[0].boxes

            for box_p in cajas_personas:
                x1_p, y1_p, x2_p, y2_p = map(int, box_p.xyxy[0])
                recorte_persona = img[y1_p:y2_p, x1_p:x2_p]
                
                if recorte_persona.shape[0] < 100 or recorte_persona.shape[1] < 50: continue

                tiene_dorsal = False
                for box_d in cajas_dorsales:
                    if caja_adentro(list(map(int, box_d.xyxy[0])), [x1_p, y1_p, x2_p, y2_p]):
                        tiene_dorsal = True
                        break
                
                if not tiene_dorsal: continue

                huella_ropa = extraer_huella_ropa(recorte_persona).tolist()
                mejor_corredor_id = None
                mejor_similitud = 0.0
                
                for corredor in cache_entidades:
                    if corredor.get('embedding_promedio'):
                        sim = calcular_similitud(huella_ropa, json.loads(corredor['embedding_promedio']) if isinstance(corredor['embedding_promedio'], str) else corredor['embedding_promedio'])
                        if sim > mejor_similitud:
                            mejor_similitud = sim
                            mejor_corredor_id = corredor['id']

                if mejor_similitud < 0.85:
                    nombre_avatar = f"{EVENTO_ID}/avatares/corredor_{uuid.uuid4().hex[:8]}.jpg"
                    _, buffer_img = cv2.imencode('.jpg', recorte_persona)
                    supabase.storage.from_('fotos').upload(path=nombre_avatar, file=buffer_img.tobytes(), file_options={"upsert": "true"})

                    op_new_corr = supabase.table('corredores').insert({
                        "evento_id": EVENTO_ID,
                        "embedding_promedio": huella_ropa,
                        "avatar_url": nombre_avatar,
                        "dorsal": "" 
                    })
                    nuevo_corr = ejecutar_con_reintento(op_new_corr)
                    if nuevo_corr:
                        mejor_corredor_id = nuevo_corr.data[0]['id']
                        cache_entidades.append(nuevo_corr.data[0])
                        print(f"   👤 Nuevo corredor identificado y agrupado.")
                else:
                    print(f"   👥 ReID Match: ¡Corredor reconocido! ({mejor_similitud*100:.1f}%)")

                dorsal_leido_final = ""
                bbox_dorsal_guardar = None
                
                for box_d in cajas_dorsales:
                    coord_dorsal = list(map(int, box_d.xyxy[0]))
                    if caja_adentro(coord_dorsal, [x1_p, y1_p, x2_p, y2_p]):
                        xd1, yd1, xd2, yd2 = coord_dorsal
                        
                        padding = 12
                        recorte_dorsal = img[max(0, yd1-padding):min(alto_img, yd2+padding), max(0, xd1-padding):min(ancho_img, xd2+padding)]
                        
                        if recorte_dorsal.shape[0] > 0 and recorte_dorsal.shape[1] > 0:
                            rec_grande = cv2.resize(recorte_dorsal, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
                            resultados_ocr = lector_ocr.readtext(rec_grande, detail=0, allowlist='0123456789')
                            texto_crudo = "".join(resultados_ocr).strip()
                            
                            es_valido, texto_final = es_dorsal_valido(texto_crudo)
                            if es_valido:
                                dorsal_leido_final = texto_final
                                print(f"   🏃‍♂️ Dorsal leído: [{texto_final}] para este corredor.")
                                
                                corredor_actual = next((c for c in cache_entidades if c['id'] == mejor_corredor_id), None)
                                if corredor_actual and not corredor_actual.get('dorsal'):
                                    ejecutar_con_reintento(supabase.table('corredores').update({"dorsal": texto_final}).eq('id', mejor_corredor_id))
                                    corredor_actual['dorsal'] = texto_final 
                        
                        # Porcentajes perfectos basados en el Original
                        bbox_dorsal_guardar = {"x": (xd1/ancho_img)*100, "y": (yd1/alto_img)*100, "w": ((xd2-xd1)/ancho_img)*100, "h": ((yd2-yd1)/alto_img)*100}
                        break 

                bbox_persona_guardar = {"x": (x1_p/ancho_img)*100, "y": (y1_p/alto_img)*100, "w": ((x2_p-x1_p)/ancho_img)*100, "h": ((y2_p-y1_p)/alto_img)*100}
                
                try:
                    op_insert_etiqueta = supabase.table('etiquetas_fotos').insert({
                        "photo_url": ruta_nube_original, 
                        "foto_id": foto_id,
                        "evento_id": EVENTO_ID,
                        "corredor_id": mejor_corredor_id,
                        "dorsal": dorsal_leido_final,
                        "bbox": bbox_dorsal_guardar, 
                        "bbox_cuerpo": bbox_persona_guardar,
                        "embedding_ropa": huella_ropa
                    })
                    ejecutar_con_reintento(op_insert_etiqueta)
                except Exception as e:
                    print(f"🔴 Error BD Etiquetas: {e}")

        # =========================================================
        # SUB-PIPELINE MODO BIOMÉTRICO (FACIAL / HÍBRIDO)
        # =========================================================
        else:
            resultados = modelo_yolo_general(img, classes=[0], conf=0.25, verbose=False)
            
            for box in resultados[0].boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                recorte = img[y1:y2, x1:x2]
                if recorte.shape[0] < 50 or recorte.shape[1] < 50: 
                    continue

                rostros = app_caras.get(recorte)
                if not rostros: 
                    continue
                    
                rostro = rostros[0]
                huella = rostro.embedding
                
                mejor_match_id = None
                mejor_puntaje = 0.0
                
                for identidad in cache_entidades:
                    if identidad.get('embedding_promedio'):
                        puntaje = calcular_similitud(huella, json.loads(identidad['embedding_promedio']) if isinstance(identidad['embedding_promedio'], str) else identidad['embedding_promedio'])
                        if puntaje > mejor_puntaje:
                            mejor_puntaje = puntaje
                            mejor_match_id = identidad['id']
                
                try:
                    if mejor_puntaje > 0.40:
                        id_asignado = mejor_match_id
                        print(f"   👥 Match Facial Confirmado: {mejor_puntaje:.2f}")
                    else:
                        fx1, fy1, fx2, fy2 = map(int, rostro.bbox)
                        recorte_cara = recorte[max(0, fy1-30):min(alto_img, fy2+30), max(0, fx1-30):min(ancho_img, fx2+30)]
                        
                        nombre_avatar = f"{EVENTO_ID}/avatares/avatar_{uuid.uuid4().hex[:8]}.jpg"
                        _, buffer_img = cv2.imencode('.jpg', recorte_cara)
                        
                        supabase.storage.from_('fotos').upload(path=nombre_avatar, file=buffer_img.tobytes(), file_options={"upsert": "true"})

                        op_new_id = supabase.table('identities').insert({
                            "display_name": f"Jugador_{len(cache_entidades) + 1}",
                            "avatar_url": nombre_avatar,
                            "embedding_promedio": huella.tolist(),
                            "evento_id": EVENTO_ID
                        })
                        nueva_id = ejecutar_con_reintento(op_new_id)
                        
                        if nueva_id:
                            id_asignado = nueva_id.data[0]['id']
                            cache_entidades.append(nueva_id.data[0])
                            print(f"   ✨ Nueva identidad biométrica registrada")
                    
                    bbox_data = {"x": (x1/ancho_img)*100, "y": (y1/alto_img)*100, "w": ((x2-x1)/ancho_img)*100, "h": ((y2-y1)/alto_img)*100}
                    
                    op_face = supabase.table('face_detections').insert({
                        "photo_url": ruta_nube_original, 
                        "identity_id": id_asignado,
                        "embedding": huella.tolist(),
                        "evento_id": EVENTO_ID,
                        "bbox": bbox_data
                    })
                    ejecutar_con_reintento(op_face)
                except Exception as e: 
                    print(f"🔴 Error de inserción Facial en BD: {e}")
            
    print("\n🏁 ¡PROCESAMIENTO DE IMÁGENES FINALIZADO CON ÉXITO!")

if __name__ == "__main__":
    evento_seleccionado = obtener_evento_activo()
    procesar_carpeta(evento_seleccionado)