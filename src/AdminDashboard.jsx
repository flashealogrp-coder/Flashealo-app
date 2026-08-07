import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import ReviewPanel from './ReviewPanel'; 
import { 
  Loader2, Plus, Calendar, Settings, Image as ImageIcon, Trash2, CheckCircle, 
  Lock, Unlock, Grid, Folder, Star, Home, ChevronRight, ArrowLeft, 
  FolderInput, CheckCircle2, ChevronLeft, ChevronRight as ChevronRightIcon, 
  Eye, Heart, Maximize2, X, PanelLeftClose, PanelLeft, UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SAND   = '#C8B99A';
const TAUPE  = '#9A8F82';
const INK    = '#1C1C1C';
const CREAM  = '#FDFCF8'; 
const WHITE  = '#FFFFFF';
const BORDER = 'rgba(0,0,0,0.06)';

const DOMINIO_R2 = import.meta.env.VITE_R2_DOMINIO || 'https://pub-c4c062c3f8754b2d9ff6de40e9d6d713.r2.dev'; 

// Resuelve URLs para Portadas
const getUrlCompleta = (ruta) => {
  if (!ruta) return null;
  if (ruta.includes('http')) return ruta;
  
  if (ruta.includes('/portadas/') || ruta.includes('/logos/')) {
    return `https://muvzhnnsdnztlhynuipd.supabase.co/storage/v1/object/public/assets/${ruta}`;
  }
  
  return `${DOMINIO_R2}/${ruta}`;
};

// Arquitectura 100% R2 (Costo Cero)
const resolverUrlFoto = (foto, altaResolucion = false) => {
  if (!foto) return '';
  
  let ruta = altaResolucion ? foto.url_original : (foto.url_watermark || foto.url_original);
  if (!ruta) return '';

  if (ruta.includes('/originales/') || ruta.includes('/watermarks/')) {
    return `https://muvzhnnsdnztlhynuipd.supabase.co/storage/v1/object/public/fotos/${ruta}`;
  }

  return `${DOMINIO_R2}/${ruta}`;
};

export default function AdminDashboard() {
  const [sidebarTab, setSidebarTab] = useState('colecciones'); 
  const [sidebarOpen, setSidebarOpen] = useState(true); 
  const [vista, setVista] = useState('grid'); 
  const [filtroGrid, setFiltroGrid] = useState('social'); 

  const [listaEventos, setListaEventos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  
  const [eventoEditandoId, setEventoEditandoId] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', url_slug: '', tipo_reconocimiento: 'hibrido', password_cliente: '' });

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
  const fileInputRef = useRef(null);

  // 🌟 NUEVO ESTADO: Para el botón de IA
  const [procesandoIA, setProcesandoIA] = useState(false);

  useEffect(() => { cargarEventos(); }, []);
  useEffect(() => { setSidebarOpen(vista !== 'dashboard'); }, [vista]);
  useEffect(() => {
    if (mensaje.texto) {
      const timer = setTimeout(() => setMensaje({ tipo: '', texto: '' }), 4000); 
      return () => clearTimeout(timer); 
    }
  }, [mensaje]);

  const cargarEventos = async () => {
    setCargando(true);
    const { data } = await supabase.from('eventos').select('*').order('created_at', { ascending: false });
    if (data) setListaEventos(data);
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
    
    setCarpetas(carpetasData);
    setCarpetaActiva(carpetasData[0]);

    const { data: fotosData } = await supabase.from('fotografias').select('*').eq('evento_id', ev.id);
    if (fotosData) setFotosEvento(fotosData);
  };

  const crearNuevaCarpeta = async () => {
    const nombre = window.prompt("Nombre de la nueva carpeta:");
    if (!nombre) return;
    const { data } = await supabase.from('carpetas_evento').insert([{ evento_id: eventoActivo.id, nombre }]).select();
    if (data) {
      setCarpetas([...carpetas, data[0]]);
      setCarpetaActiva(data[0]);
    }
  };

  const manejarSeleccionArchivos = (e) => {
    const files = Array.from(e.target.files);
    setArchivosUploader(prev => [...prev, ...files]);
  };

  const iniciarSubidaMasiva = async () => {
    if (archivosUploader.length === 0 || !carpetaActiva) return;
    
    setEstadoSubida({ activa: true, progreso: 0, total: archivosUploader.length });
    let subidasExitosas = 0;
    
    const baseR2Path = `${eventoActivo.url_slug || eventoActivo.id}/${carpetaActiva.nombre.toLowerCase().replace(/ /g, '-')}`;

    for (let i = 0; i < archivosUploader.length; i++) {
      const file = archivosUploader[i];
      try {
        const resURL = await fetch("/api/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, fileType: file.type, carpetaR2: baseR2Path }),
        });
        const data = await resURL.json();
        
        if (!data.url) throw new Error("Fallo al obtener ticket");

        const uploadRes = await fetch(data.url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (uploadRes.ok) {
          await supabase.from('fotografias').insert([{
            evento_id: eventoActivo.id,
            carpeta_id: carpetaActiva.id,
            url_original: data.path 
          }]);
          subidasExitosas++;
        }
      } catch (error) {
        console.error("Error subiendo archivo:", file.name, error);
      }
      setEstadoSubida(prev => ({ ...prev, progreso: i + 1 }));
    }

    const { data: fotosNuevas } = await supabase.from('fotografias').select('*').eq('evento_id', eventoActivo.id);
    if (fotosNuevas) setFotosEvento(fotosNuevas);
    
    setArchivosUploader([]);
    setEstadoSubida({ activa: false, progreso: 0, total: 0 });
    setMostrarUploader(false);
    setMensaje({ tipo: 'exito', texto: `${subidasExitosas} fotografías procesadas.` });
  };

  // 🌟 NUEVA FUNCIÓN: Disparar la Inteligencia Artificial en Modal
  const dispararInteligenciaArtificial = async () => {
    if (!eventoActivo) return;
    setProcesandoIA(true);
    setMensaje({ tipo: 'info', texto: 'Iniciando servidores GPU en la nube...' });
    
    try {
      // Este es el enlace que Modal nos dará cuando creemos la cuenta y subamos el código.
      const res = await fetch("https://flashealogrp-coder--flashealo-sport-ia-procesar-fotografias.modal.run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evento_id: eventoActivo.id })
      });
      
      if (!res.ok) throw new Error("Fallo en Modal");
      
      const data = await res.json();
      setMensaje({ tipo: 'exito', texto: `¡IA Finalizada! ${data.procesadas} fotos optimizadas e indexadas.` });
      
      // Recargamos para ver las miniaturas nuevas
      const { data: fotosNuevas } = await supabase.from('fotografias').select('*').eq('evento_id', eventoActivo.id);
      if (fotosNuevas) setFotosEvento(fotosNuevas);
      
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error al conectar con el motor IA. (Configura Modal primero)' });
    }
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
    await supabase.from('fotografias').delete().in('id', ids);
    setFotosEvento(prev => prev.filter(f => !ids.includes(f.id)));
    setFotosSeleccionadas([]);
    setLightboxIndex(null);
    setMensaje({ tipo: 'exito', texto: 'Fotografías eliminadas de la colección.' });
  };

  const moverFotosASet = async (nuevaCarpetaId) => {
    await supabase.from('fotografias').update({ carpeta_id: nuevaCarpetaId }).in('id', fotosSeleccionadas);
    setFotosEvento(prev => prev.map(f => fotosSeleccionadas.includes(f.id) ? { ...f, carpeta_id: nuevaCarpetaId } : f));
    setFotosSeleccionadas([]);
    setMostrarModalMover(false);
    setMensaje({ tipo: 'exito', texto: `Fotografías movidas correctamente.` });
  };

  const hacerPortada = async (url) => {
    await supabase.from('eventos').update({ portada_url: url }).eq('id', eventoActivo.id);
    setEventoActivo(prev => ({ ...prev, portada_url: url }));
    setMensaje({ tipo: 'exito', texto: 'Portada actualizada.' });
  };

  const fotosActuales = carpetaActiva ? fotosEvento.filter(f => f.carpeta_id === carpetaActiva.id) : [];

  const SidebarItem = ({ id, icon: Icon, label }) => (
    <button onClick={() => { setSidebarTab(id); setVista('grid'); setEventoActivo(null); }}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: sidebarOpen ? 12 : 0, padding: sidebarOpen ? '12px 20px' : '12px 0', justifyContent: sidebarOpen ? 'flex-start' : 'center', background: sidebarTab === id ? '#F5F5F5' : 'transparent', color: sidebarTab === id ? INK : TAUPE, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: sidebarTab === id ? 600 : 400, transition: 'all 0.2s' }} title={!sidebarOpen ? label : ''} >
      <Icon size={18} strokeWidth={sidebarTab === id ? 2.5 : 1.5} /> {sidebarOpen && <span>{label}</span>}
    </button>
  );

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
          <SidebarItem id="colecciones" icon={Grid} label="Colecciones" />
          <SidebarItem id="librerias" icon={Folder} label="Librerías" />
        </nav>
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
          
          {vista === 'grid' && (
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1 style={{ fontSize: 24, fontWeight: 400, fontFamily: 'Georgia, serif', margin: 0 }}>Colecciones</h1>
                <button onClick={() => { setEventoEditandoId(null); setVista('form'); }} style={{ background: INK, color: WHITE, border: 'none', padding: '9px 18px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
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
                    
                    {/* 🌟 BOTÓN DE INTELIGENCIA ARTIFICIAL AQUÍ */}
                    <button 
                      onClick={dispararInteligenciaArtificial} 
                      disabled={procesandoIA}
                      style={{ background: SAND, color: INK, border: 'none', padding: '8px 14px', borderRadius: 4, cursor: procesandoIA ? 'wait' : 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                    >
                      {procesandoIA ? <Loader2 size={13} className="animate-spin" /> : <Star size={13} />} 
                      {procesandoIA ? 'Procesando IA...' : 'Ejecutar IA'}
                    </button>

                    <button onClick={() => window.open(`/g/${eventoActivo.url_slug || eventoActivo.id}`, '_blank')} style={{ background: 'rgba(255,255,255,0.15)', color: WHITE, border: 'none', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}><Eye size={13} /> Ver</button>
                    <button onClick={() => {setEventoEditandoId(eventoActivo.id); setFormData(eventoActivo); setVista('form');}} style={{ background: WHITE, color: INK, border: 'none', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}><Settings size={13} /> Ajustes</button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flex: 1, minHeight: 450 }}>
                <div style={{ width: 220, background: WHITE, borderRight: `1px solid ${BORDER}`, padding: '20px 0', flexShrink: 0 }}>
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

                <div style={{ flex: 1, padding: 28, background: '#FAFAFA', position: 'relative' }}>
                  
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
                          <div style={{ flex: 1, border: `2px dashed ${TAUPE}`, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: WHITE }}>
                            <UploadCloud size={40} color={TAUPE} style={{ marginBottom: 16 }} />
                            <p style={{ fontSize: 14, color: INK, marginBottom: 8, fontWeight: 500 }}>Arrastra tus fotografías aquí</p>
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
                                    {carpetas.map(s => (
                                      <button key={s.id} onClick={() => moverFotosASet(s.id)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: INK, borderRadius: 4 }}>Mover a {s.nombre}</button>
                                    ))}
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
                            return (
                              <div key={foto.id} className="group" style={{ aspectRatio: '1', position: 'relative', borderRadius: 4, overflow: 'hidden', border: isSelected ? `3px solid ${SAND}` : '3px solid transparent', background: '#E8E4DE' }}>
                                
                                <img src={resolverUrlFoto(foto, false)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setLightboxIndex(index)} style={{ cursor: 'zoom-in' }}>
                                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: WHITE }}><Maximize2 size={22} /></div>
                                </div>

                                <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 10 }} onClick={(e) => toggleFotoSeleccion(foto.id, e)}>
                                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: isSelected ? SAND : 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    {isSelected && <CheckCircle2 size={11} color={WHITE} />}
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