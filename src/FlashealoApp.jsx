import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, ArrowUpRight, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── DESIGN TOKENS (COLORES BASE) ──────────────────────────────────────────── */
const WHITE  = '#FFFFFF';
const TAUPE  = '#9A8F82';
const INK    = '#1C1C1C';
const SAND   = '#C8B99A';
const CREAM  = '#F9F8F6';
const FOOTINK = '#111111';

/* ─── DICCIONARIO DE TEMAS (EL CAMALEÓN EDITORIAL) ──────────────────────────── */
const THEMES = {
  sesiones: {
    bg: '#F9F8F6', 
    text: '#222222',
    accent: '#9A8F82',
    navBg: 'rgba(249,248,246,0.92)',
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
      'https://images.unsplash.com/photo-1532712938736-59b16ccb6a11?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1509927083803-4bd519298ac4?q=80&w=800&auto=format&fit=crop'
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
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1528243097678-739049bbf2e7?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop'
    ],
    
    ctaImg: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=2000&auto=format&fit=crop',
    ctaTitle: 'ELEVA TU MARCA.',
    ctaText: 'Reserva tu espacio en nuestro estudio comercial.'
  },
  sport: {
    bg: '#F4F4F5',
    text: '#09090B',
    accent: '#E11D48',
    navBg: 'rgba(244,244,245,0.95)',
    logoFont: '"Arial Black", Impact, sans-serif',
    logoStyle: 'italic',
    logoText: 'FLASHEALO SPORT',
    titleMain: 'ACCIÓN',
    titleSub: 'AL LÍMITE.',
    desc: 'Encuentra tus fotografías. Cubrimos los eventos deportivos y maratones más exigentes con tecnología de reconocimiento facial y de dorsales impulsada por IA.',
    cardBg: '#E4E4E7'
  }
};

const FlashealoApp = () => {
  const navigate = useNavigate();
  const [eventosSport, setEventosSport] = useState([]);
  const [cargandoEventos, setCargandoEventos] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  const [seccionActiva, setSeccionActiva] = useState('sesiones');
  const theme = THEMES[seccionActiva];

  useEffect(() => {
    if (seccionActiva !== 'sport') return;
    const fetchEventosSport = async () => {
      setCargandoEventos(true);
      const { data } = await supabase
        .from('eventos')
        .select('*')
        .eq('categoria', 'sport')
        .or('password_cliente.is.null,password_cliente.eq.""')
        .order('fecha_evento', { ascending: false });
      if (data) setEventosSport(data);
      setCargandoEventos(false);
    };
    fetchEventosSport();
  }, [seccionActiva]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const abrirEvento = (evento) => {
    const ruta = evento.url_slug ? `/g/${evento.url_slug}` : `/g/${evento.id}`;
    navigate(ruta);
    window.scrollTo(0, 0);
  };

  const agendarCita = () => {
    window.open('https://calendly.com/', '_blank');
  };

  const abrirWhatsApp = () => {
    const numero = "18292856200";
    const mensaje = encodeURIComponent("¡Hola! Me gustaría obtener más información sobre los servicios de Flashealo.");
    window.open(`https://wa.me/${numero}?text=${mensaje}`, '_blank');
  };

  // Configuración base de animaciones de Scroll
  const scrollAnim = {
    initial: { opacity: 0, y: 50 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
  };

  return (
    <div style={{ background: theme.bg, color: theme.text, fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', transition: 'background-color 0.8s ease, color 0.8s ease', position: 'relative' }}>

      {/* ── NAVBAR (Dinámico y con Blur) ── */}
      <nav style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 50,
        padding: scrolled ? '16px 48px' : '28px 48px',
        background: scrolled ? theme.navBg : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? `1px solid ${theme.text}11` : '1px solid transparent',
        transition: 'all 0.6s cubic-bezier(0.22,1,0.36,1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxSizing: 'border-box',
      }}>
        {/* LOGO */}
        <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 3, height: 18, background: (scrolled || seccionActiva === 'sport') ? theme.accent : WHITE, display: 'inline-block', transition: 'all 0.5s ease' }} />
          <span style={{ 
            fontFamily: theme.logoFont, fontStyle: theme.logoStyle,
            fontSize: seccionActiva === 'sesiones' ? 14 : 14, 
            fontWeight: seccionActiva === 'sport' ? 900 : 600,
            letterSpacing: seccionActiva === 'sesiones' ? '0.25em' : '0.1em', 
            textTransform: 'uppercase', 
            color: (scrolled || seccionActiva === 'sport') ? theme.text : WHITE, 
            transition: 'all 0.5s ease' 
          }}>
            {theme.logoText}
          </span>
        </div>
        
        {/* PESTAÑAS (TABS) */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', background: (scrolled || seccionActiva === 'sport') ? 'rgba(128,128,128,0.1)' : 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '4px', backdropFilter: 'blur(10px)', transition: 'all 0.5s ease' }}>
          {[
            { id: 'sesiones', label: 'Sesiones' },
            { id: 'estudio', label: 'Estudio' },
            { id: 'sport', label: 'Sport' }
          ].map(tab => {
            const isTabActive = seccionActiva === tab.id;
            return (
              <button key={tab.id} onClick={() => setSeccionActiva(tab.id)} style={{
                background: 'transparent',
                color: (scrolled || seccionActiva === 'sport') ? theme.text : WHITE,
                border: 'none', cursor: 'pointer',
                fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
                transition: 'all 0.4s ease', fontWeight: isTabActive ? 700 : 400, 
                padding: '8px 16px',
                opacity: isTabActive ? 1 : 0.6,
                borderBottom: isTabActive ? `1px solid ${(scrolled || seccionActiva === 'sport') ? theme.text : WHITE}` : '1px solid transparent'
              }}>
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>

      <AnimatePresence mode="wait">
        <motion.main 
          key={seccionActiva} 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
          style={{ minHeight: '100vh' }}
        >
          
          {/* ══════════════════════════════════════════════════════════════════
              VISTA 1: PORTAFOLIO EDITORIAL (SESIONES / ESTUDIO) - TIPO MORGAN
          ══════════════════════════════════════════════════════════════════ */}
          {(seccionActiva === 'sesiones' || seccionActiva === 'estudio') && (
            <div>
              
              {/* ── 1. HERO A PANTALLA COMPLETA ── */}
              <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <motion.img 
                  initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 1.5, ease: 'easeOut' }}
                  src={theme.heroImg} alt="Portada" 
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: seccionActiva === 'estudio' ? 'contrast(1.1) grayscale(0.3)' : 'brightness(0.8)' }} 
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.4) 100%)' }} />
                
                <div style={{ position: 'relative', zIndex: 10, padding: '0 24px', maxWidth: 900 }}>
                  <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }} style={{ fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase', color: WHITE, marginBottom: 24, fontWeight: 600 }}>
                    {theme.heroTag}
                  </motion.p>
                  <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 1 }} style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 300, lineHeight: 1.1, color: WHITE, margin: 0, letterSpacing: '-0.02em' }}>
                    {theme.heroTitle}
                  </motion.h1>
                </div>
              </div>

              {/* ── 2. SECCIÓN ABOUT (Imágenes intercaladas) ── */}
              <div style={{ maxWidth: 1200, margin: '0 auto', padding: '160px 48px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '60px 8%', alignItems: 'center' }}>
                  <motion.div {...scrollAnim} style={{ flex: '1 1 400px' }}>
                    <p style={{ fontSize: 10, letterSpacing: '0.3em', color: theme.accent, textTransform: 'uppercase', fontWeight: 700, marginBottom: 20 }}>{theme.aboutTag}</p>
                    <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 32 }}>
                      {theme.aboutTitle}
                    </h2>
                    <p style={{ fontSize: 15, lineHeight: 1.8, opacity: 0.7, marginBottom: 40 }}>
                      {theme.aboutText}
                    </p>
                    <button onClick={agendarCita} style={{
                      background: 'transparent', color: theme.text, border: `1px solid ${theme.text}40`,
                      padding: '16px 36px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em',
                      cursor: 'pointer', transition: 'all 0.3s ease',
                    }} onMouseEnter={e => e.currentTarget.style.background = `${theme.text}08`} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      CONOCER MÁS
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

              {/* ── 3. PORTAFOLIO (Galería Masonry CSS) ── */}
              <div style={{ padding: '80px 48px', background: CREAM, color: '#1C1C1C' }}>
                <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                  <motion.div {...scrollAnim} style={{ textAlign: 'center', marginBottom: 60 }}>
                    <h3 style={{ fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0, opacity: 0.6, fontWeight: 600 }}>
                      {theme.galleryTitle}
                    </h3>
                  </motion.div>
                  
                  <motion.div {...scrollAnim} style={{ columnCount: 3, columnGap: '24px', paddingBottom: 40 }} className="masonry-grid">
                    {theme.portfolio.map((img, idx) => (
                      <div key={idx} style={{ breakInside: 'avoid', marginBottom: '24px', overflow: 'hidden', background: '#E8E4DE', cursor: 'zoom-in' }}>
                        <img 
                          src={img} 
                          alt={`Portfolio ${idx}`} 
                          style={{ width: '100%', display: 'block', transition: 'transform 0.8s ease' }} 
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'} 
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} 
                        />
                      </div>
                    ))}
                  </motion.div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <button style={{
                      background: 'transparent', color: '#1C1C1C', border: `1px solid #1C1C1C40`,
                      padding: '16px 36px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em', cursor: 'pointer'
                    }}>
                      VER GALERÍAS COMPLETAS
                    </button>
                  </div>
                </div>
              </div>

              {/* ── 4. CALL TO ACTION FINAL ── */}
              <div style={{ position: 'relative', width: '100%', padding: '180px 24px', textAlign: 'center', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, background: theme.text }}>
                  <img src={theme.ctaImg} alt="CTA" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
                </div>
                
                <motion.div {...scrollAnim} style={{ position: 'relative', zIndex: 10, color: theme.bg }}>
                  <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 300, marginBottom: 20 }}>{theme.ctaTitle}</h2>
                  <p style={{ fontSize: 15, opacity: 0.8, marginBottom: 50, letterSpacing: '0.05em' }}>{theme.ctaText}</p>
                  
                  <button onClick={agendarCita} style={{
                    background: theme.bg, color: theme.text,
                    padding: '18px 48px', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em',
                    border: 'none', cursor: 'pointer', transition: 'transform 0.3s ease', display: 'inline-flex', alignItems: 'center', gap: 12
                  }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
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
            <div style={{ paddingTop: 160, paddingLeft: 48, paddingRight: 48, paddingBottom: 120, maxWidth: 1400, margin: '0 auto' }}>
              
              <motion.div {...scrollAnim} style={{ marginBottom: 80, maxWidth: 800 }}>
                <p style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: theme.accent, marginBottom: 20, fontWeight: 'bold' }}>
                  GALERÍAS PÚBLICAS
                </p>
                <h1 style={{ fontFamily: theme.logoFont, fontStyle: 'italic', fontSize: 'clamp(48px, 7vw, 88px)', fontWeight: 900, lineHeight: 1.05, margin: '0 0 24px 0', color: theme.text, textTransform: 'uppercase' }}>
                  {theme.titleMain}<br />
                  <span style={{ color: theme.accent }}>{theme.titleSub}</span>
                </h1>
                <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.8, maxWidth: 600 }}>{theme.desc}</p>
              </motion.div>

              {cargandoEventos ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '120px 0' }}>
                  <Loader2 size={36} className="animate-spin" style={{ color: theme.accent }} strokeWidth={1} />
                </div>
              ) : eventosSport.length === 0 ? (
                <motion.div {...scrollAnim} style={{ border: `1px dashed ${theme.text}40`, padding: '80px 20px', textAlign: 'center' }}>
                  <p style={{ color: theme.text, opacity: 0.6, fontStyle: 'italic', margin: 0 }}>No hay eventos deportivos disponibles actualmente.</p>
                </motion.div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '64px 48px' }}>
                  {eventosSport.map((evento, i) => (
                    <motion.div
                      key={evento.id}
                      initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, delay: (i % 3) * 0.1 }}
                      onClick={() => abrirEvento(evento)}
                      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 0 }}
                    >
                      <div style={{ width: '100%', paddingBottom: '125%', position: 'relative', overflow: 'hidden', background: theme.cardBg }}>
                        <img
                          src={evento.portada_url || 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=800&auto=format&fit=crop'}
                          alt={evento.nombre}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 1.8s cubic-bezier(0.22,1,0.36,1)', filter: 'saturate(0.95)' }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)', padding: '40px 24px 20px' }}>
                          <span style={{ color: theme.accent, fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 'bold' }}>{evento.fecha_evento}</span>
                          <span style={{ color: WHITE, fontFamily: theme.logoFont, fontStyle: 'italic', fontSize: 24, letterSpacing: '0.02em', fontWeight: 900 }}>{evento.nombre}</span>
                        </div>
                      </div>
                      <div style={{ paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${theme.text}22` }}>
                        <span style={{ fontSize: 10, color: theme.text, opacity: 0.7, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>Entrar a la galería</span>
                        <ArrowUpRight size={16} style={{ color: theme.accent }} strokeWidth={2} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

        </motion.main>
      </AnimatePresence>

      {/* ── BOTONES FLOTANTES (FAB) ── */}
      <div style={{ position: 'fixed', bottom: 32, right: 32, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 100 }}>
        
        {/* FAB: Calendario */}
        <button onClick={agendarCita} style={{
          width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', 
          backdropFilter: 'blur(12px)', border: `1px solid ${theme.text}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          color: theme.text, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', transition: 'all 0.3s ease'
        }} title="Agendar Cita" onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          <Calendar size={20} strokeWidth={1.5} />
        </button>

        {/* FAB: WhatsApp (SVG crudo para evitar fallos de librería) */}
        <button onClick={abrirWhatsApp} style={{
          width: 50, height: 50, borderRadius: '50%', background: theme.text, 
          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          color: theme.bg, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', transition: 'all 0.3s ease'
        }} title="Contactar por WhatsApp" onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        </button>
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ background: FOOTINK, padding: '40px 48px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ width: 2, height: 16, background: theme.accent, display: 'inline-block', transition: 'background-color 0.5s ease' }} />
              <span style={{ fontFamily: 'Georgia, serif', fontSize: 14, letterSpacing: '0.18em', textTransform: 'uppercase', color: WHITE }}>Flashealo</span>
            </div>
            <p style={{ fontSize: 8, color: 'rgba(255, 255, 255, 0.43)', letterSpacing: '0.22em', textTransform: 'uppercase', margin: 0 }}>Estudio &amp; Sports Technology</p>
          </div>
          
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            {/* SVG crudo de Instagram */}
            <a href="https://www.instagram.com/flashealo.studio/?utm_source=ig_web_button_share_sheet" target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.4)', transition: 'color 0.4s ease' }} onMouseEnter={e => e.currentTarget.style.color = WHITE} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            <a href="mailto:info@flashealo.do" style={{ color: 'rgba(255,255,255,0.4)', transition: 'color 0.4s ease' }} onMouseEnter={e => e.currentTarget.style.color = WHITE} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
              <Mail size={18} strokeWidth={1.5} />
            </a>
          </div>
        </div>
      </footer>

      {/* Reglas CSS para el estilo Masonry responsivo */}
      <style>{`
        .masonry-grid {
          column-count: 3;
        }
        @media (max-width: 1024px) {
          .masonry-grid { column-count: 2; }
        }
        @media (max-width: 640px) {
          .masonry-grid { column-count: 1; }
        }
      `}</style>
    </div>
  );
};

export default FlashealoApp;