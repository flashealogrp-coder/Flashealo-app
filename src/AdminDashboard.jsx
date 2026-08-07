import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import ReviewPanel from './ReviewPanel'; 
import { 
  Loader2, Plus, Calendar, Settings, Image as ImageIcon, Trash2, CheckCircle, 
  Lock, Unlock, Grid, Folder, Star, Home, ChevronRight, ArrowLeft, 
  FolderInput, CheckCircle2, ChevronLeft, ChevronRight as ChevronRightIcon, 
  Eye, Heart, Maximize2, X, PanelLeftClose, PanelLeft
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
  const [vista, setVista] = useState('grid'); // 'grid' | 'form' | 'dashboard'
  const [filtroGrid, setFiltroGrid] = useState('social'); 

  const [listaEventos, setListaEventos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [eventoParaAuditar, setEventoParaAuditar] = useState(null);

  // Estados del Formulario de Ajustes
  const [eventoEditandoId, setEventoEditandoId] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [portadaFile, setPortadaFile] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '', url_slug: '', descripcion: '', fecha_evento: '', ubicacion: '', 
    tipo_reconocimiento: 'hibrido', password_cliente: '', portada_url: ''
  });

  // Estados del Dashboard del Evento Activo
  const [eventoActivo, setEventoActivo] = useState(null);
  const [setActivo, setSetActivo] = useState('Highlights');
  const [fotosSeleccionadas, setFotosSeleccionadas] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [mostrarModalMover, setMostrarModalMover] = useState(false);

  // Fotografías del evento activo (Conectadas a Supabase o estado local de trabajo)
  const [fotosEvento, setFotosEvento] = useState([]);
  const setsDisponibles = ['Highlights', 'Ceremonia', 'Recepción', 'Detalles'];

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

  const cargarFotosDeEvento = async (eventoId) => {
    const { data } = await supabase.from('fotografias').select('*').eq('evento_id', eventoId);
    if (data) {
      setFotosEvento(data.map(f => ({
        id: f.id,
        url: f.ruta_r2.startsWith('http') ? f.ruta_r2 : `https://fotos.flashealo.do/${f.ruta_r2}`,
        set: f.set_name || 'Highlights',
        favorite: f.es_favorita || false,
        rutaOriginal: f.ruta_r2
      })));
    } else {
      setFotosEvento([]);
    }
  };

  // ─── NAVEGACIÓN Y RETROCESO INTELIGENTE ───
  const manejarVolver = () => {
    if (vista === 'form' && eventoActivo) {
      setVista('dashboard'); // Si estábamos ajustando la galería activa, volvemos a ella
    } else {
      setVista('grid');
      setEventoActivo(null);
    }
  };

  const abrirAjustes = (ev) => {
    setEventoEditandoId(ev.id);
    setFormData({ ...ev });
    setVista('form');
  };

  const entrarAlEvento = async (ev) => {
    setEventoActivo(ev);
    setSetActivo('Highlights');
    setFotosSeleccionadas([]);
    await cargarFotosDeEvento(ev.id);
    setVista('dashboard');
  };

  // ─── ACCIONES DE FOTOS ───
  const toggleFotoSeleccion = (fotoId, e) => {
    e.stopPropagation();
    setFotosSeleccionadas(prev => prev.includes(fotoId) ? prev.filter(id => id !== fotoId) : [...prev, fotoId]);
  };

  const toggleFavorito = async (fotoId, e) => {
    e?.stopPropagation();
    const foto = fotosEvento.find(f => f.id === fotoId);
    if (!foto) return;

    const nuevoEstado = !foto.favorite;
    setFotosEvento(prev => prev.map(f => f.id === fotoId ? { ...f, favorite: nuevoEstado } : f));
    
    await supabase.from('fotografias').update({ es_favorita: nuevoEstado }).eq('id', fotoId);
  };

  const borrarFotos = async (ids) => {
    await supabase.from('fotografias').delete().in('id', ids);
    setFotosEvento(prev => prev.filter(f => !ids.includes(f.id)));
    setFotosSeleccionadas([]);
    setLightboxIndex(null);
    setMensaje({ tipo: 'exito', texto: 'Fotografías eliminadas correctamente.' });
  };

  const moverFotosASet = async (nuevoSet) => {
    await supabase.from('fotografias').update({ set_name: nuevoSet }).in('id', fotosSeleccionadas);
    setFotosEvento(prev => prev.map(f => fotosSeleccionadas.includes(f.id) ? { ...f, set: nuevoSet } : f));
    setFotosSeleccionadas([]);
    setMostrarModalMover(false);
    setMensaje({ tipo: 'exito', texto: `Movidas a ${nuevoSet}` });
  };

  const hacerPortada = async (url) => {
    await supabase.from('eventos').update({ portada_url: url }).eq('id', eventoActivo.id);
    setEventoActivo(prev => ({ ...prev, portada_url: url }));
    setMensaje({ tipo: 'exito', texto: 'Portada de la colección actualizada.' });
  };

  const guardarAjustesEvento = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      await supabase.from('eventos').update(formData).eq('id', eventoEditandoId);
      setMensaje({ tipo: 'exito', texto: 'Ajustes guardados correctamente.' });
      await cargarEventos();
      setEventoActivo({ ...eventoActivo, ...formData });
      setVista('dashboard');
    } catch (err) {
      setMensaje({ tipo: 'error', texto: "Error al guardar: " + err.message });
    } finally {
      setCargando(false);
    }
  };

  const fotosActuales = fotosEvento.filter(f => f.set === setActivo);

  if (eventoParaAuditar) return <ReviewPanel key={eventoParaAuditar.id} evento={eventoParaAuditar} onVolver={() => setEventoParaAuditar(null)} />;

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

  const headerHeight = vista === 'dashboard' ? 48 : 64;

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

          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TAUPE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 4, transition: 'all 0.2s' }}>
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
        
        {/* BARRA SUPERIOR CON MEMORIA */}
        <header style={{ height: headerHeight, flexShrink: 0, background: WHITE, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 40, transition: 'height 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {(vista === 'form' || vista === 'dashboard') && (
              <button onClick={manejarVolver} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: TAUPE, fontSize: 12, transition: 'color 0.2s', fontWeight: 500 }}>
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

        {/* NOTIFICACIONES TOAST */}
        <AnimatePresence>
          {mensaje.texto && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ position: 'absolute', top: 16, right: 24, zIndex: 100, padding: '12px 20px', background: INK, fontSize: 12, color: WHITE, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle size={14} color={SAND} /> {mensaje.texto}
            </motion.div>
          )}
        </AnimatePresence>

        <main style={{ flex: 1, overflowY: 'auto' }}>
          
          {/* VISTA 1: GRILLA */}
          {vista === 'grid' && (
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1 style={{ fontSize: 24, fontWeight: 400, fontFamily: 'Georgia, serif', margin: 0, color: INK }}>Colecciones</h1>
                <button onClick={() => { setEventoEditandoId(null); setFormData({ nombre: '', url_slug: '', tipo_reconocimiento: 'hibrido', password_cliente: '' }); setVista('form'); }} style={{ background: INK, color: WHITE, border: 'none', padding: '9px 18px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
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
                    const tipoIA = ev.tipo_reconocimiento ? ev.tipo_reconocimiento.toUpperCase() : 'HÍBRIDO';

                    return (
                      <div key={ev.id} onClick={() => entrarAlEvento(ev)} style={{ background: WHITE, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div style={{ height: 160, position: 'relative', background: '#E8E4DE' }}>
                          <img src={getUrlCompleta(ev.portada_url) || "https://images.unsplash.com/photo-1541534741688?w=800"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.92)', color: INK, padding: '3px 8px', borderRadius: 4, fontSize: 8, fontWeight: 700, letterSpacing: '0.1em' }}>{tipoIA}</div>
                          <div style={{ position: 'absolute', top: 10, right: 10, background: esPrivado ? 'rgba(28,28,28,0.85)' : 'rgba(255,255,255,0.92)', color: esPrivado ? WHITE : INK, padding: '3px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {esPrivado ? <Lock size={10} color={SAND} /> : <Unlock size={10} color={TAUPE} />}
                            <span style={{ fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{esPrivado ? 'Privada' : 'Pública'}</span>
                          </div>
                        </div>
                        <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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

          {/* VISTA 2: FORMULARIO DE AJUSTES */}
          {vista === 'form' && (
            <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 32px' }}>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: INK, margin: '0 0 20px 0' }}>Ajustes de Colección</h1>
              <form onSubmit={guardarAjustesEvento} style={{ background: WHITE, padding: 36, borderRadius: 6, border: `1px solid ${BORDER}` }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 11, color: TAUPE, marginBottom: 6 }}>Título</label>
                  <input required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} style={{ width: '100%', padding: '8px 0', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.2)', fontSize: 16, outline: 'none' }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 11, color: TAUPE, marginBottom: 6 }}>Clave de Acceso</label>
                  <input type="text" value={formData.password_cliente || ''} onChange={e => setFormData({...formData, password_cliente: e.target.value})} placeholder="Vacío = Pública" style={{ width: '100%', padding: 10, background: CREAM, border: 'none', borderRadius: 4, fontSize: 13, outline: 'none' }} />
                </div>
                <button disabled={cargando} style={{ width: '100%', padding: 12, background: INK, color: WHITE, border: 'none', borderRadius: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>
                  {cargando ? <Loader2 size={14} className="animate-spin" /> : 'Guardar Cambios'}
                </button>
              </form>
            </div>
          )}

          {/* VISTA 3: DASHBOARD DE LA GALERÍA */}
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
                    <button onClick={() => window.open(`/g/${eventoActivo.url_slug || eventoActivo.id}`, '_blank')} style={{ background: 'rgba(255,255,255,0.15)', color: WHITE, border: 'none', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}><Eye size={13} /> Ver</button>
                    <button onClick={() => abrirAjustes(eventoActivo)} style={{ background: WHITE, color: INK, border: 'none', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}><Settings size={13} /> Ajustes</button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flex: 1, minHeight: 450 }}>
                {/* SETS */}
                <div style={{ width: 220, background: WHITE, borderRight: `1px solid ${BORDER}`, padding: '20px 0', flexShrink: 0 }}>
                  <div style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: TAUPE }}>Carpetas</span>
                    <button style={{ background: 'none', border: 'none', color: TAUPE, cursor: 'pointer' }}><Plus size={14} /></button>
                  </div>
                  {setsDisponibles.map(set => {
                    const cant = fotosEvento.filter(f => f.set === set).length;
                    return (
                      <div key={set} onClick={() => setSetActivo(set)} style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: setActivo === set ? '#F5F5F5' : 'transparent', borderLeft: setActivo === set ? `3px solid ${INK}` : '3px solid transparent' }}>
                        <span style={{ fontSize: 12, fontWeight: setActivo === set ? 500 : 400, color: INK }}>{set}</span>
                        <span style={{ fontSize: 10, color: TAUPE }}>{cant}</span>
                      </div>
                    );
                  })}
                </div>

                {/* FOTOS */}
                <div style={{ flex: 1, padding: 28, background: '#FAFAFA', position: 'relative' }}>
                  
                  <AnimatePresence>
                    {fotosSeleccionadas.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} style={{ position: 'fixed', bottom: 40, left: '55%', transform: 'translateX(-50%)', background: INK, color: WHITE, padding: '12px 24px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 32, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 100 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{fotosSeleccionadas.length} seleccionadas</span>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <div style={{ position: 'relative' }}>
                            <button onClick={() => setMostrarModalMover(!mostrarModalMover)} style={{ background: 'transparent', border: 'none', color: WHITE, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><FolderInput size={14} /> Mover</button>
                            {mostrarModalMover && (
                              <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 12, background: WHITE, borderRadius: 6, padding: 8, width: 160, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                                {setsDisponibles.map(s => (
                                  <button key={s} onClick={() => moverFotosASet(s)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: INK }}>Mover a {s}</button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button onClick={() => borrarFotos(fotosSeleccionadas)} style={{ background: 'transparent', border: 'none', color: '#E74C3C', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><Trash2 size={14} /> Borrar</button>
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

                  {fotosActuales.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: TAUPE, fontStyle: 'italic', fontSize: 13 }}>No hay fotografías en este set todavía.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
                      {fotosActuales.map((foto, index) => {
                        const isSelected = fotosSeleccionadas.includes(foto.id);
                        return (
                          <div key={foto.id} className="group" style={{ aspectRatio: '1', position: 'relative', borderRadius: 4, overflow: 'hidden', border: isSelected ? `3px solid ${SAND}` : '3px solid transparent', background: '#E8E4DE' }}>
                            <img src={foto.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setLightboxIndex(index)} style={{ cursor: 'zoom-in' }}>
                              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: WHITE }}><Maximize2 size={22} /></div>
                            </div>

                            <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 10 }} onClick={(e) => toggleFotoSeleccion(foto.id, e)}>
                              <div style={{ width: 20, height: 20, borderRadius: '50%', background: isSelected ? SAND : 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                {isSelected && <CheckCircle2 size={11} color={WHITE} />}
                              </div>
                            </div>

                            <div style={{ position: 'absolute', bottom: 6, right: 6, zIndex: 10 }} onClick={(e) => toggleFavorito(foto.id, e)}>
                              <Heart size={16} fill={foto.favorite ? '#E74C3C' : 'none'} color={foto.favorite ? '#E74C3C' : WHITE} style={{ cursor: 'pointer', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* LIGHTBOX */}
          <AnimatePresence>
            {lightboxIndex !== null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', color: WHITE }}>
                  <span style={{ fontSize: 12, letterSpacing: '0.1em' }}>{lightboxIndex + 1} / {fotosActuales.length}</span>
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    <button onClick={() => toggleFavorito(fotosActuales[lightboxIndex].id)} style={{ background: 'none', border: 'none', color: WHITE, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><Heart size={15} fill={fotosActuales[lightboxIndex].favorite ? '#E74C3C' : 'none'} color={fotosActuales[lightboxIndex].favorite ? '#E74C3C' : WHITE}/> Favorita</button>
                    <button onClick={() => hacerPortada(fotosActuales[lightboxIndex].url)} style={{ background: 'none', border: 'none', color: WHITE, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><ImageIcon size={15} /> Usar como Portada</button>
                    <button onClick={() => borrarFotos([fotosActuales[lightboxIndex].id])} style={{ background: 'none', border: 'none', color: '#E74C3C', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><Trash2 size={15} /> Borrar</button>
                    <button onClick={() => setLightboxIndex(null)} style={{ background: 'none', border: 'none', color: WHITE, cursor: 'pointer' }}><X size={22} /></button>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
                  <button onClick={() => setLightboxIndex(prev => (prev === 0 ? fotosActuales.length - 1 : prev - 1))} style={{ background: 'none', border: 'none', color: WHITE, cursor: 'pointer', padding: 20 }}><ChevronLeft size={36} strokeWidth={1} /></button>
                  <div style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
                    <img src={fotosActuales[lightboxIndex]?.url} alt="" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
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