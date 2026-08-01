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
        .select('*')
        .eq('categoria', 'sport')
        .or('password_cliente.is.null,password_cliente.eq.""')
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
const manejarFotosCapturadas = async (fotosBiometricas) => {
    try {
      setModalCamaraAbierto(false); 
      // Opcional: Podrías poner un estado de "setCargandoVector(true)" para mostrar un loader
      
      const URL_API = "https://surrey-delivers-merchandise-whereas.trycloudflare.com/vectorizar-selfie/";
      
      const response = await fetch(URL_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagen_base64: fotosBiometricas.frente }) 
      });

      if (!response.ok) throw new Error("No pudimos procesar el rostro.");

      const data = await response.json();
      
      // Viajamos a la nueva página llevando la selfie original y el vector matemático
      navigate('/mis-resultados', { 
        state: { 
          vector: data.vector, 
          selfieB64: fotosBiometricas.frente 
        } 
      });

    } catch (error) {
      console.error(error);
      alert("Error al analizar el rostro. Intenta de nuevo con mejor iluminación.");
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
        
        <h1 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 'clamp(32px, 5vw, 64px)', fontWeight: 900, lineHeight: 1.15, margin: '0 0 24px 0', letterSpacing: '-0.02em', color: '#111111' }}>
          Encuentra tus fotos de{' '}
          <span style={{ position: 'relative', display: 'inline-block', color: '#E11D48', verticalAlign: 'bottom', minWidth: isMobile ? '180px' : '340px' }}>
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} style={{ marginTop: 40, maxWidth: 480 }}>
          
          <button onClick={() => setModalCamaraAbierto(true)} style={{ 
            width: '100%', background: '#111111', color: '#FFFFFF', padding: '18px 24px', borderRadius: 12, border: 'none',
            fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)', marginBottom: 16, transition: 'transform 0.2s ease'
          }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <Camera size={22} color="#FFFFFF" /> Búsqueda por Selfie
          </button>

          <div style={{ position: 'relative' }}>
            <Search size={22} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
            <input type="text" placeholder="Buscar evento, lugar o actividad..." value={busquedaEvento} onChange={e => setBusquedaEvento(e.target.value)}
              style={{ width: '100%', padding: '18px 20px 18px 56px', borderRadius: 12, border: '1px solid #E4E4E7', fontSize: 16, outline: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', boxSizing: 'border-box', fontFamily: 'inherit', color: '#111' }} 
            />
          </div>
        </motion.div>
      </motion.div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: 16 }}>
          <span style={{ fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 800, color: '#09090B' }}>Eventos Recientes &amp; Activos</span>
          <span style={{ fontSize: 11, opacity: 0.5, fontWeight: 600 }}>{eventosFiltrados.length} Eventos</span>
        </div>

        {cargandoEventos ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '120px 0' }}><Loader2 size={36} className="animate-spin" style={{ color: '#E11D48' }} strokeWidth={1.5} /></div>
        ) : eventosFiltrados.length === 0 ? (
          <motion.div {...scrollAnim} style={{ border: '1px dashed rgba(0,0,0,0.2)', padding: '80px 20px', textAlign: 'center', borderRadius: 8 }}>
            <p style={{ color: '#09090B', opacity: 0.6, fontStyle: 'italic', margin: 0 }}>{busquedaEvento ? 'No encontramos ningún evento con ese nombre.' : 'No hay eventos deportivos disponibles.'}</p>
          </motion.div>
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