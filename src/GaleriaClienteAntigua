import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { X, ChevronLeft, ChevronRight, Loader2, AlertCircle, Lock, ChevronDown, Mail, Columns, LayoutGrid, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── DESIGN TOKENS ─────────────────────────────────────────────────────────── */
const SAND   = '#C8B99A';
const TAUPE  = '#9A8F82';
const INK    = '#1C1C1C';
const CREAM  = '#FDFCF8';
const WHITE  = '#FFFFFF';

const GaleriaCliente = () => {
  const { slug } = useParams(); 
  const navigate = useNavigate();

  const [evento, setEvento] = useState(null);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorInicial, setErrorInicial] = useState(null);
  
  // Autenticación con Memoria de Sesión
  const [autenticado, setAutenticado] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  const [vistaActual, setVistaActual] = useState('evento'); 
  const [modoVista, setModoVista] = useState('editorial'); // 'editorial' (Mosaico), 'pinterest' (Columnas), 'large'
  const [searchQuery, setSearchQuery] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorBuscador, setErrorBuscador] = useState('');
  
  const [fotosReales, setFotosReales] = useState([]);
  const [fotosGenerales, setFotosGenerales] = useState([]);
  const [mostrarCantidadGenerales, setMostrarCantidadGenerales] = useState(12);
  
  const [identidadSeleccionada, setIdentidadSeleccionada] = useState(null);
  const [identidadesEvento, setIdentidadesEvento] = useState([]);
  
  // Mapa de IA: Conecta fotos con los rostros que aparecen en ellas
  const [mapaDetecciones, setMapaDetecciones] = useState({});
  
  const [lightboxData, setLightboxData] = useState({ fotos: [], index: null });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchEventoPorSlug = async () => {
      setCargandoInicial(true);
      const esUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      let query = supabase.from('eventos').select('*');
      query = esUUID ? query.eq('id', slug) : query.eq('url_slug', slug);

      const { data, error } = await query.single();
      if (error || !data) {
        setErrorInicial('No pudimos encontrar esta colección. Verifica el enlace.');
      } else {
        setEvento(data);
        
        // Memoria de Sesión para no pedir la clave 2 veces
        const authMemory = sessionStorage.getItem(`auth_${data.id}`);
        if (!data.password_cliente || authMemory === 'true') {
          setAutenticado(true);
        }

        if (data.tipo_reconocimiento !== 'ocr') cargarAvatares(data.id);
        
        const { data: allPhotos } = await supabase.from('fotografias').select('url_watermark, url_original').eq('evento_id', data.id);
        if (allPhotos) {
          const arrGenerales = allPhotos.map((f, idx) => {
            const path = (f.url_watermark || f.url_original).trim();
            const { data: u } = supabase.storage.from('fotos').getPublicUrl(path);
            return { id: idx, src: u.publicUrl + '?v=1', path: path }; // Guardamos el path para el mapa
          });
          setFotosGenerales(arrGenerales);
        }
      }
      setCargandoInicial(false);
    };
    if (slug) fetchEventoPorSlug();
  }, [slug]);

  const cargarAvatares = async (eventoId) => {
    setCargando(true);
    const { data: identitiesData } = await supabase.from('identities').select('*').eq('evento_id', eventoId);
    const { data: detectionsData } = await supabase.from('face_detections').select('identity_id, photo_url').eq('evento_id', eventoId);
    
    if (identitiesData) {
      const conteos = {};
      if (detectionsData) detectionsData.forEach(det => { const k = String(det.identity_id); conteos[k] = (conteos[k] || 0) + 1; });
      
      const identidadesConUrl = identitiesData.map(id => {
        const pathLimpio = id.avatar_url ? id.avatar_url.trim() : '';
        const { data: urlData } = supabase.storage.from('fotos').getPublicUrl(pathLimpio);
        return { ...id, publicAvatarUrl: urlData.publicUrl, totalFotos: conteos[String(id.id)] || 0 };
      }).sort((a, b) => b.totalFotos - a.totalFotos);
      
      setIdentidadesEvento(identidadesConUrl);

      // Creamos el Mapa de Rostros para el Lightbox
      const newMap = {};
      if (detectionsData) {
        detectionsData.forEach(det => {
          const cleanPath = det.photo_url ? det.photo_url.trim() : '';
          if (!cleanPath) return;
          if (!newMap[cleanPath]) newMap[cleanPath] = [];
          const idObj = identidadesConUrl.find(i => i.id === det.identity_id);
          if (idObj && !newMap[cleanPath].some(i => i.id === idObj.id)) {
             newMap[cleanPath].push(idObj);
          }
        });
      }
      setMapaDetecciones(newMap);
    }
    setCargando(false);
  };

  const ejecutarBusquedaYMostrarGaleria = async (tipoBusqueda, valor) => {
    setCargando(true); setErrorBuscador('');
    try {
      let fotosEncontradas = [];
      if (tipoBusqueda === 'dorsal') {
        const { data, error } = await supabase.from('etiquetas_fotos').select('fotografias!inner(id, url_watermark, url_original)').eq('dorsal', valor).eq('fotografias.evento_id', evento.id);
        if (error) throw error;
        if (data) fotosEncontradas = data.map(item => ({ ...item.fotografias }));
      } else if (tipoBusqueda === 'identity_id') {
        const { data, error } = await supabase.from('face_detections').select('photo_url').eq('identity_id', valor).eq('evento_id', evento.id);
        if (error) throw error;
        if (data) fotosEncontradas = data.map(item => ({ id: Math.random(), url_watermark: item.photo_url }));
      }

      if (fotosEncontradas.length === 0) {
        setErrorBuscador('No encontramos fotografías para esta búsqueda.');
      } else {
        const fotosFormateadas = fotosEncontradas.map((foto, index) => {
          const pathLimpio = (foto.url_watermark || foto.photo_url).trim();
          const { data } = supabase.storage.from('fotos').getPublicUrl(pathLimpio);
          return { id: foto.id || index, src: data.publicUrl + '?v=1', path: pathLimpio };
        });
        setFotosReales(fotosFormateadas);
        setVistaActual('galeria');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setErrorBuscador('Ocurrió un error al procesar la solicitud.');
    } finally {
      setCargando(false);
    }
  };

  const handleSearchOCR = async (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query || !evento) return;
    ejecutarBusquedaYMostrarGaleria('dorsal', query);
  };

  const seleccionarIdentidad = (identidad) => {
    setSearchQuery(identidad.display_name);
    setIdentidadSeleccionada(identidad);
    ejecutarBusquedaYMostrarGaleria('identity_id', identidad.id);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === evento.password_cliente) {
      setAutenticado(true);
      sessionStorage.setItem(`auth_${evento.id}`, 'true'); // Memoria activada
    } else {
      setErrorBuscador("Contraseña incorrecta");
    }
  };

  const openLightbox = (fotosArray, i) => setLightboxData({ fotos: fotosArray, index: i });
  const closeLightbox = () => setLightboxData({ fotos: [], index: null });
  const prevImage = (e) => { e.stopPropagation(); setLightboxData(p => ({ ...p, index: p.index === 0 ? p.fotos.length - 1 : p.index - 1 })); };
  const nextImage = (e) => { e.stopPropagation(); setLightboxData(p => ({ ...p, index: p.index === p.fotos.length - 1 ? 0 : p.index + 1 })); };

  // ─── COMPONENTE FOTO INTELIGENTE (TETRIS EDITORIAL O COLUMNAS PURAS) ───
  const RenderizarFoto = ({ foto, index, arrayOrigen }) => {
    // Modo 1: Editorial Mosaico (Cortes hermosos sin sobreponerse)
    const editorialPatterns = [
      "col-span-2 row-span-2", // 0: Cuadrado Gigante
      "col-span-1 row-span-1", // 1: Cuadrado Pequeño
      "col-span-1 row-span-2", // 2: Vertical Alto
      "col-span-2 row-span-1", // 3: Horizontal Ancho
      "col-span-1 row-span-1", // 4: Cuadrado Pequeño
      "col-span-1 row-span-1", // 5: Cuadrado Pequeño
    ];

    let containerClass = "relative group cursor-pointer transition-all duration-500 ease-out overflow-hidden z-0 bg-[#F5F5F5] ";
    let imgClass = "filter saturate-[0.9] transition-transform duration-[1.5s] ease-out group-hover:scale-105 ";

    if (modoVista === 'editorial') {
      containerClass += editorialPatterns[(index * 5) % editorialPatterns.length] + " w-full h-full";
      imgClass += "w-full h-full object-cover absolute inset-0"; 
    } else if (modoVista === 'pinterest') {
      containerClass += "mb-4 md:mb-6 break-inside-avoid w-full inline-block"; // Columnas sin corte
      imgClass += "w-full h-auto object-cover";
    } else if (modoVista === 'large') {
      containerClass += "w-full";
      imgClass += "w-full h-auto object-cover";
    }

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={containerClass}
        onClick={() => openLightbox(arrayOrigen, index)}
      >
        <img src={foto.src} alt="Galería" loading="lazy" className={imgClass} />
        
        {/* Marca de Agua */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(24px, 4vw, 48px)', letterSpacing: '0.3em', textTransform: 'uppercase', color: WHITE, opacity: 0.35, transform: 'rotate(-25deg)', mixBlendMode: 'overlay', userSelect: 'none' }}>Flashealo</span>
        </div>

        {/* Hover Efecto Completo */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 active:bg-black/30 transition-colors duration-500 opacity-0 group-hover:opacity-100 active:opacity-100 flex items-center justify-center pointer-events-none z-20">
          <span className="text-white text-[10px] uppercase tracking-[0.2em] backdrop-blur-md bg-white/10 px-8 py-3 shadow-2xl border border-white/20 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
            Ampliar
          </span>
        </div>
      </motion.div>
    );
  };

  // ─── PANTALLAS DE CARGA Y ERROR ───
  if (cargandoInicial) {
    return (
      <div style={{ background: CREAM, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: 24, letterSpacing: '0.4em', textTransform: 'uppercase', color: INK }}>Flashealo</span>
        </motion.div>
        <span style={{ fontSize: 9, letterSpacing: '0.3em', color: TAUPE, marginTop: 16, textTransform: 'uppercase' }}>Revelando Colección...</span>
      </div>
    );
  }

  if (errorInicial || !evento) {
    return (
      <div style={{ background: CREAM, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
        <AlertCircle size={48} strokeWidth={1} style={{ color: '#C0392B', marginBottom: 16 }} />
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 32, color: INK }}>Colección no encontrada</h1>
        <p style={{ color: TAUPE, marginTop: 8 }}>{errorInicial}</p>
        <button type="button" onClick={() => navigate('/')} style={{ marginTop: 32, padding: '12px 32px', background: INK, color: WHITE, border: 'none', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: 10, cursor: 'pointer' }}>Volver al inicio</button>
      </div>
    );
  }

  const esEventoOCR = evento.tipo_reconocimiento === 'ocr';

  return (
    <div className={`min-h-screen bg-[#FDFCF8] text-[#1a1a1a] font-sans selection:bg-[#1a1a1a] selection:text-white ${!autenticado ? 'overflow-hidden h-screen' : ''}`}>
      
      {/* ── NAVBAR DINÁMICO ── */}
      <AnimatePresence>
        {autenticado && (
          <motion.nav initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.5 }} className={`fixed top-0 w-full z-40 transition-all duration-700 ${scrolled ? 'bg-[#FDFCF8]/95 backdrop-blur-md border-b border-gray-100 py-4 shadow-sm' : 'bg-transparent py-6'}`}>
            <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex items-center justify-between relative">
              
              <div onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 2, height: 18, background: SAND, display: 'inline-block', borderRadius: 1 }} />
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 18, letterSpacing: '0.18em', textTransform: 'uppercase', color: (scrolled || vistaActual === 'galeria') ? INK : WHITE, transition: 'color 0.5s ease' }}>Flashealo</span>
              </div>

              <div className="flex items-center gap-3 md:gap-8">
                
                {/* SELECTOR DE VISTAS EN NAVBAR (Exterior) */}
                {vistaActual === 'evento' && scrolled && fotosGenerales.length > 0 && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1 bg-black/5 backdrop-blur-md rounded-full p-1 border border-black/5 z-50">
                    <button type="button" onClick={() => setModoVista('editorial')} className={`p-1.5 md:p-2 rounded-full transition-colors ${modoVista === 'editorial' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-black'}`} title="Mosaico Editorial">
                      <LayoutGrid size={14} strokeWidth={2}/>
                    </button>
                    <button type="button" onClick={() => setModoVista('pinterest')} className={`p-1.5 md:p-2 rounded-full transition-colors ${modoVista === 'pinterest' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-black'}`} title="Columnas Naturales">
                      <Columns size={14} strokeWidth={2}/>
                    </button>
                    <button type="button" onClick={() => setModoVista('large')} className={`p-1.5 md:p-2 rounded-full transition-colors ${modoVista === 'large' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-black'}`} title="Cine">
                      <Square size={14} strokeWidth={2}/>
                    </button>
                  </motion.div>
                )}

                <div className={`flex text-[10px] uppercase tracking-[0.2em] font-medium ${(scrolled || vistaActual === 'galeria') ? 'text-gray-600' : 'text-white/90'}`}>
                  {vistaActual === 'galeria' ? (
                    <button type="button" onClick={() => { setVistaActual('evento'); setIdentidadSeleccionada(null); setModoVista('editorial'); window.scrollTo(0, 0); }} className="hover:text-black transition-colors duration-500 flex items-center gap-1 md:gap-2">
                      <ChevronLeft size={14}/> <span className="hidden sm:inline">Volver a la colección</span><span className="sm:hidden">Volver</span>
                    </button>
                  ) : (
                    <button type="button" onClick={() => navigate('/')} className="hover:text-black transition-colors duration-500 hidden sm:block">Volver al Sitio</button>
                  )}
                </div>
              </div>

            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* =========================================
            VISTA 1: HERO + ABOUT + ABREBOCAS + AVATARES
            ========================================= */}
        {vistaActual === 'evento' && (
          <motion.main key="evento" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col">
            
            <header className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-black">
              <div className="absolute inset-0 z-0">
                <motion.img 
                  src={evento.portada_url || "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=2070&auto=format&fit=crop"} 
                  initial={false}
                  animate={{ 
                    scale: autenticado ? [1, 1.05, 1] : 1.05,
                    filter: autenticado ? "brightness(0.85) saturate(0.85) blur(0px)" : "brightness(0.4) saturate(0.5) blur(16px)"
                  }}
                  transition={{ 
                    scale: { duration: 40, repeat: Infinity, ease: "easeInOut" },
                    filter: { duration: 1.5, ease: "easeInOut" }
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transformOrigin: 'center center' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              </div>

              <AnimatePresence>
                {!autenticado && (
                  <motion.div 
                    exit={{ opacity: 0, y: 30, scale: 0.95 }} 
                    transition={{ duration: 0.8, ease: "easeOut" }} 
                    style={{ position: 'relative', zIndex: 10, maxWidth: 480, width: '90%', background: WHITE, padding: '80px 48px', boxShadow: '0 30px 100px rgba(0,0,0,0.3)', borderRadius: 2, textAlign: 'center' }}
                  >
                    <div style={{ width: 40, height: 1, background: SAND, margin: '0 auto 40px' }} />
                    <p style={{ fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase', color: TAUPE, marginBottom: 12, fontWeight: 500 }}>Colección Privada</p>
                    <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(28px, 5vw, 36px)', color: INK, marginBottom: 16, letterSpacing: '-0.01em', fontWeight: 300, lineHeight: 1.2 }}>{evento.nombre}</h1>
                    <p style={{ fontSize: 12, color: TAUPE, marginBottom: 56, fontStyle: 'italic' }}>Por favor, ingresa la contraseña para acceder.</p>
                    
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
                      <div style={{ position: 'relative' }}>
                        <input type="password" placeholder="Contraseña" autoFocus value={passwordInput} onChange={(e) => { setPasswordInput(e.target.value); setErrorBuscador(''); }} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid rgba(0,0,0,0.12)`, padding: '12px 0', fontSize: 14, outline: 'none', color: INK, textAlign: 'center', letterSpacing: '0.4em', transition: 'border-color 0.4s' }} onFocus={(e) => e.target.style.borderBottomColor = SAND} onBlur={(e) => e.target.style.borderBottomColor = 'rgba(0,0,0,0.12)'}/>
                        <Lock size={14} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,0,0,0.15)' }} />
                      </div>
                      {errorBuscador && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#C0392B', fontSize: 11, letterSpacing: '0.05em', marginTop: -20 }}>{errorBuscador}</motion.span>}
                      <button type="submit" style={{ padding: '18px 0', background: INK, color: WHITE, border: 'none', cursor: 'pointer', fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 600, transition: 'all 0.4s ease', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} onMouseEnter={e => { e.target.style.background = '#333'; e.target.style.transform = 'translateY(-2px)'; }} onMouseLeave={e => { e.target.style.background = INK; e.target.style.transform = 'translateY(0)'; }}>Acceder</button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {autenticado && (
                  <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.6 }} className="relative z-10 text-center text-white px-6 mt-16">
                    <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] font-light mb-6 opacity-80">{evento.fecha_evento}</p>
                    <h1 className="text-5xl md:text-7xl lg:text-[8rem] font-serif font-light tracking-wide leading-tight mb-8 drop-shadow-2xl">
                      {evento.nombre}
                    </h1>
                    <button type="button" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })} className="inline-flex flex-col items-center opacity-70 hover:opacity-100 transition-opacity duration-500 mt-12 cursor-pointer">
                      <span className="text-[9px] uppercase tracking-[0.3em] mb-4">Descubrir</span>
                      <ChevronDown size={20} className="animate-bounce" strokeWidth={1} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </header>

            {autenticado && (
              <>
                <section className="py-28 px-6 max-w-3xl mx-auto text-center">
                  <div style={{ width: 40, height: 1, background: SAND, margin: '0 auto 40px' }} />
                  <h2 className="text-3xl md:text-4xl font-serif mb-8 italic text-gray-800 leading-snug">
                    "{evento.titulo_about || 'Capturando la esencia y la emoción de cada instante.'}"
                  </h2>
                  <p className="text-gray-500 font-light leading-relaxed tracking-wide text-sm md:text-base">
                    {evento.descripcion || "Esta colección es un tributo visual diseñado meticulosamente para preservar tus recuerdos con la más alta calidad. Navega a través de los momentos destacados."}
                  </p>
                </section>

                {/* ── CUADRÍCULA DE ABREBOCAS ── */}
                {/* ── CUADRÍCULA DE ABREBOCAS ── */}
                {fotosGenerales.length > 0 && (
                  /* Redujimos el pb-32 a pb-16 */
                  <section className="px-6 md:px-12 pb-16 max-w-[1600px] mx-auto w-full">
                    
                    {modoVista === 'editorial' && (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 auto-rows-[120px] md:auto-rows-[180px] grid-flow-dense gap-2 md:gap-4">
                        {fotosGenerales.slice(0, mostrarCantidadGenerales).map((foto, index) => <RenderizarFoto key={foto.id} foto={foto} index={index} arrayOrigen={fotosGenerales} />)}
                      </div>
                    )}
                    
                    {modoVista === 'pinterest' && (
                      <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-6">
                        {fotosGenerales.slice(0, mostrarCantidadGenerales).map((foto, index) => <RenderizarFoto key={foto.id} foto={foto} index={index} arrayOrigen={fotosGenerales} />)}
                      </div>
                    )}

                    {modoVista === 'large' && (
                      <div className="flex flex-col gap-6 md:gap-16 max-w-4xl mx-auto">
                        {fotosGenerales.slice(0, mostrarCantidadGenerales).map((foto, index) => <RenderizarFoto key={foto.id} foto={foto} index={index} arrayOrigen={fotosGenerales} />)}
                      </div>
                    )}
                    
                    {mostrarCantidadGenerales < fotosGenerales.length && (
                      /* Redujimos el mt-16 a mt-12 */
                      <div className="flex justify-center mt-12">
                        <button type="button" onClick={() => setMostrarCantidadGenerales(prev => prev + 12)} className="px-12 py-4 bg-white border border-gray-200 text-[#1a1a1a] text-[10px] uppercase tracking-[0.3em] hover:border-black hover:bg-gray-50 transition-all duration-500 font-bold">
                          Cargar más fotografías
                        </button>
                      </div>
                    )}
                  </section>
                )}

                {/* Cambiamos py-32 (arriba y abajo) por pt-16 pb-32 (poquito arriba, mucho abajo) */}
                <section className="bg-[#F8F7F3] px-6 border-t border-gray-100">
                  <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-6">Tu colección personal</span>
                    <h2 className="text-4xl md:text-5xl font-serif mb-16 text-[#1a1a1a]">Encuentra tus fotografías</h2>
                    
                    {errorBuscador && <div style={{ color: '#C0392B', marginBottom: 24, fontSize: 13 }}><AlertCircle size={14} style={{display:'inline', marginRight:4}}/>{errorBuscador}</div>}

                    {esEventoOCR ? (
                      <form onSubmit={handleSearchOCR} className="w-full max-w-lg flex flex-col items-center">
                        <input type="text" placeholder="Ej. 1405" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} disabled={cargando} className="w-full bg-transparent border-b border-gray-300 py-4 text-center text-3xl font-serif placeholder:text-gray-300 outline-none focus:border-black transition-colors duration-500"/>
                        <button type="submit" disabled={cargando} className="mt-16 px-14 py-4 bg-[#1a1a1a] text-white text-[10px] uppercase tracking-[0.3em] hover:bg-black transition-all duration-500 hover:-translate-y-1">
                          {cargando ? 'Buscando...' : 'Acceder a Galería'}
                        </button>
                      </form>
                    ) : (
                      <div className="w-full mt-4">
                        {cargando ? (
                          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#C8B99A]" size={32} strokeWidth={1}/></div>
                        ) : identidadesEvento.length === 0 ? (
                          <p className="text-gray-400 font-light italic">Las fotografías están en proceso de revelado...</p>
                        ) : (
                          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-y-5 gap-x-6">
                            {identidadesEvento.map(id => {
                              const tieneNombreReal = id.display_name && !id.display_name.startsWith('Jugador_');
                              return (
                                <button type="button" key={id.id} onClick={() => seleccionarIdentidad(id)} className="flex flex-col items-center gap-4 group outline-none">
                                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-white transition-all duration-500 relative" style={{ boxShadow: '0 8px 24px rgba(200,185,154,0.35), 0 2px 8px rgba(0,0,0,0.08)', 
  border: '1px solid rgba(200,185,154,0.2)'}}>
                                    <img src={id.publicAvatarUrl} alt="Avatar" className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-[2s] ease-out filter grayscale-[20%] group-hover:grayscale-0" />
                                    <div className="absolute inset-0 border-[2px] border-transparent group-hover:border-[#C8B99A] rounded-full transition-colors duration-500 pointer-events-none" />
                                  </div>
                                  <div className="flex flex-col items-center">
                                    {tieneNombreReal && <span className="text-xs font-serif italic tracking-wide text-gray-800 group-hover:text-black transition-colors truncate w-full px-2">{id.display_name}</span>}
                                    <span className="text-[9px] uppercase tracking-[0.2em] text-gray-400 mt-0 font-bold">{id.totalFotos} Fotos</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
          </motion.main>
        )}

        {/* =========================================
            VISTA 2: RESULTADOS FOTOS PERSONALES
            ========================================= */}
        {vistaActual === 'galeria' && (
          <motion.main key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ paddingTop: 160, paddingBottom: 120, minHeight: '100vh', background: CREAM }}>
            
            <div style={{ maxWidth: 720, margin: '0 auto 80px', textAlign: 'center', padding: '0 48px' }}>
              <p style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: TAUPE, marginBottom: 16 }}>Colección Privada</p>
              
              {/* AVATAR DE LA PERSONA EN SU GALERÍA */}
              {identidadSeleccionada && identidadSeleccionada.publicAvatarUrl && (
                <div className="flex justify-center mb-6">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-[3px] border-[#C8B99A] shadow-xl">
                    <img src={identidadSeleccionada.publicAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 'clamp(40px, 6vw, 72px)', letterSpacing: '-0.02em', color: INK, marginBottom: 20 }}>
                {identidadSeleccionada ? (identidadSeleccionada.display_name.startsWith('Jugador_') ? 'Tu Colección' : identidadSeleccionada.display_name) : `Dorsal ${searchQuery}`}
              </h1>
              <p style={{ color: TAUPE, fontSize: 14, marginBottom: 44, fontStyle: 'italic' }}>
                {fotosReales.length} {fotosReales.length === 1 ? 'fotografía procesada' : 'fotografías procesadas'}
              </p>
              <div style={{ width: 40, height: 1, background: SAND, margin: '0 auto' }} />
            </div>

            {/* CONTENEDOR DINÁMICO */}
            <div className="px-6 md:px-12 max-w-[1600px] mx-auto w-full">
              {modoVista === 'editorial' && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 auto-rows-[120px] md:auto-rows-[180px] grid-flow-dense gap-2 md:gap-4">
                  {fotosReales.map((foto, index) => <RenderizarFoto key={foto.id} foto={foto} index={index} arrayOrigen={fotosReales} />)}
                </div>
              )}

              {modoVista === 'pinterest' && (
                <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-6">
                  {fotosReales.map((foto, index) => <RenderizarFoto key={foto.id} foto={foto} index={index} arrayOrigen={fotosReales} />)}
                </div>
              )}

              {modoVista === 'large' && (
                <div className="flex flex-col gap-6 md:gap-16 max-w-4xl mx-auto">
                  {fotosReales.map((foto, index) => <RenderizarFoto key={foto.id} foto={foto} index={index} arrayOrigen={fotosReales} />)}
                </div>
              )}
            </div>

            <div style={{ marginTop: 120, textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 64 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 48 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ width: 2, height: 28, background: SAND, borderRadius: 1 }}></span>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 24, letterSpacing: '0.2em', textTransform: 'uppercase', color: INK }}>Flashealo</span>
                </div>
                <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: TAUPE }}>Inteligencia artificial aplicada al arte.</span>
              </div>
              <button type="button" onClick={() => { setVistaActual('evento'); setIdentidadSeleccionada(null); setModoVista('editorial'); window.scrollTo(0, 0); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: INK, borderBottom: `1px solid ${SAND}`, paddingBottom: 4, transition: 'opacity 0.3s' }} onMouseEnter={e => e.target.style.opacity = 0.6} onMouseLeave={e => e.target.style.opacity = 1}>
                ← Volver a la colección general
              </button>
            </div>
          </motion.main>
        )}
      </AnimatePresence>

      {/* ── SELECTOR DE VISTA FLOTANTE (PÍLDORA PRIVADA) ── */}
      <AnimatePresence>
        {vistaActual === 'galeria' && (
          <motion.div 
            initial={{ y: 100, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: 100, opacity: 0, x: '-50%' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-8 left-1/2 z-50 flex items-center gap-2 bg-[#1C1C1C]/40 hover:bg-[#1C1C1C]/90 transition-colors duration-500 backdrop-blur-md px-4 py-2.5 rounded-full shadow-2xl border border-white/10"
          >
            <button type="button" onClick={() => setModoVista('editorial')} className={`p-2.5 rounded-full transition-colors ${modoVista === 'editorial' ? 'bg-[#C8B99A] text-black shadow-sm' : 'text-white hover:text-[#C8B99A]'}`} title="Mosaico Editorial">
              <LayoutGrid size={16} strokeWidth={2}/>
            </button>
            <button type="button" onClick={() => setModoVista('pinterest')} className={`p-2.5 rounded-full transition-colors ${modoVista === 'pinterest' ? 'bg-[#C8B99A] text-black shadow-sm' : 'text-white hover:text-[#C8B99A]'}`} title="Columnas">
              <Columns size={16} strokeWidth={2}/>
            </button>
            <button type="button" onClick={() => setModoVista('large')} className={`p-2.5 rounded-full transition-colors ${modoVista === 'large' ? 'bg-[#C8B99A] text-black shadow-sm' : 'text-white hover:text-[#C8B99A]'}`} title="Cine">
              <Square size={16} strokeWidth={2}/>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LIGHTBOX (CON MAPA DE ROSTROS INTELIGENTE) ── */}
      <AnimatePresence>
        {lightboxData.index !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(253,252,248,0.96)', backdropFilter: 'blur(16px)' }} onClick={closeLightbox}>
            <button type="button" onClick={closeLightbox} style={{ position: 'absolute', top: 32, right: 40, background: 'none', border: 'none', cursor: 'pointer', color: INK, zIndex: 70 }}><X size={28} strokeWidth={1}/></button>
            <button type="button" onClick={prevImage} style={{ position: 'absolute', left: 32, background: 'none', border: 'none', cursor: 'pointer', color: INK, zIndex: 70 }}><ChevronLeft size={44} strokeWidth={0.5} /></button>
            
            <img src={lightboxData.fotos[lightboxData.index].src} alt="" style={{ maxHeight: '75vh', maxWidth: '88vw', objectFit: 'contain', boxShadow: '0 30px 80px rgba(0,0,0,0.1)', zIndex: 65 }} onClick={e => e.stopPropagation()} />
            
            <button type="button" onClick={nextImage} style={{ position: 'absolute', right: 32, background: 'none', border: 'none', cursor: 'pointer', color: INK, zIndex: 70 }}><ChevronRight size={44} strokeWidth={0.5} /></button>
            
            <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, zIndex: 70 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.3em', color: TAUPE }}>{lightboxData.index + 1} / {lightboxData.fotos.length}</div>
              
              {/* ROSTROS DETECTADOS EN ESTA FOTO */}
              {(() => {
                 const currentPhoto = lightboxData.fotos[lightboxData.index];
                 if (!currentPhoto) return null;
                 
                 // Buscamos si hay coincidencias en nuestro mapa de rostros
                 const entry = Object.entries(mapaDetecciones).find(([k, v]) => currentPhoto.path.includes(k) || k.includes(currentPhoto.path));
                 const carasEnEstaFoto = entry ? entry[1] : [];
                 
                 if (carasEnEstaFoto.length === 0) return null;

                 return (
                   <div className="flex items-center gap-3 mt-1" onClick={e => e.stopPropagation()}>
                     {carasEnEstaFoto.map(idObj => (
                       <div 
                         key={idObj.id} 
                         onClick={() => { closeLightbox(); seleccionarIdentidad(idObj); }}
                         className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-[#C8B99A] overflow-hidden cursor-pointer hover:scale-110 transition-transform shadow-lg bg-white"
                         title={idObj.display_name}
                       >
                         <img src={idObj.publicAvatarUrl} className="w-full h-full object-cover" />
                       </div>
                     ))}
                   </div>
                 );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="footer-premium" style={{ background: INK, marginTop: 0 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ width: 2, height: 16, background: SAND, display: 'inline-block', borderRadius: 1 }} />
              <span style={{ fontFamily: 'Georgia, serif', fontSize: 16, letterSpacing: '0.18em', textTransform: 'uppercase', color: WHITE }}>Flashealo</span>
            </div>
            <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>Inteligencia artificial aplicada al arte.</p>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <a href="#" style={{ color: 'rgba(255,255,255,0.4)', transition: 'color 0.4s ease' }} onMouseEnter={e => e.currentTarget.style.color = WHITE} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
              <Mail size={16} strokeWidth={1} />
            </a>
          </div>
        </div>
      </footer>

      <style>{`
        .footer-premium { padding: 40px 48px; }
        @media (max-width: 768px) { .footer-premium { padding: 24px 24px; } }
      `}</style>
    </div>
  );
};

export default GaleriaCliente;