import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import ReviewPanel from './ReviewPanel'; 
import { Loader2, Plus, Calendar, Settings, Image as ImageIcon, Trash2, Edit3, CheckCircle, ShieldCheck, ArrowRight, Lock, MapPin, Link, UploadCloud, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── DESIGN TOKENS ─────────────────────────────────────────────────────────── */
const SAND   = '#C8B99A';
const TAUPE  = '#9A8F82';
const INK    = '#1C1C1C';
const CREAM  = '#F7F5F0';
const WHITE  = '#FFFFFF';

// Función para resolver links de imágenes
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
  
  // 🌟 NUEVO: Estado para controlar qué sección del acordeón está abierta
  const [seccionAbierta, setSeccionAbierta] = useState('datos'); // 'datos' | 'fotos'

  // 🌟 NUEVO: Estados para la subida de fotos a Cloudflare R2
  const [fileParaSubir, setFileParaSubir] = useState(null);
  const [estadoSubidaR2, setEstadoSubidaR2] = useState('');
  
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

  // Temporizador para ocultar notificaciones automáticamente
  useEffect(() => {
    if (mensaje.texto) {
      const timer = setTimeout(() => {
        setMensaje({ tipo: '', texto: '' });
      }, 4000); 
      return () => clearTimeout(timer); 
    }
  }, [mensaje]);

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
    setSeccionAbierta('datos'); // 🌟 NUEVO: Al editar, abrimos la sección de datos por defecto
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
    setSeccionAbierta('datos');
    setFormData({ nombre: '', url_slug: '', descripcion: '', fecha_evento: '', ubicacion: '', tipo_reconocimiento: 'hibrido', es_gratis: true, precio_galeria: 0, logo_url: '', portada_url: '', titulo_about: '', password_cliente: '' });
  };
  
  // 🌟 NUEVO: Lógica directa para subir fotos a Cloudflare R2 (Lo que probamos en TestUpload)
  const handleSubirFotoR2 = async () => {
    if (!fileParaSubir) return setMensaje({ tipo: 'error', texto: 'Selecciona una foto primero' });
    
    setEstadoSubidaR2('Pidiendo permiso al servidor...');
    
    try {
      // 1. Pedir URL prefirmada al API que creamos en Vercel
      const resURL = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: fileParaSubir.name, fileType: fileParaSubir.type }),
      });
      
      const data = await resURL.json();
      if (!data.url) throw new Error("Fallo al obtener el ticket de Cloudflare");

      setEstadoSubidaR2('Subiendo foto directo a Cloudflare R2...');

      // 2. Subida directa al R2
      const uploadRes = await fetch(data.url, {
        method: "PUT",
        headers: { "Content-Type": fileParaSubir.type },
        body: fileParaSubir,
      });

      if (uploadRes.ok) {
        setEstadoSubidaR2('¡Éxito! Foto subida a la nube.');
        setMensaje({ tipo: 'exito', texto: 'Foto subida correctamente a Cloudflare R2' });
        setFileParaSubir(null); // Limpiamos el input
      } else {
        throw new Error("Cloudflare rechazó la subida (Revisa el CORS en R2)");
      }
    } catch (error) {
      console.error(error);
      setEstadoSubidaR2('');
      setMensaje({ tipo: 'error', texto: error.message });
    }
  };


  if (eventoParaAuditar) {
    return <ReviewPanel key={eventoParaAuditar.id} evento={eventoParaAuditar} onVolver={() => setEventoParaAuditar(null)} />;
  }

  const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
  const accordionVariant = {
    hidden: { height: 0, opacity: 0, overflow: 'hidden' },
    visible: { height: 'auto', opacity: 1, transition: { duration: 0.4, ease: "easeInOut" } }
  };

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
        
        {/* ALERTA FLOTANTE ESTILO TOAST */}
        <div style={{ position: 'fixed', top: 96, right: 48, zIndex: 100 }}>
          <AnimatePresence>
            {mensaje.texto && (
              <motion.div 
                initial={{ opacity: 0, x: 50 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                style={{ 
                  padding: '16px 24px', 
                  background: WHITE, 
                  borderLeft: `3px solid ${mensaje.tipo === 'exito' ? SAND : '#C0392B'}`, 
                  fontSize: 13, 
                  letterSpacing: '0.04em', 
                  color: INK, 
                  boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                {mensaje.tipo === 'exito' ? <CheckCircle size={16} color={SAND} /> : <AlertTriangle size={16} color="#C0392B" />}
                {mensaje.texto}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          
          {/* TAB: LISTA DE EVENTOS */}
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

          {/* TAB: CREAR / GESTIONAR EVENTO */}
          {tabActiva === 'crear' && (
            <motion.div key="crear" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ marginBottom: 64 }}>
                <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 48, fontWeight: 300, color: INK, marginBottom: 16 }}>
                  {eventoEditandoId ? `Gestionando: ${formData.nombre}` : 'Nueva Colección'}
                </h1>
                <p style={{ color: TAUPE, fontSize: 14, letterSpacing: '0.02em' }}>
                  {eventoEditandoId ? 'Administra los datos y sube las fotografías del evento.' : 'Define los detalles estéticos y logísticos para el portal del cliente.'}
                </p>
              </div>

              <div style={{ background: WHITE, boxShadow: '0 20px 60px rgba(0,0,0,0.02)', borderRadius: 4, overflow: 'hidden' }}>
                
                {/* 🌟 NUEVO: SECCIÓN 1 - DATOS (ACORDEÓN) */}
                <div 
                  onClick={() => setSeccionAbierta(seccionAbierta === 'datos' ? '' : 'datos')}
                  style={{ padding: '24px 64px', background: seccionAbierta === 'datos' ? '#FAFAFA' : WHITE, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.3s' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Settings size={20} color={TAUPE} />
                    <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: INK, margin: 0 }}>Datos de la Colección</h2>
                  </div>
                  {seccionAbierta === 'datos' ? <ChevronUp size={20} color={TAUPE} /> : <ChevronDown size={20} color={TAUPE} />}
                </div>

                <AnimatePresence>
                  {seccionAbierta === 'datos' && (
                    <motion.div variants={accordionVariant} initial="hidden" animate="visible" exit="hidden">
                      <form onSubmit={guardarEvento} style={{ padding: 64, paddingTop: 32 }}>
                        
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
                          {cargando ? <><Loader2 size={16} className="animate-spin"/> Guardando Colección...</> : <><CheckCircle size={16}/> {eventoEditandoId ? 'Actualizar Datos' : 'Crear Colección'}</>}
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 🌟 NUEVO: SECCIÓN 2 - SUBIDA DE FOTOS (ACORDEÓN - SOLO VISIBLE AL EDITAR) */}
                {eventoEditandoId && (
                  <>
                    <div 
                      onClick={() => setSeccionAbierta(seccionAbierta === 'fotos' ? '' : 'fotos')}
                      style={{ padding: '24px 64px', background: seccionAbierta === 'fotos' ? '#FAFAFA' : WHITE, borderBottom: '1px solid rgba(0,0,0,0.06)', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.3s' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <UploadCloud size={20} color={seccionAbierta === 'fotos' ? INK : TAUPE} />
                        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: seccionAbierta === 'fotos' ? INK : TAUPE, margin: 0 }}>Centro de Carga de Fotografías</h2>
                      </div>
                      {seccionAbierta === 'fotos' ? <ChevronUp size={20} color={INK} /> : <ChevronDown size={20} color={TAUPE} />}
                    </div>

                    <AnimatePresence>
                      {seccionAbierta === 'fotos' && (
                        <motion.div variants={accordionVariant} initial="hidden" animate="visible" exit="hidden">
                          <div style={{ padding: 64, background: '#FAFAFA' }}>
                            <div style={{ maxWidth: 600, margin: '0 auto', background: WHITE, padding: 40, border: '2px dashed rgba(0,0,0,0.1)', borderRadius: 8, textAlign: 'center' }}>
                              
                              <UploadCloud size={48} color={SAND} style={{ margin: '0 auto 24px' }} />
                              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: INK, marginBottom: 8 }}>Sube fotos directo a Cloudflare R2</h3>
                              <p style={{ fontSize: 13, color: TAUPE, marginBottom: 32 }}>Sin pasar por el servidor. Transferencia 100% gratuita.</p>
                              
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => setFileParaSubir(e.target.files[0])}
                                style={{ display: 'block', margin: '0 auto 24px', color: TAUPE, fontSize: 12 }} 
                              />
                              
                              <button 
                                onClick={handleSubirFotoR2} 
                                style={{ background: SAND, color: WHITE, padding: '12px 32px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, transition: 'background 0.3s' }}
                                onMouseEnter={e => e.target.style.background = '#b8a889'} 
                                onMouseLeave={e => e.target.style.background = SAND}
                              >
                                {estadoSubidaR2.includes('Pidiendo') || estadoSubidaR2.includes('Subiendo') ? (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Loader2 size={14} className="animate-spin" /> Procesando...</span>
                                ) : 'Iniciar Subida a R2'}
                              </button>
                              
                              {estadoSubidaR2 && (
                                <p style={{ marginTop: 24, fontSize: 12, fontWeight: 600, color: estadoSubidaR2.includes('Error') ? '#C0392B' : INK }}>
                                  Estado: {estadoSubidaR2}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default AdminDashboard;