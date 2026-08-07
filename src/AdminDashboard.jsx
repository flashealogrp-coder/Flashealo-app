import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import ReviewPanel from './ReviewPanel'; 
import { 
  Loader2, Plus, Calendar, Settings, Image as ImageIcon, Trash2, CheckCircle, 
  Lock, Unlock, MapPin, UploadCloud, Grid, Folder, Star, Home, 
  ChevronRight, ArrowLeft, FolderInput, CheckCircle2, PanelLeftClose, PanelLeft, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── DESIGN TOKENS ─────────────────────────────────────────────────────────── */
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
  const [eventoParaAuditar, setEventoParaAuditar] = useState(null);

  const [eventoEditandoId, setEventoEditandoId] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [portadaFile, setPortadaFile] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '', url_slug: '', descripcion: '', fecha_evento: '', ubicacion: '', 
    tipo_reconocimiento: 'hibrido', es_gratis: true, precio_galeria: 0, 
    logo_url: '', portada_url: '', titulo_about: '', password_cliente: ''
  });

  const [eventoActivo, setEventoActivo] = useState(null);
  const [setActivo, setSetActivo] = useState('Highlights');
  const [fotosSeleccionadas, setFotosSeleccionadas] = useState([]);
  
  // DATOS SIMULADOS (Mock Data) para diseño visual.
  // En el futuro, esto vendrá de una consulta a Supabase.
  const fotosMock = [
    { id: 1, url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400', set: 'Highlights' },
    { id: 2, url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400', set: 'Highlights' },
    { id: 3, url: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=400', set: 'Ceremonia' },
  ];
  const setsMock = ['Highlights', 'Ceremonia', 'Recepción', 'Detalles'];

  useEffect(() => { cargarEventos(); }, []);

  // Control Automático de la Barra Lateral
  useEffect(() => {
    if (vista === 'dashboard') {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
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

  const subirArchivo = async (file, subcarpeta) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const fileName = `${subcarpeta}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from('assets').upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const guardarEvento = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      let lUrl = formData.logo_url;
      let pUrl = formData.portada_url;
      if (logoFile) lUrl = await subirArchivo(logoFile, 'logos');
      if (portadaFile) pUrl = await subirArchivo(portadaFile, 'portadas');

      const payload = { 
        ...formData, 
        precio_galeria: formData.es_gratis ? 0 : parseFloat(formData.precio_galeria),
        logo_url: lUrl, portada_url: pUrl 
      };

      if (eventoEditandoId) {
        await supabase.from('eventos').update(payload).eq('id', eventoEditandoId);
      } else {
        await supabase.from('eventos').insert([payload]);
      }
      
      setMensaje({ tipo: 'exito', texto: 'Colección guardada correctamente.' });
      resetForm();
      cargarEventos();
      setVista('grid'); 
    } catch (err) {
      setMensaje({ tipo: 'error', texto: "Error: " + err.message });
    } finally {
      setCargando(false);
    }
  };

  const abrirFormulario = (ev = null) => {
    if (ev) {
      setEventoEditandoId(ev.id);
      setFormData({
        nombre: ev.nombre || '', url_slug: ev.url_slug || '', descripcion: ev.descripcion || '', 
        fecha_evento: ev.fecha_evento || '', ubicacion: ev.ubicacion || '',
        tipo_reconocimiento: ev.tipo_reconocimiento || 'hibrido', es_gratis: ev.es_gratis,
        precio_galeria: ev.precio_galeria || 0, logo_url: ev.logo_url || '', 
        portada_url: ev.portada_url || '', titulo_about: ev.titulo_about || '', 
        password_cliente: ev.password_cliente || ''
      });
    } else {
      resetForm();
    }
    setVista('form');
  };

  const resetForm = () => {
    setEventoEditandoId(null); setLogoFile(null); setPortadaFile(null);
    setFormData({ nombre: '', url_slug: '', descripcion: '', fecha_evento: '', ubicacion: '', tipo_reconocimiento: 'hibrido', es_gratis: true, precio_galeria: 0, logo_url: '', portada_url: '', titulo_about: '', password_cliente: '' });
  };

  const entrarAlEvento = (ev) => {
    setEventoActivo(ev);
    setSetActivo('Highlights');
    setFotosSeleccionadas([]);
    setVista('dashboard');
  };

  const toggleFotoSeleccion = (fotoId) => {
    setFotosSeleccionadas(prev => prev.includes(fotoId) ? prev.filter(id => id !== fotoId) : [...prev, fotoId]);
  };

  if (eventoParaAuditar) return <ReviewPanel key={eventoParaAuditar.id} evento={eventoParaAuditar} onVolver={() => setEventoParaAuditar(null)} />;

  const SidebarItem = ({ id, icon: Icon, label }) => (
    <button onClick={() => { setSidebarTab(id); setVista('grid'); setEventoActivo(null); }}
      style={{ 
        width: '100%', display: 'flex', alignItems: 'center', gap: sidebarOpen ? 12 : 0, 
        padding: sidebarOpen ? '12px 20px' : '12px 0', justifyContent: sidebarOpen ? 'flex-start' : 'center',
        background: sidebarTab === id ? '#F5F5F5' : 'transparent', color: sidebarTab === id ? INK : TAUPE, 
        border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: sidebarTab === id ? 600 : 400, transition: 'all 0.2s' 
      }}
      title={!sidebarOpen ? label : ''}
    >
      <Icon size={18} strokeWidth={sidebarTab === id ? 2.5 : 1.5} /> 
      {sidebarOpen && <span>{label}</span>}
    </button>
  );

  const headerHeight = vista === 'dashboard' ? 48 : 64;

  return (
    <div style={{ display: 'flex', height: '100vh', background: CREAM, color: INK, fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      
      {/* ─── BARRA LATERAL ─── */}
      <aside style={{ 
        width: sidebarOpen ? 240 : 64, 
        background: WHITE, 
        borderRight: `1px solid ${BORDER}`, 
        display: 'flex', 
        flexDirection: 'column', 
        zIndex: 50, 
        flexShrink: 0, 
        transition: 'width 0.25s ease' 
      }}>
        <div style={{ 
          padding: sidebarOpen ? '0 16px 0 20px' : '0', 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: sidebarOpen ? 'space-between' : 'center', 
          borderBottom: `1px solid ${BORDER}`,
          overflow: 'hidden'
        }}>
          {sidebarOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 2, height: 18, background: SAND, flexShrink: 0, borderRadius: 1 }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 15, letterSpacing: '0.15em', textTransform: 'uppercase', color: INK, lineHeight: 1 }}>Flashealo</span>
                <span style={{ fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: TAUPE, marginTop: 3 }}>Admin</span>
              </div>
            </div>
          ) : (
            <span style={{ width: 3, height: 20, background: SAND, borderRadius: 1 }} />
          )}

          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', color: TAUPE, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 4, transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = INK; e.currentTarget.style.background = '#F5F5F5'; }}
            onMouseLeave={e => { e.currentTarget.style.color = TAUPE; e.currentTarget.style.background = 'none'; }}
          >
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, marginTop: 12 }}>
          <SidebarItem id="colecciones" icon={Grid} label="Colecciones" />
          <SidebarItem id="librerias" icon={Folder} label="Librerías" />
          <SidebarItem id="resaltadas" icon={Star} label="Resaltadas" />
          
          {sidebarOpen ? (
            <div style={{ marginTop: 20, marginBottom: 4, padding: '0 20px', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: TAUPE, fontWeight: 600 }}>Sitio Web</div>
          ) : (
            <div style={{ height: 1, background: BORDER, margin: '12px 16px' }} />
          )}

          <SidebarItem id="homepage" icon={Home} label="Home Page" />
          <SidebarItem id="configuracion" icon={Settings} label="Configuración" />
        </nav>
      </aside>

      {/* ─── ÁREA PRINCIPAL ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        
        {/* BARRA SUPERIOR DINÁMICA */}
        <header style={{ 
          height: headerHeight, 
          flexShrink: 0, 
          background: WHITE, 
          borderBottom: `1px solid ${BORDER}`, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '0 24px', 
          zIndex: 40,
          transition: 'height 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {(vista === 'form' || vista === 'dashboard') && (
              <button onClick={() => { setVista('grid'); setEventoActivo(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: TAUPE, fontSize: 12, transition: 'color 0.2s', fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.color = INK} onMouseLeave={e => e.currentTarget.style.color = TAUPE}>
                <ArrowLeft size={14} /> Volver a Colecciones
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            {headerHeight > 48 && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: INK }}>Estudio Flashealo</p>
                <p style={{ fontSize: 10, color: TAUPE, margin: 0 }}>Plan Ilimitado</p>
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

        {/* CONTENEDOR DE VISTAS */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          
          {/* VISTA 1: GRILLA DE EVENTOS */}
          {vista === 'grid' && (
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1 style={{ fontSize: 24, fontWeight: 400, fontFamily: 'Georgia, serif', margin: 0, color: INK }}>Colecciones</h1>
                <button onClick={() => abrirFormulario()} style={{ background: INK, color: WHITE, border: 'none', padding: '9px 18px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.3s' }} onMouseEnter={e=>e.currentTarget.style.background='#333'} onMouseLeave={e=>e.currentTarget.style.background=INK}>
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
                      <div key={ev.id} onClick={() => entrarAlEvento(ev)} style={{ background: WHITE, borderRadius: 6, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', cursor: 'pointer', border: `1px solid ${BORDER}`, transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'; }}>
                        <div style={{ height: 160, position: 'relative', background: '#E8E4DE' }}>
                          <img src={getUrlCompleta(ev.portada_url) || "https://images.unsplash.com/photo-1541534741688?w=800"} alt="Portada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)', color: INK, padding: '3px 8px', borderRadius: 4, fontSize: 8, fontWeight: 700, letterSpacing: '0.1em' }}>{tipoIA}</div>
                          <div style={{ position: 'absolute', top: 10, right: 10, background: esPrivado ? 'rgba(28,28,28,0.85)' : 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)', color: esPrivado ? WHITE : INK, padding: '3px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {esPrivado ? <Lock size={10} color={SAND} /> : <Unlock size={10} color={TAUPE} />}
                            <span style={{ fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{esPrivado ? 'Privada' : 'Pública'}</span>
                          </div>
                        </div>
                        <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: INK }}><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.nombre}</span> <ChevronRight size={14} color={TAUPE} /></h3>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${BORDER}`, paddingTop: 8, marginTop: 4 }}>
                            <span style={{ fontSize: 11, color: TAUPE, display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} /> {ev.fecha_evento || 'Sin fecha'}</span>
                            <span style={{ fontSize: 10, color: INK, fontWeight: 600, background: CREAM, padding: '2px 6px', borderRadius: 3 }}>{ev.total_fotos || 0} fotos</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VISTA 2: FORMULARIO DE EVENTO */}
          {vista === 'form' && (
            <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 32px' }}>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: INK, margin: '0 0 20px 0' }}>{eventoEditandoId ? `Ajustes: ${formData.nombre}` : 'Nueva Colección'}</h1>
              <form onSubmit={guardarEvento} style={{ background: WHITE, padding: 36, borderRadius: 6, border: `1px solid ${BORDER}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
                  <div><label style={{ display: 'block', fontSize: 11, color: TAUPE, marginBottom: 6 }}>Título de la Colección</label><input required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} style={{ width: '100%', padding: '8px 0', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.2)', fontSize: 16, fontFamily: 'Georgia, serif', outline: 'none' }} /></div>
                  <div><label style={{ display: 'block', fontSize: 11, color: TAUPE, marginBottom: 6 }}>URL (Slug)</label><input required value={formData.url_slug} onChange={e => setFormData({...formData, url_slug: e.target.value.toLowerCase().replace(/ /g, '-')})} style={{ width: '100%', padding: '8px 0', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.2)', fontSize: 16, fontFamily: 'Georgia, serif', outline: 'none' }} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
                  <div><label style={{ display: 'block', fontSize: 11, color: TAUPE, marginBottom: 6 }}>Motor de IA</label><select value={formData.tipo_reconocimiento} onChange={e => setFormData({...formData, tipo_reconocimiento: e.target.value})} style={{ width: '100%', padding: 10, background: CREAM, border: 'none', fontSize: 12, outline: 'none', borderRadius: 4 }}><option value="hibrido">Híbrido (Facial + Dorsales)</option><option value="facial">Facial Puro (Sociales/Bodas)</option><option value="ocr">Lectura OCR (Flashealo Sport)</option></select></div>
                  <div><label style={{ display: 'block', fontSize: 11, color: TAUPE, marginBottom: 6 }}>Clave de Acceso (Privacidad)</label><input type="text" placeholder="Vacío = Pública" value={formData.password_cliente || ''} onChange={e => setFormData({...formData, password_cliente: e.target.value})} style={{ width: '100%', padding: 10, background: CREAM, border: 'none', fontSize: 12, outline: 'none', borderRadius: 4 }} /></div>
                </div>
                <button disabled={cargando} style={{ width: '100%', padding: 14, background: INK, color: WHITE, border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>{cargando ? <Loader2 size={14} className="animate-spin"/> : 'Guardar Colección'}</button>
              </form>
            </div>
          )}

          {/* VISTA 3: DASHBOARD DEL EVENTO */}
          {vista === 'dashboard' && eventoActivo && (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
              <div style={{ height: 180, position: 'relative', background: INK, display: 'flex', alignItems: 'flex-end', padding: '0 32px 24px', flexShrink: 0 }}>
                <img src={getUrlCompleta(eventoActivo.portada_url) || "https://images.unsplash.com/photo-1541534741688?w=1200"} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
                <div style={{ position: 'relative', zIndex: 10, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <h1 style={{ fontSize: 28, fontFamily: 'Georgia, serif', color: WHITE, margin: '0 0 4px 0' }}>{eventoActivo.nombre}</h1>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: 3, fontSize: 9, color: WHITE, textTransform: 'uppercase' }}>{eventoActivo.password_cliente ? 'Privada' : 'Pública'}</span>
                      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: 0 }}>{eventoActivo.fecha_evento || 'Sin fecha'}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => window.open(`/g/${eventoActivo.url_slug || eventoActivo.id}`, '_blank')} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', color: WHITE, border: 'none', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}><Eye size={13} /> Ver Galería</button>
                    <button onClick={() => abrirFormulario(eventoActivo)} style={{ background: WHITE, color: INK, border: 'none', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}><Settings size={13} /> Ajustes</button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flex: 1, minHeight: 450 }}>
                {/* COLUMNA SETS */}
                <div style={{ width: 220, background: WHITE, borderRight: `1px solid ${BORDER}`, padding: '20px 0', flexShrink: 0 }}>
                  <div style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: TAUPE }}>Carpetas</span>
                    <button style={{ background: 'none', border: 'none', color: TAUPE, cursor: 'pointer' }}><Plus size={14} /></button>
                  </div>
                  {setsMock.map(set => (
                    <div key={set} onClick={() => setSetActivo(set)} style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: setActivo === set ? '#F5F5F5' : 'transparent', borderLeft: setActivo === set ? `3px solid ${INK}` : '3px solid transparent' }}>
                      <span style={{ fontSize: 12, fontWeight: setActivo === set ? 500 : 400, color: INK }}>{set}</span>
                      <span style={{ fontSize: 10, color: TAUPE }}>-</span>
                    </div>
                  ))}
                </div>

                {/* COLUMNA FOTOS */}
                <div style={{ flex: 1, padding: 28, background: '#FAFAFA', position: 'relative' }}>
                  <AnimatePresence>
                    {fotosSeleccionadas.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} style={{ position: 'fixed', bottom: 40, left: '55%', transform: 'translateX(-50%)', background: INK, color: WHITE, padding: '16px 24px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 32, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 100 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{fotosSeleccionadas.length} seleccionadas</span>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <button style={{ background: 'transparent', border: 'none', color: WHITE, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><FolderInput size={16} /> Mover a Set</button>
                          <button style={{ background: 'transparent', border: 'none', color: '#E74C3C', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><Trash2 size={16} /> Eliminar</button>
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

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                    {fotosMock.filter(f => f.set === setActivo).map(foto => {
                      const isSelected = fotosSeleccionadas.includes(foto.id);
                      return (
                        <div key={foto.id} onClick={() => toggleFotoSeleccion(foto.id)} style={{ aspectRatio: '1', position: 'relative', borderRadius: 4, overflow: 'hidden', border: isSelected ? `3px solid ${SAND}` : '3px solid transparent', cursor: 'pointer', transition: 'all 0.1s' }}>
                          <img src={foto.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', top: 6, left: 6, width: 18, height: 18, borderRadius: '50%', background: isSelected ? SAND : 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: WHITE }}>
                            {isSelected && <CheckCircle size={11} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}