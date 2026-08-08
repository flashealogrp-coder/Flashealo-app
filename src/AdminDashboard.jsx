import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import ReviewPanel from './ReviewPanel'; 
import { 
  Loader2, Plus, Calendar, Settings, Image as ImageIcon, Trash2, CheckCircle, 
  Lock, Unlock, Grid, Folder, Star, ArrowLeft, FolderInput, CheckCircle2, 
  Eye, Heart, Maximize2, X, PanelLeftClose, PanelLeft, UploadCloud, ChevronDown, 
  ChevronUp, MapPin, AlertTriangle, Zap, User, Copy, LogOut
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

const getUrlCompleta = (ruta) => {
  if (!ruta) return null;
  if (ruta.includes('http')) return ruta;
  if (ruta.includes('/portadas/') || ruta.includes('/logos/')) return `https://muvzhnnsdnztlhynuipd.supabase.co/storage/v1/object/public/assets/${ruta}`;
  return `${DOMINIO_R2}/${ruta}`;
};

const resolverUrlFoto = (foto, altaResolucion = false) => {
  if (!foto) return '';
  let ruta = altaResolucion ? foto.url_original : (foto.url_watermark || foto.url_original);
  if (!ruta) return '';
  if (ruta.includes('/originales/') || ruta.includes('/watermarks/')) return `https://muvzhnnsdnztlhynuipd.supabase.co/storage/v1/object/public/fotos/${ruta}`;
  return `${DOMINIO_R2}/${ruta}`;
};

export default function AdminDashboard() {
  // 🌟 NUEVO: SEGURIDAD (LOGIN NATIVO SUPABASE) 🌟
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargandoLogin, setCargandoLogin] = useState(true);

  const [sidebarTab, setSidebarTab] = useState('colecciones'); 
  const [sidebarOpen, setSidebarOpen] = useState(true); 
  const [vista, setVista] = useState('grid'); // grid, form, dashboard, review
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

  // 1. Efecto de Autenticación
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

  // 2. Efecto Realtime
  useEffect(() => {
    if (!eventoActivo || vista === 'review') return;
    const canal = supabase.channel('cambios-fotos')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fotografias', filter: `evento_id=eq.${eventoActivo.id}` },
        (payload) => setFotosEvento((prev) => prev.map(f => f.id === payload.new.id ? payload.new : f))
      ).subscribe();
    return () => supabase.removeChannel(canal);
  }, [eventoActivo, vista]);

  useEffect(() => { if(session) cargarEventos(); }, [session]);
  useEffect(() => { setSidebarOpen(vista !== 'dashboard'); }, [vista]);
  useEffect(() => {
    if (mensaje.texto) {
      const timer = setTimeout(() => setMensaje({ tipo: '', texto: '' }), 4000); 
      return () => clearTimeout(timer); 
    }
  }, [mensaje]);

  const iniciarSesion = async (e) => {
    e.preventDefault();
    setCargandoLogin(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Credenciales incorrectas");
    setCargandoLogin(false);
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
  };

  // 🌟 NUEVO: Botón Copiar al Portapapeles (WhatsApp)
  const copiarEnlacePublico = () => {
    const slug = eventoActivo.url_slug || eventoActivo.id;
    const url = `${window.location.origin}/g/${slug}`;
    navigator.clipboard.writeText(url);
    setMensaje({ tipo: 'exito', texto: 'Enlace copiado. ¡Listo para compartir!' });
  };

  const cargarEventos = async () => {
    setCargando(true);
    const { data } = await supabase.from('eventos').select('*').order('created_at', { ascending: false });
    if (data) setListaEventos(data);
    setCargando(false);
  };

  const guardarEvento = async (e) => {
    e.preventDefault();
    setCargando(true);
    let finalPortadaUrl = formData.portada_url;
    let finalLogoUrl = formData.logo_url;

    try {
      if (portadaFile) {
        const fileExt = portadaFile.name.split('.').pop();
        const fileName = `${Date.now()}_portada.${fileExt}`;
        await supabase.storage.from('assets').upload(`portadas/${fileName}`, portadaFile);
        finalPortadaUrl = `portadas/${fileName}`;
      }
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}_logo.${fileExt}`;
        await supabase.storage.from('assets').upload(`logos/${fileName}`, logoFile);
        finalLogoUrl = `logos/${fileName}`;
      }

      const datosGuardar = { ...formData, portada_url: finalPortadaUrl, logo_url: finalLogoUrl };

      if (eventoEditandoId) {
        await supabase.from('eventos').update(datosGuardar).eq('id', eventoEditandoId);
        setMensaje({ tipo: 'exito', texto: 'Colección actualizada con éxito' });
      } else {
        await supabase.from('eventos').insert([datosGuardar]);
        setMensaje({ tipo: 'exito', texto: 'Colección creada con éxito' });
      }

      await cargarEventos();
      setVista('grid'); 
      setPortadaFile(null); setLogoFile(null);
      setEventoEditandoId(null);
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Hubo un error al guardar la colección.' });
    }
    setCargando(false);
  };

  const eliminarColeccionCompleta = async () => {
    if (textoConfirmacion !== formData.nombre) return;
    setCargando(true);
    try {
      const prefijoCarpeta = formData.url_slug || formData.id; 
      await supabase.from('eventos').delete().eq('id', eventoEditandoId);
      try {
        await fetch(MODAL_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "eliminar_coleccion", prefijo: prefijoCarpeta }) });
      } catch (err) { }
      setMensaje({ tipo: 'exito', texto: 'Colección e imágenes eliminadas permanentemente.' });
      setVista('grid');
      setEventoEditandoId(null);
      setMostrarConfirmacionBorrar(false);
      setTextoConfirmacion('');
      await cargarEventos();
    } catch (error) { setMensaje({ tipo: 'error', texto: 'Error al eliminar la colección.' }); }
    setCargando(false);
  };

  const entrarAlEvento = async (ev) => {
    setEventoActivo(ev);
    setFotosSeleccionadas([]);
    setVista('dashboard');
    let { data: carpetasData } = await supabase.from('carpetas_evento').select('*').eq('evento_id', ev.id).order('created_at', { ascending: true });
    if (!carpetasData || carpetasData.length === 0) {
      const { data: nuevaCarpeta } = await supabase.from('carpetas_evento').insert([{ evento_id: ev.id, nombre: 'Highlights' }]).select();
      carpetasData = nuevaCarpeta;
    }
    setCarpetas(carpetasData); setCarpetaActiva(carpetasData[0]);
    const { data: fotosData } = await supabase.from('fotografias').select('*').eq('evento_id', ev.id);
    if (fotosData) setFotosEvento(fotosData);
  };

  const crearNuevaCarpeta = async () => {
    const nombre = window.prompt("Nombre de la nueva carpeta:");
    if (!nombre) return;
    const { data } = await supabase.from('carpetas_evento').insert([{ evento_id: eventoActivo.id, nombre }]).select();
    if (data) { setCarpetas([...carpetas, data[0]]); setCarpetaActiva(data[0]); }
  };

  const manejarSeleccionArchivos = (e) => {
    const files = Array.from(e.target.files);
    setArchivosUploader(prev => [...prev, ...files]);
  };

  const prevenirDefault = (e) => { e.preventDefault(); e.stopPropagation(); };

  const procesarEntry = (entry, filesArray) => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file(file => { if (file.type.startsWith('image/')) filesArray.push(file); resolve(); });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        dirReader.readEntries(async (entries) => {
          for (let i = 0; i < entries.length; i++) await procesarEntry(entries[i], filesArray);
          resolve();
        });
      } else resolve();
    });
  };

  const manejarDrop = async (e) => {
    prevenirDefault(e); setArrastrando(false);
    const items = e.dataTransfer.items; let nuevosArchivos = [];
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry();
          if (entry) await procesarEntry(entry, nuevosArchivos);
        }
      }
    } else {
      const files = Array.from(e.dataTransfer.files);
      nuevosArchivos = files.filter(file => file.type.startsWith('image/'));
    }
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
        if (uploadRes.ok) {
          await supabase.from('fotografias').insert([{ evento_id: eventoActivo.id, carpeta_id: carpetaActiva.id, url_original: data.path }]);
          subidasExitosas++;
        }
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
    setMensaje({ tipo: 'info', texto: 'Iniciando reconocimiento IA masivo...' });
    try {
      await fetch(MODAL_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evento_id: eventoActivo.id, accion: "ia", tipo_reconocimiento: eventoActivo.tipo_reconocimiento }) });
      setMensaje({ tipo: 'exito', texto: `¡IA Inicializada! Verás los rostros y etiquetas aparecer pronto.` });
    } catch (error) { setMensaje({ tipo: 'error', texto: 'Error al conectar con la IA.' }); }
    setProcesandoIA(false);
  };

  const toggleFotoSeleccion = (fotoId, e) => {
    e.stopPropagation();
    setFotosSeleccionadas(prev => prev.includes(fotoId) ? prev.filter(id => id !== fotoId) : [...prev, fotoId]);
  };

  const toggleFavorito = async (fotoId, e) => {
    e?.stopPropagation();
    const foto = fotosEvento.find(f => f.id === fotoId);
    if (!foto) return;
    const nuevoEstado = !foto.es_favorita;
    setFotosEvento(prev => prev.map(f => f.id === fotoId ? { ...f, es_favorita: nuevoEstado } : f));
    await supabase.from('fotografias').update({ es_favorita: nuevoEstado }).eq('id', fotoId);
  };

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

  // ── PANTALLA DE LOGIN ──
  if (cargandoLogin) return <div className="h-screen w-full flex items-center justify-center bg-[#FDFCF8]"><Loader2 className="animate-spin text-[#9A8F82]" size={32}/></div>;
  if (!session) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#FDFCF8] font-sans">
        <div className="bg-white p-12 shadow-2xl border border-black/5 w-full max-w-md">
          <div className="text-center mb-8">
            <span className="w-4 h-12 bg-[#C8B99A] inline-block mb-4"></span>
            <h1 className="text-3xl font-serif text-[#1C1C1C]">Flashealo</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#9A8F82] mt-2">Acceso Administrativo</p>
          </div>
          <form onSubmit={iniciarSesion} className="flex flex-col gap-5">
            <input type="email" placeholder="Correo electrónico" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-4 bg-[#FDFCF8] outline-none border-b border-black/10 focus:border-black transition-colors" />
            <input type="password" placeholder="Contraseña" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-4 bg-[#FDFCF8] outline-none border-b border-black/10 focus:border-black transition-colors" />
            <button type="submit" className="w-full bg-[#1C1C1C] text-white p-4 text-xs uppercase tracking-widest font-bold mt-4 hover:bg-black transition-colors">Ingresar al Sistema</button>
          </form>
        </div>
      </div>
    );
  }

  // Si estamos en la vista de IA, renderizamos el panel directo
  if (vista === 'review') {
    return <ReviewPanel evento={eventoActivo} onVolver={() => setVista('dashboard')} />;
  }

  const fotosActuales = carpetaActiva ? fotosEvento.filter(f => f.carpeta_id === carpetaActiva.id) : [];

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
        </header>

        <AnimatePresence>
          {mensaje.texto && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ position: 'absolute', top: 16, right: 24, zIndex: 100, padding: '12px 20px', background: INK, fontSize: 12, color: WHITE, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle size={14} color={SAND} /> {mensaje.texto}
            </motion.div>
          )}
        </AnimatePresence>

        <main style={{ flex: 1, overflowY: 'auto' }}>
          {/* VISTA GRID DE EVENTOS (Intacta) */}
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

          {/* VISTA FORMULARIO (AJUSTES) - Oculté por brevedad, está intacta en tu lógica original */}
          {vista === 'form' && (
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px 80px' }}>
              <h1 className="text-3xl font-serif mb-8 text-[#1C1C1C]">Ajustes del Evento</h1>
              <form onSubmit={guardarEvento} className="bg-white p-8 border shadow-sm flex flex-col gap-6">
                <div>
                  <label className="text-xs uppercase tracking-widest text-gray-500 mb-2 block">Nombre del Evento</label>
                  <input required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full p-4 bg-[#FDFCF8] outline-none border-b border-black/10 focus:border-black text-xl font-serif" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-gray-500 mb-2 block">URL Personalizada</label>
                  <input required value={formData.url_slug} onChange={e => setFormData({...formData, url_slug: e.target.value.toLowerCase().replace(/ /g, '-')})} className="w-full p-4 bg-[#FDFCF8] outline-none border-b border-black/10 focus:border-black text-xl font-serif" />
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
                    {/* 🌟 BOTONES DE ENCABEZADO ACTUALIZADOS 🌟 */}
                    <button onClick={copiarEnlacePublico} style={{ background: SAND, color: INK, border: 'none', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                      <Copy size={13} /> Copiar Enlace
                    </button>
                    <button onClick={() => window.open(`/g/${eventoActivo.url_slug || eventoActivo.id}`, '_blank')} style={{ background: 'rgba(255,255,255,0.15)', color: WHITE, border: 'none', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}><Eye size={13} /> Ver Público</button>
                    <button onClick={() => {
                      setEventoEditandoId(eventoActivo.id); setFormData(eventoActivo); setVista('form');
                    }} style={{ background: WHITE, color: INK, border: 'none', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}><Settings size={13} /> Ajustes</button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flex: 1, minHeight: 450 }}>
                {/* 🌟 BARRA LATERAL DEL EVENTO (AQUÍ MUDAMOS LA IA) 🌟 */}
                <div style={{ width: 240, background: WHITE, borderRight: `1px solid ${BORDER}`, padding: '20px 0', flexShrink: 0 }}>
                  <div className="mb-8">
                    <div style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: TAUPE }}>Carpetas</span>
                      <button onClick={crearNuevaCarpeta} style={{ background: 'none', border: 'none', color: TAUPE, cursor: 'pointer' }}><Plus size={14} /></button>
                    </div>
                    {carpetas.map(carpeta => {
                      const cant = fotosEvento.filter(f => f.carpeta_id === carpeta.id).length;
                      const isActiva = carpetaActiva?.id === carpeta.id;
                      return (
                        <div key={carpeta.id} onClick={() => setCarpetaActiva(carpeta)} style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isActiva ? '#F5F5F5' : 'transparent', borderLeft: isActiva ? `3px solid ${INK}` : '3px solid transparent' }}>
                          <span style={{ fontSize: 12, fontWeight: isActiva ? 500 : 400, color: INK }}>{carpeta.nombre}</span>
                          <span style={{ fontSize: 10, color: TAUPE }}>{cant}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 🌟 NUEVA SECCIÓN DE IA EN EL SIDEBAR 🌟 */}
                  <div>
                    <div style={{ padding: '0 16px', marginBottom: 12 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: TAUPE }}>Auditoría & IA</span>
                    </div>
                    
                    <button onClick={dispararInteligenciaArtificial} disabled={procesandoIA} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-y border-transparent hover:border-black/5 group text-left">
                      <div className="flex items-center gap-3">
                        {procesandoIA ? <Loader2 size={16} className="animate-spin text-amber-500"/> : <Zap size={16} className="text-amber-500 group-hover:scale-110 transition-transform"/>}
                        <span className="text-[12px] font-bold text-[#1C1C1C] uppercase tracking-wider">{procesandoIA ? 'Procesando...' : 'Ejecutar Motor IA'}</span>
                      </div>
                    </button>
                    
                    <button onClick={() => setVista('review')} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group">
                      <User size={16} className="text-[#9A8F82] group-hover:text-black transition-colors"/>
                      <span className="text-[12px] text-[#1C1C1C]">Identidades / OCR</span>
                    </button>
                    
                    {eventoActivo.tipo_reconocimiento !== 'ocr' && (
                      <button onClick={() => setVista('review')} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group">
                        <AlertTriangle size={16} className="text-red-400 group-hover:text-red-500 transition-colors"/>
                        <span className="text-[12px] text-[#1C1C1C]">Dudas y Huérfanas</span>
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ flex: 1, padding: 28, background: '#FAFAFA', position: 'relative' }}>
                  
                  {/* Uploader Masivo intacto */}
                  <AnimatePresence>
                    {mostrarUploader && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ position: 'absolute', inset: 0, background: 'rgba(250,250,250,0.95)', zIndex: 50, padding: 40, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                          <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>Subir a: {carpetaActiva?.nombre}</h2>
                          {!estadoSubida.activa && <button onClick={() => setMostrarUploader(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TAUPE }}><X size={20}/></button>}
                        </div>

                        {estadoSubida.activa ? (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyCenter: 'center' }}>
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
                            style={{ flex: 1, border: `2px dashed ${arrastrando ? SAND : TAUPE}`, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyCenter: 'center', background: arrastrando ? 'rgba(200, 185, 154, 0.05)' : WHITE, transition: 'all 0.2s' }}
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
                      <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h2 style={{ fontSize: 18, margin: 0, fontWeight: 500 }}>{carpetaActiva?.nombre}</h2>
                        <button onClick={() => setMostrarUploader(true)} style={{ background: INK, color: WHITE, border: 'none', padding: '9px 18px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
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
                              <div key={foto.id} className="group relative aspect-square rounded-none overflow-hidden bg-[#E8E4DE]" style={{ border: isSelected ? `3px solid ${SAND}` : '3px solid transparent' }}>
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
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer ${isSelected ? 'bg-[#C8B99A]' : 'bg-white/80'}`}>
                                    {isSelected && <CheckCircle2 size={11} className="text-white" />}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
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

        </main>
      </div>
    </div>
  );
}