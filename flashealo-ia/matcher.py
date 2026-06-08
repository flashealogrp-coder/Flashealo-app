import numpy as np

def calcular_match_hibrido(nueva_deteccion, identidad_candidata):
    """
    nueva_deteccion: diccionario con {embedding, color_uniforme, confianza_cara}
    identidad_candidata: diccionario con {embedding_promedio, color_uniforme}
    """
    
    # 1. Similitud Facial (pgvector cosine)
    sim_facial = np.dot(nueva_deteccion['embedding'], identidad_candidata['embedding_promedio'])
    
    # 2. Similitud de Color (Dummy simple: 1 si es igual, 0 si no)
    sim_color = 1.0 if nueva_deteccion['color_uniforme'] == identidad_candidata['color_uniforme'] else 0.0
    
    # 3. PESOS DINÁMICOS
    # Si la confianza de la cara es > 0.8, le damos el 80% de peso a la cara.
    # Si la cara es borrosa (confianza < 0.5), bajamos el peso a 20% y subimos el color.
    peso_cara = 0.8 if nueva_deteccion['confianza_cara'] > 0.8 else 0.3
    peso_color = 1.0 - peso_cara
    
    # Puntaje Final Híbrido
    puntaje_final = (sim_facial * peso_cara) + (sim_color * peso_color)
    
    return puntaje_final

# --- PRUEBA DEL SISTEMA ---
# Imaginemos que el jugador tiene un embedding de cara borrosa (0.3 de confianza)
deteccion = {
    'embedding': np.random.rand(512), 
    'color_uniforme': 'azul', 
    'confianza_cara': 0.3 
}

identidad = {
    'embedding_promedio': np.random.rand(512), 
    'color_uniforme': 'azul'
}

score = calcular_match_hibrido(deteccion, identidad)
print(f"Puntaje final de match: {score:.2f}")

if score > 0.65:
    print("✅ ¡Match exitoso! Agregando a la identidad.")
else:
    print("❌ Es alguien diferente o la cara no coincide.")
    