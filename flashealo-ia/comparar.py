import cv2
import numpy as np
from insightface.app import FaceAnalysis
from numpy.linalg import norm

print("⏳ Cargando motor biométrico...")
app = FaceAnalysis(name='buffalo_l')
app.prepare(ctx_id=0, det_size=(640, 640))

# 1. Definir las dos imágenes a comparar
# (Asegúrate de que estas rutas coincidan con tus recortes)
ruta_foto_A = "marlona.jpg"
ruta_foto_B = "marlonb.jpg"

def obtener_huella(ruta_imagen):
    img = cv2.imread(ruta_imagen)
    if img is None:
        print(f"❌ Error: No pude leer {ruta_imagen}")
        return None
        
    rostros = app.get(img)
    if len(rostros) == 0:
        print(f"⚠️ No hay cara visible en {ruta_imagen}")
        return None
        
    return rostros[0].embedding

# 2. Extraer huellas de ambas fotos
print("\n🔍 Analizando Foto A...")
huella_A = obtener_huella(ruta_foto_A)

print("🔍 Analizando Foto B...")
huella_B = obtener_huella(ruta_foto_B)

# 3. Calcular la Similitud Matemática (Similitud del Coseno)
if huella_A is not None and huella_B is not None:
    # Fórmula matemática para comparar dos vectores
    similitud = np.dot(huella_A, huella_B) / (norm(huella_A) * norm(huella_B))
    
    # Convertimos a porcentaje para leerlo más fácil
    porcentaje = similitud * 100
    
    print("\n========================================")
    print(f"📊 PUNTAJE DE SIMILITUD: {porcentaje:.2f}%")
    print("========================================")
    
    # Con InsightFace, un puntaje mayor a ~40% o 50% casi siempre confirma que es la misma persona
    UMBRAL = 45.0 
    
    if porcentaje >= UMBRAL:
        print("✅ ¡MATCH CONFIRMADO! La IA dice que SON LA MISMA PERSONA.")
    else:
        print("❌ NO HAY MATCH. La IA dice que SON PERSONAS DIFERENTES.")