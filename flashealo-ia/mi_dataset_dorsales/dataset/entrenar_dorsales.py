from ultralytics import YOLO
import os

def entrenar_modelo():
    print("🚀 Iniciando el entrenamiento del modelo de Dorsales...")
    
    # 1. Cargar el modelo base pre-entrenado (YOLOv8 Nano - rápido y ligero)
    model = YOLO('yolov8n.pt')
    
    # 2. Ruta a tu archivo de configuración (Asegúrate de que el nombre sea correcto)
    ruta_yaml = "data.yaml" # Si está en una subcarpeta, pon la ruta completa ej: "dataset/data.yaml"
    
    if not os.path.exists(ruta_yaml):
        print(f"❌ ¡Error! No se encuentra el archivo {ruta_yaml}.")
        return

    # 3. Configuración del entrenamiento
    # imgsz=800: Mayor resolución ayuda a detectar dorsales pequeños de lejos.
    # epochs=50: 50 pasadas por el dataset completo. Puedes subirlo a 100 si tienes una buena GPU.
    # batch=8: Cantidad de fotos que procesa a la vez. Bájalo a 4 si te da error de memoria en la tarjeta gráfica.
    resultados = model.train(
        data=ruta_yaml,
        epochs=50,
        imgsz=800,
        batch=8,
        name='modelo_dorsales', # Así se llamará la carpeta de resultados
        patience=15 # Si el modelo deja de aprender durante 15 epochs seguidas, se detiene solo para no perder tiempo
    )
    
    print("\n🏁 ¡Entrenamiento completado!")
    print("👉 Tu nuevo 'cerebro' está guardado en: runs/detect/modelo_dorsales/weights/best.pt")

if __name__ == '__main__':
    # Esto es necesario en Windows para evitar errores con los procesos paralelos
    import multiprocessing
    from multiprocessing import freeze_support
    freeze_support()
    
    entrenar_modelo()