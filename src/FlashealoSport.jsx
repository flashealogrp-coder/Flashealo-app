import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowUpRight, Search, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// IMPORTAMOS EL NUEVO MÓDULO
import CameraBiometrica from './CameraBiometrica'; 

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

  // Estado que controla si el modal de la cámara se muestra o no
  const [modalCamaraAbierto, setModalCamaraAbierto] = useState(false);

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

  useEffect(() => {
    const fetchEventosSport = async () => {
      setCargandoEventos(true);
      const { data } = await supabase
        .from('eventos')
        .select('id,nombre,descripcion,logo_url,banner_url,es_gratis,precio_galeria,fecha_evento,estado,created_at,tipo_reconocimiento,slug,portada_url,configuracion_ui,precio_foto,moneda,requiere_pago_para_ver,ubicacion,url_slug,titulo_about,categoria,url_portada,tiene_clave')
        .eq('categoria', 'sport')
        .eq('tiene_clave', false)
        .order('fecha_evento', { ascending: false });

      if (data) setEventosSport(data);
      setCargandoEventos(false);
    };
    fetchEventosSport();
  }, []);

  const abrirEvento = (evento) => {
    const ruta = evento.url_slug ? `/g/${evento.url_slug}` : `/g/${evento.id}`;
    navigate(ruta);
    window.scrollTo(0, 0);
  };

// FUNCIÓN QUE RECIBE LAS 3 FOTOS DESDE EL MÓDULO DE LA CÁMARA
// FUNCIÓN QUE RECIBE LAS 3 FOTOS DESDE EL MÓDULO DE LA CÁMARA
  const manejarFotosCapturadas = async (fotosBiometricas) => {
    try {
      setModalCamaraAbierto(false); 
      
      const URL_API = `${import.meta.env.VITE_IA_PUBLICA || 'https://api.flashealo.do'}/vectorizar-selfie/`;      
      
      // 🚨 VOLVEMOS A TU CÓDIGO ORIGINAL (Enviando JSON con Base64)
      const response = await fetch(URL_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagen_base64: fotosBiometricas.frente }) 
      });

      if (!response.ok) {
         throw new Error("No pudimos procesar el rostro.");
      }

      const data = await response.json();
      
      // Viajamos a la nueva página llevando la selfie y el vector
      navigate('/mis-resultados', { 
        state: { 
          vector: data.vector, 
          selfieB64: fotosBiometricas.frente 
        } 
      });

    } catch (error) {
      console.error(error);
      alert("Error al analizar el rostro. Revisa tu conexión o iluminación.");
    }
  };

  const scrollAnim = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
  };

  const eventosFiltrados = eventosSport.filter(evento => 
    evento.nombre.toLowerCase().includes(busquedaEvento.toLowerCase())
  );

  return (
    <div style={{ paddingTop: isMobile ? 120 : 160, paddingBottom: 120, maxWidth: 1400, margin: '0 auto', paddingLeft: isMobile ? 24 : 48, paddingRight: isMobile ? 24 : 48 }}>
      
      <motion.div {...scrollAnim} style={{ marginBottom: isMobile ? 60 : 90, maxWidth: 900 }}>
        
        <h1 style={{ fontFamily: 'var(--fl-serif)', fontSize: 'clamp(40px, 7vw, 92px)', fontWeight: 300, lineHeight: 1.04, margin: '0 0 28px 0', letterSpacing: '-0.015em', color: '#181816' }}>
          Encuentra tus fotos de{' '}
          <span style={{ position: 'relative', display: 'inline-block', color: '#181816', fontStyle: 'italic', verticalAlign: 'bottom', minWidth: isMobile ? '180px' : '440px' }}>
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

        <p style={{ fontSize: isMobile ? 15 : 17, lineHeight: 1.7, color: '#5A5955', maxWidth: 560, margin: 0 }}>
          Sube una selfie o ingresa tu número de dorsal para encontrar automáticamente todas tus fotografías del evento en cuestión de segundos.
        </p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} style={{ marginTop: 40, maxWidth: 480 }}>
          
          <button onClick={() => setModalCamaraAbierto(true)} className="fl-boton" style={{ width: '100%', marginBottom: 16, minHeight: '3.5rem' }}>
            <Camera size={18} color="#F9F8F5" /> Búsqueda por selfie <ArrowUpRight size={14} />
          </button>

          <div style={{ position: 'relative' }}>
            <Search size={22} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: '#5A5955' }} />
            <input type="text" placeholder="Buscar evento, lugar o actividad..." value={busquedaEvento} onChange={e => setBusquedaEvento(e.target.value)}
              className="fl-campo" style={{ padding: '18px 20px 18px 56px', minHeight: '3.5rem' }}
            />
          </div>
        </motion.div>
      </motion.div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, borderBottom: '1px solid #E2DFD9', paddingBottom: 16 }}>
          <span style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500, color: '#181816' }}>Eventos recientes &amp; Activos</span>
          <span style={{ fontSize: 11, color: '#5A5955', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{eventosFiltrados.length} eventos</span>
        </div>

        {cargandoEventos ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '120px 0' }}><Loader2 size={36} className="animate-spin" style={{ color: '#5A5955' }} strokeWidth={1.5} /></div>
        ) : eventosFiltrados.length === 0 ? (
          <motion.div {...scrollAnim} style={{ border: '1px dashed #C8B69E', padding: '80px 20px', textAlign: 'center', borderRadius: 2 }}>
            <p style={{ color: '#5A5955', fontFamily: 'var(--fl-serif)', fontSize: 22, margin: 0 }}>{busquedaEvento ? 'No encontramos ningún evento con ese nombre.' : 'No hay eventos deportivos disponibles.'}</p>
          </motion.div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: isMobile ? '36px' : '56px 40px' }}>
            {eventosFiltrados.map((evento, i) => (
              <motion.div key={evento.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.5, delay: isMobile ? 0 : (i % 3) * 0.1 }} onClick={() => abrirEvento(evento)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div style={{ width: '100%', paddingBottom: '120%', position: 'relative', overflow: 'hidden', background: '#EFECE6', borderRadius: 2 }}>
                  <img src={evento.portada_url || 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=800&auto=format&fit=crop'} alt={evento.nombre} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 1.2s cubic-bezier(0.22,1,0.36,1)', filter: 'saturate(0.95)' }} onMouseEnter={e => !isMobile && (e.currentTarget.style.transform = 'scale(1.05)')} onMouseLeave={e => !isMobile && (e.currentTarget.style.transform = 'scale(1)')} />
                  <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8 }}><span style={{ background: 'rgba(24,24,22,0.78)', backdropFilter: 'blur(12px)', color: '#F9F8F5', fontSize: 10, padding: '6px 12px', borderRadius: 2, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}><Camera size={12} color="#C8B69E" /> Búsqueda por selfie</span></div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)', padding: '40px 24px 20px' }}>
                    <span style={{ color: '#C8B69E', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 500 }}>{evento.fecha_evento}</span>
                    <span style={{ color: '#F9F8F5', fontFamily: 'var(--fl-serif)', fontSize: 28, letterSpacing: '-0.01em', fontWeight: 400, lineHeight: 1.1 }}>{evento.nombre}</span>
                  </div>
                </div>
                <div style={{ paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2DFD9' }}>
                  <span style={{ fontSize: 10, color: '#181816', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}><Search size={13} color="#181816" /> Buscar mis fotografías</span>
                  <ArrowUpRight size={16} style={{ color: '#181816' }} strokeWidth={1.5} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* RENDERIZAMOS EL MÓDULO DE LA CÁMARA */}
      <AnimatePresence>
        <CameraBiometrica 
          isOpen={modalCamaraAbierto} 
          onClose={() => setModalCamaraAbierto(false)} 
          onComplete={manejarFotosCapturadas} 
        />
      </AnimatePresence>

    </div>
  );
};

export default FlashealoSport;