import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { 
  Loader2, Plus, Calendar, Settings, Image as ImageIcon, Trash2, CheckCircle, 
  Lock, Unlock, Grid, Folder, Star, ArrowLeft, FolderInput, CheckCircle2, 
  ChevronLeft, ChevronRight as ChevronRightIcon, Eye, Heart, Maximize2, X, 
  PanelLeftClose, PanelLeft, UploadCloud, ChevronDown, ChevronUp, MapPin, 
  AlertTriangle, Zap, User, Copy, LogOut, Hash, UserMinus, Combine, Check, 
  ScanFace, ScanLine, Share2, Edit2, Columns, LayoutGrid, Square, Info, Camera, Sliders, HardDrive, Monitor, Smartphone, Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SAND   = '#C8B99A';
const TAUPE  = '#9A8F82';
const INK    = '#1C1C1C';
const CREAM  = '#FDFCF8'; 
const WHITE  = '#FFFFFF';
const BORDER = 'rgba(0,0,0,0.06)';

const DOMINIO_R2 = import.meta.env.VITE_R2_DOMINIO || 'https://pub-c4c062c3f8754b2d9ff6de40e9d6d713.r2.dev'; 
const MODAL_API_URL = "https://flashealogrp-coder--flashealo-ia-produccion-webhook-react.modal.run";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://muvzhnnsdnztlhynuipd.supabase.co";

const getUrlCompleta = (ruta) => {
  if (!ruta) return null;
  if (ruta.includes('http')) return ruta;
  if (ruta.includes('/portadas/') || ruta.includes('/logos/')) return `${SUPABASE_URL}/storage/v1/object/public/assets/${ruta}`;
  return `${DOMINIO_R2}/${ruta}`;
};

// 🌟 Generador de Slug inteligente y compacto
const generarSlugCorto = (texto) => {
  if (!texto) return '';
  const ignorar = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'en', 'por', 'para', 'con', 'y', 'a', 'al']);
  
  const palabras = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .replace(/[^a-z0-9\s-]/g, '')    // Quitar símbolos especiales
    .split(/\s+/)
    .filter(p => p.length > 0 && !ignorar.has(p));

  return palabras.slice(0, 4).join('-'); // Toma las primeras 4 palabras clave
};

const renderCoverUrl = (urlStr) => {
  if (!urlStr) return null;
  const [rawUrl] = urlStr.split('@');
  return getUrlCompleta(rawUrl);
};

const renderCoverPosition = (urlStr) => {
  if (!urlStr || !urlStr.includes('@')) return '50% 50%'; 
  const [, pos] = urlStr.split('@');
  return `${pos.split(',')[0]}% ${pos.split(',')[1]}%`;
};

const resolverUrlFoto = (foto, altaResolucion = false) => {
  if (!foto) return '';
  let ruta = altaResolucion ? foto.url_original : (foto.url_watermark || foto.url_original);
  if (!ruta) return '';
  if (ruta.startsWith('http')) return ruta;
  if (!altaResolucion && ruta.includes('originales/')) {
    ruta = ruta.replace('originales/', 'watermarks/');
  }
  return `${DOMINIO_R2}/${ruta}`;
};

const fotoUrlAux = (path, esWatermark = true) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  let ruta = path;
  
  if (esWatermark) {
    if (ruta.includes('originales/')) {
      ruta = ruta.replace('originales/', 'watermarks/');
    } else if (!ruta.includes('watermarks/')) {
      // 🌟 MAGIA: Si la ruta es solo "evento/foto.jpg", la forzamos a "evento/watermarks/foto.jpg"
      const partes = ruta.split('/');
      if (partes.length === 2) {
        ruta = `${partes[0]}/watermarks/${partes[1]}`;
      }
    }
  }
  return `${DOMINIO_R2}/${ruta}`;
};

const getBboxCoords = (bbox) => {
  if (!bbox) return null;
  try {
    let parsed = bbox;
    if (typeof bbox === 'string') {
      const jsonString = bbox.replace(/'/g, '"');
      parsed = JSON.parse(jsonString);
    }
    if (Array.isArray(parsed) && parsed.length >= 4) {
      return { x: parsed[0], y: parsed[1], w: parsed[2], h: parsed[3] };
    }
    if (parsed && typeof parsed.x === 'number') {
      if (parsed.w <= 0 || parsed.h <= 0) return null;
      return parsed;
    }
  } catch (e) { return null; }
  return null;
};

const expandBbox = (originalBox) => {
  if (!originalBox) return null;
  let nw = originalBox.w * 2.2; 
  let nh = originalBox.h * 3.8; 
  let nx = originalBox.x - (nw - originalBox.w) / 2;
  let ny = originalBox.y - (originalBox.h * 0.4); 
  
  nx = Math.max(0, nx); ny = Math.max(0, ny);
  if (nx + nw > 100) nw = 100 - nx;
  if (ny + nh > 100) nh = 100 - ny;
  
  return { x: nx, y: ny, w: nw, h: nh };
};

const BoundingBox = ({ bbox, color, label, esCuerpo }) => {
  const box = getBboxCoords(bbox);
  if (!box) return null;
  return (
    <div className="absolute z-10 pointer-events-none transition-all duration-300 group" style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}>
      <div className="absolute inset-0 border-[2px] rounded-sm transition-colors duration-300" style={{ borderColor: color, borderStyle: esCuerpo ? 'dashed' : 'solid', boxShadow: esCuerpo ? 'none' : `0 0 12px ${color}88` }} />
      {!esCuerpo && label && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/90 px-2 py-0.5 rounded-sm whitespace-nowrap">
          <span className="text-white text-[9px] uppercase tracking-widest">{label}</span>
        </div>
      )}
    </div>
  );
};

export default function AdminDashboard() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargandoLogin, setCargandoLogin] = useState(true);

  const [sidebarTab, setSidebarTab] = useState('colecciones'); 
  const [sidebarOpen, setSidebarOpen] = useState(true); 
  const [vista, setVista] = useState('grid'); 
  const [filtroGrid, setFiltroGrid] = useState('social'); 

  const [listaEventos, setListaEventos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  
  const [eventoEditandoId, setEventoEditandoId] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', url_slug: '', tipo_reconocimiento: 'hibrido', password_cliente: '', fecha_evento: '', ubicacion: '', titulo_about: '', descripcion: '' });
  const [seccionAbierta, setSeccionAbierta] = useState('datos');
  const [portadaFile, setPortadaFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const [mostrarConfirmacionBorrar, setMostrarConfirmacionBorrar] = useState(false);
  const [textoConfirmacion, setTextoConfirmacion] = useState('');

  const [eventoActivo, setEventoActivo] = useState(null);
  const [carpetas, setCarpetas] = useState([]);
  const [carpetaActiva, setCarpetaActiva] = useState(null);
  const [fotosEvento, setFotosEvento] = useState([]);
  const [fotosSeleccionadas, setFotosSeleccionadas] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [mostrarExif, setMostrarExif] = useState(true); // Panel EXIF abierto por defecto
  const [fotoHdCargada, setFotoHdCargada] = useState(false); // Control de carga progresiva
  const [mostrarModalMover, setMostrarModalMover] = useState(false);

  // 🌟 ESTADOS PARA EL VISOR DE GALERÍA Y FILTROS 🌟
  const [layoutModo, setLayoutModo] = useState('grid-small'); // 'masonry' | 'grid-small' | 'grid-big' | 'single'
  const [separarFavoritas, setSepararFavoritas] = useState(false);

  const [modalPortada, setModalPortada] = useState(null); 
  const [portadaPos, setPortadaPos] = useState({ x: 50, y: 50 });
  const [isDraggingPortada, setIsDraggingPortada] = useState(false);
  const dragStart = useRef(null);

  const [mostrarUploader, setMostrarUploader] = useState(false);
  const [archivosUploader, setArchivosUploader] = useState([]);
  const [estadoSubida, setEstadoSubida] = useState({ activa: false, progreso: 0, total: 0 });
  const [arrastrando, setArrastrando] = useState(false);
  const fileInputRef = useRef(null);
  const [procesandoIA, setProcesandoIA] = useState(false);

  const [seccionDashboard, setSeccionDashboard] = useState('fotos'); 
  const [subTabIA, setSubTabIA] = useState('identidades'); 
  const [scrolledPastBanner, setScrolledPastBanner] = useState(false);

  const [statsIA, setStatsIA] = useState({ caras: 0, dorsales: 0, dudas: 0, cargando: false });
  const [listaJugadores, setListaJugadores] = useState([]);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [fotosDelJugador, setFotosDelJugador] = useState([]);
  const [cargandoPerfiles, setCargandoPerfiles] = useState(false);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombreTemporal, setNombreTemporal] = useState('');
  const [fusionando, setFusionando] = useState(false);
  const [candidatosFusion, setCandidatosFusion] = useState([]);

  const [listaCorredores, setListaCorredores] = useState([]);
  const [corredorSeleccionado, setCorredorSeleccionado] = useState(null);
  const [fotosDelCorredor, setFotosDelCorredor] = useState([]);
  const [dorsalTemporal, setDorsalTemporal] = useState('');

  const [fotoDudosa, setFotoDudosa] = useState(null);
  const [candidatosDuda, setCandidatosDuda] = useState([]);
  const [cargandoDudas, setCargandoDudas] = useState(false);
  const [zoomCara, setZoomCara] = useState(null);

  // 🌟 Estados para el Módulo de Personalización UI
  const [subTabDiseno, setSubTabDiseno] = useState('cover'); // 'cover' | 'tipografia' | 'color' | 'grid' | 'ia'
  const [disenoDispositivo, setDisenoDispositivo] = useState('web'); // 'web' | 'mobile'

  const mainRef = useRef(null);
  const prevSeccion = useRef(seccionDashboard);
  const [isDisenoLocked, setIsDisenoLocked] = useState(false);

  const mockScrollRef = useRef(null);
  const iaSectionRef = useRef(null);

  // Configuración de UI sincronizada con la columna configuracion_ui de Supabase
  const [configUi, setConfigUi] = useState({
    estilo_portada: 'hero_full', // 'hero' | 'split' | 'editorial' | 'card'
    posicion_titulo: 'centro', // 'centro' | 'izquierda' | 'abajo_izquierda'
    opacidad_overlay: 50,
    fuente_titulo: 'serif', // 'serif' | 'sans' | 'mono'
    tamano_titulo: 'gigante', // 'normal' | 'grande' | 'gigante'
    color_fondo: '#FDFCF8',
    color_texto: '#1C1C1C',
    color_acento: '#C8B99A',
    modo_grid_default: 'editorial', // 'editorial' | 'pinterest' | 'large'
    placeholder_buscador: 'Busca tus fotos o ingresa tu nombre...',
    estilo_avatares: 'circulo_dorado' // 'circulo_dorado' | 'cuadrado_minimal'
  });

  // Cargar la configuración UI cuando se selecciona un evento activo
  useEffect(() => {
    if (eventoActivo && eventoActivo.configuracion_ui) {
      setConfigUi(prev => ({ ...prev, ...eventoActivo.configuracion_ui }));
    }
  }, [eventoActivo]);

  useEffect(() => {
    if (seccionDashboard === 'diseno' && subTabDiseno === 'ia' && mockScrollRef.current) {
      setTimeout(() => {
        mockScrollRef.current.scrollTo({
          top: mockScrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 150);
    }
  }, [seccionDashboard, subTabDiseno]);



  // Función para guardar los cambios de diseño en Supabase
  const guardarConfiguracionUi = async (nuevaConfig) => {
    const configActualizada = nuevaConfig || configUi;
    setConfigUi(configActualizada);
    if (!eventoActivo) return;
    
    await supabase
      .from('eventos')
      .update({ configuracion_ui: configActualizada })
      .eq('id', eventoActivo.id);
      
    setMensaje({ tipo: 'exito', texto: 'Ajustes de diseño guardados correctamente.' });
  };

useEffect(() => {
    if (!mainRef.current) {
      prevSeccion.current = seccionDashboard;
      return;
    }
    
    if (seccionDashboard === 'diseno') {
      // 1. Al entrar a diseño, auto-scrolleamos suavemente para ocultar el banner
      mainRef.current.scrollTo({ top: 220, behavior: 'smooth' });
      
      // 2. Bloqueamos el scroll justo cuando termine la animación de bajar
      const timer = setTimeout(() => setIsDisenoLocked(true), 400);
      prevSeccion.current = seccionDashboard;
      return () => clearTimeout(timer);
    } else {
      // 3. Al salir a fotos o IA, soltamos el candado
      setIsDisenoLocked(false);
      
      // 4. Si veníamos de diseño, subimos de vuelta al banner
      if (prevSeccion.current === 'diseno') {
        mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      prevSeccion.current = seccionDashboard;
    }
  }, [seccionDashboard]);




  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setCargandoLogin(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setLightboxIndex(null); // Cierra la foto gigante
          setZoomCara(null);      // Cierra la lupa de IA si está abierta
          // Agrega aquí cualquier otro estado de modal que quieras cerrar
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

  useEffect(() => {
  setFotoHdCargada(false);
  }, [lightboxIndex]);  




  useEffect(() => {
    if (!eventoActivo) return;
    const canal = supabase.channel('cambios-fotos')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fotografias', filter: `evento_id=eq.${eventoActivo.id}` },
        (payload) => setFotosEvento((prev) => prev.map(f => f.id === payload.new.id ? payload.new : f))
      ).subscribe();
    return () => supabase.removeChannel(canal);
  }, [eventoActivo]);

  useEffect(() => { if(session) cargarEventos(); }, [session]);
  useEffect(() => { setSidebarOpen(vista !== 'dashboard'); }, [vista]);
  useEffect(() => {
    if (mensaje.texto) {
      const timer = setTimeout(() => setMensaje({ tipo: '', texto: '' }), 6000); 
      return () => clearTimeout(timer); 
    }
  }, [mensaje]);

  useEffect(() => {
    const handleGlobalPointerUp = () => { setIsDraggingPortada(false); dragStart.current = null; };
    if (isDraggingPortada) {
      window.addEventListener('pointerup', handleGlobalPointerUp); window.addEventListener('pointercancel', handleGlobalPointerUp);
      return () => { window.removeEventListener('pointerup', handleGlobalPointerUp); window.removeEventListener('pointercancel', handleGlobalPointerUp); };
    }
  }, [isDraggingPortada]);

  // Si cambiamos de carpeta, desactivar la separación de favoritas si no hay
  useEffect(() => {
    const currentFolderPhotos = fotosEvento.filter(f => f.carpeta_id === carpetaActiva?.id);
    if (!currentFolderPhotos.some(f => f.es_favorita)) {
      setSepararFavoritas(false);
    }
  }, [carpetaActiva, fotosEvento]);

  const iniciarSesion = async (e) => {
    e.preventDefault(); setCargandoLogin(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Credenciales incorrectas");
    setCargandoLogin(false);
  };
  const cerrarSesion = async () => { await supabase.auth.signOut(); };

  const copiarEnlacePublico = () => {
    if (!eventoActivo) return;
    const slug = eventoActivo.url_slug || eventoActivo.id;
    const url = `${window.location.origin}/g/${slug}`;
    navigator.clipboard.writeText(url);
    setMensaje({ tipo: 'exito', texto: 'Enlace copiado al portapapeles. ¡Listo para compartir!' });
  };

  const cargarEventos = async () => {
    setCargando(true);
    const { data } = await supabase.from('eventos').select('*').order('created_at', { ascending: false });
    if (data) setListaEventos(data);
    setCargando(false);
  };

  const guardarEvento = async (e) => {
    e.preventDefault(); setCargando(true);
    let finalPortadaUrl = formData.portada_url; let finalLogoUrl = formData.logo_url;
    try {
      if (portadaFile) {
        const fileName = `${Date.now()}_portada.${portadaFile.name.split('.').pop()}`;
        const { error: errP } = await supabase.storage.from('assets').upload(`portadas/${fileName}`, portadaFile);
        if (errP) throw errP;
        finalPortadaUrl = `portadas/${fileName}`;
      }
      if (logoFile) {
        const fileName = `${Date.now()}_logo.${logoFile.name.split('.').pop()}`;
        const { error: errL } = await supabase.storage.from('assets').upload(`logos/${fileName}`, logoFile);
        if (errL) throw errL;
        finalLogoUrl = `logos/${fileName}`;
      }
      const datosGuardar = { ...formData, portada_url: finalPortadaUrl, logo_url: finalLogoUrl };
      
      Object.keys(datosGuardar).forEach(key => { if (datosGuardar[key] === '') datosGuardar[key] = null; });
      if (!eventoEditandoId) delete datosGuardar.id; 

      if (eventoEditandoId) {
        await supabase.from('eventos').update(datosGuardar).eq('id', eventoEditandoId);
        setMensaje({ tipo: 'exito', texto: 'Colección actualizada' });
      } else {
        await supabase.from('eventos').insert([datosGuardar]);
        setMensaje({ tipo: 'exito', texto: 'Colección creada exitosamente' });
      }
      await cargarEventos(); setVista('grid'); setPortadaFile(null); setLogoFile(null); setEventoEditandoId(null);
    } catch (error) { 
      setMensaje({ tipo: 'error', texto: `Error en Base de Datos: ${error.message || 'No se pudo guardar.'}` }); 
    }
    setCargando(false);
  };

  const eliminarColeccionCompleta = async () => {
    if (textoConfirmacion !== formData.nombre) return;
    setCargando(true);
    try {
      const prefijoCarpeta = formData.url_slug || formData.id; 
      await supabase.from('eventos').delete().eq('id', eventoEditandoId);
      try { await fetch(MODAL_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "eliminar_coleccion", prefijo: prefijoCarpeta }) }); } catch (err) { }
      setMensaje({ tipo: 'exito', texto: 'Colección e imágenes eliminadas.' });
      setVista('grid'); setEventoEditandoId(null); setMostrarConfirmacionBorrar(false); setTextoConfirmacion(''); await cargarEventos();
    } catch (error) { setMensaje({ tipo: 'error', texto: `Error al eliminar: ${error.message}` }); }
    setCargando(false);
  };

  const entrarAlEvento = async (ev) => {
    setEventoActivo(ev); setFotosSeleccionadas([]); setSeccionDashboard('fotos'); setVista('dashboard'); setScrolledPastBanner(false);
    let { data: carpetasData } = await supabase.from('carpetas_evento').select('*').eq('evento_id', ev.id).order('created_at', { ascending: true });
    if (!carpetasData || carpetasData.length === 0) {
      const { data: nuevaCarpeta } = await supabase.from('carpetas_evento').insert([{ evento_id: ev.id, nombre: 'Highlights' }]).select();
      carpetasData = nuevaCarpeta;
    }
    setCarpetas(carpetasData); setCarpetaActiva(carpetasData[0]);
    const { data: fotosData } = await supabase.from('fotografias').select('*').eq('evento_id', ev.id);
    if (fotosData) setFotosEvento(fotosData);
    cargarStatsIA(ev.id);
  };

  const cargarStatsIA = async (eventoId, silencioso = false) => {
    if (!silencioso) setStatsIA(prev => ({ ...prev, cargando: true }));
    const evId = eventoId || eventoActivo?.id;
    if (!evId) return;
    const [resCaras, resDorsales, resDudas] = await Promise.all([
      supabase.from('identities').select('id', { count: 'exact' }).eq('evento_id', evId),
      supabase.from('etiquetas_fotos').select('id', { count: 'exact' }).eq('evento_id', evId),
      supabase.from('face_detections').select('id', { count: 'exact' }).eq('evento_id', evId).is('identity_id', null)
    ]);
    setStatsIA({ caras: resCaras.count || 0, dorsales: resDorsales.count || 0, dudas: resDudas.count || 0, cargando: false });
  };

  const cargarJugadores = useCallback(async () => { 
    if (!eventoActivo) return;
    setCargandoPerfiles(true);
    const { data } = await supabase.from('identities').select('id, display_name, avatar_url, embedding_promedio').eq('evento_id', eventoActivo.id).order('display_name');
    if (data) { setListaJugadores(data); if (data.length > 0 && !jugadorSeleccionado) seleccionarJugador(data[0]); }
    setCargandoPerfiles(false);
  }, [eventoActivo, jugadorSeleccionado]);

  const seleccionarJugador = async (jugador) => { 
    setJugadorSeleccionado(jugador); setEditandoNombre(false); setFusionando(false); setCargandoPerfiles(true);
    const { data } = await supabase.from('face_detections').select('*').eq('identity_id', jugador.id).eq('evento_id', eventoActivo.id);
    if (data) {
      const mapa = {};
      data.forEach(det => {
        const key = det.photo_url;
        if (!mapa[key]) mapa[key] = { photo_url: key, detecciones: [] };
        mapa[key].detecciones.push(det);
      });
      setFotosDelJugador(Object.values(mapa));
    }
    setCargandoPerfiles(false);
  };

  const guardarNombreJugador = async () => {
    if (!nombreTemporal.trim() || !jugadorSeleccionado) return;
    await supabase.from('identities').update({ display_name: nombreTemporal.trim() }).eq('id', jugadorSeleccionado.id);
    setJugadorSeleccionado(prev => ({ ...prev, display_name: nombreTemporal.trim() }));
    setListaJugadores(prev => prev.map(j => (j.id === jugadorSeleccionado.id ? { ...j, display_name: nombreTemporal.trim() } : j)));
    setEditandoNombre(false);
  };

  const iniciarFusion = async () => {
    setFusionando(true);
    if (jugadorSeleccionado?.embedding_promedio && eventoActivo) {
      const { data } = await supabase.rpc('sugerir_candidatos', { huella_dudosa: jugadorSeleccionado.embedding_promedio, limite_resultados: 4, id_evento: eventoActivo.id });
      setCandidatosFusion((data || []).filter(s => s.id_identidad !== jugadorSeleccionado.id));
    }
  };

const fusionarConJugador = async (idDestino) => {
    // 1. Guardamos la ruta del avatar físico antes de borrar el registro
    const avatarABorrar = jugadorSeleccionado.avatar_url;

    // 2. Reasignamos las fotos y borramos el perfil clonado en la BD
    await supabase.from('face_detections').update({ identity_id: idDestino }).eq('identity_id', jugadorSeleccionado.id);
    await supabase.from('identities').delete().eq('id', jugadorSeleccionado.id);
    
    // 3. 🌟 DISPARAMOS EL BORRADO FÍSICO EN CLOUDFLARE R2
    if (avatarABorrar && !avatarABorrar.includes('default.jpg')) {
      try {
        await fetch(MODAL_API_URL, { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ accion: "eliminar_fotos", rutas: [avatarABorrar] }) 
        });
      } catch (err) { console.error("Error borrando avatar físico:", err); }
    }

    setJugadorSeleccionado(null); 
    cargarJugadores(); 
    cargarStatsIA(eventoActivo.id, true);
  };

const destruirPerfilFalso = async () => {
    // 1. Guardamos la ruta del avatar físico
    const avatarABorrar = jugadorSeleccionado.avatar_url;

    // 2. Borramos las detecciones basura y el perfil en la BD
    await supabase.from('face_detections').delete().eq('identity_id', jugadorSeleccionado.id);
    await supabase.from('identities').delete().eq('id', jugadorSeleccionado.id);
    
    // 3. 🌟 DISPARAMOS EL BORRADO FÍSICO EN CLOUDFLARE R2
    if (avatarABorrar && !avatarABorrar.includes('default.jpg')) {
      try {
        await fetch(MODAL_API_URL, { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ accion: "eliminar_fotos", rutas: [avatarABorrar] }) 
        });
      } catch (err) { console.error("Error borrando avatar físico:", err); }
    }

    setJugadorSeleccionado(null); 
    cargarJugadores(); 
    cargarStatsIA(eventoActivo.id, true);
  };

  const cargarCorredores = useCallback(async () => {
    if (!eventoActivo) return;
    setCargandoPerfiles(true);
    const { data } = await supabase.from('corredores').select('*').eq('evento_id', eventoActivo.id);
    setListaCorredores(data || []);
    if (data?.length > 0 && !corredorSeleccionado) seleccionarCorredor(data[0]);
    setCargandoPerfiles(false);
  }, [eventoActivo, corredorSeleccionado]);

  const seleccionarCorredor = async (corredor) => {
    setCorredorSeleccionado(corredor); setCargandoPerfiles(true);
    const { data } = await supabase.from('etiquetas_fotos').select('*').eq('corredor_id', corredor.id);
    setFotosDelCorredor(data || []); setDorsalTemporal(corredor.dorsal || '');
    setCargandoPerfiles(false);
  };

  const guardarDorsalGlobal = async () => {
    const num = dorsalTemporal.trim().toUpperCase();
    if (!corredorSeleccionado || num === (corredorSeleccionado.dorsal || '')) return;
    await supabase.from('corredores').update({ dorsal: num }).eq('id', corredorSeleccionado.id);
    await supabase.from('etiquetas_fotos').update({ dorsal: num }).eq('corredor_id', corredorSeleccionado.id);
    setCorredorSeleccionado(prev => ({ ...prev, dorsal: num }));
    setListaCorredores(prev => prev.map(c => c.id === corredorSeleccionado.id ? { ...c, dorsal: num } : c));
  };

  const cargarDudas = useCallback(async () => {
    if (!eventoActivo) return;
    setCargandoDudas(true);
    const { data } = await supabase.from('face_detections').select('*').eq('evento_id', eventoActivo.id).is('identity_id', null).limit(1);
    if (data && data.length > 0) {
      setFotoDudosa(data[0]);
      const { data: sugerencias } = await supabase.rpc('sugerir_candidatos', { huella_dudosa: data[0].embedding, limite_resultados: 3, id_evento: eventoActivo.id });
      setCandidatosDuda(sugerencias || []);
    } else { setFotoDudosa(null); }
    setCargandoDudas(false);
  }, [eventoActivo]);

    useEffect(() => {
    // 1. Cargar datos si estamos en la vista de Dashboard IA tradicional
    if (seccionDashboard === 'ia') {
      if (subTabIA === 'identidades') cargarJugadores();
      else if (subTabIA === 'corredores') cargarCorredores();
      else if (subTabIA === 'dudas') cargarDudas();
    }
    
    // 2. Cargar datos Y hacer Auto-Scroll si estamos en el Preview de Diseño IA
    if (seccionDashboard === 'diseno' && subTabDiseno === 'ia') {
      cargarJugadores(); // Trae las caras reales para el Preview
      
      // La "Magia" del auto-scroll directo al Módulo IA
      if (iaSectionRef.current) {
        setTimeout(() => {
          iaSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300); // Pequeño retraso para que renderice primero
      }
    }
  }, [seccionDashboard, subTabIA, subTabDiseno, cargarJugadores, cargarCorredores, cargarDudas]);

  const crearNuevaCarpeta = async () => {
    const nombre = window.prompt("Nombre de la nueva carpeta:");
    if (!nombre) return;
    const { data } = await supabase.from('carpetas_evento').insert([{ evento_id: eventoActivo.id, nombre }]).select();
    if (data) { setCarpetas([...carpetas, data[0]]); setCarpetaActiva(data[0]); }
  };

  const manejarSeleccionArchivos = (e) => { setArchivosUploader(prev => [...prev, ...Array.from(e.target.files)]); };
  const prevenirDefault = (e) => { e.preventDefault(); e.stopPropagation(); };

  const procesarEntry = (entry, filesArray) => {
    return new Promise((resolve) => {
      if (entry.isFile) { entry.file(file => { if (file.type.startsWith('image/')) filesArray.push(file); resolve(); }); } 
      else if (entry.isDirectory) { const dirReader = entry.createReader(); dirReader.readEntries(async (entries) => { for (let i = 0; i < entries.length; i++) await procesarEntry(entries[i], filesArray); resolve(); }); } 
      else resolve();
    });
  };

  const manejarDrop = async (e) => {
    prevenirDefault(e); setArrastrando(false);
    const items = e.dataTransfer.items; let nuevosArchivos = [];
    if (items) { for (let i = 0; i < items.length; i++) { const item = items[i]; if (item.kind === 'file') { const entry = item.webkitGetAsEntry(); if (entry) await procesarEntry(entry, nuevosArchivos); } } } 
    else { const files = Array.from(e.dataTransfer.files); nuevosArchivos = files.filter(file => file.type.startsWith('image/')); }
    if(nuevosArchivos.length > 0) setArchivosUploader(prev => [...prev, ...nuevosArchivos]);
  };

  const iniciarSubidaMasiva = async () => {
    if (archivosUploader.length === 0 || !carpetaActiva) return;
    setEstadoSubida({ activa: true, progreso: 0, total: archivosUploader.length });
    let subidasExitosas = 0;
    const baseR2Path = `${eventoActivo.url_slug || eventoActivo.id}/${carpetaActiva.nombre.toLowerCase().replace(/ /g, '-')}`;

    for (let i = 0; i < archivosUploader.length; i++) {
      const file = archivosUploader[i];
      try {
        const resURL = await fetch("/api/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, fileType: file.type, carpetaR2: baseR2Path }) });
        const data = await resURL.json();
        const uploadRes = await fetch(data.url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (uploadRes.ok) { await supabase.from('fotografias').insert([{ evento_id: eventoActivo.id, carpeta_id: carpetaActiva.id, url_original: data.path }]); subidasExitosas++; }
      } catch (error) {}
      setEstadoSubida(prev => ({ ...prev, progreso: i + 1 }));
    }

    const { data: fotosNuevas } = await supabase.from('fotografias').select('*').eq('evento_id', eventoActivo.id);
    if (fotosNuevas) setFotosEvento(fotosNuevas);
    setArchivosUploader([]); setEstadoSubida({ activa: false, progreso: 0, total: 0 }); setMostrarUploader(false);
    setMensaje({ tipo: 'exito', texto: `${subidasExitosas} fotos subidas. Optimizando en la nube...` });
    try { await fetch(MODAL_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evento_id: eventoActivo.id, accion: "miniaturas" }) }); } catch (err) {}
  };

  const dispararInteligenciaArtificial = async () => {
    if (!eventoActivo) return;
    setProcesandoIA(true);
    try {
      await fetch(MODAL_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evento_id: eventoActivo.id, accion: "ia", tipo_reconocimiento: eventoActivo.tipo_reconocimiento }) });
      setMensaje({ tipo: 'exito', texto: `¡IA Desplegada! Analizando imágenes...` });
      setTimeout(() => { cargarStatsIA(eventoActivo.id, true); setProcesandoIA(false); }, 5000);
    } catch (error) { setMensaje({ tipo: 'error', texto: 'Error al conectar con la IA.' }); setProcesandoIA(false); }
  };

  const toggleFotoSeleccion = (fotoId, e) => { e.stopPropagation(); setFotosSeleccionadas(prev => prev.includes(fotoId) ? prev.filter(id => id !== fotoId) : [...prev, fotoId]); };
  const toggleFavorito = async (fotoId, e) => { e?.stopPropagation(); const foto = fotosEvento.find(f => f.id === fotoId); if (!foto) return; const nuevoEstado = !foto.es_favorita; setFotosEvento(prev => prev.map(f => f.id === fotoId ? { ...f, es_favorita: nuevoEstado } : f)); await supabase.from('fotografias').update({ es_favorita: nuevoEstado }).eq('id', fotoId); };
  
  const borrarFotos = async (ids) => {
    const fotosABorrar = fotosEvento.filter(f => ids.includes(f.id));
    const rutasR2 = fotosABorrar.map(f => f.url_original);
    await supabase.from('fotografias').delete().in('id', ids);
    setFotosEvento(prev => prev.filter(f => !ids.includes(f.id)));
    setFotosSeleccionadas([]); setLightboxIndex(null);
    setMensaje({ tipo: 'exito', texto: 'Fotografías eliminadas permanentemente.' });
    if (rutasR2.length > 0) {
      try { await fetch(MODAL_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "eliminar_fotos", rutas: rutasR2 }) }); } catch (err) {}
    }
  };

  const moverFotosASet = async (nuevaCarpetaId) => {
    await supabase.from('fotografias').update({ carpeta_id: nuevaCarpetaId }).in('id', fotosSeleccionadas);
    setFotosEvento(prev => prev.map(f => fotosSeleccionadas.includes(f.id) ? { ...f, carpeta_id: nuevaCarpetaId } : f));
    setFotosSeleccionadas([]); setMostrarModalMover(false);
    setMensaje({ tipo: 'exito', texto: `Fotografías movidas correctamente.` });
  };

  const hacerPortada = async (url) => {
    await supabase.from('eventos').update({ portada_url: url }).eq('id', eventoActivo.id);
    setEventoActivo(prev => ({ ...prev, portada_url: url }));
    setListaEventos(prev => prev.map(ev => ev.id === eventoActivo.id ? { ...ev, portada_url: url } : ev));
    setMensaje({ tipo: 'exito', texto: 'Portada actualizada con su nuevo encuadre.' });
  };

  const handleMainScroll = (e) => {
    if (e.target.scrollTop > 160) {
      if (!scrolledPastBanner) setScrolledPastBanner(true);
    } else {
      if (scrolledPastBanner) setScrolledPastBanner(false);
    }
  };

  const handlePointerDown = (e) => {
    setIsDraggingPortada(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingPortada || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    dragStart.current = { x: e.clientX, y: e.clientY };

    setPortadaPos(prev => ({
      x: Math.min(100, Math.max(0, prev.x - (dx * 0.15))),
      y: Math.min(100, Math.max(0, prev.y - (dy * 0.15)))
    }));
  };

  // 🌟 COMPONENTE RENDERIZADOR DE FOTO DINÁMICO 🌟
  const RenderFotoItem = ({ foto, globalIdx }) => {
    const isSelected = fotosSeleccionadas.includes(foto.id);
    const procesandoMiniatura = !foto.url_watermark;

    let containerClass = "group relative rounded-sm overflow-hidden bg-[#E8E4DE] transition-all ";
    let imgClass = "transition-opacity duration-300 ";

    if (layoutModo === 'masonry') {
      containerClass += "mb-4 break-inside-avoid w-full block ";
      imgClass += "w-full h-auto block ";
    } else if (layoutModo === 'single') {
      containerClass += "w-full bg-[#FAFAFA] flex items-center justify-center py-4 mb-8 ";
      imgClass += "max-w-full max-h-[70vh] object-contain shadow-sm ";
    } else {
      // grid-small y grid-big (Mantienen el espacio sin deformar)
      containerClass += "aspect-square flex items-center justify-center ";
      imgClass += "max-w-full max-h-full object-contain ";
    }

    return (
      <div 
        key={foto.id} 
        className="group relative rounded-none overflow-hidden bg-transparent" 
        style={{ border: isSelected ? `3px solid ${SAND}` : '3px solid transparent' }}
      >
        <img 
          src={resolverUrlFoto(foto, false)} 
          alt="" 
          className="w-full h-full object-contain transition-opacity duration-300" 
        />
        
        {/* Capa de hover con cursor de dedito normal */}
        <div 
          className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" 
          onClick={() => setLightboxIndex(fotosActuales.findIndex(f => f.id === foto.id))}
        >
          {/* Botón de selección con opacidad baja (bg-white/40) */}
          <div className="absolute top-2 left-2 z-10" onClick={(e) => toggleFotoSeleccion(foto.id, e)}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all hover:bg-white ${isSelected ? 'bg-[#C8B99A]' : 'bg-white/40'}`}>
              {isSelected && <Check size={14} color={WHITE} />}
            </div>
          </div>
          
          {/* Corazón con opacidad baja */}
          <div className="absolute bottom-2 right-2 z-10" onClick={(e) => toggleFavorito(foto.id, e)}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/40 hover:bg-white transition-all">
                <Heart size={14} fill={foto.es_favorita ? '#E74C3C' : 'none'} color={foto.es_favorita ? '#E74C3C' : INK} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 🌟 FUNCIÓN PARA RENDERIZAR LA GALERÍA (CON O SIN SECCIÓN DE FAVORITAS) 🌟
  const GalleryLayout = ({ fotos, title }) => {
    if (fotos.length === 0) return null;

    let gridClass = "";
    if (layoutModo === 'masonry') gridClass = "columns-2 md:columns-3 lg:columns-5 gap-4";
    else if (layoutModo === 'grid-small') gridClass = "grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-3";
    else if (layoutModo === 'grid-big') gridClass = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6";
    else if (layoutModo === 'single') gridClass = "flex flex-col items-center";

    return (
      <div className="mb-12">
        {title && <h3 className="text-[10px] uppercase tracking-widest text-[#9A8F82] mb-6 font-bold flex items-center gap-2">{title} <span className="px-2 py-0.5 bg-[#E8E4DE] text-[#1C1C1C] rounded-sm">{fotos.length}</span></h3>}
        <div className={gridClass}>
          {fotos.map((foto) => {
            const globalIdx = fotosActuales.findIndex(f => f.id === foto.id);
            return <RenderFotoItem key={foto.id} foto={foto} globalIdx={globalIdx} />;
          })}
        </div>
      </div>
    );
  };


  if (cargandoLogin) return <div className="h-screen w-full flex items-center justify-center bg-[#FDFCF8]"><Loader2 className="animate-spin text-[#9A8F82]" size={32}/></div>;
  if (!session) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#FDFCF8] font-sans">
        <div className="bg-white p-12 shadow-2xl border border-black/5 w-full max-w-md">
          <div className="text-center mb-8"><span className="w-4 h-12 bg-[#C8B99A] inline-block mb-4"></span><h1 className="text-3xl font-serif text-[#1C1C1C]">Flashealo</h1><p className="text-[10px] uppercase tracking-[0.3em] text-[#9A8F82] mt-2">Acceso Administrativo</p></div>
          <form onSubmit={iniciarSesion} className="flex flex-col gap-5">
            <input type="email" placeholder="Correo electrónico" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-4 bg-[#FDFCF8] outline-none border-b border-black/10 focus:border-black transition-colors" />
            <input type="password" placeholder="Contraseña" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-4 bg-[#FDFCF8] outline-none border-b border-black/10 focus:border-black transition-colors" />
            <button type="submit" className="w-full bg-[#1C1C1C] text-white p-4 text-xs uppercase tracking-widest font-bold mt-4 hover:bg-black transition-colors">Ingresar al Sistema</button>
          </form>
        </div>
      </div>
    );
  }

  const fotosActuales = carpetaActiva ? fotosEvento.filter(f => f.carpeta_id === carpetaActiva.id) : [];
  const fotosFavoritas = fotosActuales.filter(f => f.es_favorita);
  const fotosRestantes = fotosActuales.filter(f => !f.es_favorita);
  
  const iaEjecutada = statsIA.caras > 0 || statsIA.dorsales > 0 || statsIA.dudas > 0;

  return (
    <div style={{ display: 'flex', height: '100vh', background: CREAM, color: INK, fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      
      {/* ─── BARRA LATERAL PRINCIPAL ─── */}
      <aside style={{ width: sidebarOpen ? 240 : 64, background: WHITE, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', zIndex: 50, flexShrink: 0, transition: 'width 0.25s ease' }}>
        <div style={{ padding: sidebarOpen ? '0 16px 0 20px' : '0', height: 64, display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center', borderBottom: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          {sidebarOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 2, height: 18, background: SAND, flexShrink: 0, borderRadius: 1 }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 15, letterSpacing: '0.15em', textTransform: 'uppercase', color: INK, lineHeight: 1 }}>Flashealo</span>
                <span style={{ fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: TAUPE, marginTop: 3 }}>Admin</span>
              </div>
            </div>
          ) : <span style={{ width: 3, height: 20, background: SAND, borderRadius: 1 }} />}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TAUPE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 4, transition: 'all 0.2s' }}>
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          </button>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, marginTop: 12 }}>
          <button onClick={() => { setVista('grid'); setEventoActivo(null); }} className="flex items-center w-full p-3 hover:bg-gray-50 transition-colors" style={{ color: !eventoActivo ? INK : TAUPE, paddingLeft: sidebarOpen ? 20 : 0, justifyContent: sidebarOpen ? 'flex-start' : 'center' }}>
            <Grid size={18} strokeWidth={1.5}/> {sidebarOpen && <span className="ml-3 text-[13px]">Colecciones</span>}
          </button>
        </nav>
        <div className="p-4 border-t" style={{ borderColor: BORDER }}>
          <button onClick={cerrarSesion} className="flex items-center text-xs text-gray-500 hover:text-red-500 transition-colors" style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}>
            <LogOut size={16} /> {sidebarOpen && <span className="ml-2 uppercase tracking-widest">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* ─── ÁREA DE CONTENIDO ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        
        {/* CABECERA GLOBAL SUPERIOR */}
        <header style={{ height: vista === 'dashboard' ? 48 : 64, flexShrink: 0, background: WHITE, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 40, transition: 'height 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {(vista === 'form' || vista === 'dashboard') && (
              <button onClick={() => { vista === 'form' && eventoActivo ? setVista('dashboard') : setVista('grid') }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: TAUPE, fontSize: 12, fontWeight: 500 }}>
                <ArrowLeft size={14} /> Volver
              </button>
            )}
          </div>
          <AnimatePresence>
            {mensaje.texto && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ position: 'absolute', top: 16, right: 24, zIndex: 100, padding: '12px 20px', background: mensaje.tipo === 'error' ? '#E74C3C' : INK, fontSize: 12, color: WHITE, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                {mensaje.tipo === 'error' ? <AlertTriangle size={14} /> : <CheckCircle size={14} color={SAND} />} {mensaje.texto}
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* CONTENEDOR CON SCROLL GLOBAL */}
{/* CONTENEDOR CON SCROLL GLOBAL */}
          <main 
            ref={mainRef}
            onScroll={handleMainScroll} 
            style={{ 
              flex: 1, 
              overflowY: isDisenoLocked ? 'hidden' : 'auto', // 🌟 Se oculta sutilmente sin romper el scroll 
              background: '#FAFAFA' 
            }} 
            className="custom-scrollbar"
          >        
          {vista === 'grid' && (
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1 style={{ fontSize: 24, fontWeight: 400, fontFamily: 'Georgia, serif', margin: 0 }}>Colecciones</h1>
                <button onClick={() => { 
                  setEventoEditandoId(null); 
                  setFormData({ 
                    nombre: '', 
                    url_slug: '', 
                    categoria: 'sport',
                    estado: 'activo',
                    tipo_reconocimiento: 'facial', // 🌟 Predeterminado Facial
                    fecha_evento: '', 
                    ubicacion: '', 
                    titulo_about: '', 
                    descripcion: '',
                    password_cliente: '',
                    es_gratis: true, // 🌟 Predeterminado Gratuito
                    requiere_pago_para_ver: false,
                    moneda: 'DOP',
                    precio_galeria: 0,
                    precio_foto: 0
                  });
                  setPortadaFile(null); 
                  setLogoFile(null); 
                  setSeccionAbierta('datos'); 
                  setVista('form'); 
                }} style={{ background: INK, color: WHITE, border: 'none', padding: '9px 18px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={14} /> Crear Colección
                </button>
              </div>
              <div style={{ display: 'flex', gap: 24, borderBottom: `1px solid ${BORDER}`, marginBottom: 24 }}>
                <button onClick={() => setFiltroGrid('social')} style={{ background: 'none', border: 'none', padding: '0 0 10px 0', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: filtroGrid === 'social' ? 600 : 400, color: filtroGrid === 'social' ? INK : TAUPE, borderBottom: filtroGrid === 'social' ? `2px solid ${INK}` : '2px solid transparent', cursor: 'pointer' }}>Eventos y Bodas</button>
                <button onClick={() => setFiltroGrid('sport')} style={{ background: 'none', border: 'none', padding: '0 0 10px 0', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: filtroGrid === 'sport' ? 600 : 400, color: filtroGrid === 'sport' ? INK : TAUPE, borderBottom: filtroGrid === 'sport' ? `2px solid ${INK}` : '2px solid transparent', cursor: 'pointer' }}>Flashealo Sport</button>
              </div>
              {cargando ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><Loader2 size={24} className="animate-spin" color={TAUPE} /></div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                  {listaEventos.filter(e => filtroGrid === 'sport' ? e.tipo_reconocimiento === 'ocr' : e.tipo_reconocimiento !== 'ocr').map(ev => {
                    const esPrivado = ev.password_cliente && ev.password_cliente.trim() !== '';
                    return (
                      <div key={ev.id} onClick={() => entrarAlEvento(ev)} style={{ background: WHITE, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ height: 160, position: 'relative', background: '#E8E4DE' }}>
                          <img src={renderCoverUrl(ev.portada_url) || "https://images.unsplash.com/photo-1541534741688?w=800"} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: renderCoverPosition(ev.portada_url) }} />
                          <div style={{ position: 'absolute', top: 10, right: 10, background: esPrivado ? 'rgba(28,28,28,0.85)' : 'rgba(255,255,255,0.92)', color: esPrivado ? WHITE : INK, padding: '3px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {esPrivado ? <Lock size={10} color={SAND} /> : <Unlock size={10} color={TAUPE} />}
                            <span style={{ fontSize: 8, textTransform: 'uppercase', fontWeight: 600 }}>{esPrivado ? 'Privada' : 'Pública'}</span>
                          </div>
                        </div>
                        <div style={{ padding: 14 }}>
                          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px 0', color: INK }}>{ev.nombre}</h3>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {vista === 'form' && (
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px 80px' }}>
              <h1 className="text-3xl font-serif mb-8 text-[#1C1C1C]">
                {eventoEditandoId ? 'Ajustes del Evento' : 'Nueva Colección'}
              </h1>
              
              <form onSubmit={guardarEvento} className="bg-white p-8 border border-[#EAEAEA] shadow-sm flex flex-col gap-10">
                
                {/* --- SECCIÓN 1: INFORMACIÓN BÁSICA --- */}
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9A8F82] border-b border-[#EAEAEA] pb-2 mb-5">Información Básica</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] uppercase tracking-widest text-[#1C1C1C] font-bold mb-2 block">Nombre del Evento</label>
                      <input 
                        required 
                        value={formData.nombre} 
                        onChange={e => {
                          const nuevoNombre = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            nombre: nuevoNombre,
                            // 🌟 Genera el slug automáticamente al escribir el nombre si es una colección nueva
                            url_slug: eventoEditandoId ? prev.url_slug : generarSlugCorto(nuevoNombre)
                          }));
                        }} 
                        className="w-full p-3 bg-[#FDFCF8] outline-none border border-[#EAEAEA] focus:border-[#C8B99A] text-xl font-serif rounded-sm transition-colors" 
                        placeholder="Ej. Boda Maria y Jose / Maratón Santo Domingo"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-[#1C1C1C] font-bold mb-2 block">URL Personalizada (Slug Auto-generado)</label>
                      <input 
                        required 
                        value={formData.url_slug} 
                        onChange={e => setFormData({...formData, url_slug: e.target.value.toLowerCase().replace(/ /g, '-')})} 
                        className="w-full p-3 bg-[#FDFCF8] outline-none border border-[#EAEAEA] focus:border-[#C8B99A] font-serif rounded-sm transition-colors text-gray-700" 
                        placeholder="ejemplo: boda-maria-jose" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-[#1C1C1C] font-bold mb-2 block">Categoría</label>
                      <select value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} className="w-full p-3 bg-[#FDFCF8] outline-none border border-[#EAEAEA] focus:border-[#C8B99A] font-serif rounded-sm transition-colors">
                        <option value="sport">Deporte / Sport</option>
                        <option value="sesion_fotos">Sesión de Fotos</option> {/* 🌟 NUEVA OPCIÓN */}
                        <option value="social">Social / Fiesta</option>
                        <option value="boda">Bodas</option>
                        <option value="graduacion">Graduaciones</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-[#1C1C1C] font-bold mb-2 block">Fecha del Evento</label>
                      <input type="date" value={formData.fecha_evento || ''} onChange={e => setFormData({...formData, fecha_evento: e.target.value})} className="w-full p-3 bg-[#FDFCF8] outline-none border border-[#EAEAEA] focus:border-[#C8B99A] font-serif rounded-sm transition-colors" />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-[#1C1C1C] font-bold mb-2 block">Ubicación</label>
                      <input type="text" value={formData.ubicacion || ''} onChange={e => setFormData({...formData, ubicacion: e.target.value})} className="w-full p-3 bg-[#FDFCF8] outline-none border border-[#EAEAEA] focus:border-[#C8B99A] font-serif rounded-sm transition-colors" placeholder="Ej. Jarabacoa / Punta Cana" />
                    </div>
                  </div>
                </div>

                {/* --- SECCIÓN 2: PÁGINA PÚBLICA Y ARCHIVOS --- */}
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9A8F82] border-b border-[#EAEAEA] pb-2 mb-5">Página Pública y Presentación</h3>
                  <div className="flex flex-col gap-6">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-[#1C1C1C] font-bold mb-2 block">Título "Acerca Del Evento"</label>
                      <input type="text" value={formData.titulo_about || ''} onChange={e => setFormData({...formData, titulo_about: e.target.value})} className="w-full p-3 bg-[#FDFCF8] outline-none border border-[#EAEAEA] focus:border-[#C8B99A] font-serif rounded-sm transition-colors" placeholder="Ej. Fotografías oficiales del evento" />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-[#1C1C1C] font-bold mb-2 block">Descripción Completa</label>
                      <textarea value={formData.descripcion || ''} onChange={e => setFormData({...formData, descripcion: e.target.value})} rows={3} className="w-full p-3 bg-[#FDFCF8] outline-none border border-[#EAEAEA] focus:border-[#C8B99A] font-serif resize-none rounded-sm transition-colors" placeholder="Detalles o mensaje de bienvenida..." />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="border border-dashed border-[#C8B99A] bg-[#FDFCF8] p-4 flex flex-col items-center justify-center text-center rounded-sm">
                        <ImageIcon size={24} className="text-[#C8B99A] mb-2" />
                        <label className="text-[10px] uppercase tracking-widest text-[#1C1C1C] font-bold mb-2 cursor-pointer hover:underline">
                          Subir Portada (Banner)
                          <input type="file" accept="image/*" onChange={(e) => setPortadaFile(e.target.files[0])} className="hidden" />
                        </label>
                        <span className="text-xs text-gray-400">{portadaFile ? portadaFile.name : (formData.portada_url ? 'Ya tiene portada' : 'No seleccionada')}</span>
                      </div>

                      <div className="border border-dashed border-[#C8B99A] bg-[#FDFCF8] p-4 flex flex-col items-center justify-center text-center rounded-sm">
                        <Star size={24} className="text-[#C8B99A] mb-2" />
                        <label className="text-[10px] uppercase tracking-widest text-[#1C1C1C] font-bold mb-2 cursor-pointer hover:underline">
                          Subir Logo del Evento
                          <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} className="hidden" />
                        </label>
                        <span className="text-xs text-gray-400">{logoFile ? logoFile.name : (formData.logo_url ? 'Ya tiene logo' : 'No seleccionado')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* --- SECCIÓN 3: COMERCIALIZACIÓN Y ACCESO (AHORA ABAJO) --- */}
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9A8F82] border-b border-[#EAEAEA] pb-2 mb-5">Comercialización y Acceso</h3>
                  
                  {/* Selector de Gratuito / Pago */}
                  <div className="flex gap-8 mb-6 bg-[#FDFCF8] p-4 border border-[#EAEAEA] rounded-sm">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-sm border flex items-center justify-center transition-colors ${formData.es_gratis ? 'bg-[#C8B99A] border-[#C8B99A]' : 'bg-white border-gray-300'}`}>
                        {formData.es_gratis && <Check size={14} color={WHITE} />}
                      </div>
                      <input type="checkbox" checked={formData.es_gratis} onChange={e => setFormData({...formData, es_gratis: e.target.checked})} className="hidden"/>
                      <span className="text-xs uppercase tracking-widest text-[#1C1C1C] font-bold group-hover:text-[#C8B99A] transition-colors">Evento Gratuito (Predeterminado)</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-sm border flex items-center justify-center transition-colors ${formData.requiere_pago_para_ver ? 'bg-[#C8B99A] border-[#C8B99A]' : 'bg-white border-gray-300'}`}>
                        {formData.requiere_pago_para_ver && <Check size={14} color={WHITE} />}
                      </div>
                      <input type="checkbox" checked={formData.requiere_pago_para_ver} onChange={e => setFormData({...formData, requiere_pago_para_ver: e.target.checked})} className="hidden"/>
                      <span className="text-xs uppercase tracking-widest text-[#1C1C1C] font-bold group-hover:text-[#C8B99A] transition-colors">Requiere Pago Para Ver</span>
                    </label>
                  </div>

                  {/* Precios (Si no es gratuito) */}
                  {!formData.es_gratis && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-[#1C1C1C] font-bold mb-2 block">Moneda</label>
                        <select value={formData.moneda} onChange={e => setFormData({...formData, moneda: e.target.value})} className="w-full p-3 bg-[#FDFCF8] outline-none border border-[#EAEAEA] focus:border-[#C8B99A] font-serif rounded-sm transition-colors">
                          <option value="DOP">DOP (Pesos)</option>
                          <option value="USD">USD (Dólares)</option>
                          <option value="EUR">EUR (Euros)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-[#1C1C1C] font-bold mb-2 block">Precio Galería Completa</label>
                        <input type="number" step="0.01" min="0" value={formData.precio_galeria || 0} onChange={e => setFormData({...formData, precio_galeria: parseFloat(e.target.value) || 0})} className="w-full p-3 bg-[#FDFCF8] outline-none border border-[#EAEAEA] focus:border-[#C8B99A] font-serif rounded-sm transition-colors" />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-[#1C1C1C] font-bold mb-2 block">Precio Foto Individual</label>
                        <input type="number" step="0.01" min="0" value={formData.precio_foto || 0} onChange={e => setFormData({...formData, precio_foto: parseFloat(e.target.value) || 0})} className="w-full p-3 bg-[#FDFCF8] outline-none border border-[#EAEAEA] focus:border-[#C8B99A] font-serif rounded-sm transition-colors" />
                      </div>
                    </div>
                  )}

                  {/* Configuración de IA, Estado y Seguridad */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-[#1C1C1C] font-bold mb-2 block">Motor IA (Predeterminado: Facial)</label>
                      <select value={formData.tipo_reconocimiento} onChange={e => setFormData({...formData, tipo_reconocimiento: e.target.value})} className="w-full p-3 bg-[#FDFCF8] outline-none border border-[#EAEAEA] focus:border-[#C8B99A] font-serif rounded-sm transition-colors">
                        <option value="facial">Facial Puro (Predeterminado)</option>
                        <option value="hibrido">Híbrido (Rostros + OCR)</option>
                        <option value="ocr">Lectura OCR (Deportes)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-[#1C1C1C] font-bold mb-2 block">Estado de Publicación</label>
                      <select value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})} className="w-full p-3 bg-[#FDFCF8] outline-none border border-[#EAEAEA] focus:border-[#C8B99A] font-serif rounded-sm transition-colors">
                        <option value="activo">Activo (Público)</option>
                        <option value="oculto">Oculto (Borrador Privado)</option>
                        <option value="inactivo">Inactivo (Archivado)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-[#1C1C1C] font-bold mb-2 flex items-center gap-1"><Lock size={10}/> Contraseña de Galería</label>
                      <input type="text" placeholder="Vacío = Acceso libre" value={formData.password_cliente || ''} onChange={e => setFormData({...formData, password_cliente: e.target.value})} className="w-full p-3 bg-[#FDFCF8] outline-none border border-[#EAEAEA] focus:border-[#C8B99A] font-serif rounded-sm transition-colors" />
                    </div>
                  </div>
                </div>

                {/* --- BOTONES DE ACCIÓN --- */}
                <div className="flex gap-4 mt-4 pt-6 border-t border-[#EAEAEA]">
                  <button type="submit" disabled={cargando} className="bg-[#1C1C1C] text-white px-8 py-4 uppercase tracking-widest text-xs font-bold rounded-sm hover:bg-black transition-colors">
                    {cargando ? 'Guardando...' : 'Guardar Colección'}
                  </button>
                  {eventoEditandoId && (
                    <button type="button" onClick={() => setMostrarConfirmacionBorrar(true)} className="border border-red-200 text-red-500 px-8 py-4 uppercase tracking-widest text-xs font-bold rounded-sm hover:bg-red-50 transition-colors">
                      Eliminar Evento
                    </button>
                  )}
                </div>
                
                {/* --- CONFIRMACIÓN BORRAR --- */}
                {mostrarConfirmacionBorrar && (
                  <div className="mt-4 p-6 border border-red-200 bg-red-50 rounded-sm">
                    <p className="text-sm text-red-800 mb-3 font-bold">⚠️ ZONA DE PELIGRO: Escribe "{formData.nombre}" para confirmar</p>
                    <input type="text" value={textoConfirmacion} onChange={(e) => setTextoConfirmacion(e.target.value)} className="w-full p-3 mb-3 border border-red-300 outline-none focus:border-red-500" placeholder="Nombre exacto..." />
                    <button type="button" onClick={eliminarColeccionCompleta} className="bg-red-600 text-white px-6 py-3 text-xs uppercase tracking-widest font-bold rounded-sm hover:bg-red-700 transition-colors">Eliminar Definitivamente</button>
                  </div>
                )}

              </form>
            </div>
          )}

          {vista === 'dashboard' && eventoActivo && (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
              
              <div style={{ height: 220, position: 'relative', background: INK, display: 'flex', alignItems: 'center', padding: '0 40px', flexShrink: 0 }}>
                <img src={renderCoverUrl(eventoActivo.portada_url) || "https://images.unsplash.com/photo-1541534741688?w=1200"} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: renderCoverPosition(eventoActivo.portada_url), opacity: 0.4 }} />
                <div style={{ position: 'relative', zIndex: 10, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h1 style={{ fontSize: 32, fontFamily: 'Georgia, serif', color: WHITE, margin: '0 0 8px 0', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{eventoActivo.nombre}</h1>
                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{eventoActivo.fecha_evento || 'Sin fecha'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={copiarEnlacePublico} style={{ background: SAND, color: INK, border: 'none', padding: '10px 18px', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                      <Share2 size={13} /> Copiar Enlace
                    </button>
                    <button onClick={() => window.open(`/g/${eventoActivo.url_slug || eventoActivo.id}`, '_blank')} style={{ background: 'rgba(255,255,255,0.15)', color: WHITE, border: 'none', padding: '10px 18px', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}><Eye size={13} /> Ver Público</button>
                    <button onClick={() => {
                      setEventoEditandoId(eventoActivo.id); setFormData(eventoActivo); setVista('form');
                    }} style={{ background: WHITE, color: INK, border: 'none', padding: '10px 18px', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}><Settings size={13} /> Ajustes</button>
                  </div>
                </div>
              </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', flexGrow: 1 }}>                {/* 🌟 BARRA LATERAL INTERNA DEL EVENTO (REDISEÑADA) 🌟 */}
              <div style={{ width: 240, background: WHITE, borderRight: `1px solid ${BORDER}`, flexShrink: 0, position: 'sticky', top: 0, height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
                
                {/* Previsualización de Portada al hacer scroll */}
                <div style={{ height: scrolledPastBanner ? 160 : 0, opacity: scrolledPastBanner ? 1 : 0, overflow: 'hidden', transition: 'all 0.3s ease', flexShrink: 0, borderBottom: `1px solid ${BORDER}` }}>
                  <img src={renderCoverUrl(eventoActivo.portada_url)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: renderCoverPosition(eventoActivo.portada_url) }} alt="" />
                </div>

                <div className="flex-1 overflow-y-auto py-5 px-3 space-y-7">
                  
                  {/* SECCIÓN 1: FOTOS */}
                  <div>
                    <div className="flex items-center justify-between px-2 mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-[0.18em] text-[#9A8F82]">Fotos</span>
                      <button 
                        onClick={crearNuevaCarpeta} 
                        className="flex items-center gap-1.5 px-2 py-1 hover:bg-[#EAEAEA] rounded-sm text-[#9A8F82] hover:text-[#1C1C1C] transition-colors" 
                        title="Añadir nuevo set"
                      >
                        <Plus size={12} strokeWidth={2.5} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Nuevo Set</span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      {carpetas.map(carpeta => {
                        const cant = fotosEvento.filter(f => f.carpeta_id === carpeta.id).length;
                        const isActiva = seccionDashboard === 'fotos' && carpetaActiva?.id === carpeta.id;
                        return (
                          <button
                            key={carpeta.id}
                            onClick={() => { setCarpetaActiva(carpeta); setSeccionDashboard('fotos'); }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-sm transition-all text-left ${
                              isActiva 
                                ? 'bg-[#1C1C1C] text-white font-medium shadow-sm' 
                                : 'text-[#1C1C1C] hover:bg-[#F5F4F0]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <Folder size={14} className={isActiva ? 'text-[#C8B99A]' : 'text-[#9A8F82]'} />
                              <span className="truncate">{carpeta.nombre}</span>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isActiva ? 'bg-white/20 text-white' : 'bg-[#E8E4DE] text-[#1C1C1C]'}`}>
                              {cant}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* SECCIÓN 2: MOTOR IA (SIN EL RAYITO) */}
                  <div>
                    <div className="px-2 mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-[0.18em] text-[#9A8F82]">Motor IA</span>
                    </div>
                    <button
                      onClick={() => setSeccionDashboard('ia')}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-sm transition-all text-left ${
                        seccionDashboard === 'ia' 
                          ? 'bg-[#1C1C1C] text-white font-medium shadow-sm' 
                          : 'text-[#1C1C1C] hover:bg-[#F5F4F0]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ScanFace size={15} className={seccionDashboard === 'ia' ? 'text-[#C8B99A]' : 'text-[#9A8F82]'} />
                        <span>Centro de IA</span>
                      </div>
                      {statsIA.dudas > 0 && (
                        <span className="bg-[#E74C3C] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          {statsIA.dudas}
                        </span>
                      )}
                    </button>
                  </div>

                {/* SECCIÓN 3: DISEÑO */}
                <div>
                  <div className="px-2 mb-2 mt-6 border-t border-[#EAEAEA] pt-4">
                    <span className="text-[10px] uppercase font-bold tracking-[0.18em] text-[#9A8F82]">Diseño de Galería</span>
                  </div>
                  <button
                    onClick={() => { setSeccionDashboard('diseno'); if (!subTabDiseno) setSubTabDiseno('cover'); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-sm transition-all text-left ${
                      seccionDashboard === 'diseno' 
                        ? 'bg-[#1C1C1C] text-white font-medium shadow-sm' 
                        : 'text-[#1C1C1C] hover:bg-[#F5F4F0]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Sliders size={15} className={seccionDashboard === 'diseno' ? 'text-[#C8B99A]' : 'text-[#9A8F82]'} />
                      <span>Personalización UI</span>
                    </div>
                  </button>

                  {/* 🌟 SUB-OPCIONES (Anidadas debajo del botón) 🌟 */}
                  <AnimatePresence>
                    {seccionDashboard === 'diseno' && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: 'auto', opacity: 1 }} 
                        exit={{ height: 0, opacity: 0 }} 
                        className="mt-2 ml-4 border-l border-[#EAEAEA] pl-2 flex flex-col gap-1 overflow-hidden"
                      >
                        {[
                          { id: 'cover', label: 'Cover & Portada' },
                          { id: 'tipografia', label: 'Tipografía' },
                          { id: 'color', label: 'Colores' },
                          { id: 'grid', label: 'Grid de Fotos' },
                          { id: 'ia', label: 'Módulo IA' }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setSubTabDiseno(tab.id)}
                            className={`w-full text-left px-3 py-2 text-[10px] uppercase tracking-widest font-bold rounded-sm transition-colors ${
                              subTabDiseno === tab.id ? 'text-[#1C1C1C] bg-[#F5F4F0]' : 'text-[#9A8F82] hover:text-[#1C1C1C] hover:bg-[#F5F4F0]'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                </div>
              </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>
                  
                  {/* 🌟 CASO A: MODO FOTOS CON NUEVA BARRA DE HERRAMIENTAS 🌟 */}
                  {seccionDashboard === 'fotos' && (
                    <>
                      {/* HEADER STICKY (TOOLBAR) */}
                      <div style={{ 
                        position: 'sticky', 
                        top: 0, 
                        zIndex: 40, 
                        background: 'rgba(250, 250, 250, 0.95)', 
                        backdropFilter: 'blur(8px)',
                        /* Padding súper reducido: 10px cuando scrolleas, 16px arriba */
                        padding: scrolledPastBanner ? '10px 28px' : '16px 28px', 
                        borderBottom: `1px solid ${BORDER}`, 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        boxShadow: scrolledPastBanner ? '0 4px 20px rgba(0,0,0,0.03)' : 'none', 
                        transition: 'all 0.3s ease' 
                      }}>
                        <h2 style={{ fontSize: scrolledPastBanner ? 16 : 18, margin: 0, fontWeight: 500, transition: 'font-size 0.3s ease' }}>
                          {carpetaActiva?.nombre}
                        </h2>
                        
                        {/* TODOS LOS BOTONES DENTRO DE LA BARRA */}
                        <div className="flex items-center gap-4">
                          
                          {/* Botón Solo Favoritas */}
                          <button 
                            disabled={fotosActuales.filter(f => f.es_favorita).length === 0}
                            onClick={() => setSepararFavoritas(!separarFavoritas)}
                            className={`flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider transition-colors ${fotosActuales.filter(f => f.es_favorita).length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:text-[#E74C3C]'} ${separarFavoritas ? 'text-[#E74C3C]' : 'text-gray-500'}`}
                            title="Dividir Favoritas"
                          >
                            <Heart size={14} fill={separarFavoritas ? '#E74C3C' : 'none'} color={separarFavoritas ? '#E74C3C' : 'currentColor'} />
                            Solo Favoritas
                          </button>

                          <div className="w-[1px] h-5 bg-gray-200 mx-1"></div>

                          {/* Botones de Layout SIN el fondo de "bullet" gris */}
                          <div className="flex gap-2">
                            <button onClick={() => setLayoutModo('masonry')} className={`transition-transform hover:scale-110 p-1 ${layoutModo==='masonry'?'text-black':'text-gray-400 hover:text-black'}`} title="Mosaico"><Columns size={16}/></button>
                            <button onClick={() => setLayoutModo('grid-small')} className={`transition-transform hover:scale-110 p-1 ${layoutModo==='grid-small'?'text-black':'text-gray-400 hover:text-black'}`} title="Grid Pequeño"><Grid size={16}/></button>
                            <button onClick={() => setLayoutModo('grid-big')} className={`transition-transform hover:scale-110 p-1 ${layoutModo==='grid-big'?'text-black':'text-gray-400 hover:text-black'}`} title="Grid Grande"><LayoutGrid size={16}/></button>
                            <button onClick={() => setLayoutModo('single')} className={`transition-transform hover:scale-110 p-1 ${layoutModo==='single'?'text-black':'text-gray-400 hover:text-black'}`} title="Pantalla Completa"><Square size={16}/></button>
                          </div>

                          <div className="w-[1px] h-5 bg-gray-200 mx-1"></div>

                          {/* Botón de Añadir Fotos */}
                          <button 
                            onClick={() => setMostrarUploader(true)} 
                            style={{ 
                              background: INK, 
                              color: WHITE, 
                              border: 'none', 
                              padding: scrolledPastBanner ? '7px 14px' : '9px 18px', 
                              borderRadius: 4, 
                              cursor: 'pointer', 
                              fontSize: 11, 
                              fontWeight: 500, 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 6, 
                              transition: 'padding 0.3s ease' 
                            }}>
                            <UploadCloud size={15} /> Añadir Fotos
                          </button>
                        </div>
                      </div>  

                      {/* AREA DE FOTOS */}
                      <div style={{ padding: 28, flex: 1, position: 'relative' }}>
                        <AnimatePresence>
                          {mostrarUploader && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ position: 'absolute', inset: 0, background: 'rgba(250,250,250,0.95)', zIndex: 50, padding: 40, display: 'flex', flexDirection: 'column' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>Subir a: {carpetaActiva?.nombre}</h2>
                                {!estadoSubida.activa && <button onClick={() => setMostrarUploader(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TAUPE }}><X size={20}/></button>}
                              </div>
                              {estadoSubida.activa ? (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                  <Loader2 size={40} className="animate-spin" color={SAND} style={{ marginBottom: 16 }} />
                                  <h3 style={{ fontSize: 16, color: INK, margin: '0 0 8px 0' }}>Subiendo archivos a Cloudflare R2</h3>
                                  <p style={{ color: TAUPE, fontSize: 13 }}>Procesando {estadoSubida.progreso} de {estadoSubida.total}...</p>
                                  <div style={{ width: '100%', maxWidth: 400, height: 6, background: BORDER, borderRadius: 4, marginTop: 24, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', background: SAND, width: `${(estadoSubida.progreso / estadoSubida.total) * 100}%`, transition: 'width 0.3s' }} />
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  onDrop={manejarDrop} onDragOver={(e) => { prevenirDefault(e); setArrastrando(true); }} onDragEnter={(e) => { prevenirDefault(e); setArrastrando(true); }} onDragLeave={(e) => { prevenirDefault(e); setArrastrando(false); }}
                                  style={{ flex: 1, border: `2px dashed ${arrastrando ? SAND : TAUPE}`, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: arrastrando ? 'rgba(200, 185, 154, 0.05)' : WHITE, transition: 'all 0.2s' }}
                                >
                                  <UploadCloud size={40} color={arrastrando ? SAND : TAUPE} style={{ marginBottom: 16 }} />
                                  <p style={{ fontSize: 14, color: INK, marginBottom: 8, fontWeight: 500 }}>{arrastrando ? '¡Suelta para añadir!' : 'Arrastra tus fotografías o carpetas aquí'}</p>
                                  <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={manejarSeleccionArchivos} style={{ display: 'none' }} />
                                  <button onClick={() => fileInputRef.current?.click()} style={{ padding: '10px 24px', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Explorar Archivos</button>
                                  {archivosUploader.length > 0 && (
                                    <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                      <span style={{ fontSize: 12, color: INK, fontWeight: 600, marginBottom: 12 }}>{archivosUploader.length} archivos en cola</span>
                                      <button onClick={iniciarSubidaMasiva} style={{ background: INK, color: WHITE, border: 'none', padding: '12px 32px', borderRadius: 4, cursor: 'pointer', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Iniciar Subida</button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {!mostrarUploader && (
                          <>
                            <AnimatePresence>
                              {fotosSeleccionadas.length > 0 && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} style={{ position: 'fixed', bottom: 40, left: '55%', transform: 'translateX(-50%)', background: INK, color: WHITE, padding: '12px 24px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 32, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 100 }}>
                                  <span style={{ fontSize: 13, fontWeight: 600 }}>{fotosSeleccionadas.length} seleccionadas</span>
                                  <div style={{ display: 'flex', gap: 16 }}>
                                    <div style={{ position: 'relative' }}>
                                      <button onClick={() => setMostrarModalMover(!mostrarModalMover)} style={{ background: 'transparent', border: 'none', color: WHITE, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><FolderInput size={14} /> Mover a Set</button>
                                      {mostrarModalMover && (
                                        <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 12, background: WHITE, borderRadius: 6, padding: 8, width: 160, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                                          {carpetas.map(s => (<button key={s.id} onClick={() => moverFotosASet(s.id)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: INK, borderRadius: 4 }}>Mover a {s.nombre}</button>))}
                                        </div>
                                      )}
                                    </div>
                                    <button onClick={() => borrarFotos(fotosSeleccionadas)} style={{ background: 'transparent', border: 'none', color: '#E74C3C', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><Trash2 size={14} /> Eliminar</button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {fotosActuales.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '60px 0', color: TAUPE, fontStyle: 'italic', fontSize: 13 }}>La carpeta está vacía. ¡Sube las primeras fotos!</div>
                            ) : (
                              <>
                                {separarFavoritas && fotosFavoritas.length > 0 ? (
                                  <>
                                    <GalleryLayout fotos={fotosFavoritas} title="Favoritas" />
                                    <hr className="border-t border-dashed border-[#C8B99A] opacity-50 my-12" />
                                    <GalleryLayout fotos={fotosRestantes} title="Resto de la colección" />
                                  </>
                                ) : (
                                  <GalleryLayout fotos={fotosActuales} />
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}

{/* CASO B: MODO MOTOR IA */}
                  {seccionDashboard === 'ia' && (
                    <div className="flex-1 flex flex-col relative">
                      
                      {/* 🌟 1. BARRA STICKY CON ESTADÍSTICAS INTEGRADAS (Fijada a 72px) 🌟 */}
                      <div style={{ position: 'sticky', top: 0, height: 72, zIndex: 40, background: '#FAFAFA', padding: '0 28px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: scrolledPastBanner ? '0 4px 20px rgba(0,0,0,0.03)' : 'none', transition: 'all 0.3s ease' }}>
                        
                        {/* Izquierda: Título + Stats */}
                        <div className="flex items-center gap-6">
                          <div>
                            <h2 className="text-xl font-serif text-[#1C1C1C] m-0">Centro de Control IA</h2>
                            <p className="text-[10px] uppercase tracking-widest text-[#9A8F82] mt-1">Motor configurado: <span className="font-bold text-[#1C1C1C]">{eventoActivo.tipo_reconocimiento.toUpperCase()}</span></p>
                          </div>

                          {/* Bloque de Estadísticas en la barra */}
                          {iaEjecutada && (
                            <div className="flex items-center gap-5 border-l border-[#EAEAEA] pl-6 h-8">
                              {eventoActivo.tipo_reconocimiento !== 'ocr' && (
                                <div className="flex items-center gap-2 text-[#1C1C1C]" title="Personas Detectadas">
                                  <ScanFace size={16} className="text-[#9A8F82]" />
                                  <span className="text-lg font-serif leading-none">{statsIA.cargando ? '...' : statsIA.caras}</span>
                                </div>
                              )}
                              {eventoActivo.tipo_reconocimiento !== 'facial' && (
                                <div className="flex items-center gap-2 text-[#1C1C1C]" title="Dorsales Detectados">
                                  <ScanLine size={16} className="text-[#9A8F82]" />
                                  <span className="text-lg font-serif leading-none">{statsIA.cargando ? '...' : statsIA.dorsales}</span>
                                </div>
                              )}
                              {eventoActivo.tipo_reconocimiento !== 'ocr' && (
                                <div className="flex items-center gap-2" title="Dudas / Huérfanas">
                                  <AlertTriangle size={16} className={statsIA.dudas > 0 ? "text-[#E74C3C]" : "text-[#9A8F82]"} />
                                  <span className={`text-lg font-serif leading-none ${statsIA.dudas > 0 ? 'text-[#E74C3C] font-bold' : 'text-[#1C1C1C]'}`}>{statsIA.cargando ? '...' : statsIA.dudas}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Derecha: Botón de Ejecutar */}
                        <button 
                          onClick={dispararInteligenciaArtificial} disabled={procesandoIA}
                          className="bg-[#1C1C1C] text-white hover:bg-black px-5 py-2.5 text-xs uppercase tracking-widest font-bold flex items-center gap-2 transition-all disabled:opacity-50 rounded-sm shadow-sm"
                        >
                          {procesandoIA ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} className="text-[#C8B99A]" />}
                          {procesandoIA ? 'Procesando Enjambre...' : 'Ejecutar Motor IA'}
                        </button>
                      </div>

                      <div className="p-8 flex-1 flex flex-col">
                        
                        {/* 🌟 2. ADIÓS TARJETAS GIGANTES, DIRECTO A LOS TABS 🌟 */}
                        {!iaEjecutada ? (
                          <div className="p-6 border border-dashed border-[#C8B99A] bg-[#FDFCF8] rounded-sm mb-6">
                            <p className="text-sm text-[#1C1C1C] m-0 flex items-center gap-2">
                              <AlertTriangle size={16} className="text-[#C8B99A]" />
                              La inteligencia artificial aún no ha analizado esta colección. Presiona "Ejecutar Motor IA" arriba.
                            </p>
                          </div>
                        ) : (
                          <div className="flex border-b border-[#EAEAEA] mb-6">
                            {eventoActivo.tipo_reconocimiento !== 'ocr' && (
                              <button onClick={() => setSubTabIA('identidades')} className={`px-6 py-3 text-xs uppercase tracking-widest font-bold border-b-2 transition-colors ${subTabIA === 'identidades' ? 'border-[#1C1C1C] text-[#1C1C1C]' : 'border-transparent text-[#9A8F82] hover:text-[#1C1C1C]'}`}>
                                Identidades
                              </button>
                            )}
                            {eventoActivo.tipo_reconocimiento !== 'facial' && (
                              <button onClick={() => setSubTabIA('corredores')} className={`px-6 py-3 text-xs uppercase tracking-widest font-bold border-b-2 transition-colors ${subTabIA === 'corredores' ? 'border-[#1C1C1C] text-[#1C1C1C]' : 'border-transparent text-[#9A8F82] hover:text-[#1C1C1C]'}`}>
                                Grupos OCR
                              </button>
                            )}
                            {eventoActivo.tipo_reconocimiento !== 'ocr' && (
                              <button onClick={() => setSubTabIA('dudas')} className={`px-6 py-3 text-xs uppercase tracking-widest font-bold border-b-2 transition-colors flex items-center gap-2 ${subTabIA === 'dudas' ? 'border-[#E74C3C] text-[#E74C3C]' : 'border-transparent text-[#9A8F82] hover:text-[#E74C3C]'}`}>
                                Dudas / Huérfanas
                                {statsIA.dudas > 0 && <span className="bg-[#E74C3C]/10 text-[#E74C3C] px-2 py-0.5 rounded-full text-[10px]">{statsIA.dudas}</span>}
                              </button>
                            )}
                          </div>
                        )}

                        {iaEjecutada && (
                          <div className="flex-1 pb-8">
                            
                            {/* 1. IDENTIDADES */}
                            {subTabIA === 'identidades' && (
                              <div className="flex gap-8 items-start">
                                {/* BARRA LATERAL PEGADA A 72px */}
                                <div className="w-64 shrink-0 bg-white border border-[#EAEAEA] rounded-sm p-2 sticky top-[72px] max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar shadow-sm">
                                  {listaJugadores.length === 0 ? <p className="text-xs text-[#9A8F82] p-4 text-center">No hay identidades.</p> : 
                                    listaJugadores.map(j => (
                                      <button key={j.id} onClick={() => seleccionarJugador(j)} className={`w-full flex items-center gap-3 p-2.5 mb-1 transition-colors rounded-sm text-left ${jugadorSeleccionado?.id === j.id ? 'bg-[#1C1C1C] text-white' : 'hover:bg-gray-50 text-[#1C1C1C]'}`}>
                                        <img src={fotoUrlAux(j.avatar_url)} loading="lazy" className="w-8 h-8 rounded-full object-cover bg-gray-200" alt="" />
                                        <span className="font-serif text-xs truncate">{j.display_name}</span>
                                      </button>
                                    ))
                                  }
                                </div>
                                
                                <div className="flex-1">
                                  {jugadorSeleccionado ? (
                                    <>
                                      {/* ENCABEZADO JUGADOR PEGADO A 72px */}
                                      <div className="flex justify-between items-center mb-6 bg-white p-4 border border-[#EAEAEA] rounded-sm shadow-sm sticky top-[72px] z-20">
                                        <div className="flex items-center gap-4">
                                          <img src={fotoUrlAux(jugadorSeleccionado.avatar_url)} loading="lazy" className="w-12 h-12 rounded-full object-cover border border-gray-200" alt="" />
                                          {editandoNombre ? (
                                            <div className="flex gap-2">
                                              <input type="text" value={nombreTemporal} onChange={e=>setNombreTemporal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&guardarNombreJugador()} autoFocus className="bg-transparent border-b border-[#1C1C1C] text-xl font-serif text-[#1C1C1C] outline-none" />
                                              <button onClick={guardarNombreJugador} className="text-xs bg-[#1C1C1C] text-white px-2 py-1 rounded-sm"><Check size={14}/></button>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setNombreTemporal(jugadorSeleccionado.display_name); setEditandoNombre(true); }}>
                                              <h3 className="text-2xl font-serif text-[#1C1C1C] m-0">{jugadorSeleccionado.display_name}</h3>
                                              <Edit2 size={14} className="text-[#9A8F82] opacity-0 group-hover:opacity-100 transition-opacity"/>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex gap-2">
                                          <button onClick={iniciarFusion} className="px-3 py-1.5 bg-[#FDFCF8] border border-[#C8B99A] text-[#1C1C1C] hover:bg-[#C8B99A] text-[10px] uppercase font-bold flex items-center gap-1.5 transition-colors rounded-sm"><Combine size={12}/> Fusionar</button>
                                          <button onClick={() => { if(window.confirm('¿Eliminar este perfil falso?')) destruirPerfilFalso(); }} className="px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white text-[10px] uppercase font-bold flex items-center gap-1.5 transition-colors rounded-sm border border-red-100"><Trash2 size={12}/></button>
                                        </div>
                                      </div>

                                      {fusionando && candidatosFusion.length > 0 && (
                                        <div className="bg-[#FFFDF5] p-4 mb-6 border border-[#F5E6B3] rounded-sm">
                                          <p className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest mb-3 flex items-center gap-2"><Zap size={14}/> Sugerencias de Fusión:</p>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {candidatosFusion.map(c => (
                                              <button key={c.id_identidad} onClick={() => fusionarConJugador(c.id_identidad)} className="p-3 bg-white border border-[#EAEAEA] hover:border-[#C8B99A] flex items-center gap-3 transition-colors rounded-sm text-left shadow-sm">
                                                <img src={fotoUrlAux(c.avatar)} loading="lazy" className="w-10 h-10 rounded-full object-cover" alt="" />
                                                <div>
                                                  <div className="text-sm font-serif text-[#1C1C1C] truncate">{c.nombre_jugador}</div>
                                                  <div className="text-[10px] font-bold text-[#2E7D32]">{Math.round(c.porcentaje_similitud * 100)}% Match</div>
                                                </div>
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
                                        {fotosDelJugador.map((foto, idx) => (
                                          <div key={idx} className="aspect-square bg-[#EAEAEA] relative group overflow-hidden cursor-zoom-in rounded-sm" onClick={() => setZoomCara({ photo_url: foto.photo_url, bbox: foto.detecciones[0]?.bbox })}>
                                            <img src={fotoUrlAux(foto.photo_url, true)} loading="lazy" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" alt="" />
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button onClick={(e) => { e.stopPropagation(); supabase.from('face_detections').update({identity_id:null}).eq('id',foto.detecciones[0]?.id).then(()=>{seleccionarJugador(jugadorSeleccionado); cargarStatsIA(eventoActivo.id, true);}); }} className="bg-white/90 text-red-500 hover:bg-red-500 hover:text-white p-1.5 rounded-sm shadow-sm transition-colors" title="Desvincular"><UserMinus size={14}/></button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="h-64 flex flex-col items-center justify-center opacity-40">
                                      <User size={48} className="mb-4 text-[#9A8F82]" />
                                      <p className="font-serif text-lg text-[#1C1C1C]">Selecciona un perfil en la barra lateral</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 2. CORREDORES OCR */}
                            {subTabIA === 'corredores' && (
                              <div className="flex gap-8 items-start">
                                {/* BARRA LATERAL PEGADA A 72px */}
                                <div className="w-64 shrink-0 bg-white border border-[#EAEAEA] rounded-sm p-2 sticky top-[72px] max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar shadow-sm">
                                  {listaCorredores.length === 0 ? <p className="text-xs text-[#9A8F82] p-4 text-center">No hay dorsales detectados.</p> : 
                                    listaCorredores.map(c => (
                                      <button key={c.id} onClick={() => seleccionarCorredor(c)} className={`w-full flex items-center gap-3 p-2 mb-1 transition-colors rounded-sm text-left ${corredorSeleccionado?.id === c.id ? 'bg-[#1C1C1C] text-white' : 'hover:bg-gray-50 text-[#1C1C1C]'}`}>
                                        <img src={fotoUrlAux(c.avatar_url)} loading="lazy" className="w-8 h-12 object-cover bg-gray-200" alt="" />
                                        <span className="font-serif text-xs truncate">{c.dorsal ? `#${c.dorsal}` : '⚠️ Revisar'}</span>
                                      </button>
                                    ))
                                  }
                                </div>
                                <div className="flex-1">
                                  {corredorSeleccionado && (
                                    <>
                                      {/* ENCABEZADO DORSAL PEGADO A 72px */}
                                      <div className="flex items-center gap-4 bg-white p-4 border border-[#EAEAEA] rounded-sm shadow-sm mb-6 sticky top-[72px] z-20">
                                        <Hash size={20} className="text-[#9A8F82]"/>
                                        <input type="text" value={dorsalTemporal} onChange={e=>setDorsalTemporal(e.target.value)} onBlur={guardarDorsalGlobal} className="text-3xl font-serif bg-transparent text-[#1C1C1C] outline-none uppercase w-full" placeholder="NÚMERO" />
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
                                        {fotosDelCorredor.map((f, idx) => (
                                          <div key={idx} className="aspect-square bg-[#EAEAEA] relative cursor-zoom-in rounded-sm overflow-hidden" onClick={() => setZoomCara({ photo_url: f.photo_url, bbox: f.bbox })}>
                                            <img src={fotoUrlAux(f.photo_url, true)} loading="lazy" className="w-full h-full object-cover" alt="" />
                                            <BoundingBox bbox={f.bbox} color={SAND} label={`#${f.dorsal}`} />
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 3. DUDAS / HUÉRFANAS */}
                            {subTabIA === 'dudas' && (
                              <div>
                                {!fotoDudosa ? (
                                  <div className="flex flex-col items-center justify-center h-64 opacity-50">
                                    <CheckCircle size={48} className="text-[#2E7D32] mb-4" />
                                    <h2 className="font-serif text-2xl text-[#1C1C1C] m-0">Galería Impecable</h2>
                                    <p className="text-xs text-[#9A8F82] uppercase tracking-widest mt-2">No hay rostros huérfanos pendientes.</p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col xl:flex-row gap-8 bg-white p-6 border border-[#EAEAEA] rounded-sm shadow-sm max-w-5xl mx-auto">
                                    <div className="w-full xl:w-1/2 flex flex-col items-center">
                                      
                                      <div className="flex items-center gap-2 mb-6 uppercase tracking-[0.3em] text-[9px] border px-4 py-1.5" style={{ background: '#FFFDF5', color: '#D4AF37', borderColor: '#F5E6B3' }}>
                                        <AlertTriangle size={12} /> Rostro sin identificar
                                      </div>

                                      <div className="w-full bg-[#111] relative overflow-hidden rounded-sm flex items-center justify-center p-4 min-h-[300px]">
                                        <div className="relative inline-block leading-none max-w-full shadow-lg">
                                          {(() => {
                                            const rawBox = getBboxCoords(fotoDudosa.bbox);
                                            
                                            if (rawBox) {
                                              const box = expandBbox(rawBox);
                                              const insetTop = box.y;
                                              const insetRight = 100 - (box.x + box.w);
                                              const insetBottom = 100 - (box.y + box.h);
                                              const insetLeft = box.x;
                                              
                                              return (
                                                <>
                                                  <img src={fotoUrlAux(fotoDudosa.photo_url, true)} loading="lazy" className="max-h-[50vh] w-auto max-w-full block opacity-50 blur-[3px]" alt="Contexto"/>
                                                  <img src={fotoUrlAux(fotoDudosa.photo_url, true)} 
                                                       loading="lazy"
                                                       className="absolute inset-0 max-h-[50vh] w-auto max-w-full block" 
                                                       style={{ clipPath: `inset(${insetTop}% ${insetRight}% ${insetBottom}% ${insetLeft}%)` }} 
                                                       alt="Rostro"/>
                                                  <div className="absolute border-[2px] border-[#E74C3C] shadow-[0_0_15px_rgba(0,0,0,0.4)] z-10 pointer-events-none" 
                                                       style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}>
                                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#E74C3C] text-white text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-sm whitespace-nowrap">
                                                      ¿Quién es?
                                                    </div>
                                                  </div>
                                                </>
                                              );
                                            } else {
                                              return (
                                                <>
                                                  <img src={fotoUrlAux(fotoDudosa.photo_url, true)} loading="lazy" className="max-h-[50vh] w-auto max-w-full block" alt="Contexto"/>
                                                  <div className="absolute top-2 left-2 bg-red-500 text-white text-[9px] px-2 py-1 uppercase font-bold tracking-widest rounded-sm">
                                                    ⚠️ Registro Antiguo (Sin Coordenadas)
                                                  </div>
                                                </>
                                              );
                                            }
                                          })()}
                                        </div>
                                      </div>

                                      <button onClick={async () => { await supabase.from('face_detections').delete().eq('id', fotoDudosa.id); cargarDudas(); cargarStatsIA(eventoActivo.id, true); }} className="mt-8 text-[#E74C3C] bg-red-50 hover:bg-red-500 hover:text-white px-4 py-3 text-xs uppercase tracking-widest font-bold flex items-center gap-2 rounded-sm transition-colors w-full justify-center border border-red-100">
                                        <Trash2 size={16}/> Descartar Rostro Falso
                                      </button>
                                    </div>
                                    <div className="w-full md:w-1/2 flex flex-col justify-center">
                                      <h3 className="text-3xl font-serif text-[#1C1C1C] mb-2">¿De quién es este rostro?</h3>
                                      <p className="text-xs text-[#9A8F82] mb-6">La Inteligencia Artificial encontró coincidencias, pero no está 100% segura. Elige la identidad correcta.</p>
                                      
                                      <div className="flex flex-col gap-3">
                                        {candidatosDuda.map(c => (
                                          <button key={c.id_identidad} onClick={async () => { await supabase.from('face_detections').update({identity_id: c.id_identidad}).eq('id', fotoDudosa.id); cargarDudas(); cargarStatsIA(eventoActivo.id, true); }} className="p-3 bg-white border border-[#EAEAEA] hover:border-[#1C1C1C] flex items-center gap-4 transition-colors text-left rounded-sm shadow-sm group">
                                            <img src={fotoUrlAux(c.avatar)} loading="lazy" className="w-14 h-14 rounded-full object-cover" alt="" />
                                            <div className="flex-1">
                                              <div className="text-base font-serif text-[#1C1C1C] font-semibold group-hover:underline">{c.nombre_jugador}</div>
                                              <div className="text-[11px] font-bold text-[#C8B99A] uppercase tracking-wider mt-0.5">{Math.round(c.porcentaje_similitud * 100)}% Coincidencia</div>
                                            </div>
                                            <ChevronRightIcon size={20} className="text-gray-300 group-hover:text-[#1C1C1C]"/>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    </div>
                  )}
{/* CASO C: MÓDULO DE PERSONALIZACIÓN Y DISEÑO DE GALERÍA */}
{seccionDashboard === 'diseno' && (() => {
  const previewImg = renderCoverUrl(eventoActivo?.portada_url) || "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=1200";
  const focalPosition = renderCoverPosition(eventoActivo?.portada_url);
  const fuenteClase = configUi.fuente_titulo === 'sans' ? 'font-sans' : configUi.fuente_titulo === 'mono' ? 'font-mono' : 'font-serif';

  const alineacionContenedor = 
    configUi.posicion_titulo === 'abajo_izq' ? 'justify-end items-start text-left pb-16 px-8' :
    configUi.posicion_titulo === 'abajo_centro' ? 'justify-end items-center text-center pb-16 px-6' :
    'justify-center items-center text-center p-6';

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-white min-h-0">
      
      {/* BARRA SUPERIOR HEADER (Fija) */}
      <div className="h-14 flex-shrink-0 bg-white border-b border-[#EAEAEA] flex items-center justify-between px-8 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-serif text-[#1C1C1C] m-0">Live Preview</h2>
          <span className="px-2 py-0.5 bg-[#C8B99A]/20 text-[#C8B99A] text-[9px] uppercase tracking-widest font-bold rounded-sm border border-[#C8B99A]/30">Auto-Sync</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center bg-[#F5F4F0] p-1 rounded-sm border border-[#EAEAEA]">
            <button onClick={() => setDisenoDispositivo('web')} className={`flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest transition-all rounded-sm ${disenoDispositivo === 'web' ? 'bg-[#1C1C1C] text-white shadow-sm' : 'text-[#9A8F82] hover:text-[#1C1C1C]'}`}><Monitor size={13} /><span>Escritorio</span></button>
            <button onClick={() => setDisenoDispositivo('mobile')} className={`flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest transition-all rounded-sm ${disenoDispositivo === 'mobile' ? 'bg-[#1C1C1C] text-white shadow-sm' : 'text-[#9A8F82] hover:text-[#1C1C1C]'}`}><Smartphone size={13} /><span>Móvil</span></button>
          </div>
          <button onClick={() => guardarConfiguracionUi()} className="bg-[#1C1C1C] text-white hover:bg-black px-5 py-2 text-[10px] uppercase tracking-widest font-bold rounded-sm transition-all shadow-md">Publicar Diseño</button>
        </div>
      </div>

      {/* CONTENEDOR DIVIDIDO FIJO */}
      <div className="flex-1 flex overflow-hidden min-h-0 h-[calc(100%-56px)]">
        
        {/* ── LADO IZQUIERDO: CONTROLES (SCROLL 100% INDEPENDIENTE Y FIJO) ── */}
        <div className="w-[360px] h-full bg-white border-r border-[#EAEAEA] flex flex-col flex-shrink-0 overflow-y-auto custom-scrollbar z-10">
          <div className="p-8 pb-16">
            <h3 className="text-lg font-serif text-[#1C1C1C] mb-4 capitalize">{subTabDiseno.replace('_', ' ')}</h3>

            {/* --- 1. COVER: ESTRUCTURA, ALINEACIÓN Y OPACIDAD --- */}
            {subTabDiseno === 'cover' && (
              <div className="space-y-8">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#9A8F82] font-bold block mb-4">Estructura de la Portada</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setConfigUi({...configUi, estilo_portada: 'hero_full'})} className={`relative aspect-[4/5] rounded-md overflow-hidden border-[3px] transition-all group ${configUi.estilo_portada === 'hero_full' ? 'border-[#C8B99A] shadow-lg' : 'border-gray-200 hover:border-[#1C1C1C]'}`}><img src={previewImg} className="absolute inset-0 w-full h-full object-cover opacity-80" style={{ objectPosition: focalPosition }} alt="" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="text-white font-serif font-bold text-xs tracking-widest">TÍTULO</span></div></button>
                    <button onClick={() => setConfigUi({...configUi, estilo_portada: 'split'})} className={`relative aspect-[4/5] bg-white rounded-md overflow-hidden border-[3px] flex flex-col transition-all group ${configUi.estilo_portada === 'split' ? 'border-[#C8B99A] shadow-lg' : 'border-gray-200 hover:border-[#1C1C1C]'}`}><img src={previewImg} className="w-full h-[55%] object-cover opacity-90" style={{ objectPosition: focalPosition }} alt="" /><div className="flex-1 flex items-center justify-center bg-[#1C1C1C]"><span className="text-[#C8B99A] font-serif font-bold text-xs tracking-widest">TÍTULO</span></div></button>
                    <button onClick={() => setConfigUi({...configUi, estilo_portada: 'editorial'})} className={`relative aspect-[4/5] bg-[#FDFCF8] rounded-md overflow-hidden border-[3px] p-2 flex flex-col transition-all group ${configUi.estilo_portada === 'editorial' ? 'border-[#C8B99A] shadow-lg' : 'border-gray-200 hover:border-[#1C1C1C]'}`}><img src={previewImg} className="w-full h-[70%] object-cover opacity-90" style={{ objectPosition: focalPosition }} alt="" /><div className="flex-1 flex items-end justify-start pb-1 pl-1"><span className="text-[#1C1C1C] font-serif font-bold text-[10px] tracking-widest">TÍTULO</span></div></button>
                    <button onClick={() => setConfigUi({...configUi, estilo_portada: 'card'})} className={`relative aspect-[4/5] rounded-md overflow-hidden border-[3px] transition-all group ${configUi.estilo_portada === 'card' ? 'border-[#C8B99A] shadow-lg' : 'border-gray-200 hover:border-[#1C1C1C]'}`}><img src={previewImg} className="absolute inset-0 w-full h-full object-cover opacity-80" style={{ objectPosition: focalPosition }} alt="" /><div className="absolute inset-0 bg-black/20" /><div className="absolute bottom-3 left-3 right-3 bg-white p-3 text-left shadow-lg"><span className="text-[#1C1C1C] font-serif font-bold text-[9px] tracking-widest">TÍTULO</span></div></button>
                  </div>
                </div>

                <div className="pt-8 border-t border-[#EAEAEA]">
                  <label className="text-[10px] uppercase tracking-widest text-[#9A8F82] font-bold block mb-4">Alineación del Texto</label>
                  <div className="flex gap-3">
                    <button onClick={() => setConfigUi({...configUi, posicion_titulo: 'centro'})} className={`flex-1 h-12 border rounded-sm relative transition-all ${configUi.posicion_titulo === 'centro' || !configUi.posicion_titulo ? 'border-[#1C1C1C] bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`} title="Centro">
                      <div className="absolute inset-0 flex items-center justify-center"><div className="w-6 h-1.5 bg-[#1C1C1C] rounded-sm"></div></div>
                    </button>
                    <button onClick={() => setConfigUi({...configUi, posicion_titulo: 'abajo_izq'})} className={`flex-1 h-12 border rounded-sm relative transition-all ${configUi.posicion_titulo === 'abajo_izq' ? 'border-[#1C1C1C] bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`} title="Abajo Izquierda">
                      <div className="absolute inset-0 flex items-end justify-start p-3"><div className="w-6 h-1.5 bg-[#1C1C1C] rounded-sm"></div></div>
                    </button>
                    <button onClick={() => setConfigUi({...configUi, posicion_titulo: 'abajo_centro'})} className={`flex-1 h-12 border rounded-sm relative transition-all ${configUi.posicion_titulo === 'abajo_centro' ? 'border-[#1C1C1C] bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`} title="Abajo Centro">
                      <div className="absolute inset-0 flex items-end justify-center p-3"><div className="w-6 h-1.5 bg-[#1C1C1C] rounded-sm"></div></div>
                    </button>
                  </div>
                </div>

                <div className="pt-8 border-t border-[#EAEAEA]">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-[10px] uppercase tracking-widest text-[#9A8F82] font-bold">Nivel de Oscurecimiento</label>
                    <span className="text-[10px] font-mono font-bold bg-gray-100 px-2 py-1 rounded text-[#1C1C1C]">{configUi.opacidad_overlay || 30}%</span>
                  </div>
                  <input type="range" min="0" max="90" value={configUi.opacidad_overlay || 30} onChange={e => setConfigUi({ ...configUi, opacidad_overlay: parseInt(e.target.value) })} className="w-full accent-[#C8B99A] h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                </div>
              </div>
            )}

            {/* --- 2. TIPOGRAFÍA --- */}
            {subTabDiseno === 'tipografia' && (
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#9A8F82] font-bold block mb-4">Familia Tipográfica (Títulos)</label>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => setConfigUi({...configUi, fuente_titulo: 'serif'})} className={`flex items-center justify-between p-4 rounded-sm border transition-all ${configUi.fuente_titulo === 'serif' ? 'border-[#1C1C1C] bg-[#FAFAFA] shadow-sm' : 'border-[#EAEAEA] hover:border-[#C8B99A] bg-white'}`}>
                      <div className="flex items-center gap-4">
                        <span className="font-serif text-3xl text-[#1C1C1C] leading-none">Ag</span>
                        <div className="flex flex-col items-start">
                          <span className="text-xs font-bold text-[#1C1C1C]">Serif</span>
                          <span className="text-[9px] uppercase tracking-widest text-[#9A8F82]">Clásica & Elegante</span>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${configUi.fuente_titulo === 'serif' ? 'border-[#1C1C1C]' : 'border-gray-300'}`}>
                        {configUi.fuente_titulo === 'serif' && <div className="w-2 h-2 rounded-full bg-[#1C1C1C]" />}
                      </div>
                    </button>

                    <button onClick={() => setConfigUi({...configUi, fuente_titulo: 'sans'})} className={`flex items-center justify-between p-4 rounded-sm border transition-all ${configUi.fuente_titulo === 'sans' ? 'border-[#1C1C1C] bg-[#FAFAFA] shadow-sm' : 'border-[#EAEAEA] hover:border-[#C8B99A] bg-white'}`}>
                      <div className="flex items-center gap-4">
                        <span className="font-sans text-3xl text-[#1C1C1C] leading-none font-medium">Ag</span>
                        <div className="flex flex-col items-start">
                          <span className="text-xs font-bold text-[#1C1C1C]">Sans</span>
                          <span className="text-[9px] uppercase tracking-widest text-[#9A8F82]">Limpia & Moderna</span>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${configUi.fuente_titulo === 'sans' ? 'border-[#1C1C1C]' : 'border-gray-300'}`}>
                        {configUi.fuente_titulo === 'sans' && <div className="w-2 h-2 rounded-full bg-[#1C1C1C]" />}
                      </div>
                    </button>

                    <button onClick={() => setConfigUi({...configUi, fuente_titulo: 'mono'})} className={`flex items-center justify-between p-4 rounded-sm border transition-all ${configUi.fuente_titulo === 'mono' ? 'border-[#1C1C1C] bg-[#FAFAFA] shadow-sm' : 'border-[#EAEAEA] hover:border-[#C8B99A] bg-white'}`}>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-3xl text-[#1C1C1C] leading-none">Ag</span>
                        <div className="flex flex-col items-start">
                          <span className="text-xs font-bold text-[#1C1C1C]">Mono</span>
                          <span className="text-[9px] uppercase tracking-widest text-[#9A8F82]">Editorial & Técnica</span>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${configUi.fuente_titulo === 'mono' ? 'border-[#1C1C1C]' : 'border-gray-300'}`}>
                        {configUi.fuente_titulo === 'mono' && <div className="w-2 h-2 rounded-full bg-[#1C1C1C]" />}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- 3. COLORES --- */}
            {subTabDiseno === 'color' && (() => {
              const paletas = [
                { id: 'clasica', nombre: 'Clásica', fondo: '#FDFCF8', texto: '#1C1C1C', acento: '#C8B99A' },
                { id: 'noche', nombre: 'Noche', fondo: '#121212', texto: '#FAFAFA', acento: '#D4AF37' },
                { id: 'bosque', nombre: 'Bosque', fondo: '#F4F5F0', texto: '#2B3024', acento: '#6B7E54' },
                { id: 'terracota', nombre: 'Terracota', fondo: '#FCF8F5', texto: '#2A1B18', acento: '#B85C38' },
                { id: 'oceano', nombre: 'Océano Profundo', fondo: '#0F172A', texto: '#F8FAFC', acento: '#38BDF8' },
                { id: 'minimalista', nombre: 'Minimalista', fondo: '#FFFFFF', texto: '#000000', acento: '#9CA3AF' }
              ];

              return (
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[#9A8F82] font-bold block mb-4">Tema de Color</label>
                    <div className="grid grid-cols-2 gap-4">
                      {paletas.map(p => {
                        const isActive = configUi.color_fondo === p.fondo;
                        return (
                          <button
                            key={p.id}
                            onClick={() => setConfigUi({...configUi, color_fondo: p.fondo, color_texto: p.texto, color_acento: p.acento})}
                            className={`flex flex-col border rounded-md p-4 transition-all duration-300 ${isActive ? 'ring-2 ring-offset-2 ring-[#1C1C1C] shadow-md' : 'border-[#EAEAEA] hover:scale-[1.02]'}`}
                            style={{ backgroundColor: p.fondo }}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-5 h-5 rounded-full border border-black/10" style={{ backgroundColor: p.texto }}></div>
                              <div className="w-5 h-5 rounded-full border border-black/10" style={{ backgroundColor: p.acento }}></div>
                            </div>
                            <span className="text-xs font-bold text-left tracking-wide" style={{ color: p.texto }}>{p.nombre}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* --- 4. MÓDULO IA --- */}
            {subTabDiseno === 'ia' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-[#1C1C1C] uppercase tracking-wider mb-1">
                    Buscador Inteligente ({eventoActivo?.tipo_reconocimiento === 'ocr' ? 'OCR / Dorsales' : 'Reconocimiento Facial'})
                  </h4>
                  <p className="text-[10px] text-[#9A8F82] mb-6">
                    Configura cómo interactúan los visitantes con el motor de IA en la galería pública.
                  </p>

                  <div className="flex items-center justify-between p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-sm mb-4">
                    <div>
                      <span className="text-xs font-bold text-[#1C1C1C] block">Mostrar Buscador IA</span>
                      <span className="text-[9px] text-[#9A8F82] block">Muestra u oculta la sección de búsqueda</span>
                    </div>
                    <button type="button" onClick={() => setConfigUi({ ...configUi, mostrar_modulo_ia: configUi.mostrar_modulo_ia === false ? true : false })} className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${configUi.mostrar_modulo_ia !== false ? 'bg-[#1C1C1C]' : 'bg-gray-300'}`}><div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${configUi.mostrar_modulo_ia !== false ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                  </div>

                  {eventoActivo?.tipo_reconocimiento !== 'ocr' && (
                    <div className="flex items-center justify-between p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-sm">
                      <div>
                        <span className="text-xs font-bold text-[#1C1C1C] block">Mostrar Nombres</span>
                        <span className="text-[9px] text-[#9A8F82] block">Si se apaga, solo mostrará el avatar circular</span>
                      </div>
                      <button type="button" onClick={() => setConfigUi({ ...configUi, mostrar_nombres_ia: configUi.mostrar_nombres_ia === false ? true : false })} className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${configUi.mostrar_nombres_ia !== false ? 'bg-[#1C1C1C]' : 'bg-gray-300'}`}><div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${configUi.mostrar_nombres_ia !== false ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* FALLBACK OTROS TABS */}
            {subTabDiseno !== 'cover' && subTabDiseno !== 'tipografia' && subTabDiseno !== 'color' && subTabDiseno !== 'ia' && (
              <div className="text-center py-20 text-gray-400">
                <p className="text-xs uppercase tracking-widest">Opciones en desarrollo</p>
              </div>
            )}

          </div>
        </div>

        {/* ── LADO DERECHO: PREVIEW ENMARCADO (100% FIJO EN PANTALLA) ── */}
        <div 
          className="flex-1 bg-[#E8E6E1] p-4 md:p-6 flex flex-col items-center justify-center relative overflow-hidden h-full min-h-0" 
          style={{ backgroundImage: 'radial-gradient(#D1CEC7 1px, transparent 1px)', backgroundSize: '20px 24px' }}
        >
          
          {/* MARCO MOCKUP (Restringido con max-h-full para jamás desbordar la pantalla) */}
          <div className={`transition-all duration-500 ease-in-out flex flex-col relative overflow-hidden h-full max-h-full min-h-0 ${
            disenoDispositivo === 'mobile' 
              ? 'w-[280px] max-h-[520px] rounded-[36px] border-[8px] border-[#1C1C1C] bg-[#1C1C1C] shadow-2xl' 
              : 'w-full max-w-[900px] rounded-lg border border-[#D1CEC7] bg-white shadow-2xl'
          }`}>
            
            {/* Header Barra de Navegador (Solo Escritorio) */}
            {disenoDispositivo === 'web' && (
              <div className="h-9 bg-[#F5F5F5] border-b border-[#EAEAEA] flex items-center px-3 gap-2 flex-shrink-0 z-30">
                <div className="flex gap-1.5 w-16"><div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E]"></div><div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]"></div><div className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29]"></div></div>
                <div className="flex-1 flex justify-center"><div className="bg-white px-10 py-0.5 rounded text-[9px] font-mono text-gray-400 border border-gray-200 shadow-sm flex items-center gap-1.5"><Lock size={9}/> flashealo.com/g/{eventoActivo?.url_slug || 'demo'}</div></div>
                <div className="w-16"></div>
              </div>
            )}

            {/* Notch (Solo Móvil) */}
            {disenoDispositivo === 'mobile' && (
              <div className="absolute top-0 inset-x-0 h-4 flex justify-center z-50 pointer-events-none">
                <div className="w-24 h-4 bg-[#1C1C1C] rounded-b-[10px]"></div>
              </div>
            )}

            {/* 📱 PANTALLA INTERIOR DE LA WEB (Scroll 100% aislado dentro del mockup) */}
            <div 
              ref={mockScrollRef}
              className={`flex-1 overflow-y-auto custom-scrollbar relative transition-colors duration-500 min-h-0 ${disenoDispositivo === 'mobile' ? 'rounded-[28px]' : 'rounded-b-md'}`} 
              style={{ backgroundColor: configUi.color_fondo || '#FDFCF8', color: configUi.color_texto || '#1C1C1C' }}
            >
              
              {/* HERO FULL */}
              {configUi.estilo_portada === 'hero_full' && (
                <div className={`relative w-full ${disenoDispositivo === 'mobile' ? 'h-[360px]' : 'h-[380px]'} flex flex-col flex-shrink-0`}>
                  <img src={previewImg} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: focalPosition }} alt="" />
                  <div className="absolute inset-0 bg-black" style={{ opacity: (configUi.opacidad_overlay || 30) / 100 }} />
                  <div className={`absolute inset-0 z-10 w-full h-full flex flex-col ${alineacionContenedor}`}>
                    <span className="text-[8px] md:text-[11px] uppercase tracking-[0.35em] font-bold mb-3 drop-shadow-md transition-colors" style={{ color: configUi.color_acento || '#C8B99A' }}>
                      {eventoActivo?.fecha_evento || '10 AGOSTO 2026'}
                    </span>
                    <h1 className={`${fuenteClase} ${disenoDispositivo === 'mobile' ? 'text-[26px] font-light leading-snug' : 'text-4xl lg:text-5xl font-light leading-tight'} drop-shadow-xl text-white max-w-2xl`}>
                      {eventoActivo?.nombre || 'Tu Colección'}
                    </h1>
                  </div>
                </div>
              )}

              {/* SPLIT */}
              {configUi.estilo_portada === 'split' && (
                <div className={`flex w-full ${disenoDispositivo === 'mobile' ? 'flex-col h-[380px]' : 'flex-row h-[360px]'} flex-shrink-0`}>
                  <div className={`${disenoDispositivo === 'mobile' ? 'h-[55%]' : 'w-[55%]'} relative`}>
                    <img src={previewImg} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: focalPosition }} alt="" />
                    <div className="absolute inset-0 bg-black" style={{ opacity: (configUi.opacidad_overlay || 30) / 100 }} />
                  </div>
                  <div className={`${disenoDispositivo === 'mobile' ? 'h-[45%]' : 'w-[45%]'} flex flex-col ${configUi.posicion_titulo === 'abajo_izq' || configUi.posicion_titulo === 'abajo_centro' ? alineacionContenedor : 'justify-center items-start p-6 md:p-10'} bg-[#1C1C1C] text-white`}>
                    <span className="text-[8px] md:text-[10px] uppercase tracking-[0.3em] font-bold mb-3 transition-colors" style={{ color: configUi.color_acento || '#C8B99A' }}>{eventoActivo?.fecha_evento || '10 AGOSTO 2026'}</span>
                    <h1 className={`${fuenteClase} ${disenoDispositivo === 'mobile' ? 'text-[20px]' : 'text-3xl'} font-light leading-tight`}>{eventoActivo?.nombre || 'Tu Colección'}</h1>
                  </div>
                </div>
              )}

              {/* EDITORIAL */}
              {configUi.estilo_portada === 'editorial' && (
                <div className={`w-full pt-8 pb-6 flex flex-col items-center relative ${disenoDispositivo === 'mobile' ? 'min-h-[360px]' : 'min-h-[380px]'} flex-shrink-0`}>
                  <div className={`${disenoDispositivo === 'mobile' ? 'w-[85%] h-[220px]' : 'w-[75%] h-[280px]'} relative shadow-2xl z-10`}>
                    <img src={previewImg} className="absolute inset-0 w-full h-full object-cover border-[8px] md:border-[16px] border-white" style={{ objectPosition: focalPosition }} alt="" />
                    <div className="absolute inset-0 border-[8px] md:border-[16px] border-transparent" style={{ background: '#000000', opacity: (configUi.opacidad_overlay || 30) / 100, backgroundClip: 'content-box' }} />
                  </div>
                  <div className={`absolute inset-0 z-20 w-full h-full flex flex-col ${alineacionContenedor}`} style={{ color: configUi.color_texto || '#1C1C1C' }}>
                    <span className="text-[8px] md:text-[11px] uppercase tracking-[0.3em] font-bold mb-2 md:mb-3 transition-colors" style={{ color: configUi.color_acento || '#C8B99A' }}>{eventoActivo?.fecha_evento || '10 AGOSTO 2026'}</span>
                    <h1 className={`${fuenteClase} ${disenoDispositivo === 'mobile' ? 'text-2xl' : 'text-4xl'} font-light leading-none`}>{eventoActivo?.nombre || 'Tu Colección'}</h1>
                  </div>
                </div>
              )}

              {/* CARD */}
              {configUi.estilo_portada === 'card' && (
                <div className={`relative w-full ${disenoDispositivo === 'mobile' ? 'h-[340px]' : 'h-[380px]'} flex items-end justify-center p-6 bg-black flex-shrink-0`}>
                  <img src={previewImg} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: focalPosition }} alt="" />
                  <div className="absolute inset-0 bg-black" style={{ opacity: (configUi.opacidad_overlay || 30) / 100 }} />
                  <div className="relative z-10 p-5 md:p-8 w-[90%] max-w-2xl bg-white shadow-2xl flex flex-col items-center text-center transform translate-y-6">
                    <span className="text-[8px] md:text-[10px] uppercase tracking-[0.3em] font-bold mb-3 transition-colors" style={{ color: configUi.color_acento || '#C8B99A' }}>{eventoActivo?.fecha_evento || '10 AGOSTO 2026'}</span>
                    <h1 className={`${fuenteClase} ${disenoDispositivo === 'mobile' ? 'text-lg' : 'text-3xl'} font-light leading-tight text-[#1C1C1C] mb-2`}>{eventoActivo?.nombre || 'Tu Colección'}</h1>
                  </div>
                </div>
              )}

              {/* SECCIÓN SOBRE EL EVENTO */}
              <div className="p-6 text-center max-w-md mx-auto mt-4 mb-2 flex-shrink-0">
                <div className="w-8 h-[1px] mx-auto mb-3 transition-colors" style={{ background: configUi.color_acento || '#C8B99A' }} />
                <h3 className={`text-xs md:text-sm ${fuenteClase} italic mb-2 transition-colors`} style={{ color: configUi.color_texto || '#1C1C1C' }}>"{eventoActivo?.titulo_about || 'Capturando emociones únicas'}"</h3>
                <p className="text-[10px] font-light leading-relaxed opacity-70 transition-colors" style={{ color: configUi.color_texto || '#1C1C1C' }}>{eventoActivo?.descripcion || 'Bienvenido a la galería oficial.'}</p>
              </div>

              {/* TABS DE CARPETAS (Sets Reales) */}
              <div className="w-full px-6 md:px-10 mt-6 mb-6 flex-shrink-0">
                {carpetas && carpetas.length > 0 && (
                  <div className="flex gap-5 border-b border-black/10 overflow-x-auto custom-scrollbar mb-4">
                    {carpetas.map((c, i) => (
                      <div key={c.id} className={`pb-2 text-[9px] md:text-[10px] uppercase tracking-widest whitespace-nowrap transition-colors ${i === 0 ? 'font-bold' : 'opacity-40'}`} style={{ borderBottom: i === 0 ? `2px solid ${configUi.color_acento || '#C8B99A'}` : '2px solid transparent', color: configUi.color_texto || '#1C1C1C' }}>
                        {c.nombre}
                      </div>
                    ))}
                  </div>
                )}

                {/* GRID DE FOTOS MASONRY LITE (Fotos Reales) */}
                {fotosEvento && fotosEvento.length > 0 && (
                  <div className="columns-2 md:columns-3 gap-2 md:gap-3">
                    {fotosEvento.filter(f => carpetas.length > 0 ? f.carpeta_id === carpetas[0].id : true).slice(0, 6).map((foto) => (
                      <div key={foto.id} className="mb-2 md:mb-3 break-inside-avoid">
                        <img src={resolverUrlFoto(foto, false)} className="w-full h-auto object-cover rounded-sm shadow-sm" alt="Preview"/>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* MÓDULO DE IA CONDICIONAL */}
              {configUi.mostrar_modulo_ia !== false && (
                <div ref={iaSectionRef} className="w-full px-6 md:px-10 py-10 text-center transition-all mt-4 bg-black/5 flex-shrink-0">
                  <span className="text-[8px] md:text-[9px] uppercase tracking-[0.3em] opacity-50 block mb-2 font-bold" style={{ color: configUi.color_texto || '#1C1C1C' }}>
                    Tu colección personal
                  </span>
                  <h3 className={`text-sm md:text-base font-bold mb-6 ${fuenteClase}`} style={{ color: configUi.color_texto || '#1C1C1C' }}>
                    {eventoActivo?.tipo_reconocimiento === 'ocr' ? 'Encuentra tus fotografías' : 'Identidades Detectadas'}
                  </h3>

                  {eventoActivo?.tipo_reconocimiento === 'ocr' ? (
                    <div className="max-w-xs mx-auto flex flex-col items-center gap-3">
                      <input 
                        type="text" 
                        placeholder="Ej. 1405" 
                        disabled 
                        className={`w-full bg-transparent border-b py-2 text-center text-xs md:text-sm outline-none ${fuenteClase}`}
                        style={{ borderColor: 'rgba(0,0,0,0.2)', color: configUi.color_texto || '#1C1C1C' }}
                      />
                      <div className="px-6 py-2.5 text-[9px] uppercase tracking-widest font-bold rounded-sm shadow-sm mt-2" style={{ backgroundColor: configUi.color_texto || '#1C1C1C', color: configUi.color_fondo || '#FFFFFF' }}>
                        Acceder a Galería
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-3 max-w-xs mx-auto">
                      {(listaJugadores && listaJugadores.length > 0 
                        ? listaJugadores.slice(0, 4) 
                        : [
                            { id: 1, display_name: 'Participante 1', avatar_url: `https://i.pravatar.cc/150?img=11` },
                            { id: 2, display_name: 'Participante 2', avatar_url: `https://i.pravatar.cc/150?img=12` },
                            { id: 3, display_name: 'Participante 3', avatar_url: `https://i.pravatar.cc/150?img=13` },
                            { id: 4, display_name: 'Participante 4', avatar_url: `https://i.pravatar.cc/150?img=14` }
                          ]
                      ).map((jugador, idx) => (
                        <div key={jugador.id} className="flex flex-col items-center gap-2">
                          <div 
                            className="w-12 h-12 rounded-full overflow-hidden border-2 shadow-sm transition-transform hover:scale-110 bg-white"
                            style={{ borderColor: configUi.color_acento || '#C8B99A' }}
                          >
                            <img 
                              src={jugador.avatar_url?.includes('http') ? jugador.avatar_url : (jugador.avatar_url ? fotoUrlAux(jugador.avatar_url) : `https://i.pravatar.cc/150?img=${idx + 10}`)} 
                              className="w-full h-full object-cover filter grayscale-[20%]" 
                              alt="Avatar" 
                            />
                          </div>
                          {configUi.mostrar_nombres_ia !== false && (
                            <span className={`text-[8px] ${fuenteClase} italic truncate w-full px-1 text-center opacity-80`} style={{ color: configUi.color_texto || '#1C1C1C' }}>
                              {jugador.display_name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* FOOTER DE LA WEB INTERNA */}
              <footer className="w-full px-6 py-6 md:px-8 flex justify-between items-center transition-colors duration-500 flex-shrink-0" style={{ backgroundColor: configUi.color_texto || '#1C1C1C' }}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-0.5 h-3.5 rounded-sm transition-colors" style={{ backgroundColor: configUi.color_acento || '#C8B99A' }}></span>
                    <span className="font-serif text-[11px] tracking-[0.2em] uppercase transition-colors" style={{ color: configUi.color_fondo || '#FFFFFF' }}>Flashealo</span>
                  </div>
                  <p className="text-[7px] tracking-[0.2em] uppercase opacity-50 transition-colors" style={{ color: configUi.color_fondo || '#FFFFFF' }}>
                    Inteligencia artificial aplicada al arte.
                  </p>
                </div>
                <Mail size={14} className="opacity-50 transition-colors" style={{ color: configUi.color_fondo || '#FFFFFF' }} />
              </footer>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
})()}
                </div>
              </div>
            </div>
          )}

          {/* LIGHTBOX MAGNIFICADOR CON CARGA PROGRESIVA Y PANEL EXIF */}
          <AnimatePresence>
            {lightboxIndex !== null && fotosActuales[lightboxIndex] && (() => {
              const fotoActual = fotosActuales[lightboxIndex];
              
              // Extracción de datos EXIF (con fallbacks elegantes si algún dato no está presente)
              const exif = fotoActual.exif || fotoActual.metadata || {};
              const camara = exif.camera || exif.camara || fotoActual.camara || 'No especificada';
              const lente = exif.lens || exif.lente || 'Lente Estándar';
              const iso = exif.iso ? `ISO ${exif.iso}` : 'ISO 100';
              const apertura = exif.aperture || exif.f_number ? `f/${exif.aperture || exif.f_number}` : 'f/2.8';
              const velocidad = exif.shutter_speed || exif.velocidad || '1/500s';
              const focal = exif.focal_length ? `${exif.focal_length}mm` : '50mm';
              const resolucion = fotoActual.ancho && fotoActual.alto ? `${fotoActual.ancho} x ${fotoActual.alto} px` : 'Alta Resolución';
              const fecha = fotoActual.fecha_captura || fotoActual.created_at ? new Date(fotoActual.fecha_captura || fotoActual.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Reciente';

              return (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(5, 5, 5, 0.96)', display: 'flex', flexDirection: 'column', backdropFilter: 'blur(12px)' }}
                >
                  {/* BARRA SUPERIOR DEL LIGHTBOX */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: WHITE }}>
                    <span style={{ fontSize: 12, letterSpacing: '0.1em', fontWeight: 600, color: '#A0A0A0' }}>
                      {lightboxIndex + 1} / {fotosActuales.length}
                    </span>

                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                      {/* Botón para alternar el Panel EXIF */}
                      <button 
                        onClick={() => setMostrarExif(!mostrarExif)} 
                        title={mostrarExif ? "Ocultar Datos EXIF" : "Ver Datos EXIF"}
                        style={{ 
                          background: mostrarExif ? 'rgba(255,255,255,0.2)' : 'none', 
                          border: '1px solid rgba(255,255,255,0.2)', 
                          color: WHITE, 
                          borderRadius: '50%',
                          width: 32,
                          height: 32,
                          cursor: 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Info size={16} />
                      </button>

                      <button onClick={() => toggleFavorito(fotoActual.id)} style={{ background: 'none', border: 'none', color: WHITE, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <Heart size={15} fill={fotoActual.es_favorita ? '#E74C3C' : 'none'} color={fotoActual.es_favorita ? '#E74C3C' : WHITE}/> Favorita
                      </button>
                      
                      <button onClick={() => {
                        setPortadaPos({ x: 50, y: 50 });
                        setModalPortada({ url: fotoActual.url_original });
                      }} style={{ background: 'none', border: 'none', color: WHITE, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <ImageIcon size={15} /> Usar como Portada
                      </button>

                      <button onClick={() => borrarFotos([fotoActual.id])} style={{ background: 'none', border: 'none', color: '#E74C3C', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <Trash2 size={15} /> Borrar
                      </button>

                      <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.2)' }}></div>

                      <button onClick={() => setLightboxIndex(null)} style={{ background: 'none', border: 'none', color: WHITE, cursor: 'pointer' }}>
                        <X size={22} />
                      </button>
                    </div>
                  </div>

                  {/* ÁREA PRINCIPAL: FLECHAS + VISOR DE FOTO + PANEL EXIF */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden', position: 'relative' }}>
                    
                    {/* Flecha Izquierda */}
                    <button 
                      onClick={() => setLightboxIndex(prev => (prev === 0 ? fotosActuales.length - 1 : prev - 1))} 
                      style={{ background: 'none', border: 'none', color: WHITE, cursor: 'pointer', padding: '0 20px', zIndex: 10 }}
                    >
                      <ChevronLeft size={38} strokeWidth={1.5} />
                    </button>

                    {/* CONTENEDOR DE LA FOTO CON CARGA PROGRESIVA (ESTILO STREAMING) */}
                    {/* CONTENEDOR DE LA FOTO CON CARGA PROGRESIVA (SIN BLUR) */}
                    <div style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      
                      {/* 1. IMAGEN LIGERA (Baja calidad, carga instantánea, se muestra tal cual es) */}
                      <img 
                        src={resolverUrlFoto(fotoActual, false)} 
                        alt="Vista Previa" 
                        style={{ 
                          position: 'absolute',
                          maxWidth: '90vw', 
                          maxHeight: '82vh', 
                          objectFit: 'contain',
                          zIndex: 1
                        }} 
                      />

                      {/* 2. IMAGEN PESADA (Alta calidad, carga en segundo plano) */}
                      <img 
                        src={resolverUrlFoto(fotoActual, true)} 
                        alt={fotoActual.nombre || "Foto Full HD"} 
                        onLoad={() => setFotoHdCargada(true)} // Avisa cuando ya descargó completa
                        style={{ 
                          position: 'relative',
                          maxWidth: '90vw', 
                          maxHeight: '82vh', 
                          objectFit: 'contain',
                          /* Se mantiene invisible hasta que descarga, luego aparece suavemente sobre la miniatura */
                          opacity: fotoHdCargada ? 1 : 0, 
                          transition: 'opacity 0.4s ease-in-out', /* Este es el tiempo del fundido */
                          zIndex: 2,
                          boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                        }} 
                      />

                      {/* Indicador de carga súper sutil (Opcional) */}
                      {!fotoHdCargada && (
                        <div style={{ position: 'absolute', bottom: 30, zIndex: 10, background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: 20, color: '#DDD', fontSize: 11, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C8B99A', animation: 'pulse 1.5s infinite' }}></div>
                          Cargando HD...
                        </div>
                      )}
                    </div>

                    {/* Flecha Derecha */}
                    <button 
                      onClick={() => setLightboxIndex(prev => (prev === fotosActuales.length - 1 ? 0 : prev + 1))} 
                      style={{ background: 'none', border: 'none', color: WHITE, cursor: 'pointer', padding: '0 20px', zIndex: 10 }}
                    >
                      <ChevronRightIcon size={38} strokeWidth={1.5} />
                    </button>

                    {/* PANEL LATERAL DE DATOS EXIF */}
                    <AnimatePresence>
                      {mostrarExif && (
                        <motion.div 
                          initial={{ width: 0, opacity: 0 }} 
                          animate={{ width: 310, opacity: 1 }} 
                          exit={{ width: 0, opacity: 0 }} 
                          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                          style={{ 
                            height: '100%', 
                            background: 'rgba(18, 18, 18, 0.95)', 
                            borderLeft: '1px solid rgba(255,255,255,0.1)', 
                            padding: '24px 20px', 
                            color: WHITE, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: 20,
                            overflowY: 'auto',
                            flexShrink: 0
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8B99A' }}>
                              Información EXIF
                            </span>
                            <button onClick={() => setMostrarExif(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                              <X size={16} />
                            </button>
                          </div>

                          {/* Lista de Metadatos */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 12 }}>
                            
                            {/* Cámara */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                              <Camera size={16} style={{ color: '#C8B99A', marginTop: 2 }} />
                              <div>
                                <div style={{ color: '#888', fontSize: 10, textTransform: 'uppercase' }}>Cámara</div>
                                <div style={{ fontWeight: 500, color: WHITE }}>{camara}</div>
                                <div style={{ color: '#A0A0A0', fontSize: 11 }}>{lente}</div>
                              </div>
                            </div>

                            {/* Ajustes de Disparo */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                              <Sliders size={16} style={{ color: '#C8B99A', marginTop: 2 }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Parámetros</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 6 }}>
                                  <div><span style={{ color: '#888' }}>ISO:</span> {iso}</div>
                                  <div><span style={{ color: '#888' }}>Apertura:</span> {apertura}</div>
                                  <div><span style={{ color: '#888' }}>Velocidad:</span> {velocidad}</div>
                                  <div><span style={{ color: '#888' }}>Focal:</span> {focal}</div>
                                </div>
                              </div>
                            </div>

                            {/* Dimensión y Resolución */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                              <Maximize2 size={16} style={{ color: '#C8B99A', marginTop: 2 }} />
                              <div>
                                <div style={{ color: '#888', fontSize: 10, textTransform: 'uppercase' }}>Dimensiones</div>
                                <div style={{ fontWeight: 500, color: WHITE }}>{resolucion}</div>
                              </div>
                            </div>

                            {/* Fecha de Captura */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                              <Calendar size={16} style={{ color: '#C8B99A', marginTop: 2 }} />
                              <div>
                                <div style={{ color: '#888', fontSize: 10, textTransform: 'uppercase' }}>Capturada El</div>
                                <div style={{ fontWeight: 500, color: WHITE }}>{fecha}</div>
                              </div>
                            </div>

                            {/* Nombre de Archivo */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                              <HardDrive size={16} style={{ color: '#C8B99A', marginTop: 2 }} />
                              <div style={{ wordBreak: 'break-all' }}>
                                <div style={{ color: '#888', fontSize: 10, textTransform: 'uppercase' }}>Archivo</div>
                                <div style={{ color: '#AAA', fontSize: 11 }}>{fotoActual.nombre_archivo || fotoActual.id || 'foto_original.jpg'}</div>
                              </div>
                            </div>

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* LUPA MÁGICA DE DETECCIONES DE IA */}
          <AnimatePresence>
            {zoomCara && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setZoomCara(null)}>
                <div className="p-6 max-w-4xl w-full bg-[#111] border border-[#333] relative flex justify-center shadow-2xl" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setZoomCara(null)} className="absolute top-4 right-4 text-white z-50 bg-black/50 p-2 rounded-full hover:bg-white hover:text-black transition-colors"><X size={20}/></button>
                  <div className="relative inline-block leading-none max-w-full cursor-zoom-out shadow-md overflow-hidden" onClick={() => setZoomCara(null)}>
                    <img src={fotoUrlAux(zoomCara.photo_url, true)} className="max-h-[80vh] w-auto max-w-full block" alt="Zoom AI" draggable={false} />
                    {(() => {
                      const rawBox = getBboxCoords(zoomCara.bbox);
                      if (rawBox) {
                        const box = expandBbox(rawBox);
                        return <div className="absolute border-[3px] border-[#C8B99A] z-10 shadow-[0_0_0_9999px_rgba(0,0,0,0.75)] transition-all pointer-events-none" style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }} />;
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </main>
      </div>
    </div>
  );
}