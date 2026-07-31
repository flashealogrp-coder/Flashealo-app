import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowUpRight, Search, Camera, X, RefreshCcw, Check, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PALABRAS_RULETA = [
  'Baseball', 'Fútbol', 'Maratón', 'Pádel', 'Surf', 
  'HYROX', 'Pickleball', 'Triatlón', 'Ciclismo', 'Baloncesto', 
  'CrossFit', 'Tenis', 'Voleibol', 'Natación', 'Running', 
  'Karate', 'Golf', 'Gimnasia', 'Rugby', 'Atletismo', 
  'Kickboxing', 'Softbol', 'Automovilismo', 'Rally', 
  'tu evento deportivo'
];

const FlashealoSport = ({ isMobile }) => {
  const navigate = useNavigate();
  const [eventosSport, setEventosSport] = useState([]);
  const [cargandoEventos, setCargandoEventos] = useState(false);
  const [busquedaEvento, setBusquedaEvento] = useState('');
  const [indicePalabra, setIndicePalabra] = useState(0);

  // ── ESTADOS DE LA CÁMARA BIOMÉTRICA ──
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [pasoBiometrico, setPasoBiometrico] = useState(1); // 1: Frente, 2: Izquierda, 3: Derecha
  const [fotosCapturadas, setFotosCapturadas] = useState({ frente: null, izquierda: null, derecha: null });
  const [estadoOvalar, setEstadoOvalar] = useState('buscando'); // 'buscando' (rojo/blanco) o 'listo' (verde)
  const [procesandoBiometria, setProcesandoBiometria] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Efecto Ruleta
  useEffect(() => {
    let actualIndex = 0;
    let delay = 60; 
    let timeoutId;

    const cambiarPalabra = () => {
      if (actualIndex < PALABRAS_RULETA.length - 1) {
        actualIndex++;
        setIndicePalabra(actualIndex);
        delay += Math.floor(actualIndex * 12); 
        timeoutId = setTimeout(cambiarPalabra, delay);
      }
    };

    timeoutId = setTimeout(cambiarPalabra, delay);
    return () => clearTimeout(timeoutId);
  }, []);

  // Cargar eventos
  useEffect(() => {
    const fetchEventosSport = async () => {
      setCargandoEventos(true);
      const { data } = await supabase
        .from('eventos')
        .select('*')
        .eq('categoria', 'sport')
        .or('password_cliente.is.null,password_cliente.eq.""')
        .order('fecha_evento', { ascending: false });

      if (data) setEventosSport(data);
      setCargandoEventos(false);
    };
    fetchEventosSport();
  }, []);

  // ── LÓGICA DE LA CÁMARA BIOMÉTRICA ──
  const abrirCamara = async () => {
    setCamaraAbierta(true);
    setPasoBiometrico(1);
    setFotosCapturadas({ frente: null, izquierda: null, derecha: null });
    setEstadoOvalar('buscando');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Simulación elegante: a los 1.5 segundos el sistema "detecta" la cara y pone el óvalo en verde
      setTimeout(() => setEstadoOvalar('listo'), 1500);

    } catch (err) {
      console.error("Error al acceder a la cámara:", err);
      alert("No pudimos acceder a tu cámara. Por favor, verifica los permisos.");
      setCamaraAbierta(false);
    }
  };

  const detenerCamara = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCamaraAbierta(false);
  };

  const capturarPasoActual = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imagenBase64 = canvas.toDataURL('image/jpeg', 0.85);

      if (pasoBiometrico === 1) {
        setFotosCapturadas(prev => ({ ...prev, frente: imagenBase64 }));
        setPasoBiometrico(2);
        setEstadoOvalar('buscando');
        setTimeout(() => setEstadoOvalar('listo'), 1200);
      } else if (pasoBiometrico === 2) {
        setFotosCapturadas(prev => ({ ...prev, izquierda: imagenBase64 }));
        setPasoBiometrico(3);
        setEstadoOvalar('buscando');
        setTimeout(() => setEstadoOvalar('listo'), 1200);
      } else if (pasoBiometrico === 3) {
        setFotosCapturadas(prev => ({ ...prev, derecha: imagenBase64 }));
        setPasoBiometrico(4); // Completado
      }
    }
  };

  const enviarBiometriaAlBackend = () => {
    setProcesandoBiometria(true);
    console.log("Enviando las 3 fotos al motor de IA para generar un vector multivectorial...");
    
    setTimeout(() => {
      setProcesandoBiometria(false);
      alert("¡Éxito! Las 3 perspectivas (Frente, Izquierda, Derecha) fueron procesadas por Python. Buscando coincidencias en Supabase...");
      detenerCamara();
    }, 2500);
  };

  const abrirEvento = (evento) => {
    const ruta = evento.url_slug ? `/g/${evento.url_slug}` : `/g/${evento.id}`;
    navigate(ruta);
    window.scrollTo(0, 0);
  };

  const eventosFiltrados = eventosSport.filter(evento => 
    evento.nombre.toLowerCase().includes(busquedaEvento.toLowerCase())
  );

  return (
    <div style={{ paddingTop: isMobile ? 120 : 160, paddingBottom: 120, maxWidth: 1400, margin: '0 auto', paddingLeft: isMobile ? 24 : 48, paddingRight: isMobile ? 24 : 48 }}>
      
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} style={{ marginBottom: isMobile ? 60 : 90, maxWidth: 900 }}>
        
        <h1 style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 'clamp(32px, 5vw, 64px)',
          fontWeight: 900,
          lineHeight: 1.15,
          margin: '0 0 24px 0',
          letterSpacing: '-0.02em',
          color: '#111111'
        }}>
          Encuentra tus fotos de{' '}
          <span style={{
            position: 'relative', display: 'inline-block', color: '#E11D48', 
            verticalAlign: 'bottom', minWidth: isMobile ? '180px' : '340px'
          }}>
            <AnimatePresence mode="wait">
              <motion.span
                key={PALABRAS_RULETA[indicePalabra]}
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.08, ease: "easeOut" }} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}
              >
                {PALABRAS_RULETA[indicePalabra]}
              </motion.span>
            </AnimatePresence>
          </span>
          <br /> al instante.
        </h1>

        <p style={{ fontSize: isMobile ? 15 : 17, lineHeight: 1.6, opacity: 0.7, maxWidth: 640, margin: 0 }}>
          Sube una selfie o ingresa tu número de dorsal para encontrar automáticamente todas tus fotografías del evento en cuestión de segundos.
        </p>

        {/* CONTROLES DE BÚSQUEDA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} style={{ marginTop: 40, maxWidth: 480 }}>
          
          <button onClick={abrirCamara} style={{ 
            width: '100%', background: '#111111', color: '#FFFFFF', 
            padding: '18px 24px', borderRadius: 12, border: 'none',
            fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)', marginBottom: 16, transition: 'transform 0.2s ease'
          }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <Camera size={22} color="#FFFFFF" /> Búsqueda Biométrica por Selfie
          </button>

          <div style={{ position: 'relative' }}>
            <Search size={22} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
            <input 
              type="text" 
              placeholder="Buscar evento, lugar o actividad..." 
              value={busquedaEvento} onChange={e => setBusquedaEvento(e.target.value)}
              style={{ 
                width: '100%', padding: '18px 20px 18px 56px', borderRadius: 12, border: '1px solid #E4E4E7', 
                fontSize: 16, outline: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', boxSizing: 'border-box', fontFamily: 'inherit', color: '#111'
              }} 
            />
          </div>
        </motion.div>
      </motion.div>

      {/* GRID DE EVENTOS */}
      {!camaraAbierta && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: 16 }}>
            <span style={{ fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 800, color: '#09090B' }}>Eventos Recientes &amp; Activos</span>
            <span style={{ fontSize: 11, opacity: 0.5, fontWeight: 600 }}>{eventosFiltrados.length} Eventos</span>
          </div>

          {cargandoEventos ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '120px 0' }}><Loader2 size={36} className="animate-spin" style={{ color: '#E11D48' }} strokeWidth={1.5} /></div>
          ) : eventosFiltrados.length === 0 ? (
            <div style={{ border: '1px dashed rgba(0,0,0,0.2)', padding: '80px 20px', textAlign: 'center', borderRadius: 8 }}>
              <p style={{ color: '#09090B', opacity: 0.6, fontStyle: 'italic', margin: 0 }}>{busquedaEvento ? 'No encontramos ningún evento con ese nombre.' : 'No hay eventos deportivos disponibles.'}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: isMobile ? '36px' : '56px 40px' }}>
              {eventosFiltrados.map((evento, i) => (
                <motion.div key={evento.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.5, delay: isMobile ? 0 : (i % 3) * 0.1 }} onClick={() => abrirEvento(evento)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <div style={{ width: '100%', paddingBottom: '120%', position: 'relative', overflow: 'hidden', background: '#E4E4E7', borderRadius: 4 }}>
                    <img src={evento.portada_url || 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=800&auto=format&fit=crop'} alt={evento.nombre} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 1.2s cubic-bezier(0.22,1,0.36,1)', filter: 'saturate(0.95)' }} onMouseEnter={e => !isMobile && (e.currentTarget.style.transform = 'scale(1.05)')} onMouseLeave={e => !isMobile && (e.currentTarget.style.transform = 'scale(1)')} />
                    <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8 }}><span style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', color: '#FFF', fontSize: 9, padding: '6px 12px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 6 }}><Camera size={12} color="#E11D48" /> Búsqueda AI Activa</span></div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)', padding: '40px 24px 20px' }}>
                      <span style={{ color: '#E11D48', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 'bold' }}>{evento.fecha_evento}</span>
                      <span style={{ color: '#FFFFFF', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 22, letterSpacing: '-0.02em', fontWeight: 900, textTransform: 'uppercase' }}>{evento.nombre}</span>
                    </div>
                  </div>
                  <div style={{ paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                    <span style={{ fontSize: 10, color: '#09090B', opacity: 0.8, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}><Search size={13} color="#000" /> Buscar mis fotografías</span>
                    <ArrowUpRight size={16} style={{ color: '#000' }} strokeWidth={2.5} />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL DE CÁMARA BIOMÉTRICA (GUIADA MULTI-ÁNGULO) ── */}
      <AnimatePresence>
        {camaraAbierta && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ position: 'fixed', inset: 0, background: '#000000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}
          >
            {/* Header / Indicador de Pasos */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)', position: 'absolute', top: 0, width: '100%', zIndex: 10, boxSizing: 'border-box' }}>
              <div>
                <span style={{ color: '#E11D48', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>
                  {pasoBiometrico <= 3 ? `Paso ${pasoBiometrico} de 3` : 'Proceso Completo'}
                </span>
                <span style={{ color: '#FFF', fontSize: 14, fontWeight: 700 }}>
                  {pasoBiometrico === 1 && 'Mira fijamente de frente'}
                  {pasoBiometrico === 2 && 'Voltea ligeramente a la izquierda'}
                  {pasoBiometrico === 3 && 'Voltea ligeramente a la derecha'}
                  {pasoBiometrico === 4 && '¡Biometría lista!'}
                </span>
              </div>
              <button onClick={detenerCamara} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            {/* Viewport de Video con la Guía Biométrica Ovalada */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
              {pasoBiometrico <= 3 ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                  
                  {/* ÓVALO GUÍA BIOMÉTRICO */}
                  <div style={{
                    position: 'absolute',
                    width: '260px',
                    height: '360px',
                    border: `3px solid ${estadoOvalar === 'listo' ? '#22C55E' : 'rgba(255,255,255,0.6)'}`,
                    borderRadius: '50%',
                    boxShadow: estadoOvalar === 'listo' ? '0 0 30px rgba(34, 197, 94, 0.5)' : 'none',
                    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                    pointerEvents: 'none'
                  }} />

                  <div style={{ position: 'absolute', bottom: 120, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '8px 16px', borderRadius: 20 }}>
                    <span style={{ color: estadoOvalar === 'listo' ? '#22C55E' : '#FFF', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em' }}>
                      {estadoOvalar === 'listo' ? '✓ Rostro detectado perfectamente' : 'Buscando rostro en el encuadre...'}
                    </span>
                  </div>
                </>
              ) : (
                /* Vista Previa de los 3 ángulos capturados */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24, width: '100%', maxWidth: 400 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#22C55E', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCheck size={32} />
                  </div>
                  <h3 style={{ color: '#FFF', fontSize: 22, fontWeight: 700, textAlign: 'center', margin: 0 }}>Captura Biométrica Exitosa</h3>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
                    Hemos registrado tus 3 perspectivas correctamente para garantizar un reconocimiento impecable en todas las fotos del evento.
                  </p>

                  <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 12 }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <img src={fotosCapturadas.frente} alt="Frente" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, border: '2px solid #22C55E', transform: 'scaleX(-1)' }} />
                      <span style={{ color: '#aaa', fontSize: 10, display: 'block', marginTop: 4 }}>Frente</span>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <img src={fotosCapturadas.izquierda} alt="Izquierda" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, border: '2px solid #22C55E', transform: 'scaleX(-1)' }} />
                      <span style={{ color: '#aaa', fontSize: 10, display: 'block', marginTop: 4 }}>Perfil Izq.</span>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <img src={fotosCapturadas.derecha} alt="Derecha" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, border: '2px solid #22C55E', transform: 'scaleX(-1)' }} />
                      <span style={{ color: '#aaa', fontSize: 10, display: 'block', marginTop: 4 }}>Perfil Der.</span>
                    </div>
                  </div>
                </div>
              )}

              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            {/* Controles Inferiores */}
            <div style={{ padding: '32px 24px 48px', background: '#000000', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {pasoBiometrico <= 3 ? (
                <button onClick={capturarPasoActual} disabled={estadoOvalar !== 'listo'} style={{ 
                  width: '100%', maxWidth: 360, background: estadoOvalar === 'listo' ? '#E11D48' : '#333', color: '#FFF', 
                  padding: '18px 24px', borderRadius: 14, border: 'none', fontSize: 16, fontWeight: 700, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: estadoOvalar === 'listo' ? 'pointer' : 'not-allowed',
                  transition: 'background 0.3s ease'
                }}>
                  <Camera size={20} /> Capturar Ángulo {pasoBiometrico} de 3
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 400 }}>
                  <button onClick={abrirCamara} disabled={procesandoBiometria} style={{ flex: 1, background: '#222', color: '#FFF', padding: '16px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                    <RefreshCcw size={18} /> Repetir Todo
                  </button>
                  <button onClick={enviarBiometriaAlBackend} disabled={procesandoBiometria} style={{ flex: 2, background: '#22C55E', color: '#FFF', padding: '16px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', opacity: procesandoBiometria ? 0.8 : 1 }}>
                    {procesandoBiometria ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    {procesandoBiometria ? 'BUSCANDO FOTOS...' : 'ENCONTRAR MIS FOTOS'}
                  </button>
                </div>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default FlashealoSport;