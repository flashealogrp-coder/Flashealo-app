import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, ArrowUpRight, Calendar, Menu, X, CheckCircle2, MoveLeft, MoveRight } from 'lucide-react';
import { SiInstagram, SiWhatsapp } from '@icons-pack/react-simple-icons';
import { motion, AnimatePresence } from 'framer-motion';
import FlashealoSport from './FlashealoSport';

/* ─── DESIGN TOKENS (COLORES BASE) ──────────────────────────────────────────── */
const WHITE  = '#FFFFFF';
const TAUPE  = '#9A8F82';
const INK    = '#1C1C1C';
const SAND   = '#C8B99A';
const CREAM  = '#F9F8F6';
const FOOTINK = '#111111';

/* ─── DICCIONARIO DE TEMAS ──────────────────────────────────────────────────── */
const THEMES = {
  sesiones: {
    bg: '#FFFFFF', 
    text: '#222222',
    accent: '#9A8F82',
    navBg: 'rgba(255,255,255,0.95)',
    logoFont: 'Georgia, serif',
    logoStyle: 'normal',
    logoText: 'FLASHEALO',
    
    heroTag: 'LIFESTYLE & BODAS',
    heroTitle: 'Documentando la luz, el amor y la conexión auténtica.',
    heroImg: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2000&auto=format&fit=crop',
    
    aboutTag: 'NUESTRA VISIÓN',
    aboutTitle: 'Belleza en lo imperfecto.',
    aboutText: 'Creemos en la belleza de lo real. Nuestro enfoque es documental, cálido y sin poses forzadas. Capturamos tus recuerdos para que perduren por generaciones con una estética atemporal y sumamente elegante.',
    aboutImg1: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?q=80&w=800&auto=format&fit=crop', 
    aboutImg2: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop',
    
    galleryTitle: 'PORTAFOLIO RECIENTE',
    portfolio: [
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&h=1200',
      'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=800&h=533',
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=800&h=1000',
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&h=600',
      'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=800&h=1200',
      'https://images.unsplash.com/photo-1509927083803-4bd519298ac4?auto=format&fit=crop&w=800&h=1200'
    ],

    testimonioBg: '#F4F2EC', 
    testimonials: [
      { quote: "El talento para capturar tanto los grandes momentos como los detalles pequeños es inigualable. Tienen una forma única de hacer que cada foto se sienta personal.", name: "RACHEL + ALEX" },
      { quote: "No podríamos haber pedido un mejor equipo. Nos hicieron sentir cómodos y entendieron realmente lo que queríamos. Las fotos capturan perfectamente la alegría de nuestro día.", name: "CAROLINE + CHRISTOPHER" },
      { quote: "Desde el primer momento supimos que estábamos en buenas manos. Fotografiaron nuestra boda con muchísima autenticidad y elegancia.", name: "AARON + TABITHA" }
    ],
    
    ctaImg: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=2000&auto=format&fit=crop',
    ctaTitle: 'INMORTALICEMOS TU HISTORIA.',
    ctaText: 'Fechas limitadas disponibles para esta temporada.'
  },
  estudio: {
    bg: '#111111',
    text: '#FFFFFF',
    accent: '#888888',
    navBg: 'rgba(17,17,17,0.95)',
    logoFont: 'system-ui, -apple-system, sans-serif',
    logoStyle: 'normal',
    logoText: 'FLASHEALO ESTUDIO',
    
    heroTag: 'COMERCIAL & FASHION',
    heroTitle: 'Precisión técnica. Calidad editorial.',
    heroImg: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=2000&auto=format&fit=crop',
    
    aboutTag: 'EL ESTUDIO',
    aboutTitle: 'El arte del control.',
    aboutText: 'Un espacio diseñado para creadores y marcas. Dominamos la iluminación artificial para producir retratos corporativos, campañas de moda y fotografía de producto con los más altos estándares de la industria.',
    aboutImg1: 'https://images.unsplash.com/photo-1505682614136-0a12f9f7beea?q=80&w=800&auto=format&fit=crop',
    aboutImg2: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=800&auto=format&fit=crop',
    
    galleryTitle: 'TRABAJO RECIENTE',
    portfolio: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&h=1200',
      'https://images.unsplash.com/photo-1528243097678-739049bbf2e7?auto=format&fit=crop&w=800&h=600',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&h=1200',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&h=533',
      'https://images.unsplash.com/photo-1512413914482-ee7c3fa4a9b6?auto=format&fit=crop&w=800&h=1200'
    ],

    testimonioBg: '#1A1A1A', 
    testimonials: [
      { quote: "La precisión y el nivel de detalle que manejan en el estudio transformaron por completo la imagen de nuestros productos. Un nivel verdaderamente internacional.", name: "MARCA LOCAL" },
      { quote: "Necesitábamos retratos corporativos que transmitieran liderazgo sin verse anticuados. El resultado superó nuestras expectativas. Entendieron nuestra visión.", name: "GRUPO EMPRESARIAL" },
      { quote: "Su dominio de la iluminación es impresionante. Lograron dar a nuestra campaña exactamente la estética vanguardista y limpia que estábamos buscando.", name: "DISEÑADORA DE MODA" }
    ],
    
    ctaImg: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=2000&auto=format&fit=crop',
    ctaTitle: 'ELEVA TU MARCA.',
    ctaText: 'Reserva tu espacio en nuestro estudio comercial.'
  },
  sport: {
    bg: '#F4F4F5',
    text: '#09090B',
    accent: '#E11D48',
    navBg: '#000000',
    logoFont: '"Arial Black", Impact, sans-serif',
    logoStyle: 'normal', // Mantenemos el Flashealo normal
    logoText: 'FLASHEALO SPORT',
    titleMain: 'ACCIÓN',
    titleSub: 'AL LÍMITE.',
    desc: 'Encuentra tus fotografías. Cubrimos los eventos deportivos y maratones más exigentes con tecnología de reconocimiento facial y de dorsales impulsada por IA.',
    cardBg: '#E4E4E7'
  }
};

const FlashealoApp = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [menuAbierto, setMenuAbierto] = useState(false);
  
  const [modalReserva, setModalReserva] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [reservaExitosa, setReservaExitosa] = useState(false);
  const [formData, setFormData] = useState({ 
    nombre: '', 
    correo: '', 
    telefono: '', 
    servicio: 'Sesión Lifestyle / Pareja', 
    fecha: '', 
    mensaje: '',
    contactar_whatsapp: true
  });
  
  const [seccionActiva, setSeccionActiva] = useState('sesiones');
  const theme = THEMES[seccionActiva];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setMenuAbierto(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const abrirWhatsApp = () => {
    const numero = "18292856200";
    const mensaje = encodeURIComponent("¡Hola! Me gustaría obtener más información sobre los servicios de Flashealo.");
    window.open(`https://wa.me/${numero}?text=${mensaje}`, '_blank');
  };

  const enviarReserva = async (e) => {
    e.preventDefault();
    setEnviando(true);

    const { nombre, correo, telefono, servicio, fecha, mensaje, contactar_whatsapp } = formData;

    const { error } = await supabase
      .from('reservas')
      .insert([{ nombre, correo, telefono, servicio, fecha: fecha || null, mensaje, contactar_whatsapp }]);

    setEnviando(false);

    if (error) {
      console.error("Error de Supabase:", error);
      const numero = "18292856200";
      const msjAuxiliar = encodeURIComponent(`Hola Flashealo, solicito un presupuesto:\n\n*Nombre:* ${nombre}\n*Servicio:* ${servicio}\n*Fecha:* ${fecha || 'Por definir'}\n*Email:* ${correo}\n*Tel:* ${telefono}\n*Mensaje:* ${mensaje}`);
      window.open(`https://wa.me/${numero}?text=${msjAuxiliar}`, '_blank');
      cerrarModal();
    } else {
      setReservaExitosa(true);
    }
  };

  const generarCalendarioGoogle = () => {
    const { nombre, correo, telefono, servicio, fecha, mensaje } = formData;
    const titulo = encodeURIComponent(`Cita Flashealo: ${nombre} - ${servicio}`);
    const correoFlashealo = "info@flashealo.do";
    const detalles = encodeURIComponent(`📌 CLIENTE: ${nombre}\n📧 CORREO: ${correo}\n📞 TELÉFONO: ${telefono}\n📸 SERVICIO: ${servicio}\n\n📝 MENSAJE:\n${mensaje}`);
    
    if (fecha) {
      const dateStr = fecha.replace(/-/g, '');
      const dates = `${dateStr}/${dateStr}`; 
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&details=${detalles}&dates=${dates}&add=${correoFlashealo}`;
      window.open(url, '_blank');
    }
  };

  const cerrarModal = () => {
    setModalReserva(false);
    setTimeout(() => {
      setReservaExitosa(false);
      setFormData({ nombre: '', correo: '', telefono: '', servicio: 'Sesión Lifestyle / Pareja', fecha: '', mensaje: '', contactar_whatsapp: true });
    }, 400);
  };

  const cambiarSeccion = (id) => {
    setSeccionActiva(id);
    setMenuAbierto(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollAnim = {
    initial: { opacity: 0, y: 50 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
  };

  const isSport = seccionActiva === 'sport';
  const isNavSolid = scrolled || menuAbierto || isSport;
  const navColor = isSport ? WHITE : (isNavSolid ? theme.text : WHITE);
  const navBgColor = isSport ? '#000000' : (isNavSolid ? theme.navBg : 'transparent');

  const inputStyle = {
    width: '100%', padding: '12px 0', background: 'transparent', border: 'none', 
    borderBottom: `1px solid ${theme.text}40`, color: theme.text, fontSize: 14, outline: 'none',
    fontFamily: 'inherit'
  };

  return (
    <div style={{ background: theme.bg, color: theme.text, fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', transition: 'background-color 0.8s ease, color 0.8s ease', position: 'relative' }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 100,
        padding: isMobile ? (scrolled ? '16px 24px' : '24px 24px') : (scrolled ? '16px 48px' : '28px 48px'),
        background: navBgColor,
        backdropFilter: isNavSolid ? 'blur(16px)' : 'none',
        borderBottom: isNavSolid ? `1px solid rgba(255,255,255,0.1)` : '1px solid transparent',
        transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxSizing: 'border-box',
      }}>
        <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, position: isMobile ? 'absolute' : 'static', left: isMobile ? '50%' : 'auto', transform: isMobile ? 'translateX(-50%)' : 'none', zIndex: 101 }}>
          <span style={{ width: 3, height: 18, background: isSport ? '#E11D48' : (scrolled ? theme.accent : WHITE), display: 'inline-block', transition: 'all 0.5s ease' }} />
          
          {/* EL LOGO MAGICO CON SPORT "FAST ACTIVO" */}
          <span style={{ fontFamily: theme.logoFont, fontStyle: theme.logoStyle, fontSize: isMobile ? 13 : 14, fontWeight: isSport ? 900 : 500, letterSpacing: isSport ? '0.1em' : '0.25em', textTransform: 'uppercase', color: navColor, transition: 'color 0.4s ease', display: 'flex', alignItems: 'center', gap: 6 }}>
            {isSport ? (
              <>
                FLASHEALO 
                <span style={{ color: '#E11D48', fontStyle: 'italic', transform: 'skewX(-15deg)', display: 'inline-block', fontWeight: 900, paddingLeft: 2 }}>
                  SPORT
                </span>
              </>
            ) : (
              theme.logoText
            )}
          </span>
        </div>

        {isMobile && <div style={{ width: 24 }} />}
        
        {!isMobile && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[{ id: 'sesiones', label: 'Sesiones' }, { id: 'estudio', label: 'Estudio' }, { id: 'sport', label: 'Sport' }].map(tab => {
              const isTabActive = seccionActiva === tab.id;
              return (
                <button key={tab.id} onClick={() => cambiarSeccion(tab.id)} style={{
                  background: 'transparent', color: navColor, border: 'none', cursor: 'pointer',
                  fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', transition: 'all 0.4s ease', 
                  fontWeight: isTabActive ? 700 : 400, padding: '8px 16px', opacity: isTabActive ? 1 : 0.6,
                  borderBottom: isTabActive ? `1px solid ${navColor}` : '1px solid transparent'
                }}>
                  {tab.label}
                </button>
              )
            })}
          </div>
        )}

        {isMobile && (
          <button onClick={() => setMenuAbierto(!menuAbierto)} style={{ background: 'transparent', border: 'none', color: navColor, cursor: 'pointer', zIndex: 101, padding: 4 }}>
            {menuAbierto ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
          </button>
        )}
      </nav>

      {/* ── MENÚ DESPLEGABLE MÓVIL ── */}
      <AnimatePresence>
        {isMobile && menuAbierto && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} style={{ position: 'fixed', inset: 0, background: isSport ? '#000000' : theme.bg, zIndex: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
            {[{ id: 'sesiones', label: 'Sesiones' }, { id: 'estudio', label: 'Estudio' }, { id: 'sport', label: 'Sport' }].map(tab => (
              <button key={tab.id} onClick={() => cambiarSeccion(tab.id)} style={{ background: 'transparent', border: 'none', color: seccionActiva === tab.id ? (isSport ? '#E11D48' : theme.accent) : (isSport ? WHITE : theme.text), fontSize: 20, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'Georgia, serif', opacity: seccionActiva === tab.id ? 1 : 0.5 }}>
                {tab.label}
              </button>
            ))}
            <div style={{ width: 40, height: 1, background: theme.accent, margin: '20px 0' }} />
            <div style={{ display: 'flex', gap: 24, color: isSport ? WHITE : theme.text, opacity: 0.5 }}>
              <a href="https://www.instagram.com/flashealo.studio/?utm_source=ig_web_button_share_sheet" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}><SiInstagram size={20} /></a>
              <a href="mailto:info@flashealo.do" style={{ color: 'inherit' }}><Mail size={22} strokeWidth={1.5} /></a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL NATIVO DE RESERVA ── */}
      <AnimatePresence>
        {modalReserva && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={cerrarModal}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            />
            
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: 'relative', background: theme.bg, color: theme.text, width: '100%', maxWidth: 500, margin: 24, padding: '48px 40px', borderRadius: 2, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <button onClick={cerrarModal} style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', color: theme.text, cursor: 'pointer', opacity: 0.5, transition: 'opacity 0.2s ease' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.5}>
                <X size={24} strokeWidth={1} />
              </button>
              
              {!reservaExitosa ? (
                <>
                  <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 300, marginBottom: 8, textAlign: 'center' }}>Agendar Sesión</h2>
                  <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 32, textAlign: 'center', lineHeight: 1.5 }}>Déjanos tus datos y nos pondremos en contacto contigo para confirmar los detalles.</p>
                  
                  <form onSubmit={enviarReserva} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                      <input type="text" required placeholder="Nombre Completo" style={inputStyle} value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} disabled={enviando} />
                    </div>

                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 200px' }}>
                        <input type="email" required placeholder="Correo Electrónico" style={inputStyle} value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} disabled={enviando} />
                      </div>
                      <div style={{ flex: '1 1 150px' }}>
                        <input type="tel" required placeholder="Teléfono / WhatsApp" style={inputStyle} value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} disabled={enviando} />
                      </div>
                    </div>
                    
                    <div>
                      <select style={inputStyle} value={formData.servicio} onChange={e => setFormData({...formData, servicio: e.target.value})} disabled={enviando}>
                        <option value="Sesión Lifestyle / Pareja">Sesión Lifestyle / Pareja</option>
                        <option value="Cobertura de Boda">Cobertura de Boda / Elopement</option>
                        <option value="Sesión de Estudio / Moda">Sesión de Estudio / Moda</option>
                        <option value="Retrato Corporativo">Retrato Corporativo</option>
                        <option value="Fotografía de Producto">Fotografía de Producto</option>
                        <option value="Otro">Otro servicio</option>
                      </select>
                    </div>

                    <div>
                      <input type="date" style={{...inputStyle, color: formData.fecha ? theme.text : `${theme.text}80`}} value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} disabled={enviando} />
                      <span style={{ fontSize: 10, opacity: 0.5, marginTop: 4, display: 'block' }}>Fecha tentativa (Opcional).</span>
                    </div>

                    <div>
                      <textarea rows="2" placeholder="Cuéntanos un poco sobre tu idea..." style={{...inputStyle, resize: 'none'}} value={formData.mensaje} onChange={e => setFormData({...formData, mensaje: e.target.value})} disabled={enviando} />
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: enviando ? 'not-allowed' : 'pointer', fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                      <input 
                        type="checkbox" 
                        checked={formData.contactar_whatsapp} 
                        onChange={e => setFormData({...formData, contactar_whatsapp: e.target.checked})} 
                        disabled={enviando}
                        style={{ accentColor: theme.text, width: 16, height: 16 }}
                      />
                      <span>Prefiero que me contacten por WhatsApp 🇩🇴</span>
                    </label>

                    <button type="submit" disabled={enviando} style={{
                      background: theme.text, color: theme.bg, marginTop: 12,
                      padding: '16px 24px', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em',
                      border: 'none', cursor: enviando ? 'not-allowed' : 'pointer', transition: 'transform 0.3s ease', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, opacity: enviando ? 0.7 : 1
                    }} onMouseEnter={e => !enviando && (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={e => !enviando && (e.currentTarget.style.transform = 'translateY(0)')}>
                      {enviando ? <><Loader2 size={16} className="animate-spin" /> ENVIANDO...</> : 'ENVIAR SOLICITUD'}
                    </button>
                  </form>
                </>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: theme.accent, color: WHITE, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                    <CheckCircle2 size={32} strokeWidth={2} />
                  </div>
                  <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 300, marginBottom: 16 }}>¡Solicitud Recibida!</h2>
                  <p style={{ fontSize: 15, opacity: 0.7, marginBottom: 32, lineHeight: 1.6 }}>
                    Gracias por escribirnos, <strong>{formData.nombre.split(' ')[0]}</strong>.<br/> 
                    Hemos guardado tus datos y te contactaremos muy pronto {formData.contactar_whatsapp ? 'vía WhatsApp' : 'por correo'}.
                  </p>
                  
                  {formData.fecha && (
                    <button onClick={generarCalendarioGoogle} style={{ 
                      background: 'transparent', border: `1px solid ${theme.text}40`, color: theme.text, 
                      padding: '12px 24px', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', 
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24, transition: 'all 0.3s ease' 
                    }} onMouseEnter={e => e.currentTarget.style.background = `${theme.text}08`} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <Calendar size={14} /> AÑADIR RECORDATORIO A MI GOOGLE CALENDAR
                    </button>
                  )}
                  
                  <button onClick={cerrarModal} style={{ 
                    background: theme.text, color: theme.bg, padding: '16px 40px', fontSize: 11, fontWeight: 'bold', 
                    textTransform: 'uppercase', letterSpacing: '0.2em', border: 'none', cursor: 'pointer', display: 'block', width: '100%' 
                  }}>
                    CERRAR
                  </button>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.main 
          key={seccionActiva} 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
          style={{ minHeight: '100vh' }}
        >
          
          {/* ══════════════════════════════════════════════════════════════════
              VISTA 1: PORTAFOLIO EDITORIAL (SESIONES / ESTUDIO)
          ══════════════════════════════════════════════════════════════════ */}
          {(seccionActiva === 'sesiones' || seccionActiva === 'estudio') && (
            <div>
              {/* HERO */}
              <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <motion.img initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 1.5, ease: 'easeOut' }} src={theme.heroImg} alt="Portada" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: seccionActiva === 'estudio' ? 'contrast(1.1) grayscale(0.3)' : 'brightness(0.8)' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.4) 100%)' }} />
                
                <div style={{ position: 'relative', zIndex: 10, padding: '0 24px', maxWidth: 900 }}>
                  <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }} style={{ fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase', color: WHITE, marginBottom: 24, fontWeight: 600 }}>
                    {theme.heroTag}
                  </motion.p>
                  <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 1 }} style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 300, lineHeight: 1.1, color: WHITE, margin: 0, letterSpacing: '-0.02em' }}>
                    {theme.heroTitle}
                  </motion.h1>
                </div>
              </div>

              {/* ABOUT */}
              <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '100px 24px' : '160px 48px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '60px 8%', alignItems: 'center' }}>
                  <motion.div {...scrollAnim} style={{ flex: '1 1 400px' }}>
                    <p style={{ fontSize: 10, letterSpacing: '0.3em', color: theme.accent, textTransform: 'uppercase', fontWeight: 700, marginBottom: 20 }}>{theme.aboutTag}</p>
                    <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 32 }}>{theme.aboutTitle}</h2>
                    <p style={{ fontSize: 15, lineHeight: 1.8, opacity: 0.7, marginBottom: 40 }}>{theme.aboutText}</p>
                    <button onClick={() => setModalReserva(true)} style={{
                      background: 'transparent', color: theme.text, border: `1px solid ${theme.text}40`,
                      padding: '16px 36px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em',
                      cursor: 'pointer', transition: 'all 0.3s ease',
                    }} onMouseEnter={e => e.currentTarget.style.background = `${theme.text}08`} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      AGENDAR CITA
                    </button>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 1 }} style={{ flex: '1 1 450px', position: 'relative', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                    <div style={{ width: '55%', paddingBottom: '80%', position: 'relative', overflow: 'hidden', background: theme.accent }}>
                      <img src={theme.aboutImg1} alt="About 1" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ width: '40%', paddingBottom: '60%', position: 'relative', overflow: 'hidden', background: theme.accent, marginTop: '20%' }}>
                      <img src={theme.aboutImg2} alt="About 2" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* PORTAFOLIO */}
              <div style={{ padding: isMobile ? '80px 24px' : '80px 48px', background: CREAM, color: '#1C1C1C' }}>
                <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                  <motion.div {...scrollAnim} style={{ textAlign: 'center', marginBottom: 60 }}>
                    <h3 style={{ fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0, opacity: 0.6, fontWeight: 600 }}>{theme.galleryTitle}</h3>
                  </motion.div>
                  
                  <motion.div {...scrollAnim} className="masonry-grid" style={{ paddingBottom: 40 }}>
                    {theme.portfolio.map((img, idx) => (
                      <div key={idx} className="masonry-item">
                        <img src={img} alt={`Portfolio ${idx}`} style={{ width: '100%', display: 'block', transition: 'transform 0.8s ease' }} onMouseEnter={e => !isMobile && (e.currentTarget.style.transform = 'scale(1.03)')} onMouseLeave={e => !isMobile && (e.currentTarget.style.transform = 'scale(1)')} />
                      </div>
                    ))}
                  </motion.div>
                </div>
              </div>

              {/* ── SECCIÓN DE TESTIMONIOS ── */}
              {theme.testimonials && (
                <div style={{ padding: isMobile ? '0 24px 60px' : '0 48px 100px', background: CREAM }}>
                  <div style={{ background: theme.testimonioBg, padding: isMobile ? '36px 24px' : '56px 80px', maxWidth: 1200, margin: '0 auto', borderRadius: 2, color: theme.text }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 32 : 48 }}>
                      <span style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', opacity: 0.6, fontWeight: 600 }}>Testimonios</span>
                      {!isMobile && (
                        <div style={{ display: 'flex', gap: 16, opacity: 0.4 }}>
                          <MoveLeft size={24} strokeWidth={1} />
                          <MoveRight size={24} strokeWidth={1} />
                        </div>
                      )}
                    </div>

                    <div className="hide-scrollbar snap-container" style={{
                      display: isMobile ? 'flex' : 'grid',
                      gridTemplateColumns: isMobile ? 'none' : 'repeat(3, 1fr)',
                      gap: isMobile ? 24 : 60,
                      overflowX: isMobile ? 'auto' : 'visible',
                      paddingBottom: isMobile ? 16 : 0 
                    }}>
                      {theme.testimonials.map((testimonio, idx) => (
                        <div key={idx} className="snap-item" style={{
                          flex: isMobile ? '0 0 85%' : 'auto', 
                          display: 'flex', flexDirection: 'column', gap: 20
                        }}>
                          <p style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? 13 : 15, lineHeight: isMobile ? 1.6 : 1.8, opacity: 0.7, margin: 0, fontStyle: 'italic' }}>
                            "{testimonio.quote}"
                          </p>
                          <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600 }}>
                            {testimonio.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* CTA FINAL */}
              <div style={{ position: 'relative', width: '100%', padding: '180px 24px', textAlign: 'center', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, background: theme.text }}>
                  <img src={theme.ctaImg} alt="CTA" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
                </div>
                
                <motion.div {...scrollAnim} style={{ position: 'relative', zIndex: 10, color: theme.bg }}>
                  <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(28px, 5vw, 56px)', fontWeight: 300, marginBottom: 20 }}>{theme.ctaTitle}</h2>
                  <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 50, letterSpacing: '0.05em' }}>{theme.ctaText}</p>
                  
                  <button onClick={() => setModalReserva(true)} style={{
                    background: theme.bg, color: theme.text, padding: '18px 48px', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', border: 'none', cursor: 'pointer', transition: 'transform 0.3s ease', display: 'inline-flex', alignItems: 'center', gap: 12
                  }} onMouseEnter={e => !isMobile && (e.currentTarget.style.transform = 'translateY(-4px)')} onMouseLeave={e => !isMobile && (e.currentTarget.style.transform = 'translateY(0)')}>
                    <Calendar size={16} /> SOLICITAR PRESUPUESTO
                  </button>
                </motion.div>
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VISTA 2: PLATAFORMA TECNOLÓGICA (SPORT)
          ══════════════════════════════════════════════════════════════════ */}
          {seccionActiva === 'sport' && (
            <FlashealoSport isMobile={isMobile} />
          )}

        </motion.main>
      </AnimatePresence>

      {/* ── BOTONES FLOTANTES (FAB): OCULTOS EN SPORT ── */}
      {seccionActiva !== 'sport' && (
        <div style={{ position: 'fixed', bottom: isMobile ? 24 : 32, right: isMobile ? 24 : 32, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 10 }}>
          
          <button onClick={() => setModalReserva(true)} style={{
            width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', 
            backdropFilter: 'blur(12px)', border: `1px solid ${theme.text}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            color: theme.text, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', transition: 'all 0.3s ease'
          }} title="Agendar Cita" onMouseEnter={e => !isMobile && (e.currentTarget.style.transform = 'scale(1.08)')} onMouseLeave={e => !isMobile && (e.currentTarget.style.transform = 'scale(1)')}>
            <Calendar size={20} strokeWidth={1.5} />
          </button>

          <button onClick={abrirWhatsApp} style={{
            width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', 
            backdropFilter: 'blur(12px)', border: `1px solid ${theme.text}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            color: theme.text, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', transition: 'all 0.3s ease'
          }} title="Contactar por WhatsApp" onMouseEnter={e => !isMobile && (e.currentTarget.style.transform = 'scale(1.08)')} onMouseLeave={e => !isMobile && (e.currentTarget.style.transform = 'scale(1)')}>
            <SiWhatsapp size={22} />
          </button>
        </div>
      )}

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ background: FOOTINK, padding: isMobile ? '40px 24px' : '40px 48px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ width: 2, height: 16, background: theme.accent, display: 'inline-block', transition: 'background-color 0.5s ease' }} />
              <span style={{ fontFamily: 'Georgia, serif', fontSize: 14, letterSpacing: '0.18em', textTransform: 'uppercase', color: WHITE }}>Flashealo</span>
            </div>
            <p style={{ fontSize: 8, color: 'rgba(255, 255, 255, 0.43)', letterSpacing: '0.22em', textTransform: 'uppercase', margin: 0 }}>Estudio &amp; Sports Technology</p>
          </div>
          
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            <a href="https://www.instagram.com/flashealo.studio/?utm_source=ig_web_button_share_sheet" target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.4)', transition: 'color 0.4s ease', display: 'flex', alignItems: 'center' }} onMouseEnter={e => e.currentTarget.style.color = WHITE} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
              <SiInstagram size={18} />
            </a>
            <a href="mailto:info@flashealo.do" style={{ color: 'rgba(255,255,255,0.4)', transition: 'color 0.4s ease', display: 'flex', alignItems: 'center' }} onMouseEnter={e => e.currentTarget.style.color = WHITE} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
              <Mail size={18} strokeWidth={1.5} />
            </a>
          </div>
        </div>
      </footer>

      {/* CLASES CSS */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .snap-container { scroll-snap-type: x mandatory; }
        .snap-item { scroll-snap-align: center; }

        .masonry-grid {
          column-count: 3;
          column-gap: 24px;
        }
        .masonry-item {
          break-inside: avoid;
          margin-bottom: 24px;
          overflow: hidden;
          background: #E8E4DE;
        }

        @media (max-width: 1024px) { 
          .masonry-grid { column-count: 3; column-gap: 16px; }
          .masonry-item { margin-bottom: 16px; }
        }
        
        @media (max-width: 768px) { 
          .masonry-grid { column-count: 2; column-gap: 12px; }
          .masonry-item { margin-bottom: 12px; }
        }
      `}</style>
    </div>
  );
};

export default FlashealoApp;