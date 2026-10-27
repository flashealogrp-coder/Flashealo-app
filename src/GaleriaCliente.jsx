import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase as supabaseSesion, supabasePublico } from './supabaseClient';
import { urlFotoPublica } from './urlFotos';
import { resolverPortada } from './marca/portada';
import { leerTodo } from './marca/paginar';
import { X, ChevronLeft, ChevronRight, Loader2, AlertCircle, Lock, ChevronDown, Mail, Columns, LayoutGrid, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── DESIGN TOKENS ─────────────────────────────────────────────────────────── */
const SAND   = '#C8B69E';
const TAUPE  = '#5A5955';
const INK    = '#181816';
const CREAM  = '#F9F8F5';
const WHITE  = '#F9F8F5';

const DOMINIO_R2 = import.meta.env.VITE_R2_DOMINIO || 'https://pub-c4c062c3f8754b2d9ff6de40e9d6d713.r2.dev'; 
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://muvzhnnsdnztlhynuipd.supabase.co";

// Portada del evento: ruta + encuadre ("ruta@x,y"); ver marca/portada.js
const CFG_PORTADA = { dominioFotos: import.meta.env.VITE_FOTOS_DOMINIO || '', supabaseUrl: SUPABASE_URL };
const renderCoverUrl = (valor) => resolverPortada(valor, CFG_PORTADA).src;
const renderCoverPosition = (valor) => resolverPortada(valor, CFG_PORTADA).pos;

const GaleriaCliente = () => {
  const { slug } = useParams(); 
  const navigate = useNavigate();

  const db = useRef(supabasePublico); // cliente de datos: visitante; solo cambia a la sesión del dueño para ver un borrador
  const [evento, setEvento] = useState(null);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorInicial, setErrorInicial] = useState(null);
  // Marca que ve el cliente: undefined = aún no se sabe; la colección de un fotógrafo lleva SU nombre, nunca el de Flashealo.
  const [marca, setMarca] = useState(undefined);
  const esEmpresa = marca === null || marca?.empresa === true;
  const nombreMarca = marca === undefined ? '' : (esEmpresa ? 'Flashealo' : (marca.nombre || ''));
  
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
  const [carpetas, setCarpetas] = useState([]);
  const [carpetaActiva, setCarpetaActiva] = useState('todas');
  const [centrosCara, setCentrosCara] = useState({}); // ruta de foto -> {x,y} en % del centro de la cara principal
  const centinelaRef = useRef(null);
  
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
      const columnas = 'id,nombre,descripcion,logo_url,banner_url,es_gratis,precio_galeria,fecha_evento,estado,created_at,tipo_reconocimiento,slug,portada_url,configuracion_ui,precio_foto,moneda,requiere_pago_para_ver,ubicacion,url_slug,titulo_about,categoria,url_portada,tiene_clave,permitir_descarga,permitir_descarga_zip';
      const buscar = (cliente) => {
        const q = cliente.from('eventos').select(columnas);
        return (esUUID ? q.eq('id', slug) : q.eq('url_slug', slug)).maybeSingle();
      };
      // Siempre como visitante. Si no aparece y hay una sesión abierta, puede ser un borrador del propio fotógrafo (vista previa).
      db.current = supabasePublico;
      let { data, error } = await buscar(supabasePublico);
      if (!data) {
        const { data: { session: sesion } } = await supabaseSesion.auth.getSession();
        if (sesion) {
          const r = await buscar(supabaseSesion);
          if (r.data) { data = r.data; error = null; db.current = supabaseSesion; }
        }
      }

      if (error || !data) {
        setErrorInicial('No pudimos encontrar esta colección. Verifica el enlace.');
      } else {
        setEvento(data);
        supabasePublico.rpc('marca_evento', { p_evento: String(data.id) }).then(({ data: m }) => setMarca(m && typeof m === 'object' ? m : null), () => setMarca(null));
        { const m = data.configuracion_ui && data.configuracion_ui.modo_grid_default; if (['editorial', 'pinterest', 'large'].includes(m)) setModoVista(m); }
        
        // Memoria de Sesión para no pedir la clave 2 veces
        const authMemory = sessionStorage.getItem(`auth_${data.id}`);
        if (!data.tiene_clave || authMemory === 'true') {
          setAutenticado(true);
        }

        if (data.tipo_reconocimiento !== 'ocr') cargarAvatares(data.id);
        
        let allPhotos = null;
        try { allPhotos = await leerTodo((d, h) => db.current.from('fotografias').select('url_watermark, url_original, carpeta_id').eq('evento_id', data.id).order('created_at', { ascending: true }).order('id', { ascending: true }).range(d, h)); } catch (e) { allPhotos = null; }
        if (allPhotos) {
          const arrGenerales = allPhotos.map((f, idx) => {
            const path = (f.url_watermark || f.url_original).trim();
            return { id: idx, src: urlFotoPublica(path) + '?v=1', path: path, carpeta_id: f.carpeta_id || null }; // Guardamos el path para el mapa
          });
          setFotosGenerales(arrGenerales);
        }
        // Sets del evento: se muestran como pestañas para que el cliente vaya directo al que quiere.
        try {
          const { data: cs } = await db.current.from('carpetas_evento').select('id,nombre,created_at').eq('evento_id', data.id).order('created_at', { ascending: true });
          setCarpetas(cs || []);
        } catch (e) { setCarpetas([]); }
        // Centro de la cara principal de cada foto, para encuadrar el mosaico sobre las caras.
        try {
          const dets = await leerTodo((d, h) => db.current.from('face_detections').select('photo_url, bbox').eq('evento_id', data.id).order('id', { ascending: true }).range(d, h));
          const mejor = {};
          (dets || []).forEach((det) => {
            let b = det.bbox;
            if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
            const ruta = det.photo_url ? det.photo_url.trim() : '';
            if (!ruta || !b || ![b.x, b.y, b.w, b.h].every((n) => Number.isFinite(Number(n)))) return;
            const area = Number(b.w) * Number(b.h);
            if (!mejor[ruta] || area > mejor[ruta].area) mejor[ruta] = { area, x: Math.min(100, Math.max(0, Number(b.x) + Number(b.w) / 2)), y: Math.min(100, Math.max(0, Number(b.y) + Number(b.h) / 2)) };
          });
          const centros = {};
          Object.keys(mejor).forEach((k) => { centros[k] = { x: mejor[k].x, y: mejor[k].y }; });
          setCentrosCara(centros);
        } catch (e) { /* sin centrado: queda al centro de la foto */ }
      }
      setCargandoInicial(false);
    };
    if (slug) fetchEventoPorSlug();
  }, [slug]);

  const idsConFotos = new Set(fotosGenerales.map((f) => f.carpeta_id).filter(Boolean));
  const pestanas = carpetas.filter((c) => idsConFotos.has(c.id));
  const hayPestanas = pestanas.length > 1 || (pestanas.length === 1 && fotosGenerales.some((f) => !f.carpeta_id));
  const fotosMostradas = (!hayPestanas || carpetaActiva === 'todas') ? fotosGenerales : fotosGenerales.filter((f) => (carpetaActiva === 'sin' ? !f.carpeta_id : f.carpeta_id === carpetaActiva));
  const elegirPestana = (id) => { setCarpetaActiva(id); setMostrarCantidadGenerales(24); };

  // Carga continua: al acercarse al final de la cuadrícula se muestran más fotos, hasta completar el total.
  useEffect(() => {
    const el = centinelaRef.current;
    if (!el || mostrarCantidadGenerales >= fotosMostradas.length) return undefined;
    const obs = new IntersectionObserver((entradas) => {
      if (entradas.some((e) => e.isIntersecting)) setMostrarCantidadGenerales((prev) => prev + 24);
    }, { rootMargin: '1200px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [mostrarCantidadGenerales, fotosMostradas.length, modoVista, autenticado]);

  const cargarAvatares = async (eventoId) => {
    setCargando(true);
    const { data: identitiesData } = await db.current.from('identities').select('id,display_name,avatar_url,created_at,evento_id,dorsal,avatar_score').eq('evento_id', eventoId);
    let detectionsData = null;
    try { detectionsData = await leerTodo((d, h) => db.current.from('face_detections').select('identity_id, photo_url').eq('evento_id', eventoId).order('id', { ascending: true }).range(d, h)); } catch (e) { detectionsData = null; }
    
    if (identitiesData) {
      const conteos = {};
      if (detectionsData) detectionsData.forEach(det => { const k = String(det.identity_id); conteos[k] = (conteos[k] || 0) + 1; });
      
      const identidadesConUrl = identitiesData.map(id => {
        const pathLimpio = id.avatar_url ? id.avatar_url.trim() : '';
        const { data: urlData } = db.current.storage.from('fotos').getPublicUrl(pathLimpio);
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
        const { data, error } = await db.current.from('etiquetas_fotos').select('fotografias!inner(id, url_watermark, url_original)').eq('dorsal', valor).eq('fotografias.evento_id', evento.id);
        if (error) throw error;
        if (data) fotosEncontradas = data.map(item => ({ ...item.fotografias }));
      } else if (tipoBusqueda === 'identity_id') {
        const { data, error } = await db.current.from('face_detections').select('photo_url').eq('identity_id', valor).eq('evento_id', evento.id);
        if (error) throw error;
        if (data) fotosEncontradas = data.map(item => ({ id: Math.random(), url_watermark: item.photo_url }));
      }

      if (fotosEncontradas.length === 0) {
        setErrorBuscador('No encontramos fotografías para esta búsqueda.');
      } else {
        const fotosFormateadas = fotosEncontradas.map((foto, index) => {
          const pathLimpio = (foto.url_watermark || foto.photo_url).trim();
          return { id: foto.id || index, src: urlFotoPublica(pathLimpio) + '?v=1', path: pathLimpio };
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

  const handleLogin = async (e) => {
    e.preventDefault();
    // La clave se valida en el servidor (la columna password_cliente ya no es pública)
    const { data: ok, error } = await db.current.rpc('verificar_clave_evento', { p_evento: evento.id, p_clave: passwordInput });
    if (!error && ok === true) {
      setAutenticado(true);
      sessionStorage.setItem(`auth_${evento.id}`, 'true'); // Memoria activada
      try { sessionStorage.setItem(`clave_${evento.id}`, passwordInput); } catch { /* sin almacenamiento */ }
    } else {
      setErrorBuscador("Contraseña incorrecta");
    }
  };

  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState('');
  const descargarFoto = async (foto) => {
    if (!foto || descargando) return;
    setDescargando(true); setErrorDescarga('');
    try {
      let clave = '';
      try { clave = sessionStorage.getItem(`clave_${evento.id}`) || ''; } catch { /* sin almacenamiento */ }
      const r = await fetch('/api/descarga', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p: foto.path, clave }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) throw new Error(j.error || 'No se pudo descargar.');
      window.location.assign(j.url);   // el servidor responde como archivo adjunto: la página no cambia
    } catch (e) { setErrorDescarga(e.message || 'No se pudo descargar.'); }
    finally { setDescargando(false); }
  };

  const [descargandoZip, setDescargandoZip] = useState(false);
  const descargarTodo = async () => {
    if (descargandoZip || !evento) return;
    setDescargandoZip(true); setErrorDescarga('');
    try {
      let clave = '';
      try { clave = sessionStorage.getItem(`clave_${evento.id}`) || ''; } catch { /* sin almacenamiento */ }
      const r = await fetch('/api/descarga-zip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evento_id: evento.id, clave }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) throw new Error(j.error || 'No se pudo descargar.');
      window.location.assign(j.url);
    } catch (e) { setErrorDescarga(e.message || 'No se pudo descargar.'); }
    finally { setTimeout(() => setDescargandoZip(false), 4000); }
  };

  const openLightbox = (fotosArray, i) => setLightboxData({ fotos: fotosArray, index: i });
  const closeLightbox = () => setLightboxData({ fotos: [], index: null });
  const prevImage = (e) => { e.stopPropagation(); setLightboxData(p => ({ ...p, index: p.index === 0 ? p.fotos.length - 1 : p.index - 1 })); };
  const nextImage = (e) => { e.stopPropagation(); setLightboxData(p => ({ ...p, index: p.index === p.fotos.length - 1 ? 0 : p.index + 1 })); };

  // ─── COMPONENTE FOTO INTELIGENTE (TETRIS EDITORIAL O COLUMNAS PURAS) ───
  // Es una función que devuelve JSX (no un componente): así React reutiliza las fotos en cada actualización y no parpadean ni se reinician.
  const renderizarFoto = ({ foto, index, arrayOrigen }) => {
    // Modo 1: Editorial Mosaico (Cortes hermosos sin sobreponerse)
    const editorialPatterns = [
      "col-span-2 row-span-2", // 0: Cuadrado Gigante
      "col-span-1 row-span-1", // 1: Cuadrado Pequeño
      "col-span-1 row-span-2", // 2: Vertical Alto
      "col-span-2 row-span-1", // 3: Horizontal Ancho
      "col-span-1 row-span-1", // 4: Cuadrado Pequeño
      "col-span-1 row-span-1", // 5: Cuadrado Pequeño
    ];

    let containerClass = "relative group cursor-pointer transition-all duration-500 ease-out overflow-hidden z-0 bg-[#F9F8F5] ";
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
        key={foto.id}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={containerClass}
        onClick={() => openLightbox(arrayOrigen, index)}
      >
        <img src={foto.src} alt="Galería" loading="lazy" className={imgClass}
          style={modoVista === 'editorial' && centrosCara[foto.path] ? { objectPosition: `${centrosCara[foto.path].x}% ${centrosCara[foto.path].y}%` } : undefined} />
        
        {/* Hover Efecto Completo */}
        <div className="absolute inset-0 bg-fl-texto/0 group-hover:bg-fl-texto/30 active:bg-fl-texto/30 transition-colors duration-500 opacity-0 group-hover:opacity-100 active:opacity-100 flex items-center justify-center pointer-events-none z-20">
          <span className="text-white text-[10px] uppercase tracking-[0.2em] backdrop-blur-md bg-fl-lino/10 px-8 py-3 shadow-2xl border border-white/20 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
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
          <span style={{ fontFamily: 'var(--fl-serif)', fontSize: 24, letterSpacing: '0.4em', textTransform: 'uppercase', color: INK }}>{nombreMarca}</span>
        </motion.div>
        <span style={{ fontSize: 9, letterSpacing: '0.3em', color: TAUPE, marginTop: 16, textTransform: 'uppercase' }}>Revelando Colección...</span>
      </div>
    );
  }

  if (errorInicial || !evento) {
    return (
      <div style={{ background: CREAM, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
        <AlertCircle size={48} strokeWidth={1} style={{ color: '#A3392B', marginBottom: 16 }} />
        <h1 style={{ fontFamily: 'var(--fl-serif)', fontSize: 32, color: INK }}>Colección no encontrada</h1>
        <p style={{ color: TAUPE, marginTop: 8 }}>{errorInicial}</p>
        <button type="button" onClick={() => navigate('/')} style={{ marginTop: 32, padding: '12px 32px', background: INK, color: WHITE, border: 'none', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: 10, cursor: 'pointer' }}>Volver al inicio</button>
      </div>
    );
  }

  const esEventoOCR = evento.tipo_reconocimiento === 'ocr';

  // ── Diseño elegido por el fotógrafo en "Diseño de galería" (se guarda en eventos.configuracion_ui) ──
  const ui = { ...(evento.configuracion_ui || {}) };
  const cFondo = ui.color_fondo || CREAM;
  const cTexto = ui.color_texto || INK;
  const cAcento = ui.color_acento || SAND;
  const claseFuente = ui.fuente_titulo === 'sans' ? 'font-sans' : ui.fuente_titulo === 'mono' ? 'font-mono' : 'font-serif';
  const estiloPortada = autenticado ? (ui.estilo_portada || 'hero_full') : 'hero_full';
  const velo = (ui.opacidad_overlay || 30) / 100;
  const posTitulo = ui.posicion_titulo === 'abajo_izq' ? 'abajo_izq' : ui.posicion_titulo === 'abajo_centro' ? 'abajo_centro' : 'centro';
  const alineacionTitulo = posTitulo === 'abajo_izq' ? 'justify-end items-start text-left pb-20 px-8 md:px-16' : posTitulo === 'abajo_centro' ? 'justify-end items-center text-center pb-20 px-6' : 'justify-center items-center text-center px-6';
  const barraSolida = scrolled || (autenticado && (estiloPortada === 'split' || estiloPortada === 'editorial'));
  const modoInicial = ['editorial', 'pinterest', 'large'].includes(ui.modo_grid_default) ? ui.modo_grid_default : 'editorial';

  return (
    <div className={`min-h-screen font-sans selection:bg-[#181816] selection:text-white ${!autenticado ? 'overflow-hidden h-screen' : ''}`} style={{ backgroundColor: cFondo, color: cTexto }}>
      
      {/* ── NAVBAR DINÁMICO ── */}
      <AnimatePresence>
        {autenticado && (
          <motion.nav initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.5 }} className={`fixed top-0 w-full z-40 transition-all duration-700 ${barraSolida ? 'backdrop-blur-md border-b border-fl-borde py-4 shadow-sm' : 'bg-transparent py-6'}`} style={barraSolida ? { backgroundColor: cFondo + 'F2' } : undefined}>
            <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex items-center justify-between relative">
              
              <div onClick={esEmpresa ? () => navigate('/') : undefined} style={{ cursor: esEmpresa ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 2, height: 18, background: SAND, display: 'inline-block', borderRadius: 1 }} />
                <span style={{ fontFamily: 'var(--fl-serif)', fontSize: 18, letterSpacing: '0.18em', textTransform: 'uppercase', color: (barraSolida || vistaActual === 'galeria') ? cTexto : WHITE, transition: 'color 0.5s ease' }}>{nombreMarca}</span>
              </div>

              <div className="flex items-center gap-3 md:gap-8">
                
                {/* SELECTOR DE VISTAS EN NAVBAR (Exterior) */}
                {vistaActual === 'evento' && scrolled && fotosGenerales.length > 0 && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1 bg-fl-texto/5 backdrop-blur-md rounded-full p-1 border border-fl-texto/5 z-50">
                    <button type="button" onClick={() => setModoVista('editorial')} className={`p-1.5 md:p-2 rounded-full transition-colors ${modoVista === 'editorial' ? 'bg-fl-lino shadow-sm text-fl-texto' : 'text-fl-grafito hover:text-fl-texto'}`} title="Mosaico Editorial">
                      <LayoutGrid size={14} strokeWidth={2}/>
                    </button>
                    <button type="button" onClick={() => setModoVista('pinterest')} className={`p-1.5 md:p-2 rounded-full transition-colors ${modoVista === 'pinterest' ? 'bg-fl-lino shadow-sm text-fl-texto' : 'text-fl-grafito hover:text-fl-texto'}`} title="Columnas Naturales">
                      <Columns size={14} strokeWidth={2}/>
                    </button>
                    <button type="button" onClick={() => setModoVista('large')} className={`p-1.5 md:p-2 rounded-full transition-colors ${modoVista === 'large' ? 'bg-fl-lino shadow-sm text-fl-texto' : 'text-fl-grafito hover:text-fl-texto'}`} title="Cine">
                      <Square size={14} strokeWidth={2}/>
                    </button>
                  </motion.div>
                )}

                <div className={`flex text-[10px] uppercase tracking-[0.2em] font-medium ${(barraSolida || vistaActual === 'galeria') ? 'text-fl-grafito' : 'text-white/90'}`}>
                  {vistaActual === 'galeria' ? (
                    <button type="button" onClick={() => { setVistaActual('evento'); setIdentidadSeleccionada(null); setModoVista(modoInicial); window.scrollTo(0, 0); }} className="hover:text-fl-texto transition-colors duration-500 flex items-center gap-1 md:gap-2">
                      <ChevronLeft size={14}/> <span className="hidden sm:inline">Volver a la colección</span><span className="sm:hidden">Volver</span>
                    </button>
                  ) : (
                    esEmpresa ? <button type="button" onClick={() => navigate('/')} className="hover:text-fl-texto transition-colors duration-500 hidden sm:block">Volver al Sitio</button> : null
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
            
            {estiloPortada !== 'hero_full' && (() => {
              const portada = renderCoverUrl(evento.portada_url) || "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=2070&auto=format&fit=crop";
              const posImg = renderCoverPosition(evento.portada_url);
              const fecha = <span className="text-[10px] md:text-xs uppercase tracking-[0.35em] font-bold mb-4 block" style={{ color: cAcento }}>{evento.fecha_evento}</span>;
              const titulo = (tam, color) => <h1 className={`${claseFuente} font-light leading-tight ${tam}`} style={{ color }}>{evento.nombre}</h1>;
              if (estiloPortada === 'split') return (
                <header className="w-full min-h-screen flex flex-col md:flex-row" style={{ backgroundColor: '#181816' }}>
                  <div className="relative md:w-[55%] h-[55vh] md:h-auto">
                    <img src={portada} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: posImg }} />
                    <div className="absolute inset-0" style={{ background: '#181816', opacity: velo }} />
                  </div>
                  <div className={`md:w-[45%] flex flex-col text-white ${posTitulo === 'centro' ? 'justify-center items-start px-8 md:px-14 py-14' : alineacionTitulo + ' py-14'}`}>
                    {fecha}{titulo('text-4xl md:text-5xl lg:text-6xl', '#fff')}
                  </div>
                </header>
              );
              if (estiloPortada === 'editorial') return (
                <header className="relative w-full min-h-screen flex flex-col items-center justify-center pt-28 pb-16" style={{ backgroundColor: cFondo }}>
                  <div className="relative w-[88%] md:w-[70%] h-[60vh] shadow-2xl">
                    <img src={portada} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: posImg }} />
                    <div className="absolute inset-0" style={{ background: '#181816', opacity: velo }} />
                  </div>
                  <div className={`flex flex-col w-[88%] md:w-[70%] mt-8 ${posTitulo === 'abajo_izq' ? 'items-start text-left' : 'items-center text-center'}`}>
                    {fecha}{titulo('text-4xl md:text-6xl', cTexto)}
                  </div>
                </header>
              );
              return (
                <header className="relative w-full h-screen flex items-end justify-center overflow-hidden bg-fl-texto">
                  <img src={portada} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: posImg }} />
                  <div className="absolute inset-0" style={{ background: '#181816', opacity: velo }} />
                  <div className="relative z-10 w-[90%] max-w-2xl mb-16 p-8 md:p-12 shadow-2xl flex flex-col items-center text-center" style={{ backgroundColor: cFondo }}>
                    {fecha}{titulo('text-3xl md:text-5xl', cTexto)}
                  </div>
                </header>
              );
            })()}
            <header className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-fl-texto" style={estiloPortada !== 'hero_full' ? { display: 'none' } : undefined}>
              <div className="absolute inset-0 z-0">
                {/* 🌟 MAGIA APLICADA: La portada respeta el encuadre (objectPosition) 🌟 */}
                <motion.img 
                  src={renderCoverUrl(evento.portada_url) || "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=2070&auto=format&fit=crop"} 
                  initial={false}
                  animate={{ 
                    scale: autenticado ? [1, 1.05, 1] : 1.05,
                    filter: autenticado ? "brightness(0.85) saturate(0.85) blur(0px)" : "brightness(0.4) saturate(0.5) blur(16px)"
                  }}
                  transition={{ 
                    scale: { duration: 40, repeat: Infinity, ease: "easeInOut" },
                    filter: { duration: 1.5, ease: "easeInOut" }
                  }}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover', 
                    objectPosition: renderCoverPosition(evento.portada_url),
                    transformOrigin: 'center center' 
                  }}
                />
                <div className="absolute inset-0" style={{ background: '#181816', opacity: velo }} />
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
                    <h1 style={{ fontFamily: 'var(--fl-serif)', fontSize: 'clamp(28px, 5vw, 36px)', color: INK, marginBottom: 16, letterSpacing: '-0.01em', fontWeight: 300, lineHeight: 1.2 }}>{evento.nombre}</h1>
                    <p style={{ fontSize: 12, color: TAUPE, marginBottom: 56, fontStyle: 'italic' }}>Por favor, ingresa la contraseña para acceder.</p>
                    
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
                      <div style={{ position: 'relative' }}>
                        <input type="password" placeholder="Contraseña" autoFocus value={passwordInput} onChange={(e) => { setPasswordInput(e.target.value); setErrorBuscador(''); }} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid rgba(0,0,0,0.12)`, padding: '12px 0', fontSize: 14, outline: 'none', color: INK, textAlign: 'center', letterSpacing: '0.4em', transition: 'border-color 0.4s' }} onFocus={(e) => e.target.style.borderBottomColor = SAND} onBlur={(e) => e.target.style.borderBottomColor = 'rgba(0,0,0,0.12)'}/>
                        <Lock size={14} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,0,0,0.15)' }} />
                      </div>
                      {errorBuscador && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#A3392B', fontSize: 11, letterSpacing: '0.05em', marginTop: -20 }}>{errorBuscador}</motion.span>}
                      <button type="submit" style={{ padding: '18px 0', background: INK, color: WHITE, border: 'none', cursor: 'pointer', fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 600, transition: 'all 0.4s ease', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} onMouseEnter={e => { e.target.style.background = '#333'; e.target.style.transform = 'translateY(-2px)'; }} onMouseLeave={e => { e.target.style.background = INK; e.target.style.transform = 'translateY(0)'; }}>Acceder</button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {autenticado && (
                  <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.6 }} className={`relative z-10 text-white w-full h-full flex flex-col ${alineacionTitulo}`}>
                    <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] font-bold mb-6" style={{ color: cAcento }}>{evento.fecha_evento}</p>
                    <h1 className={`text-5xl md:text-7xl lg:text-[8rem] ${claseFuente} font-light tracking-wide leading-tight mb-8 drop-shadow-2xl`}>
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
                  <div style={{ width: 40, height: 1, background: cAcento, margin: '0 auto 40px' }} />
                  <h2 className={`text-3xl md:text-4xl ${claseFuente} mb-8 italic leading-snug`} style={{ color: cTexto }}>
                    "{evento.titulo_about || 'Capturando la esencia y la emoción de cada instante.'}"
                  </h2>
                  <p className="font-light leading-relaxed tracking-wide text-sm md:text-base" style={{ color: cTexto, opacity: 0.75 }}>
                    {evento.descripcion || "Esta colección es un tributo visual diseñado meticulosamente para preservar tus recuerdos con la más alta calidad. Navega a través de los momentos destacados."}
                  </p>
                </section>

                {/* ── CUADRÍCULA DE ABREBOCAS ── */}
                {/* ── CUADRÍCULA DE ABREBOCAS ── */}
                {fotosGenerales.length > 0 && (
                  /* Redujimos el pb-32 a pb-16 */
                  <section className="px-6 md:px-12 pb-16 max-w-[1600px] mx-auto w-full">
                    
                    {evento?.permitir_descarga_zip && (
                      <div className="flex flex-col items-end gap-2 mb-6">
                        <button type="button" disabled={descargandoZip} onClick={descargarTodo} className="px-8 py-3 bg-[#181816] text-white text-[10px] uppercase tracking-[0.25em] hover:bg-fl-texto transition-all duration-500" style={{ opacity: descargandoZip ? 0.6 : 1, cursor: descargandoZip ? 'wait' : 'pointer' }}>
                          {descargandoZip ? 'Preparando descarga…' : 'Descargar toda la colección'}
                        </button>
                        {errorDescarga && !lightboxData.fotos.length && <span style={{ fontSize: 12, color: '#A3392B' }}>{errorDescarga}</span>}
                      </div>
                    )}
                    {hayPestanas && (
                      <div role="tablist" aria-label="Sets de la colección" className="flex gap-2 md:gap-3 overflow-x-auto pb-4 mb-6 -mx-6 px-6 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none' }}>
                        {[{ id: 'todas', nombre: 'Todas' }, ...pestanas, ...(fotosGenerales.some((f) => !f.carpeta_id) ? [{ id: 'sin', nombre: 'Otras' }] : [])].map((c) => {
                          const activa = carpetaActiva === c.id;
                          const total = c.id === 'todas' ? fotosGenerales.length : fotosGenerales.filter((f) => (c.id === 'sin' ? !f.carpeta_id : f.carpeta_id === c.id)).length;
                          return (
                            <button key={c.id} type="button" role="tab" aria-selected={activa} onClick={() => elegirPestana(c.id)}
                              className="shrink-0 px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] border transition-colors duration-300"
                              style={{ background: activa ? cTexto : 'transparent', color: activa ? cFondo : cTexto, borderColor: activa ? cTexto : cTexto + '33', cursor: 'pointer' }}>
                              {c.nombre} <span style={{ opacity: 0.55, marginLeft: 6 }}>{total}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {modoVista === 'editorial' && (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 auto-rows-[120px] md:auto-rows-[180px] grid-flow-dense gap-2 md:gap-4">
                        {fotosMostradas.slice(0, mostrarCantidadGenerales).map((foto, index) => renderizarFoto({ foto, index, arrayOrigen: fotosMostradas }))}
                      </div>
                    )}
                    
                    {modoVista === 'pinterest' && (
                      <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-6">
                        {fotosMostradas.slice(0, mostrarCantidadGenerales).map((foto, index) => renderizarFoto({ foto, index, arrayOrigen: fotosMostradas }))}
                      </div>
                    )}

                    {modoVista === 'large' && (
                      <div className="flex flex-col gap-6 md:gap-16 max-w-4xl mx-auto">
                        {fotosMostradas.slice(0, mostrarCantidadGenerales).map((foto, index) => renderizarFoto({ foto, index, arrayOrigen: fotosMostradas }))}
                      </div>
                    )}
                    
                    {mostrarCantidadGenerales < fotosMostradas.length && (
                      <div ref={centinelaRef} aria-hidden="true" className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-[#C8B69E]" size={24} strokeWidth={1} />
                      </div>
                    )}
                  </section>
                )}

                {/* Cambiamos py-32 (arriba y abajo) por pt-16 pb-32 (poquito arriba, mucho abajo) */}
                {ui.mostrar_modulo_ia !== false && (<section className="px-6 border-t border-fl-borde" style={{ backgroundColor: cFondo }}>
                  <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-fl-grafito mb-6">Tu colección personal</span>
                    <h2 className={`text-4xl md:text-5xl ${claseFuente} mb-16`} style={{ color: cTexto }}>Encuentra tus fotografías</h2>
                    
                    {errorBuscador && <div style={{ color: '#A3392B', marginBottom: 24, fontSize: 13 }}><AlertCircle size={14} style={{display:'inline', marginRight:4}}/>{errorBuscador}</div>}

                    {esEventoOCR ? (
                      <form onSubmit={handleSearchOCR} className="w-full max-w-lg flex flex-col items-center">
                        <input type="text" placeholder="Ej. 1405" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} disabled={cargando} className="w-full bg-transparent border-b border-fl-borde py-4 text-center text-3xl font-serif placeholder:text-gray-300 outline-none focus:border-fl-texto transition-colors duration-500"/>
                        <button type="submit" disabled={cargando} className="mt-16 px-14 py-4 bg-[#181816] text-white text-[10px] uppercase tracking-[0.3em] hover:bg-fl-texto transition-all duration-500 hover:-translate-y-1">
                          {cargando ? 'Buscando...' : 'Acceder a Galería'}
                        </button>
                      </form>
                    ) : (
                      <div className="w-full mt-4">
                        {cargando ? (
                          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#C8B69E]" size={32} strokeWidth={1}/></div>
                        ) : identidadesEvento.length === 0 ? (
                          <p className="text-fl-grafito font-light italic">Las fotografías están en proceso de revelado...</p>
                        ) : (
                          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-y-5 gap-x-6">
                            {identidadesEvento.map(id => {
                              const tieneNombreReal = id.display_name && !id.display_name.startsWith('Jugador_') && !id.display_name.startsWith('Perfil_') && !id.display_name.startsWith('Identidad_');
                              return (
                                <button type="button" key={id.id} onClick={() => seleccionarIdentidad(id)} className="flex flex-col items-center gap-4 group outline-none">
                                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-fl-lino transition-all duration-500 relative" style={{ boxShadow: '0 8px 24px rgba(200,185,154,0.35), 0 2px 8px rgba(0,0,0,0.08)', 
  border: '1px solid rgba(200,185,154,0.2)'}}>
                                    <img src={id.publicAvatarUrl} alt="Avatar" className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-[2s] ease-out filter grayscale-[20%] group-hover:grayscale-0" />
                                    <div className="absolute inset-0 border-[2px] border-transparent group-hover:border-[#C8B69E] rounded-full transition-colors duration-500 pointer-events-none" />
                                  </div>
                                  <div className="flex flex-col items-center">
                                    {tieneNombreReal && ui.mostrar_nombres_ia !== false && <span className="text-xs font-serif italic tracking-wide text-fl-grafito group-hover:text-fl-texto transition-colors truncate w-full px-2">{id.display_name}</span>}
                                    <span className="text-[9px] uppercase tracking-[0.2em] text-fl-grafito mt-0 font-bold">{id.totalFotos} Fotos</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>)}
              </>
            )}
          </motion.main>
        )}

        {/* =========================================
            VISTA 2: RESULTADOS FOTOS PERSONALES
            ========================================= */}
        {vistaActual === 'galeria' && (
          <motion.main key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ paddingTop: 160, paddingBottom: 120, minHeight: '100vh', background: cFondo, color: cTexto }}>
            
            <div style={{ maxWidth: 720, margin: '0 auto 80px', textAlign: 'center', padding: '0 48px' }}>
              <p style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: TAUPE, marginBottom: 16 }}>Colección Privada</p>
              
              {/* AVATAR DE LA PERSONA EN SU GALERÍA */}
              {identidadSeleccionada && identidadSeleccionada.publicAvatarUrl && (
                <div className="flex justify-center mb-6">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-[3px] border-[#C8B69E] shadow-xl">
                    <img src={identidadSeleccionada.publicAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              <h1 style={{ fontFamily: 'var(--fl-serif)', fontWeight: 300, fontSize: 'clamp(40px, 6vw, 72px)', letterSpacing: '-0.02em', color: INK, marginBottom: 20 }}>
                {identidadSeleccionada ? (identidadSeleccionada.display_name.startsWith('Jugador_') || identidadSeleccionada.display_name.startsWith('Identidad_') || identidadSeleccionada.display_name.startsWith('Perfil_') ? 'Tu Colección' : identidadSeleccionada.display_name) : `Dorsal ${searchQuery}`}
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
                  {fotosReales.map((foto, index) => renderizarFoto({ foto, index, arrayOrigen: fotosReales }))}
                </div>
              )}

              {modoVista === 'pinterest' && (
                <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-6">
                  {fotosReales.map((foto, index) => renderizarFoto({ foto, index, arrayOrigen: fotosReales }))}
                </div>
              )}

              {modoVista === 'large' && (
                <div className="flex flex-col gap-6 md:gap-16 max-w-4xl mx-auto">
                  {fotosReales.map((foto, index) => renderizarFoto({ foto, index, arrayOrigen: fotosReales }))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 120, textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 64 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 48 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ width: 2, height: 28, background: SAND, borderRadius: 1 }}></span>
                  <span style={{ fontFamily: 'var(--fl-serif)', fontSize: 24, letterSpacing: '0.2em', textTransform: 'uppercase', color: INK }}>{nombreMarca}</span>
                </div>
                {esEmpresa && <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: TAUPE }}>Inteligencia artificial aplicada al arte.</span>}
              </div>
              <button type="button" onClick={() => { setVistaActual('evento'); setIdentidadSeleccionada(null); setModoVista(modoInicial); window.scrollTo(0, 0); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: INK, borderBottom: `1px solid ${SAND}`, paddingBottom: 4, transition: 'opacity 0.3s' }} onMouseEnter={e => e.target.style.opacity = 0.6} onMouseLeave={e => e.target.style.opacity = 1}>
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
            className="fixed bottom-8 left-1/2 z-50 flex items-center gap-2 bg-[#181816]/40 hover:bg-[#181816]/90 transition-colors duration-500 backdrop-blur-md px-4 py-2.5 rounded-full shadow-2xl border border-white/10"
          >
            <button type="button" onClick={() => setModoVista('editorial')} className={`p-2.5 rounded-full transition-colors ${modoVista === 'editorial' ? 'bg-[#C8B69E] text-fl-texto shadow-sm' : 'text-white hover:text-[#C8B69E]'}`} title="Mosaico Editorial">
              <LayoutGrid size={16} strokeWidth={2}/>
            </button>
            <button type="button" onClick={() => setModoVista('pinterest')} className={`p-2.5 rounded-full transition-colors ${modoVista === 'pinterest' ? 'bg-[#C8B69E] text-fl-texto shadow-sm' : 'text-white hover:text-[#C8B69E]'}`} title="Columnas">
              <Columns size={16} strokeWidth={2}/>
            </button>
            <button type="button" onClick={() => setModoVista('large')} className={`p-2.5 rounded-full transition-colors ${modoVista === 'large' ? 'bg-[#C8B69E] text-fl-texto shadow-sm' : 'text-white hover:text-[#C8B69E]'}`} title="Cine">
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
              {evento?.permitir_descarga && (
                <button type="button" disabled={descargando} onClick={(e) => { e.stopPropagation(); descargarFoto(lightboxData.fotos[lightboxData.index]); }} style={{ background: INK, color: WHITE, border: 'none', padding: '10px 22px', fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', cursor: descargando ? 'wait' : 'pointer', opacity: descargando ? 0.6 : 1 }}>
                  {descargando ? 'Preparando…' : 'Descargar tamaño real'}
                </button>
              )}
              {errorDescarga && <div style={{ fontSize: 12, color: '#A3392B' }}>{errorDescarga}</div>}
              
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
                         className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-[#C8B69E] overflow-hidden cursor-pointer hover:scale-110 transition-transform shadow-lg bg-fl-lino"
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
              <span style={{ fontFamily: 'var(--fl-serif)', fontSize: 16, letterSpacing: '0.18em', textTransform: 'uppercase', color: WHITE }}>{nombreMarca}</span>
            </div>
            {esEmpresa && <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>Inteligencia artificial aplicada al arte.</p>}
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