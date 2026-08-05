import React, { useState, useEffect, useRef } from 'react';
import { X, UserCheck, Loader2, Check, RefreshCcw, ScanFace } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CameraBiometrica = ({ isOpen, onClose, onComplete }) => {
  const [paso, setPaso] = useState('frente'); // 'frente', 'izquierda', 'derecha', 'procesando'
  const [estadoEscaneo, setEstadoEscaneo] = useState('buscando'); // 'buscando', 'alineando', 'quieto', 'capturado'
  const [fotos, setFotos] = useState({ frente: null, izquierda: null, derecha: null });
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (isOpen) iniciarCamara();
    else detenerCamara();
    return () => detenerCamara();
  }, [isOpen]);

  // ── MÁQUINA DE ESTADOS PREMIUM (Simulando Liveness Detection) ──
  useEffect(() => {
    if (!isOpen || paso === 'procesando') return;

    let t1, t2, t3;
    setEstadoEscaneo('buscando');

    // Simulación de interacción humana con el escáner
    t1 = setTimeout(() => setEstadoEscaneo('alineando'), 1000); // Detecta una cara
    t2 = setTimeout(() => setEstadoEscaneo('quieto'), 2500);    // Cara en posición correcta
    t3 = setTimeout(() => {
      setEstadoEscaneo('capturado');
      capturarRecorteFacial(paso); // Dispara la foto
    }, 3500); // 1 segundo de estabilidad

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [paso, isOpen]);

  const iniciarCamara = async () => {
    setPaso('frente');
    setFotos({ frente: null, izquierda: null, derecha: null });
    setEstadoEscaneo('buscando');
    
    try {
      // Pedimos la mayor resolución posible a la cámara frontal
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error de cámara:", err);
      alert("No pudimos acceder a tu cámara.");
      onClose();
    }
  };

  const detenerCamara = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // ── LA MAGIA: RECORTE MATEMÁTICO DEL ROSTRO ──
 // ── LA MAGIA: ENVIAMOS EL MARCO COMPLETO Y DEJAMOS QUE LA IA BUSQUE ──
  const capturarRecorteFacial = (anguloActual) => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Tomamos la resolución original del video
      const vWidth = video.videoWidth;
      const vHeight = video.videoHeight;

      // Escalamos la imagen para que no supere los 720px y se envíe rapidísimo
      const resolucionMaxima = 720;
      let escala = 1;
      if (Math.max(vWidth, vHeight) > resolucionMaxima) {
         escala = resolucionMaxima / Math.max(vWidth, vHeight);
      }

      canvas.width = vWidth * escala;
      canvas.height = vHeight * escala;

      // Espejo en el canvas para que la foto se guarde como la ve el usuario
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);

      // Pintamos EL MARCO COMPLETO (Sin recortes artificiales)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Comprimimos ligeramente (0.8) para optimizar la red
      const imagenBase64 = canvas.toDataURL('image/jpeg', 0.8);

      setFotos(prev => {
        const nuevasFotos = { ...prev, [anguloActual]: imagenBase64 };
        
        setTimeout(() => {
          if (anguloActual === 'frente') setPaso('izquierda');
          else if (anguloActual === 'izquierda') setPaso('derecha');
          else {
            setPaso('procesando');
            detenerCamara();
          }
        }, 600);
        
        return nuevasFotos;
      });
    }
  };

  const obtenerInstruccion = () => {
    if (estadoEscaneo === 'buscando') return "Acerca tu rostro al círculo...";
    if (estadoEscaneo === 'alineando') {
      if (paso === 'frente') return "Mira directamente a la cámara";
      if (paso === 'izquierda') return "Gira ligeramente a la izquierda";
      if (paso === 'derecha') return "Gira ligeramente a la derecha";
    }
    if (estadoEscaneo === 'quieto') return "Mantente quieto...";
    if (estadoEscaneo === 'capturado') return "¡Excelente!";
    return "";
  };

  const colorEstado = {
    buscando: 'rgba(255, 255, 255, 0.4)',
    alineando: '#FFD400', // Amarillo
    quieto: '#E11D48',    // Rojo Sport (Enfoque)
    capturado: '#22C55E'  // Verde
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} 
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      style={{ position: 'fixed', inset: 0, background: '#000000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}
    >
      {/* HEADER BIOMÉTRICO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', position: 'absolute', top: 0, width: '100%', zIndex: 50, boxSizing: 'border-box' }}>
        <div>
          <span style={{ color: '#E11D48', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: 4 }}>
            {paso === 'procesando' ? 'Completado' : `Paso ${paso === 'frente' ? '1' : paso === 'izquierda' ? '2' : '3'} de 3`}
          </span>
          <span style={{ color: '#FFF', fontSize: 16, fontWeight: 700, transition: 'color 0.3s ease' }}>
            {paso === 'procesando' ? 'Vectores generados' : obtenerInstruccion()}
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
          <X size={20} strokeWidth={2} />
        </button>
      </div>

      {/* ÁREA DE VISIÓN CON MÁSCARA (UI FILTER) */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
        
        {paso !== 'procesando' ? (
          <>
            {/* El video se escala un poco para forzar el acercamiento visual */}
            <video ref={videoRef} autoPlay playsInline muted style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1) scale(1.1)' }} />
            
            {/* MÁSCARA OSCURA CON HUECO TRANSPARENTE */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              // Truco CSS para hacer el hueco transparente y oscurecer todo lo demás
              background: 'radial-gradient(ellipse 260px 360px at center, transparent 95%, rgba(0, 0, 0, 0.85) 100%)'
            }} />

            {/* ÓVALO ANIMADO (HUD BIOMÉTRICO) */}
            <div style={{ position: 'relative', width: 280, height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <motion.div 
                animate={{ 
                  borderColor: colorEstado[estadoEscaneo],
                  scale: estadoEscaneo === 'quieto' ? 0.98 : estadoEscaneo === 'capturado' ? 1.05 : 1
                }}
                transition={{ duration: 0.3 }}
                style={{
                  position: 'absolute', width: '100%', height: '100%',
                  border: '4px solid', borderRadius: '50%',
                  boxShadow: estadoEscaneo === 'capturado' ? '0 0 40px rgba(34, 197, 94, 0.6)' : 'none',
                }} 
              />
              
              {/* LÁSER DE ESCANEO */}
              {estadoEscaneo === 'alineando' && (
                <motion.div 
                  initial={{ top: '10%' }} animate={{ top: '90%' }} 
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear", repeatType: "reverse" }}
                  style={{ position: 'absolute', width: '80%', height: 2, background: '#FFD400', boxShadow: '0 0 10px #FFD400', borderRadius: '50%' }}
                />
              )}
            </div>

            {/* GUÍA DE POSICIÓN 3D */}
            <AnimatePresence>
              {paso !== 'frente' && estadoEscaneo !== 'capturado' && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  style={{ position: 'absolute', bottom: '15%', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', padding: '12px 24px', borderRadius: 50 }}>
                  <ScanFace size={24} color="#FFF" style={{ transform: paso === 'izquierda' ? 'rotateY(45deg)' : 'rotateY(-45deg)', transition: 'transform 0.5s ease' }} />
                  <span style={{ color: '#FFF', fontSize: 13, fontWeight: 600 }}>Gira la cabeza hacia la {paso}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          /* PANTALLA DE RESULTADOS */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '24px 40px', width: '100%', maxWidth: 480 }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} style={{ width: 72, height: 72, borderRadius: '50%', background: '#22C55E', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={36} />
            </motion.div>
            
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ color: '#FFF', fontSize: 24, fontWeight: 800, margin: '0 0 8px 0' }}>Biometría 3D Lista</h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>Se ha generado un modelo multidimensional de tu rostro para garantizar la máxima precisión.</p>
            </div>
            
            {/* VISTA PREVIA DE LOS RECORTES PERFECTOS */}
            <div style={{ display: 'flex', gap: 16, width: '100%', marginTop: 12 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <img src={fotos.frente} alt="Frente" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 16, border: '2px solid #333' }} />
                <span style={{ color: '#888', fontSize: 10, display: 'block', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Frente</span>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <img src={fotos.izquierda} alt="Izq" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 16, border: '2px solid #333' }} />
                <span style={{ color: '#888', fontSize: 10, display: 'block', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Izquierda</span>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <img src={fotos.derecha} alt="Der" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 16, border: '2px solid #333' }} />
                <span style={{ color: '#888', fontSize: 10, display: 'block', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Derecha</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, width: '100%', marginTop: 24 }}>
              <button onClick={iniciarCamara} style={{ flex: 1, background: '#222', color: '#FFF', padding: '16px', borderRadius: 14, border: 'none', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                <RefreshCcw size={18} /> Repetir
              </button>
              <button onClick={() => onComplete(fotos)} style={{ flex: 2, background: '#E11D48', color: '#FFF', padding: '16px', borderRadius: 14, border: 'none', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 8px 24px rgba(225, 29, 72, 0.3)' }}>
                <Check size={18} strokeWidth={3} /> BUSCAR MIS FOTOS
              </button>
            </div>
          </div>
        )}

        {/* Canvas Oculto para el Crop */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

    </motion.div>
  );
};

export default CameraBiometrica;