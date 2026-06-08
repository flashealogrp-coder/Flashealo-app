import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Camera, ArrowRight, Menu, Download, X, ChevronLeft, ChevronRight, Loader2, AlertCircle, Calendar, Users, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FlashealoApp = () => {
  const [vistaActual, setVistaActual] = useState('landing');
  const [eventosPublicos, setEventosPublicos] = useState([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const [cargandoEventos, setCargandoEventos] = useState(true);
  
  // Búsqueda y Resultados
  const [searchQuery, setSearchQuery] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorBuscador, setErrorBuscador] = useState('');
  const [fotosReales, setFotosReales] = useState([]);
  
  // Estado para los avatares de la IA
  const [identidadSeleccionada, setIdentidadSeleccionada] = useState(null);
  const [identidadesEvento, setIdentidadesEvento] = useState([]);

  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const fetchEventos = async () => {
      setCargandoEventos(true);
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .order('fecha_evento', { ascending: false });
      if (data) setEventosPublicos(data);
      setCargandoEventos(false);
    };
    fetchEventos();
  }, []);

  // Diccionario Dinámico de Términos
  const getTerminos = () => {
    const tipo = eventoSeleccionado?.tipo_reconocimiento;
    if (tipo === 'ocr') return { persona: 'Corredor', id: 'Dorsal' };
    if (tipo === 'facial') return { persona: 'Invitado', id: 'Asistente' };
    return { persona: 'Jugador', id: 'Jugador' }; // Híbrido por defecto
  };
  const terminos = getTerminos();

  const cargarAvatares = async (eventoId) => {
    setCargando(true);
    
    const { data: identitiesData } = await supabase
      .from('identities')
      .select('*')
      .eq('evento_id', eventoId);
      
    const { data: detectionsData } = await supabase
      .from('face_detections')
      .select('identity_id')
      .eq('evento_id', eventoId);

    if (identitiesData) {
      // Conteo robusto asegurando que los IDs se crucen correctamente
      const conteos = {};
      if (detectionsData) {
        detectionsData.forEach(det => {
          const idString = String(det.identity_id);
          conteos[idString] = (conteos[idString] || 0) + 1;
        });
      }

      const identidadesConUrl = identitiesData.map(id => {
        const pathLimpio = id.avatar_url ? id.avatar_url.trim() : '';
        const { data: urlData } = supabase.storage.from('fotos').getPublicUrl(pathLimpio);
        
        return { 
          ...id, 
          publicAvatarUrl: urlData.publicUrl,
          totalFotos: conteos[String(id.id)] || 0 
        };
      });

      // Ordenar de mayor a menor cantidad de fotos
      identidadesConUrl.sort((a, b) => b.totalFotos - a.totalFotos);

      setIdentidadesEvento(identidadesConUrl);
    }
    setCargando(false);
  };

  const abrirEvento = (evento) => {
    setEventoSeleccionado(evento);
    setSearchQuery('');
    setErrorBuscador('');
    setIdentidadesEvento([]); 
    setIdentidadSeleccionada(null); // Limpiar perfil previo
    setVistaActual('evento');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (evento.tipo_reconocimiento !== 'ocr') {
      cargarAvatares(evento.id);
    }
  };

  const seleccionarIdentidad = (identidad) => {
    setSearchQuery(identidad.display_name);
    setIdentidadSeleccionada(identidad); // Guardar todo el objeto (avatar, conteo, etc)
    ejecutarBusquedaYMostrarGaleria('identity_id', identidad.id);
  };

  const volverAlInicio = () => {
    setVistaActual('landing');
    setEventoSeleccionado(null);
  };

  // Función exclusiva para OCR (Dorsales)
  const handleSearchOCR = async (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query || !eventoSeleccionado) return;
    ejecutarBusquedaYMostrarGaleria('dorsal', query);
  };

  // Motor centralizado para mostrar resultados
  const ejecutarBusquedaYMostrarGaleria = async (tipoBusqueda, valor) => {
    setCargando(true);
    setErrorBuscador('');

    try {
      let fotosEncontradas = [];

      if (tipoBusqueda === 'dorsal') {
        const { data, error } = await supabase
          .from('etiquetas_fotos')
          .select('fotografias!inner(id, url_watermark, url_original)')
          .eq('dorsal', valor)
          .eq('fotografias.evento_id', eventoSeleccionado.id);
        if (error) throw error;
        if (data) fotosEncontradas = data.map(item => ({ ...item.fotografias }));
        
      } else if (tipoBusqueda === 'identity_id') {
        const { data, error } = await supabase
          .from('face_detections')
          .select('photo_url')
          .eq('identity_id', valor)
          .eq('evento_id', eventoSeleccionado.id);
        if (error) throw error;
        if (data) fotosEncontradas = data.map(item => ({ id: Math.random(), url_watermark: item.photo_url }));
      }

      if (fotosEncontradas.length === 0) {
        setErrorBuscador("No encontramos resultados en este momento.");
      } else {
        const patronesGrid = ["col-span-1 md:col-span-2 row-span-2", "col-span-1 row-span-1", "col-span-1 row-span-1", "col-span-1 md:col-span-3 row-span-1"];
        
        const fotosFormateadas = fotosEncontradas.map((foto, index) => {
          const pathLimpio = (foto.url_watermark || foto.photo_url).trim();
          const { data } = supabase.storage.from('fotos').getPublicUrl(pathLimpio);
          return {
            id: foto.id || index,
            src: data.publicUrl, 
            className: patronesGrid[index % patronesGrid.length]
          };
        });

        setFotosReales(fotosFormateadas);
        setVistaActual('galeria');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setErrorBuscador('Error al conectar con la base de datos.');
    } finally {
      setCargando(false);
    }
  };

  // Funciones del Carrusel
  const openLightbox = (index) => setSelectedImageIndex(index);
  const closeLightbox = () => setSelectedImageIndex(null);
  const prevImage = (e) => { e.stopPropagation(); setSelectedImageIndex((prev) => (prev === 0 ? fotosReales.length - 1 : prev - 1)); };
  const nextImage = (e) => { e.stopPropagation(); setSelectedImageIndex((prev) => (prev === fotosReales.length - 1 ? 0 : prev + 1)); };

  const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } } };
  const staggerContainer = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.2 } } };
  
  const esEventoOCR = eventoSeleccionado?.tipo_reconocimiento === 'ocr';

  return (
    <div className="min-h-screen bg-[#F5F2EB] text-[#1A1A1A] font-sans selection:bg-[#1A1A1A] selection:text-[#F5F2EB]">
      
      {/* HEADER GLOBAl */}
      <header className="fixed top-0 w-full z-40 px-6 py-8 md:px-12 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 cursor-pointer group pointer-events-auto" onClick={volverAlInicio}>
          <div className="w-10 h-10 bg-[#1A1A1A] rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
            <Camera size={18} className="text-[#F5F2EB]" />
          </div>
          <span className="font-bold text-lg tracking-[0.2em] uppercase text-[#1A1A1A]">Flashealo</span>
        </div>
        <button onClick={() => setIsMenuOpen(true)} className="w-12 h-12 flex items-center justify-center bg-white/50 backdrop-blur-md rounded-full pointer-events-auto hover:bg-white transition-colors border border-[#E8E4D9]">
          <Menu size={20} className="text-[#1A1A1A]" />
        </button>
      </header>

      {/* MENÚ DESPLEGABLE */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} transition={{ type: 'tween', duration: 0.5 }} className="fixed inset-0 z-50 bg-[#1A1A1A] text-[#F5F2EB] flex flex-col p-8 md:p-16">
            <div className="flex justify-end"><button onClick={() => setIsMenuOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10"><X size={24} /></button></div>
            <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full gap-8">
              <p className="text-sm font-bold tracking-[0.3em] text-gray-500 uppercase mb-4">Navegación</p>
              <a href="#" onClick={(e) => { e.preventDefault(); volverAlInicio(); setIsMenuOpen(false);}} className="text-5xl md:text-7xl font-extrabold tracking-tighter hover:text-gray-400">Inicio</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        
        {/* =========================================
            VISTA 1: LANDING & LISTA DE EVENTOS
            ========================================= */}
        {vistaActual === 'landing' && (
          <motion.main key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-32 pb-24 min-h-screen px-6 md:px-12 max-w-[100rem] mx-auto">
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="max-w-4xl mb-24 mt-12">
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 mb-8">
                <div className="w-2 h-2 rounded-full bg-[#1A1A1A]"></div>
                <span className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500">Eventos Oficiales</span>
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-6xl md:text-7xl lg:text-[6rem] font-extrabold tracking-tighter leading-[0.9] text-[#1A1A1A]">
                Tus momentos.<br /><span className="font-light text-gray-400">Nuestra lente.</span>
              </motion.h1>
              <motion.p variants={fadeUp} className="text-lg md:text-xl text-gray-500 font-light leading-relaxed mt-8 max-w-2xl">
                Selecciona tu evento y utiliza nuestra Inteligencia Artificial para encontrar todas tus fotografías al instante.
              </motion.p>
            </motion.div>

            <motion.div variants={staggerContainer} initial="hidden" animate="visible">
              {cargandoEventos ? (
                <div className="flex justify-center py-20"><Loader2 size={40} className="animate-spin text-[#1A1A1A]/20" /></div>
              ) : eventosPublicos.length === 0 ? (
                <div className="text-center py-20 border-t border-[#1A1A1A]/10">
                  <p className="text-gray-500 text-xl font-light">Aún no hay eventos públicos disponibles.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {eventosPublicos.map((evento) => (
                    <motion.div 
                      key={evento.id} 
                      variants={fadeUp}
                      onClick={() => abrirEvento(evento)}
                      className="group cursor-pointer bg-[#E8E4D9] rounded-3xl overflow-hidden relative aspect-[4/5] flex flex-col justify-end p-8"
                    >
                      {evento.portada_url ? (
                        <img src={evento.portada_url} alt={evento.nombre} className="absolute inset-0 w-full h-full object-cover filter grayscale-[20%] group-hover:scale-105 group-hover:grayscale-0 transition-all duration-700 ease-out" />
                      ) : (
                        <img src="https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=800&auto=format&fit=crop" alt="Default" className="absolute inset-0 w-full h-full object-cover filter grayscale-[40%] group-hover:scale-105 group-hover:grayscale-0 transition-all duration-700 ease-out" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500"></div>
                      <div className="relative z-10 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full flex items-center gap-2">
                            <Calendar size={12} /> {evento.fecha_evento || 'Próximamente'}
                          </span>
                        </div>
                        <h3 className="text-3xl md:text-4xl font-extrabold text-white tracking-tighter leading-tight mb-2">{evento.nombre}</h3>
                        <p className="text-white/70 font-light text-sm line-clamp-2">{evento.descripcion || 'Accede a la galería oficial de fotografías.'}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.main>
        )}

        {/* =========================================
            VISTA 2: DETALLE DEL EVENTO (SELECTOR INTELIGENTE)
            ========================================= */}
        {vistaActual === 'evento' && eventoSeleccionado && (
          <motion.main key="evento" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col lg:flex-row min-h-screen">
            
            {/* Lado Izquierdo: Buscador o Galería de Avatares */}
            <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 md:px-16 pt-32 pb-16 lg:py-0 z-10">
              <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="max-w-xl w-full">
                
                <motion.button variants={fadeUp} onClick={volverAlInicio} className="mb-12 flex items-center gap-2 text-xs font-bold tracking-[0.3em] uppercase text-gray-400 hover:text-[#1A1A1A] transition-colors">
                  <ChevronLeft size={16} /> Volver a eventos
                </motion.button>

                <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl font-extrabold tracking-tighter leading-[0.9] mb-6 text-[#1A1A1A]">
                  {eventoSeleccionado.nombre}
                </motion.h1>
                
                <motion.div variants={fadeUp} className="flex items-center gap-4 text-gray-500 mb-8 font-light text-sm">
                  <span className="flex items-center gap-1"><Calendar size={16}/> {eventoSeleccionado.fecha_evento}</span>
                  {!esEventoOCR && <span className="flex items-center gap-1"><Users size={16}/> {identidadesEvento.length} {terminos.persona}s detectados</span>}
                </motion.div>

                {errorBuscador && (
                  <motion.div variants={fadeUp} className="mb-6 flex items-center gap-2 text-red-500 text-sm font-bold">
                    <AlertCircle size={16} /> {errorBuscador}
                  </motion.div>
                )}

                {/* LOGICA CONDICIONAL DE INTERFAZ */}
                {esEventoOCR ? (
                  <motion.form variants={fadeUp} onSubmit={handleSearchOCR} className="relative group">
                    <p className="text-lg text-gray-500 font-light leading-relaxed mb-6">Ingresa tu número de dorsal para encontrar todas tus fotografías.</p>
                    <input
                      type="text"
                      placeholder="Tu número de corredor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={cargando}
                      className="w-full bg-transparent border-b-2 border-[#1A1A1A]/20 py-4 pr-16 text-2xl font-light focus:outline-none focus:border-[#1A1A1A] transition-colors placeholder:text-gray-400 disabled:opacity-50"
                      required
                    />
                    <button type="submit" disabled={cargando} className="absolute right-0 top-1/2 -translate-y-1/2 p-3 bg-[#1A1A1A] hover:bg-black text-[#F5F2EB] rounded-full transition-transform hover:scale-105 active:scale-95 disabled:opacity-50">
                      {cargando ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
                    </button>
                  </motion.form>
                ) : (
                  <motion.div variants={fadeUp}>
                    <p className="text-lg text-[#1A1A1A] font-bold leading-relaxed mb-6 border-b border-gray-200 pb-4">
                      ¿Quién eres? Selecciona tu perfil de {terminos.persona.toLowerCase()}:
                    </p>
                    
                    {cargando ? (
                      <div className="flex py-10"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
                    ) : identidadesEvento.length === 0 ? (
                      <p className="text-gray-400 italic text-sm">Aún no hay rostros procesados para este evento.</p>
                    ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-y-10 gap-x-4 max-h-[45vh] overflow-y-auto pr-4 pb-12 custom-scrollbar mt-4">
                      {identidadesEvento.map(id => (
                        <button 
                          key={id.id} 
                          onClick={() => seleccionarIdentidad(id)} 
                          className="flex flex-col items-center gap-1 group outline-none"
                        >
                          <div className="relative mb-2">
                            {/* Avatar Circular con hover suave */}
                            <div className="w-20 h-20 rounded-full overflow-hidden border border-transparent group-hover:border-gray-300 transition-all duration-300 group-hover:scale-105 shadow-sm bg-gray-200">
                              <img src={id.publicAvatarUrl} alt={id.display_name} className="w-full h-full object-cover" />
                            </div>
                            
                            {/* Píldora Minimalista Inferior */}
                            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white text-gray-500 text-[9px] font-bold px-2.5 py-0.5 rounded-full shadow-sm border border-gray-100 group-hover:border-gray-300 group-hover:text-[#1A1A1A] transition-colors whitespace-nowrap">
                              {id.totalFotos} {id.totalFotos === 1 ? 'foto' : 'fotos'}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-center mt-1">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider group-hover:text-[#1A1A1A] truncate w-full text-center px-1">
                              {id.display_name}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            </div>

            {/* Lado Derecho: Foto del Evento */}
            <div className="w-full lg:w-[55%] h-[60vh] lg:h-screen p-4 lg:p-6 lg:pl-0">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} className="w-full h-full rounded-2xl md:rounded-3xl overflow-hidden relative">
                {eventoSeleccionado.portada_url ? (
                  <img src={eventoSeleccionado.portada_url} alt={eventoSeleccionado.nombre} className="absolute inset-0 w-full h-full object-cover filter grayscale-[20%] contrast-110" />
                ) : (
                  <img src="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=2070&auto=format&fit=crop" alt="Corredores" className="absolute inset-0 w-full h-full object-cover filter grayscale-[30%] contrast-125" />
                )}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-transparent"></div>
              </motion.div>
            </div>
          </motion.main>
        )}

        {/* =========================================
            VISTA 3: GALERÍA DE RESULTADOS
            ========================================= */}
        {vistaActual === 'galeria' && (
          <motion.main key="gallery" initial="hidden" animate="visible" variants={staggerContainer} className="pt-32 pb-24 min-h-screen px-6 md:px-12 max-w-[100rem] mx-auto">
            
            <motion.div variants={fadeUp} className="mb-16">
              {/* Botón de volver */}
              <button 
                onClick={() => { setVistaActual('evento'); setIdentidadSeleccionada(null); }} 
                className="mb-8 flex items-center gap-2 text-xs font-bold tracking-[0.3em] uppercase text-gray-400 hover:text-[#1A1A1A] transition-colors"
              >
                <ChevronLeft size={16} /> Volver al evento
              </button>

              {/* 1. Contexto del Evento (Grande) */}
              <div className="mb-10">
                <h1 className="text-5xl md:text-7xl font-black text-[#1A1A1A] tracking-tighter mb-6 leading-none">
                  {eventoSeleccionado.nombre}
                </h1>
                <div className="flex flex-wrap items-center gap-6 text-gray-500 font-bold text-xs uppercase tracking-widest">
                  <span className="flex items-center gap-2">
                    <Calendar size={16} className="text-[#1A1A1A]" /> 
                    {eventoSeleccionado.fecha_evento || 'Sin fecha'}
                  </span>
                  {eventoSeleccionado.ubicacion && (
                    <span className="flex items-center gap-2">
                      <MapPin size={16} className="text-[#1A1A1A]" /> 
                      {eventoSeleccionado.ubicacion}
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Tarjeta del Jugador / Resultados */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                
                {identidadSeleccionada ? (
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-[#F5F2EB] shadow-sm bg-gray-200 flex-shrink-0">
                      <img 
                        src={identidadSeleccionada.publicAvatarUrl} 
                        alt={identidadSeleccionada.display_name} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-black tracking-[0.3em] uppercase text-orange-500 mb-2">
                        Perfil de {terminos.persona}
                      </p>
                      <h2 className="text-3xl md:text-4xl font-extrabold text-[#1A1A1A] tracking-tight mb-2 uppercase">
                        {identidadSeleccionada.display_name}
                      </h2>
                      <p className="text-gray-500 font-medium text-sm md:text-base">
                        Colección personal • <span className="font-bold text-[#1A1A1A]">{fotosReales.length}</span> fotografías
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col justify-center">
                    <p className="text-[10px] font-black tracking-[0.3em] uppercase text-orange-500 mb-2">
                      Resultados de Búsqueda
                    </p>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-[#1A1A1A] tracking-tight mb-2 uppercase">
                      {terminos.id} #{searchQuery}
                    </h2>
                    <p className="text-gray-500 font-medium text-sm md:text-base">
                      <span className="font-bold text-[#1A1A1A]">{fotosReales.length}</span> fotografías encontradas
                    </p>
                  </div>
                )}

                {/* Botón de Acción Principal */}
                <button className="flex items-center justify-center gap-3 px-8 py-5 bg-[#1A1A1A] text-[#F5F2EB] rounded-2xl font-bold hover:bg-black transition-transform active:scale-95 shadow-xl shadow-black/10 w-full md:w-auto flex-shrink-0">
                  Obtener Colección ({eventoSeleccionado.es_gratis ? 'Gratis' : `$${eventoSeleccionado.precio_galeria}`}) <Download size={20} />
                </button>

              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[400px]">
              {fotosReales.map((foto, index) => (
                <motion.div 
                  key={foto.id} 
                  variants={fadeUp} 
                  className={`relative group rounded-2xl overflow-hidden bg-[#E8E4D9] cursor-pointer ${foto.className}`}
                  onClick={() => openLightbox(index)}
                >
                  <img 
                    src={foto.src} 
                    alt="Foto detectada" 
                    className="w-full h-full object-cover" 
                  />
                  <WatermarkOverlay />
                </motion.div>
              ))}
            </div>
          </motion.main>
        )}
      </AnimatePresence>

      {/* LIGHTBOX / CARRUSEL A PANTALLA COMPLETA */}
      <AnimatePresence>
        {selectedImageIndex !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm" onClick={closeLightbox}>
            <button className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors" onClick={closeLightbox}><X size={40} strokeWidth={1.5} /></button>
            <button className="absolute left-6 text-white/50 hover:text-white transition-colors p-4" onClick={prevImage}><ChevronLeft size={48} strokeWidth={1} /></button>
            <motion.img key={selectedImageIndex} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }} src={fotosReales[selectedImageIndex].src} alt="Vista previa" className="max-h-[85vh] max-w-[85vw] object-contain select-none" onClick={(e) => e.stopPropagation()} />
            <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none mix-blend-overlay"><span className="text-white text-5xl md:text-8xl font-bold tracking-[0.3em] uppercase rotate-[-20deg]">Flashealo</span></div>
            <button className="absolute right-6 text-white/50 hover:text-white transition-colors p-4" onClick={nextImage}><ChevronRight size={48} strokeWidth={1} /></button>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 text-sm tracking-widest">{selectedImageIndex + 1} / {fotosReales.length}</div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

const WatermarkOverlay = () => (
  <>
    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/40 transition-colors duration-500"></div>
    <div className="absolute inset-0 flex items-center justify-center opacity-30 mix-blend-overlay pointer-events-none"><span className="text-white text-3xl font-bold tracking-[0.3em] uppercase rotate-[-20deg]">Flashealo</span></div>
    <div className="absolute bottom-6 left-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300"><span className="text-white text-xs tracking-widest uppercase border border-white/50 px-4 py-2 rounded-full backdrop-blur-md">Ampliar vista</span></div>
  </>
);

export default FlashealoApp;