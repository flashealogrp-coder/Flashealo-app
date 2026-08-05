import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import ReviewPanel from './ReviewPanel'; 
import { Loader2, Plus, Calendar, Settings, Image as ImageIcon, Trash2, Edit3, CheckCircle, ShieldCheck, ArrowRight, Lock, MapPin, Link } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── DESIGN TOKENS ─────────────────────────────────────────────────────────── */
const SAND   = '#C8B99A';
const TAUPE  = '#9A8F82';
const INK    = '#1C1C1C';
const CREAM  = '#F7F5F0';
const WHITE  = '#FFFFFF';

// 🌟 Función para resolver links de imágenes
const getUrlCompleta = (ruta) => {
  if (!ruta) return null;
  if (ruta.includes('http')) return ruta;
  return `https://muvzhnnsdnztlhynuipd.supabase.co/storage/v1/object/public/fotos/${ruta}`;
};

const AdminDashboard = () => {
  const [tabActiva, setTabActiva] = useState('lista'); 
  const [listaEventos, setListaEventos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const [eventoParaAuditar, setEventoParaAuditar] = useState(null);

  // ESTADOS DEL FORMULARIO UNIFICADO
  const [eventoEditandoId, setEventoEditandoId] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [portadaFile, setPortadaFile] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre: '', 
    url_slug: '', 
    descripcion: '', 
    fecha_evento: '', 
    ubicacion: '', 
    tipo_reconocimiento: 'hibrido', 
    es_gratis: true, 
    precio_galeria: 0.00, 
    logo_url: '', 
    portada_url: '',
    titulo_about: '',
    password_cliente: '' 
  });

  useEffect(() => { cargarEventos(); }, []);

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
    setMensaje({ tipo: '', texto: '' });

    try {
      let lUrl = formData.logo_url;
      let pUrl = formData.portada_url;

      if (logoFile) lUrl = await subirArchivo(logoFile, 'logos');
      if (portadaFile) pUrl = await subirArchivo(portadaFile, 'portadas');

      const payload = { 
        ...formData, 
        precio_galeria: formData.es_gratis ? 0 : parseFloat(formData.precio_galeria),
        logo_url: lUrl, 
        portada_url: pUrl 
      };

      if (eventoEditandoId) {
        await supabase.from('eventos').update(payload).eq('id', eventoEditandoId);
      } else {
        await supabase.from('eventos').insert([payload]);
      }
      
      setMensaje({ tipo: 'exito', texto: 'Colección guardada con excelencia.' });
      resetForm();
      cargarEventos();
      setTabActiva('lista');
    } catch (err) {
      setMensaje({ tipo: 'error', texto: "Error al guardar: " + err.message });
    } finally {
      setCargando(false);
    }
  };

  const iniciarEdicion = (ev) => {
    setEventoEditandoId(ev.id);
    setFormData({
      nombre: ev.nombre || '', 
      url_slug: ev.url_slug || '', 
      descripcion: ev.descripcion || '', 
      fecha_evento: ev.fecha_evento || '', 
      ubicacion: ev.ubicacion || '',
      tipo_reconocimiento: ev.tipo_reconocimiento || 'hibrido', 
      es_gratis: ev.es_gratis,
      precio_galeria: ev.precio_galeria || 0, 
      logo_url: ev.logo_url || '', 
      portada_url: ev.portada_url || '',
      titulo_about: ev.titulo_about || '', 
      password_cliente: ev.password_cliente || ''
    });
    setLogoFile(null);
    setPortadaFile(null);
    setTabActiva('crear');
  };

  const resetForm = () => {
    setEventoEditandoId(null);
    setLogoFile(null);
    setPortadaFile(null);
    setFormData({ nombre: '', url_slug: '', descripcion: '', fecha_evento: '', ubicacion: '', tipo_reconocimiento: 'hibrido', es_gratis: true, precio_galeria: 0, logo_url: '', portada_url: '', titulo_about: '', password_cliente: '' });
  };
  
  if (eventoParaAuditar) {
    return <ReviewPanel key={eventoParaAuditar.id} evento={eventoParaAuditar} onVolver={() => setEventoParaAuditar(null)} />;
  }

  const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

  return (
    <div style={{ background: CREAM, color: INK, fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh' }}>
      
      {/* ── NAVBAR ADMINISTRATIVO ── */}
      <nav style={{ padding: '24px 48px', background: WHITE, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 32, height: 32, background: INK, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={16} color={WHITE} />
          </div>
          <div>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: 20, letterSpacing: '0.15em', textTransform: 'uppercase', color: INK, display: 'block', lineHeight: 1 }}>Flashealo</span>
            <span style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: TAUPE }}>Dashboard</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          <button onClick={() => { setTabActiva('lista'); cargarEventos(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: tabActiva === 'lista' ? INK : TAUPE, fontWeight: tabActiva === 'lista' ? 600 : 400, transition: 'color 0.3s' }}>
            Mis Colecciones
          </button>
          <button onClick={() => { resetForm(); setTabActiva('crear'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: tabActiva === 'crear' ? INK : TAUPE, fontWeight: tabActiva === 'crear' ? 600 : 400, transition: 'color 0.3s' }}>
            Configurar Nueva
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 48px 120px' }}>
        
        {mensaje.texto && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '16px 24px', background: WHITE, borderLeft: `3px solid ${mensaje.tipo === 'exito' ? SAND : '#C0392B'}`, marginBottom: 48, fontSize: 13, letterSpacing: '0.04em', color: INK, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            {mensaje.texto}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {tabActiva === 'lista' && (
            <motion.div key="lista" initial="hidden" animate="visible" exit={{ opacity: 0 }} variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
              <div style={{ marginBottom: 64 }}>
                <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 48, fontWeight: 300, color: INK, marginBottom: 16 }}>Colecciones Activas</h1>
                <p style={{ color: TAUPE, fontSize: 14, letterSpacing: '0.02em' }}>Administra tus eventos fotográficos y realiza auditorías de IA.</p>
              </div>

              {cargando ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><Loader2 size={32} className="animate-spin" style={{ color: SAND }} /></div>
              ) : listaEventos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '100px 0', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <p style={{ color: TAUPE, fontStyle: 'italic' }}>El lienzo está en blanco. Crea tu primera colección.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 40 }}>
                  {listaEventos.map(ev => {
                    const esPrivado = ev.password_cliente && ev.password_cliente.trim() !== '';

                    return (
                      <motion.div key={ev.id} variants={fadeUp} style={{ background: WHITE, borderRadius: 2, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        
                        <div style={{ position: 'relative', height: 200, background: '#E8E4DE', overflow: 'hidden' }}>
                          <img src={getUrlCompleta(ev.portada_url) || "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=800&auto=format&fit=crop"} alt="Portada" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.8)' }} />
                          
                          <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', padding: '6px 12px', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: INK, fontWeight: 600 }}>
                            {ev.tipo_reconocimiento}
                          </div>

                          {esPrivado && (
                            <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(28,28,28,0.85)', backdropFilter: 'blur(4px)', padding: '6px 12px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6, color: WHITE }}>
                              <Lock size={10} />
                              <span style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, color: WHITE }}>Privado</span>
                            </div>
                          )}
                        </div>
                        
                        <div style={{ padding: 32, flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 300, color: INK, marginBottom: 12, lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {ev.nombre} 
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: TAUPE, fontSize: 11, letterSpacing: '0.06em', marginBottom: 32 }}>
                            <Calendar size={14} /> {ev.fecha_evento || 'Sin fecha programada'}
                          </div>
                          
                          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <button onClick={() => setEventoParaAuditar(ev)} style={{ width: '100%', padding: '14px 0', background: INK, color: WHITE, border: 'none', cursor: 'pointer', fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.3s' }} onMouseEnter={e => e.target.style.background = '#333'} onMouseLeave={e => e.target.style.background = INK}>
                              Auditar Colección <ArrowRight size={14} />
                            </button>
                            
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button 
                                onClick={() => {
                                  const url = `${window.location.origin}/g/${ev.url_slug || ev.id}`;
                                  navigator.clipboard.writeText(url);
                                  setMensaje({ tipo: 'exito', texto: '¡Enlace copiado al portapapeles!' });
                                  setTimeout(() => setMensaje({ tipo: '', texto: '' }), 4000);
                                }} 
                                style={{ flex: 1, padding: '12px 0', background: CREAM, color: INK, border: 'none', cursor: 'pointer', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', transition: 'background 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} 
                                onMouseEnter={e => e.target.style.background = '#E8E4DE'} onMouseLeave={e => e.target.style.background = CREAM}
                                title="Copiar link para clientes"
                              >
                                <Link size={14} /> Link
                              </button>

                              <button onClick={() => iniciarEdicion(ev)} style={{ flex: 1, padding: '12px 0', background: CREAM, color: INK, border: 'none', cursor: 'pointer', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', transition: 'background 0.3s' }} onMouseEnter={e => e.target.style.background = '#E8E4DE'} onMouseLeave={e => e.target.style.background = CREAM}>
                                Editar
                              </button>

                              <button onClick={async () => { if(window.confirm("¿Destruir esta colección por completo?")) { await supabase.from('eventos').delete().eq('id', ev.id); cargarEventos(); } }} style={{ padding: '0 20px', background: '#FDF8F8', color: '#C0392B', border: 'none', cursor: 'pointer', transition: 'background 0.3s' }} onMouseEnter={e => e.target.style.background = '#F9EBEB'} onMouseLeave={e => e.target.style.background = '#FDF8F8'}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {tabActiva === 'crear' && (
            <motion.div key="crear" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ marginBottom: 64 }}>
                <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 48, fontWeight: 300, color: INK, marginBottom: 16 }}>
                  {eventoEditandoId ? 'Refinar Colección' : 'Nueva Colección'}
                </h1>
                <p style={{ color: TAUPE, fontSize: 14, letterSpacing: '0.02em' }}>Define los detalles estéticos y logísticos para el portal del cliente.</p>
              </div>

              <form onSubmit={guardarEvento} style={{ background: WHITE, padding: 64, boxShadow: '0 20px 60px rgba(0,0,0,0.02)' }}>
                
                {/* IDENTIDAD */}
                <h3 style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: TAUPE, marginBottom: 32, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 16 }}>Identidad Pública</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 64 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', color: INK, marginBottom: 12 }}>Título de la Colección</label>
                    <input required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Ej. Boda Punta Cana" style={{ width: '100%', padding: '16px 0', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.2)', fontSize: 20, fontFamily: 'Georgia, serif', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', color: INK, marginBottom: 12 }}>Enlace Personalizado (Slug)</label>
                    <input required value={formData.url_slug} onChange={e => setFormData({...formData, url_slug: e.target.value.toLowerCase().replace(/ /g, '-')})} placeholder="boda-punta-cana" style={{ width: '100%', padding: '16px 0', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.2)', fontSize: 20, fontFamily: 'Georgia, serif', outline: 'none' }} />
                    <p style={{ fontSize: 10, color: TAUPE, marginTop: 8 }}>Tus clientes entrarán a: <span style={{ color: SAND }}>misitio.com/g/{formData.url_slug || '...'}</span></p>
                  </div>
                </div>

                {/* LOGÍSTICA & ABOUT */}
                <h3 style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: TAUPE, marginBottom: 32, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 16 }}>Logística y Narrativa</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 32 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', color: INK, marginBottom: 12 }}><Calendar size={12} style={{display:'inline', marginRight:6}}/>Fecha del Evento</label>
                    <input type="date" required value={formData.fecha_evento} onChange={e => setFormData({...formData, fecha_evento: e.target.value})} style={{ width: '100%', padding: 16, background: CREAM, border: 'none', fontSize: 14, outline: 'none', color: INK }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', color: INK, marginBottom: 12 }}><MapPin size={12} style={{display:'inline', marginRight:6}}/>Locación</label>
                    <input value={formData.ubicacion} onChange={e => setFormData({...formData, ubicacion: e.target.value})} placeholder="Ej. Casa de Campo" style={{ width: '100%', padding: 16, background: CREAM, border: 'none', fontSize: 14, outline: 'none', color: INK }} />
                  </div>
                </div>
                
                <div style={{ marginBottom: 32 }}>
                  <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', color: INK, marginBottom: 12 }}>Título Editorial (About)</label>
                  <input value={formData.titulo_about || ''} onChange={e => setFormData({...formData, titulo_about: e.target.value})} placeholder='Ej. "Capturando la esencia de cada instante."' style={{ width: '100%', padding: 16, background: CREAM, border: 'none', fontSize: 16, fontFamily: 'Georgia, serif', outline: 'none', color: INK }} />
                </div>
                <div style={{ marginBottom: 64 }}>
                  <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', color: INK, marginBottom: 12 }}>Descripción Editorial</label>
                  <textarea rows="5" value={formData.descripcion || ''} onChange={e => setFormData({...formData, descripcion: e.target.value})} placeholder="Historia del evento..." style={{ width: '100%', padding: 16, background: CREAM, border: 'none', fontSize: 14, outline: 'none', color: INK, resize: 'none' }} />
                </div>

                {/* IMÁGENES CON VISUALIZACIÓN OPTIMIZADA */}
                <h3 style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: TAUPE, marginBottom: 32, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 16 }}>Dirección de Arte</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 48 }}>
                  
                  {/* LOGO */}
                  <div style={{ padding: 24, border: '1px dashed rgba(0,0,0,0.1)', textAlign: 'center', background: '#FAFAFA', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      {formData.logo_url && !logoFile ? (
                        <img src={getUrlCompleta(formData.logo_url)} alt="Logo actual" style={{ width: '100%', height: 180, objectFit: 'cover', margin: '0 auto 16px', borderRadius: 4, border: '1px solid rgba(0,0,0,0.05)', background: WHITE }} />
                      ) : (
                        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px solid rgba(0,0,0,0.05)', background: WHITE, borderRadius: 4 }}>
                          <ImageIcon size={32} style={{ color: TAUPE }} />
                        </div>
                      )}
                      
                      <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', color: INK, marginBottom: 16, textTransform: 'uppercase', fontWeight: 600 }}>Logo Cuadrado</label>
                    </div>
                    <div>
                      <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files[0])} style={{ fontSize: 11, color: TAUPE, width: '100%' }} />
                      {formData.logo_url && !logoFile && <p style={{ fontSize: 10, color: '#2E7D32', marginTop: 12 }}>✓ Mostrando imagen actual guardada</p>}
                    </div>
                  </div>

                  {/* PORTADA */}
                  <div style={{ padding: 24, border: '1px dashed rgba(0,0,0,0.1)', textAlign: 'center', background: '#FAFAFA', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      {formData.portada_url && !portadaFile ? (
                        <img src={getUrlCompleta(formData.portada_url)} alt="Portada actual" style={{ width: '100%', height: 180, objectFit: 'cover', margin: '0 auto 16px', borderRadius: 4, border: '1px solid rgba(0,0,0,0.05)' }} />
                      ) : (
                        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px solid rgba(0,0,0,0.05)', background: WHITE, borderRadius: 4 }}>
                          <ImageIcon size={32} style={{ color: TAUPE }} />
                        </div>
                      )}

                      <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', color: INK, marginBottom: 16, textTransform: 'uppercase', fontWeight: 600 }}>Portada Cinematográfica</label>
                    </div>
                    <div>
                      <input type="file" accept="image/*" onChange={e => setPortadaFile(e.target.files[0])} style={{ fontSize: 11, color: TAUPE, width: '100%' }} />
                      {formData.portada_url && !portadaFile && <p style={{ fontSize: 10, color: '#2E7D32', marginTop: 12 }}>✓ Mostrando imagen actual guardada</p>}
                    </div>
                  </div>

                </div>

                {/* MOTORES Y SEGURIDAD */}
                <h3 style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: TAUPE, marginBottom: 32, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 16 }}>Configuración de Software</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 64 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', color: INK, marginBottom: 12 }}><Settings size={12} style={{display:'inline', marginRight:6}}/>Motor de Inteligencia Artificial</label>
                    <select value={formData.tipo_reconocimiento} onChange={e => setFormData({...formData, tipo_reconocimiento: e.target.value})} style={{ width: '100%', padding: 16, background: CREAM, border: 'none', fontSize: 14, outline: 'none', color: INK, cursor: 'pointer' }}>
                      <option value="hibrido">Híbrido (Recomendado)</option>
                      <option value="facial">Facial Puro (Eventos Sociales)</option>
                      <option value="ocr">Lectura OCR (Dorsales)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', color: INK, marginBottom: 12 }}><Lock size={12} style={{display:'inline', marginRight:6}}/>Contraseña para el Cliente (Opcional)</label>
                    <input type="text" placeholder="Ej. BODA2026" value={formData.password_cliente || ''} onChange={e => setFormData({...formData, password_cliente: e.target.value})} style={{ width: '100%', padding: 16, background: CREAM, border: 'none', fontSize: 14, outline: 'none', color: INK }} />
                  </div>
                </div>

                {/* ACCIÓN */}
                <button disabled={cargando} style={{ width: '100%', padding: 24, background: INK, color: WHITE, border: 'none', cursor: 'pointer', fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, transition: 'background 0.3s' }} onMouseEnter={e => e.target.style.background = '#333'} onMouseLeave={e => e.target.style.background = INK}>
                  {cargando ? <><Loader2 size={16} className="animate-spin"/> Guardando Colección...</> : <><CheckCircle size={16}/> {eventoEditandoId ? 'Actualizar Colección' : 'Lanzar Colección'}</>}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default AdminDashboard;