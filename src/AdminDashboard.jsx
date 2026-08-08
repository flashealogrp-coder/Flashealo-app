import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { 
  Loader2, Plus, Calendar, Settings, Image as ImageIcon, Trash2, CheckCircle, 
  Lock, Unlock, Grid, Folder, Star, ArrowLeft, FolderInput, CheckCircle2, 
  ChevronLeft, ChevronRight as ChevronRightIcon, Eye, Heart, Maximize2, X, 
  PanelLeftClose, PanelLeft, UploadCloud, ChevronDown, ChevronUp, MapPin, 
  AlertTriangle, Zap, User, Copy, LogOut, Hash, UserMinus, Combine, Check, 
  ScanFace, ScanLine, Share2, Edit2
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
  if (esWatermark && ruta.includes('originales/')) {
    ruta = ruta.replace('originales/', 'watermarks/');
  }
  return `${DOMINIO_R2}/${ruta}`;
};

// 🌟 ESCUDO ANTI-CRASH PARA BBOX (Soporta errores de formato de Python) 🌟
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

// 🌟 MAGIA: Expande el cuadro del rostro para capturar el cuerpo 🌟
const expandBbox = (originalBox) => {
  if (!originalBox) return null;
  let nw = originalBox.w * 2.2; 
  let nh = originalBox.h * 3.8; 
  let nx = originalBox.x - (nw - originalBox.w) / 2;
  let ny = originalBox.y - (originalBox.h * 0.4); 
  
  nx = Math.max(0, nx);
  ny = Math.max(0, ny);
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
  const [mostrarModalMover, setMostrarModalMover] = useState(false);

  const [mostrarUploader, setMostrarUploader] = useState(false);
  const [archivosUploader, setArchivosUploader] = useState([]);
  const [estadoSubida, setEstadoSubida] = useState({ activa: false, progreso: 0, total: 0 });
  const [arrastrando, setArrastrando] = useState(false);
  const fileInputRef = useRef(null);
  const [procesandoIA, setProcesandoIA] = useState(false);

  // Navegación en el Dashboard
  const [seccionDashboard, setSeccionDashboard] = useState('fotos'); 
  const [subTabIA, setSubTabIA] = useState('identidades'); 

  // Estados Datos IA
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCargandoLogin(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

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
        await supabase.storage.from('assets').upload(`portadas/${fileName}`, portadaFile);
        finalPortadaUrl = `portadas/${fileName}`;
      }
      if (logoFile) {
        const fileName = `${Date.now()}_logo.${logoFile.name.split('.').pop()}`;
        await supabase.storage.from('assets').upload(`logos/${fileName}`, logoFile);
        finalLogoUrl = `logos/${fileName}`;
      }
      const datosGuardar = { ...formData, portada_url: finalPortadaUrl, logo_url: finalLogoUrl };
      
      Object.keys(datosGuardar).forEach(key => {
        if (datosGuardar[key] === '') datosGuardar[key] = null;
      });
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
      setMensaje({ tipo: 'exito', texto: 'Colección e imágenes eliminadas permanentemente.' });
      setVista('grid'); setEventoEditandoId(null); setMostrarConfirmacionBorrar(false); setTextoConfirmacion(''); await cargarEventos();
    } catch (error) { setMensaje({ tipo: 'error', texto: `Error al eliminar: ${error.message}` }); }
    setCargando(false);
  };

  const entrarAlEvento = async (ev) => {
    setEventoActivo(ev); setFotosSeleccionadas([]); setSeccionDashboard('fotos'); setVista('dashboard');
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
    await supabase.from('face_detections').update({ identity_id: idDestino }).eq('identity_id', jugadorSeleccionado.id);
    await supabase.from('identities').delete().eq('id', jugadorSeleccionado.id);
    setJugadorSeleccionado(null); cargarJugadores(); cargarStatsIA(eventoActivo.id, true);
  };

  const destruirPerfilFalso = async () => {
    await supabase.from('face_detections').delete().eq('identity_id', jugadorSeleccionado.id);
    await supabase.from('identities').delete().eq('id', jugadorSeleccionado.id);
    setJugadorSeleccionado(null); cargarJugadores(); cargarStatsIA(eventoActivo.id, true);
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
    if (seccionDashboard === 'ia') {
      if (subTabIA === 'identidades') cargarJugadores();
      else if (subTabIA === 'corredores') cargarCorredores();
      else if (subTabIA === 'dudas') cargarDudas();
    }
  }, [seccionDashboard, subTabIA, cargarJugadores, cargarCorredores, cargarDudas]);

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
    setMensaje({ tipo: 'exito', texto: 'Portada actualizada.' });
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
  const iaEjecutada = statsIA.caras > 0 || statsIA.dorsales > 0 || statsIA.dudas > 0;

  return (
    <div style={{ display: 'flex', height: '100vh', background: CREAM, color: INK, fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
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

        <main style={{ flex: 1, overflowY: 'auto' }}>
          
          {/* VISTA 1: GRID DE COLECCIONES */}
          {vista === 'grid' && (
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1 style={{ fontSize: 24, fontWeight: 400, fontFamily: 'Georgia, serif', margin: 0 }}>Colecciones</h1>
                <button onClick={() => { 
                  setEventoEditandoId(null); 
                  setFormData({ nombre: '', url_slug: '', tipo_reconocimiento: 'hibrido', password_cliente: '', fecha_evento: '', ubicacion: '', titulo_about: '', descripcion: '' });
                  setPortadaFile(null); setLogoFile(null); setSeccionAbierta('datos'); setVista('form'); 
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
                          <img src={getUrlCompleta(ev.portada_url) || "https://images.unsplash.com/photo-1541534741688?w=800"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

          {/* VISTA FORMULARIO (AJUSTES) */}
          {vista === 'form' && (
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px 80px' }}>
              <h1 className="text-3xl font-serif mb-8 text-[#1C1C1C]">Ajustes del Evento</h1>
              <form onSubmit={guardarEvento} className="bg-white p-8 border shadow-sm flex flex-col gap-6">
                <div>
                  <label className="text-xs uppercase tracking-widest text-gray-500 mb-2 block">Nombre del Evento</label>
                  <input required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full p-4 bg-[#FDFCF8] outline-none border-b border-black/10 focus:border-black text-xl font-serif" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-gray-500 mb-2 block">URL Personalizada (Slug)</label>
                  <input required value={formData.url_slug} onChange={e => setFormData({...formData, url_slug: e.target.value.toLowerCase().replace(/ /g, '-')})} className="w-full p-4 bg-[#FDFCF8] outline-none border-b border-black/10 focus:border-black text-xl font-serif" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-gray-500 mb-2 block">Motor IA Principal</label>
                  <select value={formData.tipo_reconocimiento} onChange={e => setFormData({...formData, tipo_reconocimiento: e.target.value})} className="w-full p-4 bg-[#FDFCF8] outline-none border-b border-black/10 focus:border-black font-serif">
                    <option value="hibrido">Híbrido (Recomendado)</option>
                    <option value="facial">Facial Puro (Bodas/Sociales)</option>
                    <option value="ocr">Lectura OCR (Deportes)</option>
                  </select>
                </div>
                <div className="flex gap-4 mt-4">
                  <button type="submit" disabled={cargando} className="bg-[#1C1C1C] text-white px-6 py-3 uppercase tracking-widest text-xs font-bold">{cargando ? 'Guardando...' : 'Guardar Cambios'}</button>
                  {eventoEditandoId && (
                    <button type="button" onClick={() => setMostrarConfirmacionBorrar(true)} className="border border-red-500 text-red-500 px-6 py-3 uppercase tracking-widest text-xs font-bold hover:bg-red-50">Eliminar Evento</button>
                  )}
                </div>
                {mostrarConfirmacionBorrar && (
                  <div className="mt-4 p-4 border border-red-200 bg-red-50">
                    <p className="text-sm text-red-800 mb-2">Escribe "{formData.nombre}" para confirmar</p>
                    <input type="text" value={textoConfirmacion} onChange={(e) => setTextoConfirmacion(e.target.value)} className="w-full p-2 mb-2" />
                    <button type="button" onClick={eliminarColeccionCompleta} className="bg-red-600 text-white px-4 py-2">Eliminar Definitivamente</button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* VISTA DASHBOARD (EVENTO ACTIVO) */}
          {vista === 'dashboard' && eventoActivo && (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
              
              <div style={{ height: 180, position: 'relative', background: INK, display: 'flex', alignItems: 'flex-end', padding: '0 32px 24px', flexShrink: 0 }}>
                <img src={getUrlCompleta(eventoActivo.portada_url) || "https://images.unsplash.com/photo-1541534741688?w=1200"} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
                <div style={{ position: 'relative', zIndex: 10, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <h1 style={{ fontSize: 28, fontFamily: 'Georgia, serif', color: WHITE, margin: '0 0 4px 0' }}>{eventoActivo.nombre}</h1>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: 0 }}>{eventoActivo.fecha_evento || 'Sin fecha'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={copiarEnlacePublico} style={{ background: SAND, color: INK, border: 'none', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                      <Share2 size={13} /> Copiar Enlace
                    </button>
                    <button onClick={() => window.open(`/g/${eventoActivo.url_slug || eventoActivo.id}`, '_blank')} style={{ background: 'rgba(255,255,255,0.15)', color: WHITE, border: 'none', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}><Eye size={13} /> Ver Público</button>
                    <button onClick={() => {
                      setEventoEditandoId(eventoActivo.id); setFormData(eventoActivo); setVista('form');
                    }} style={{ background: WHITE, color: INK, border: 'none', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}><Settings size={13} /> Ajustes</button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flex: 1, minHeight: 450 }}>
                <div style={{ width: 240, background: WHITE, borderRight: `1px solid ${BORDER}`, padding: '20px 0', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                  
                  <div className="mb-6">
                    <div style={{ padding: '8px 16px', background: '#F5F3EF', borderLeft: `3px solid ${SAND}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: INK }}>Carpetas</span>
                      <button onClick={crearNuevaCarpeta} style={{ background: 'none', border: 'none', color: TAUPE, cursor: 'pointer' }}><Plus size={14} /></button>
                    </div>
                    {carpetas.map(carpeta => {
                      const cant = fotosEvento.filter(f => f.carpeta_id === carpeta.id).length;
                      const isActiva = seccionDashboard === 'fotos' && carpetaActiva?.id === carpeta.id;
                      return (
                        <div 
                          key={carpeta.id} 
                          onClick={() => { setCarpetaActiva(carpeta); setSeccionDashboard('fotos'); }} 
                          style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isActiva ? '#F5F5F5' : 'transparent', borderLeft: isActiva ? `3px solid ${INK}` : '3px solid transparent' }}
                        >
                          <span style={{ fontSize: 12, fontWeight: isActiva ? 600 : 400, color: INK }}>{carpeta.nombre}</span>
                          <span style={{ fontSize: 10, color: TAUPE }}>{cant}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <div style={{ padding: '8px 16px', background: '#F5F3EF', borderLeft: `3px solid ${INK}`, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Zap size={14} className="text-amber-500" />
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: INK }}>Motor IA</span>
                    </div>

                    <button 
                      onClick={() => setSeccionDashboard('ia')} 
                      className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left border-l-3 ${seccionDashboard === 'ia' ? 'bg-[#F5F5F5] border-black font-semibold' : 'border-transparent text-gray-700 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ScanFace size={16} className={seccionDashboard === 'ia' ? 'text-black' : 'text-gray-400'} />
                        <span style={{ fontSize: 12 }}>Centro de IA</span>
                      </div>
                      <ChevronRightIcon size={14} className="text-gray-400" />
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, padding: seccionDashboard === 'ia' ? 0 : 28, background: seccionDashboard === 'ia' ? '#FAFAFA' : '#FAFAFA', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  
                  {seccionDashboard === 'fotos' && (
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
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

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 18, margin: 0, fontWeight: 500 }}>{carpetaActiva?.nombre}</h2>
                            <button onClick={() => setMostrarUploader(true)} style={{ background: INK, color: WHITE, border: 'none', padding: '9px 18px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <UploadCloud size={15} /> Añadir Fotos
                            </button>
                          </div>

                          {fotosActuales.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: TAUPE, fontStyle: 'italic', fontSize: 13 }}>La carpeta está vacía. ¡Sube las primeras fotos!</div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
                              {fotosActuales.map((foto, index) => {
                                const isSelected = fotosSeleccionadas.includes(foto.id);
                                const procesandoMiniatura = !foto.url_watermark;
                                return (
                                  <div key={foto.id} className="group relative aspect-square rounded-sm overflow-hidden bg-[#E8E4DE]" style={{ border: isSelected ? `3px solid ${SAND}` : '3px solid transparent' }}>
                                    <img src={resolverUrlFoto(foto, false)} alt="" className={`w-full h-full object-cover transition-opacity duration-300 ${procesandoMiniatura ? 'opacity-40' : 'opacity-100'}`} />
                                    {procesandoMiniatura && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                        <Loader2 size={24} className="animate-spin text-white" />
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-zoom-in" onClick={() => setLightboxIndex(index)}>
                                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white"><Maximize2 size={22} /></div>
                                    </div>
                                    <div className="absolute top-2 left-2 z-10" onClick={(e) => toggleFotoSeleccion(foto.id, e)}>
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer ${isSelected ? 'bg-[#C8B99A]' : 'bg-white/90 shadow-sm'}`}>
                                        {isSelected && <CheckCircle2 size={11} className="text-white" />}
                                      </div>
                                    </div>
                                    <div style={{ position: 'absolute', bottom: 6, right: 6, zIndex: 10 }} onClick={(e) => toggleFavorito(foto.id, e)}>
                                      <Heart size={16} fill={foto.es_favorita ? '#E74C3C' : 'none'} color={foto.es_favorita ? '#E74C3C' : WHITE} style={{ cursor: 'pointer', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* 🌟 CASO B: MODO MOTOR IA 🌟 */}
                  {seccionDashboard === 'ia' && (
                    <div className="flex-1 flex flex-col h-full bg-[#FAFAFA] overflow-hidden">
                      
                      <div className="p-8 border-b border-[#EAEAEA] flex items-center justify-between bg-white shrink-0">
                        <div>
                          <h2 className="text-2xl font-serif text-[#1C1C1C] m-0">Motor de Inteligencia Artificial</h2>
                          <p className="text-[11px] uppercase tracking-widest text-[#9A8F82] mt-2">Configuración activa: <span className="font-bold text-[#1C1C1C]">{eventoActivo.tipo_reconocimiento.toUpperCase()}</span></p>
                        </div>
                        
                        <button 
                          onClick={dispararInteligenciaArtificial}
                          disabled={procesandoIA}
                          className="bg-[#1C1C1C] text-white hover:bg-black px-6 py-3 text-xs uppercase tracking-widest font-bold flex items-center gap-2 transition-all disabled:opacity-50 rounded-sm shadow-sm"
                        >
                          {procesandoIA ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} className="text-[#C8B99A]" />}
                          {procesandoIA ? 'Procesando Enjambre...' : 'Ejecutar Motor IA'}
                        </button>
                      </div>

                      <div className="px-8 pt-8 shrink-0">
                        {iaEjecutada ? (
                          <div className="flex gap-4 mb-6">
                            {eventoActivo.tipo_reconocimiento !== 'ocr' && (
                              <div className="bg-white border border-[#EAEAEA] p-5 min-w-[140px] rounded-sm shadow-sm relative">
                                {statsIA.cargando && <Loader2 className="absolute top-4 right-4 animate-spin text-gray-300" size={14} />}
                                <span className="text-[10px] uppercase tracking-widest text-[#9A8F82] block mb-2 flex items-center gap-2"><ScanFace size={14}/> Personas</span>
                                <span className="text-3xl font-serif text-[#1C1C1C]">{statsIA.caras}</span>
                              </div>
                            )}
                            {eventoActivo.tipo_reconocimiento !== 'facial' && (
                              <div className="bg-white border border-[#EAEAEA] p-5 min-w-[140px] rounded-sm shadow-sm relative">
                                {statsIA.cargando && <Loader2 className="absolute top-4 right-4 animate-spin text-gray-300" size={14} />}
                                <span className="text-[10px] uppercase tracking-widest text-[#9A8F82] block mb-2 flex items-center gap-2"><ScanLine size={14}/> Dorsales</span>
                                <span className="text-3xl font-serif text-[#1C1C1C]">{statsIA.dorsales}</span>
                              </div>
                            )}
                            {eventoActivo.tipo_reconocimiento !== 'ocr' && (
                              <div className="bg-white border border-[#EAEAEA] p-5 min-w-[140px] rounded-sm shadow-sm relative overflow-hidden">
                                {statsIA.cargando && <Loader2 className="absolute top-4 right-4 animate-spin text-gray-300" size={14} />}
                                <span className="text-[10px] uppercase tracking-widest text-[#9A8F82] block mb-2 flex items-center gap-2"><AlertTriangle size={14} className={statsIA.dudas > 0 ? "text-[#E74C3C]" : ""}/> Dudas</span>
                                <span className={`text-3xl font-serif transition-colors ${statsIA.dudas > 0 ? 'text-[#E74C3C]' : 'text-[#2E7D32]'}`}>{statsIA.dudas}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-6 border border-dashed border-[#C8B99A] bg-[#FDFCF8] rounded-sm mb-6">
                            <p className="text-sm text-[#1C1C1C] m-0 flex items-center gap-2">
                              <AlertTriangle size={16} className="text-[#C8B99A]" />
                              La inteligencia artificial aún no ha analizado esta colección. Presiona "Ejecutar Motor IA" arriba.
                            </p>
                          </div>
                        )}

                        <div className="flex border-b border-[#EAEAEA]">
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
                      </div>

                      {/* CONTENIDO INTERNO DE LAS TABS DE IA */}
                      {iaEjecutada && (
                        <div className="flex-1 overflow-hidden px-8 pb-8 pt-6">
                          
                          {/* 1. IDENTIDADES */}
                          {subTabIA === 'identidades' && (
                            <div className="flex gap-8 h-full overflow-hidden">
                              <div className="w-64 shrink-0 bg-white border border-[#EAEAEA] rounded-sm p-2 h-full overflow-y-auto custom-scrollbar shadow-sm">
                                {listaJugadores.length === 0 ? <p className="text-xs text-[#9A8F82] p-4 text-center">No hay identidades.</p> : 
                                  listaJugadores.map(j => (
                                    <button key={j.id} onClick={() => seleccionarJugador(j)} className={`w-full flex items-center gap-3 p-2.5 mb-1 transition-colors rounded-sm text-left ${jugadorSeleccionado?.id === j.id ? 'bg-[#1C1C1C] text-white' : 'hover:bg-gray-50 text-[#1C1C1C]'}`}>
                                      <img src={fotoUrlAux(j.avatar_url)} className="w-8 h-8 rounded-full object-cover bg-gray-200" alt="" />
                                      <span className="font-serif text-xs truncate">{j.display_name}</span>
                                    </button>
                                  ))
                                }
                              </div>
                              
                              <div className="flex-1 h-full overflow-y-auto pr-2 custom-scrollbar">
                                {jugadorSeleccionado ? (
                                  <>
                                    <div className="flex justify-between items-center mb-6 bg-white p-4 border border-[#EAEAEA] rounded-sm shadow-sm sticky top-0 z-20">
                                      <div className="flex items-center gap-4">
                                        <img src={fotoUrlAux(jugadorSeleccionado.avatar_url)} className="w-12 h-12 rounded-full object-cover border border-gray-200" alt="" />
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
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                          {candidatosFusion.map(c => (
                                            <button key={c.id_identidad} onClick={() => fusionarConJugador(c.id_identidad)} className="p-3 bg-white border border-[#EAEAEA] hover:border-[#C8B99A] flex items-center gap-3 transition-colors rounded-sm text-left shadow-sm">
                                              <img src={fotoUrlAux(c.avatar)} className="w-10 h-10 rounded-full object-cover" alt="" />
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
                                          <img src={fotoUrlAux(foto.photo_url, true)} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" alt="" />
                                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {foto.detecciones.map(det => (
                                              <button key={det.id} onClick={(e) => { e.stopPropagation(); supabase.from('face_detections').update({identity_id:null}).eq('id',det.id).then(()=>{seleccionarJugador(jugadorSeleccionado); cargarStatsIA(eventoActivo.id, true);}); }} className="bg-white/90 text-red-500 hover:bg-red-500 hover:text-white p-1.5 rounded-sm shadow-sm transition-colors" title="Desvincular"><UserMinus size={14}/></button>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                ) : (
                                  <div className="h-full flex flex-col items-center justify-center opacity-40">
                                    <User size={48} className="mb-4 text-[#9A8F82]" />
                                    <p className="font-serif text-lg text-[#1C1C1C]">Selecciona un perfil en la barra lateral</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 2. CORREDORES OCR */}
                          {subTabIA === 'corredores' && (
                            <div className="flex gap-8 h-full overflow-hidden">
                              <div className="w-64 shrink-0 bg-white border border-[#EAEAEA] rounded-sm p-2 h-full overflow-y-auto custom-scrollbar shadow-sm">
                                {listaCorredores.length === 0 ? <p className="text-xs text-[#9A8F82] p-4 text-center">No hay dorsales detectados.</p> : 
                                  listaCorredores.map(c => (
                                    <button key={c.id} onClick={() => seleccionarCorredor(c)} className={`w-full flex items-center gap-3 p-2 mb-1 transition-colors rounded-sm text-left ${corredorSeleccionado?.id === c.id ? 'bg-[#1C1C1C] text-white' : 'hover:bg-gray-50 text-[#1C1C1C]'}`}>
                                      <img src={fotoUrlAux(c.avatar_url)} className="w-8 h-12 object-cover bg-gray-200" alt="" />
                                      <span className="font-serif text-xs truncate">{c.dorsal ? `#${c.dorsal}` : '⚠️ Revisar'}</span>
                                    </button>
                                  ))
                                }
                              </div>
                              <div className="flex-1 h-full overflow-y-auto pr-2 custom-scrollbar">
                                {corredorSeleccionado && (
                                  <>
                                    <div className="flex items-center gap-4 bg-white p-4 border border-[#EAEAEA] rounded-sm shadow-sm mb-6 sticky top-0 z-20">
                                      <Hash size={20} className="text-[#9A8F82]"/>
                                      <input type="text" value={dorsalTemporal} onChange={e=>setDorsalTemporal(e.target.value)} onBlur={guardarDorsalGlobal} className="text-3xl font-serif bg-transparent text-[#1C1C1C] outline-none uppercase w-full" placeholder="NÚMERO" />
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
                                      {fotosDelCorredor.map((f, idx) => (
                                        <div key={idx} className="aspect-square bg-[#EAEAEA] relative cursor-zoom-in rounded-sm overflow-hidden" onClick={() => setZoomCara({ photo_url: f.photo_url, bbox: f.bbox })}>
                                          <img src={fotoUrlAux(f.photo_url, true)} className="w-full h-full object-cover" alt="" />
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
                            <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                              {!fotoDudosa ? (
                                <div className="flex flex-col items-center justify-center h-64 opacity-50">
                                  <CheckCircle size={48} className="text-[#2E7D32] mb-4" />
                                  <h2 className="font-serif text-2xl text-[#1C1C1C] m-0">Galería Impecable</h2>
                                  <p className="text-xs text-[#9A8F82] uppercase tracking-widest mt-2">No hay rostros huérfanos pendientes.</p>
                                </div>
                              ) : (
                                <div className="flex flex-col md:flex-row gap-8 bg-white p-6 border border-[#EAEAEA] rounded-sm shadow-sm max-w-5xl mx-auto">
                                  <div className="w-full md:w-1/2 flex flex-col items-center">
                                    
                                    {/* 🌟 EL EFECTO SNIPER Y BBOX CON CLIP-PATH 🌟 */}
                                    <div className="w-full bg-[#FAFAFA] border border-[#EAEAEA] rounded-sm mb-4 flex items-center justify-center p-4 min-h-[300px]">
                                      <div className="relative inline-block leading-none max-w-full shadow-md overflow-hidden">
                                        
                                        {(() => {
                                          const rawBox = getBboxCoords(fotoDudosa.bbox);
                                          
                                          if (rawBox) {
                                            const box = expandBbox(rawBox);
                                            // Calcula los bordes para recortar la imagen (Clip Path)
                                            const insetTop = box.y;
                                            const insetRight = 100 - (box.x + box.w);
                                            const insetBottom = 100 - (box.y + box.h);
                                            const insetLeft = box.x;
                                            
                                            return (
                                              <>
                                                {/* Capa Base: Fondo borroso */}
                                                <img src={fotoUrlAux(fotoDudosa.photo_url, true)} className="max-h-[50vh] w-auto max-w-full block opacity-50 blur-[3px]" alt="Contexto"/>
                                                
                                                {/* Capa Media: Recorte Nítido Exacto */}
                                                <img src={fotoUrlAux(fotoDudosa.photo_url, true)} 
                                                     className="absolute inset-0 max-h-[50vh] w-auto max-w-full block" 
                                                     style={{ clipPath: `inset(${insetTop}% ${insetRight}% ${insetBottom}% ${insetLeft}%)` }} 
                                                     alt="Rostro"/>
                                                
                                                {/* Capa Superior: Cuadro Rojo y Etiqueta */}
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
                                                <img src={fotoUrlAux(fotoDudosa.photo_url, true)} className="max-h-[50vh] w-auto max-w-full block" alt="Contexto"/>
                                                <div className="absolute top-2 left-2 bg-red-500 text-white text-[9px] px-2 py-1 uppercase font-bold tracking-widest rounded-sm">
                                                  ⚠️ Registro Antiguo (Sin Coordenadas)
                                                </div>
                                              </>
                                            );
                                          }
                                        })()}

                                      </div>
                                    </div>

                                    <button onClick={async () => { await supabase.from('face_detections').delete().eq('id', fotoDudosa.id); cargarDudas(); cargarStatsIA(eventoActivo.id, true); }} className="text-[#E74C3C] bg-red-50 hover:bg-red-500 hover:text-white px-4 py-3 text-xs uppercase tracking-widest font-bold flex items-center gap-2 rounded-sm transition-colors w-full justify-center border border-red-100">
                                      <Trash2 size={16}/> Descartar Rostro Falso
                                    </button>
                                  </div>
                                  <div className="w-full md:w-1/2 flex flex-col justify-center">
                                    <h3 className="text-3xl font-serif text-[#1C1C1C] mb-2">¿De quién es este rostro?</h3>
                                    <p className="text-xs text-[#9A8F82] mb-6">La Inteligencia Artificial encontró coincidencias, pero no está 100% segura. Elige la identidad correcta.</p>
                                    
                                    <div className="flex flex-col gap-3">
                                      {candidatosDuda.map(c => (
                                        <button key={c.id_identidad} onClick={async () => { await supabase.from('face_detections').update({identity_id: c.id_identidad}).eq('id', fotoDudosa.id); cargarDudas(); cargarStatsIA(eventoActivo.id, true); }} className="p-3 bg-white border border-[#EAEAEA] hover:border-[#1C1C1C] flex items-center gap-4 transition-colors text-left rounded-sm shadow-sm group">
                                          <img src={fotoUrlAux(c.avatar)} className="w-14 h-14 rounded-full object-cover" alt="" />
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
                  )}

                </div>
              </div>
            </div>
          )}

          {/* LIGHTBOX MAGNIFICADOR */}
          <AnimatePresence>
            {lightboxIndex !== null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', color: WHITE }}>
                  <span style={{ fontSize: 12, letterSpacing: '0.1em' }}>{lightboxIndex + 1} / {fotosActuales.length}</span>
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    <button onClick={() => toggleFavorito(fotosActuales[lightboxIndex].id)} style={{ background: 'none', border: 'none', color: WHITE, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><Heart size={15} fill={fotosActuales[lightboxIndex].es_favorita ? '#E74C3C' : 'none'} color={fotosActuales[lightboxIndex].es_favorita ? '#E74C3C' : WHITE}/> Favorita</button>
                    <button onClick={() => hacerPortada(fotosActuales[lightboxIndex].url_original)} style={{ background: 'none', border: 'none', color: WHITE, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><ImageIcon size={15} /> Usar como Portada</button>
                    <button onClick={() => borrarFotos([fotosActuales[lightboxIndex].id])} style={{ background: 'none', border: 'none', color: '#E74C3C', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><Trash2 size={15} /> Borrar</button>
                    <button onClick={() => setLightboxIndex(null)} style={{ background: 'none', border: 'none', color: WHITE, cursor: 'pointer' }}><X size={22} /></button>
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
                  <button onClick={() => setLightboxIndex(prev => (prev === 0 ? fotosActuales.length - 1 : prev - 1))} style={{ background: 'none', border: 'none', color: WHITE, cursor: 'pointer', padding: 20 }}><ChevronLeft size={36} strokeWidth={1} /></button>
                  <div style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
                    <img src={resolverUrlFoto(fotosActuales[lightboxIndex], true)} alt="" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                  </div>
                  <button onClick={() => setLightboxIndex(prev => (prev === fotosActuales.length - 1 ? 0 : prev + 1))} style={{ background: 'none', border: 'none', color: WHITE, cursor: 'pointer', padding: 20 }}><ChevronRightIcon size={36} strokeWidth={1} /></button>
                </div>
              </motion.div>
            )}
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