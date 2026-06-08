import cv2
from insightface.app import FaceAnalysis

print("⏳ Arrancando el motor biométrico (InsightFace)...")
# Inicializamos el modelo de análisis facial (buffalo_l es el estándar de alta precisión)
app = FaceAnalysis(name='buffalo_l')
app.prepare(ctx_id=0, det_size=(640, 640)) # ctx_id=0 usa CPU por ahora para pruebas

# Vamos a leer el primer jugador recortado (asegúrate de que el archivo exista)
ruta_jugador = "jugadores_recortados/jugador_1.jpg"
img = cv2.imread(ruta_jugador)

if img is None:
    print(f"❌ No se encontró la imagen en {ruta_jugador}. Cambia el número si es necesario.")
else:
    print("🔍 Analizando rostro del jugador...")
    rostros = app.get(img)

    if len(rostros) == 0:
        print("⚠️ No se detectó ninguna cara clara en este recorte (quizás está de espaldas).")
    else:
        # Tomamos el primer rostro detectado en el recorte
        rostro = rostros[0]
        
        # Extraemos el vector matemático (Embedding)
        embedding = rostro.embedding
        
        print("✅ ¡Rostro detectado exitosamente!")
        print(f"📏 Tamaño de la huella digital: {len(embedding)} dimensiones.")
        print("🧬 Muestra de los primeros 5 números del vector:")
        print(embedding[:5])