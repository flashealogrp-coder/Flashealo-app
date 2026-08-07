import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import ReviewPanel from './ReviewPanel'; 
import { 
  Loader2, Plus, Calendar, Settings, Image as ImageIcon, Trash2, CheckCircle, 
  Lock, Unlock, Home, Grid, Folder, Star, PanelLeftClose, PanelLeft, ArrowLeft, 
  UploadCloud, FolderInput, CheckCircle2, ChevronLeft, ChevronRight as ChevronRightIcon, 
  Eye, Heart, Maximize2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── DESIGN TOKENS ─── */
const SAND   = '#C8B99A';
const TAUPE  = '#9A8F82';
const INK    = '#1C1C1C';
const CREAM  = '#FDFCF8'; 
const WHITE  = '#FFFFFF';
const BORDER = 'rgba(0,0,0,0.06)';

const getUrlCompleta = (ruta) => {
  if (!ruta) return null;
  if (ruta.includes('http')) return ruta;
  return `https://muvzhnnsdnztlhynuipd.supabase.co/storage/v1/object/public/fotos/${ruta}`;
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
  const [setActivo, setSetActivo] = useState('Highlights');
  const [fotosSeleccionadas, setFotosSeleccionadas] = useState([]);
  
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [mostrarModalMover, setMostrarModalMover] = useState(false);

  // ─── ESTADO DINÁMICO DE FOTOS (Simulando la Base de Datos) ───
  const setsDisponibles = ['Highlights', 'Ceremonia', 'Recepción', 'Detalles'];
  const [fotos, setFotos] = useState([
    { id: 1, url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800', set: 'Highlights', favorite: true },
    { id: 2, url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800', set: 'Highlights', favorite: false },
    { id: 3, url: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800', set: 'Ceremonia', favorite: false },
    { id: 4, url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800', set: 'Recepción', favorite: false },
  ]);

  const fotosActuales = fotos.filter(f => f.set === setActivo);

  useEffect(() => { cargarEventos(); }, []);

  useEffect(() => {
    if (vista === 'dashboard') setSidebarOpen(false);
    else setSidebarOpen(true);
  }, [vista]);

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

  // ─── NAVEGACIÓN CORREGIDA ───
  const manejarVolver = () => {
    if (vista === 'form' && eventoActivo) {
      setVista('dashboard'); // Si veníamos de una galería, volvemos a la galería
    } else {
      setVista('grid');
      setEventoActivo(null);
    }
  };

  const abrirFormulario = (ev = null) => {
    if (ev) {
      setEventoEditandoId(ev.id);
      setFormData({ ...ev });
    } else {
      setEventoEditandoId(null);
      setFormData({ nombre: '', url_slug: '', tipo_reconocimiento: 'hibrido', password_cliente: '' });
    }
    setVista('form');
  };

  const entrarAlEvento = (ev) => {
    setEventoActivo(ev);
    setSetActivo('Highlights');
    setFotosSeleccionadas([]);
    setVista('dashboard');
  };

  // ─── FUNCIONES DE FOTOS Y LIGHTBOX ───
  const toggleFotoSeleccion = (fotoId, e) => {
    e.stopPropagation();
    setFotosSeleccionadas(prev => prev.includes(fotoId) ? prev.filter(id => id !== fotoId) : [...prev, fotoId]);
  };

  const toggleFavorito = (fotoId, e) => {
    e?.stopPropagation();
    setFotos(prev => prev.map(f => f.id === fotoId ? { ...f, favorite: !f.favorite } : f));
  };

  const borrarFotos = (ids) => {
    setFotos(prev => prev.filter(f => !ids.includes(f.id)));
    setFotosSeleccionadas([]);
    setLightboxIndex(null);
    setMensaje({ tipo: 'exito', texto: 'Fotografías eliminadas correctamente.' });
  };

  const moverFotosASet = (nuevoSet) => {
    setFotos(prev => prev.map(f => fotosSeleccionadas.includes(f.id) ? { ...f, set: nuevoSet } : f));
    setFotosSeleccionadas([]);
    setMostrarModalMover(false);
    setMensaje({ tipo: 'exito', texto: `Movidas a ${nuevoSet}` });
  };

  const hacerPortada = (url) => {
    setEventoActivo(prev => ({ ...prev, portada_url: url }));
    setMensaje({ tipo: 'exito', texto: 'Portada actualizada.' });
  };

  const avanzarLightbox = (dir) => {
    let nuevoIndex = lightboxIndex + dir;
    if (nuevoIndex < 0) nuevoIndex = fotosActuales.length - 1;
    if (nuevoIndex >= fotosActuales.length) nuevoIndex = 0;
    setLightboxIndex(nuevoIndex);
  };

  const headerHeight = vista === 'dashboard' ? 48 : 64;

  const SidebarItem = ({ id, icon: Icon, label }) => (
    <button onClick={() => { setSidebarTab(id); setVista('grid'); setEventoActivo(null); }}
      style={{ 
        width: '100%', display: 'flex', alignItems: 'center', gap: sidebarOpen ? 12 : 0, 
        padding: sidebarOpen ? '12px 20px' : '12px 0', justifyContent: sidebarOpen ? 'flex-start' : 'center',
        background: sidebarTab === id ? '#F5F5F5' : 'transparent', color: sidebarTab === id ? INK : TAUPE, 
        border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: sidebarTab === id ? 600 : 400, transition: 'all 0.2s' 
      }} title={!sidebarOpen ? label : ''} >
      <Icon size={18} strokeWidth={sidebarTab === id ? 2.5 : 1.5} /> 
      {sidebarOpen && <span>{label}</span>}
    </button>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: CREAM, color: INK, fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      
      {/* ─── BARRA LATERAL ─── */}
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

          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TAUPE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 4, transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.color = INK; e.currentTarget.style.background = '#F5F5F5'; }} onMouseLeave={e => { e.currentTarget.style.color = TAUPE; e.currentTarget.style.background = 'none'; }}>
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, marginTop: 12 }}>
          <SidebarItem id="colecciones" icon={Grid} label="Colecciones" />
          <SidebarItem id="librerias" icon={Folder} label="Librerías" />
          <SidebarItem id="resaltadas" icon={Star} label="Resaltadas" />
        </nav>
      </aside>

      {/* ─── ÁREA PRINCIPAL ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        
        {/* BARRA SUPERIOR FIJA Y CON MEMORIA */}
        <header style={{ height: headerHeight, flexShrink: 0, background: WHITE, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 40, transition: 'height 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {(vista === 'form' || vista === 'dashboard') && (
              <button onClick={manejarVolver} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: TAUPE, fontSize: 12, transition: 'color 0.2s', fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.color = INK} onMouseLeave={e => e.currentTarget.style.color = TAUPE}>
                <ArrowLeft size={14} /> Volver {vista === 'form' && eventoActivo ? 'a la Galería' : 'a Colecciones'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {headerHeight > 48 && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: INK }}>Estudio Flashealo</p>
              </div>
            )}
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: INK, color: WHITE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 11 }}>F</div>
          </div>
        </header>

        {/* ALERTA FLOTANTE */}
        <AnimatePresence>
          {mensaje.texto && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ position: 'absolute', top: 16, right: 24, zIndex: 100, padding: '12px 20px', background: INK, fontSize: 12, color: WHITE, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle size={14} color={SAND} /> {mensaje.texto}
            </motion.div>
          )}
        </AnimatePresence>

        <main style={{ flex: 1, overflowY: 'auto' }}>
          
          {/* =========================================
              VISTA 1: GRILLA
              ========================================= */}
          {vista === 'grid' && (
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1 style={{ fontSize: 24, fontWeight: 400, fontFamily: 'Georgia, serif', margin: 0 }}>Colecciones</h1>
                <button onClick={() => abrirFormulario()} style={{ background: INK, color: WHITE, border: 'none', padding: '9px 18px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={14} /> Crear Colección
                </button>
              </div>

              {cargando ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><Loader2 size={24} className="animate-spin" color={TAUPE} /></div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                  {listaEventos.map(ev => {
                    const esPrivado = ev.password_cliente && ev.password_cliente.trim() !== '';
                    return (
                      <div key={ev.id} onClick={() => entrarAlEvento(ev)} style={{ background: WHITE, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ height: 160, position: 'relative', background: '#E8E4DE' }}>
                          <img src={getUrlCompleta(ev.portada_url) || "https://images.unsplash.com/photo-1541534741688?w=800"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', top: 10, right: 10, background: esPrivado ? 'rgba(28,28,28,0.85)' : 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)', color: esPrivado ? WHITE : INK, padding: '3px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {esPrivado ? <Lock size={10} color={SAND} /> : <Unlock size={10} color={TAUPE} />}
                            <span style={{ fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{esPrivado ? 'Privada' : 'Pública'}</span>
                          </div>
                        </div>
                        <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px 0', color: INK }}>{ev.nombre}</h3>
                          <span style={{ fontSize: 11, color: TAUPE, display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} /> {ev.fecha_evento || 'Sin fecha'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =========================================
              VISTA 2: FORMULARIO
              ========================================= */}
          {vista === 'form' && (
            <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 32px' }}>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: INK, margin: '0 0 20px 0' }}>{eventoEditandoId ? `Ajustes: ${formData.nombre}` : 'Nueva Colección'}</h1>
              <div style={{ background: WHITE, padding: 36, borderRadius: 6, border: `1px solid ${BORDER}` }}>
                {/* Oculto el formulario largo visualmente para este ejemplo, asumiendo que sigue igual */}
                <p style={{color: TAUPE, fontSize: 13}}>Aquí va tu formulario de ajustes que ya creamos.</p>
              </div>
            </div>
          )}

          {/* =========================================
              VISTA 3: DASHBOARD DEL EVENTO
              ========================================= */}
          {vista === 'dashboard' && eventoActivo && (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
              
              {/* HEADER DEL EVENTO */}
              <div style={{ height: 180, position: 'relative', background: INK, display: 'flex', alignItems: 'flex-end', padding: '0 32px 24px', flexShrink: 0 }}>
                <img src={getUrlCompleta(eventoActivo.portada_url) || "https://images.unsplash.com/photo-1541534741688?w=1200"} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
                <div style={{ position: 'relative', zIndex: 10, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <h1 style={{ fontSize: 28, fontFamily: 'Georgia, serif', color: WHITE, margin: '0 0 4px 0' }}>{eventoActivo.nombre}</h1>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: 0 }}>{eventoActivo.fecha_evento || 'Sin fecha'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => window.open(`/g/${eventoActivo.url_slug || eventoActivo.id}`, '_blank')} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', color: WHITE, border: 'none', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}><Eye size={13} /> Ver Galería</button>
                    <button onClick={() => abrirFormulario(eventoActivo)} style={{ background: WHITE, color: INK, border: 'none', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}><Settings size={13} /> Ajustes</button>
                  </div>
                </div>
              </div>

              {/* BODY: SETS + FOTOS */}
              <div style={{ display: 'flex', flex: 1, minHeight: 450 }}>
                
                {/* COLUMNA SETS */}
                <div style={{ width: 220, background: WHITE, borderRight: `1px solid ${BORDER}`, padding: '20px 0', flexShrink: 0 }}>
                  <div style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: TAUPE }}>Carpetas</span>
                    <button style={{ background: 'none', border: 'none', color: TAUPE, cursor: 'pointer' }}><Plus size={14} /></button>
                  </div>
                  {setsDisponibles.map(set => {
                    const cant = fotos.filter(f => f.set === set).length;
                    return (
                      <div key={set} onClick={() => setSetActivo(set)} style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: setActivo === set ? '#F5F5F5' : 'transparent', borderLeft: setActivo === set ? `3px solid ${INK}` : '3px solid transparent' }}>
                        <span style={{ fontSize: 12, fontWeight: setActivo === set ? 500 : 400, color: INK }}>{set}</span>
                        <span style={{ fontSize: 10, color: TAUPE }}>{cant}</span>
                      </div>
                    );
                  })}
                </div>

                {/* COLUMNA FOTOS */}
                <div style={{ flex: 1, padding: 28, background: '#FAFAFA', position: 'relative' }}>
                  
                  {/* ACCIONES FLOTANTES (Selección múltiple) */}
                  <AnimatePresence>
                    {fotosSeleccionadas.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} style={{ position: 'fixed', bottom: 40, left: '55%', transform: 'translateX(-50%)', background: INK, color: WHITE, padding: '12px 24px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 32, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 100 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{fotosSeleccionadas.length} seleccionadas</span>
                        <div style={{ display: 'flex', gap: 16 }}>
                          {/* Botón Mover a Set que abre el modal pequeño */}
                          <div style={{ position: 'relative' }}>
                            <button onClick={() => setMostrarModalMover(!mostrarModalMover)} style={{ background: 'transparent', border: 'none', color: WHITE, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><FolderInput size={14} /> Mover a Set</button>
                            {mostrarModalMover && (
                              <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 12, background: WHITE, borderRadius: 6, padding: 8, width: 160, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                                {setsDisponibles.map(s => (
                                  <button key={s} onClick={() => moverFotosASet(s)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: INK, borderRadius: 4 }}>Mover a {s}</button>
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
                    <h2 style={{ fontSize: 18, margin: 0, fontWeight: 500 }}>{setActivo}</h2>
                    <button style={{ background: INK, color: WHITE, border: 'none', padding: '9px 18px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <UploadCloud size={15} /> Añadir Fotos
                    </button>
                  </div>

                  {/* GRILLA DE FOTOS INTERACTIVAS */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
                    {fotosActuales.map((foto, index) => {
                      const isSelected = fotosSeleccionadas.includes(foto.id);
                      return (
                        <div key={foto.id} className="group" style={{ aspectRatio: '1', position: 'relative', borderRadius: 4, overflow: 'hidden', border: isSelected ? `3px solid ${SAND}` : '3px solid transparent', transition: 'all 0.2s', background: '#E8E4DE' }}>
                          <img src={foto.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          
                          {/* OVERLAY ON HOVER */}
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setLightboxIndex(index)} style={{ cursor: 'zoom-in' }}>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: WHITE }}><Maximize2 size={24} /></div>
                          </div>

                          {/* BOTONES DIRECTOS SOBRE LA FOTO */}
                          <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 10 }} onClick={(e) => toggleFotoSeleccion(foto.id, e)}>
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: isSelected ? SAND : 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                              {isSelected && <CheckCircle2 size={12} color={WHITE} />}
                            </div>
                          </div>

                          <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 10 }} onClick={(e) => toggleFavorito(foto.id, e)}>
                            <Heart size={18} fill={foto.favorite ? '#E74C3C' : 'none'} color={foto.favorite ? '#E74C3C' : WHITE} style={{ cursor: 'pointer', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================
              LIGHTBOX (PANTALLA COMPLETA)
              ========================================= */}
          <AnimatePresence>
            {lightboxIndex !== null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column' }}>
                
                {/* Header Lightbox */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', color: WHITE }}>
                  <span style={{ fontSize: 12, letterSpacing: '0.1em' }}>{lightboxIndex + 1} DE {fotosActuales.length}</span>
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    <button onClick={() => toggleFavorito(fotosActuales[lightboxIndex].id)} style={{ background: 'none', border: 'none', color: WHITE, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><Heart size={16} fill={fotosActuales[lightboxIndex].favorite ? '#E74C3C' : 'none'} color={fotosActuales[lightboxIndex].favorite ? '#E74C3C' : WHITE}/> Favorita</button>
                    <button onClick={() => hacerPortada(fotosActuales[lightboxIndex].url)} style={{ background: 'none', border: 'none', color: WHITE, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><ImageIcon size={16} /> Hacer Portada</button>
                    <button onClick={() => borrarFotos([fotosActuales[lightboxIndex].id])} style={{ background: 'none', border: 'none', color: '#E74C3C', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><Trash2 size={16} /> Borrar</button>
                    <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }} />
                    <button onClick={() => setLightboxIndex(null)} style={{ background: 'none', border: 'none', color: WHITE, cursor: 'pointer' }}><X size={24} /></button>
                  </div>
                </div>

                {/* Imagen Central y Flechas */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
                  <button onClick={() => avanzarLightbox(-1)} style={{ background: 'none', border: 'none', color: WHITE, cursor: 'pointer', padding: 24 }}><ChevronLeft size={40} strokeWidth={1} /></button>
                  
                  <div style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <img src={fotosActuales[lightboxIndex]?.url} alt="Ampliación" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                  </div>

                  <button onClick={() => avanzarLightbox(1)} style={{ background: 'none', border: 'none', color: WHITE, cursor: 'pointer', padding: 24 }}><ChevronRightIcon size={40} strokeWidth={1} /></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </main>
      </div>
    </div>
  );
}