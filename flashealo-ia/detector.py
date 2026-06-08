import cv2
from ultralytics import YOLO
import os

# 1. Cargar el modelo YOLOv8 (La "n" es de Nano, súper rápido para probar)
print("⏳ Cargando modelo YOLO...")
model = YOLO('yolov8n.pt') 

# 2. Preparar imagen y carpeta de salida
imagen_prueba = "partido.jpg" # <--- ¡PON UNA FOTO AQUÍ!
carpeta_salida = "jugadores_recortados"

if not os.path.exists(carpeta_salida):
    os.makedirs(carpeta_salida)

# Leer la imagen
img = cv2.imread(imagen_prueba)

# 3. Hacer la inferencia (Buscar personas)
print("🔍 Analizando fotografía...")
# classes=[0] le dice a la IA que ignore balones, sillas, etc. ¡Solo humanos!
resultados = model(img, classes=[0]) 

# 4. Procesar y recortar los resultados
for r in resultados:
    boxes = r.boxes
    print(f"✅ Se encontraron {len(boxes)} personas en la foto.")
    
    for i, box in enumerate(boxes):
        # Obtener las coordenadas del rectángulo (Bounding Box)
        x1, y1, x2, y2 = box.xyxy[0]
        x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
        
        # Recortar al jugador de la imagen original
        jugador_recortado = img[y1:y2, x1:x2]
        
        # Guardar el recorte
        ruta_guardado = f"{carpeta_salida}/jugador_{i+1}.jpg"
        cv2.imwrite(ruta_guardado, jugador_recortado)

print(f"🎉 ¡Proceso terminado! Revisa la carpeta '{carpeta_salida}'")