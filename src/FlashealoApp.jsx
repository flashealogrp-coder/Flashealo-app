import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
   Palette  : #FFFFFF white · #F7F5F0 warm off-white · #1C1C1C near-black
              #9A8F82 warm taupe · #C8B99A sand accent
   Type     : display → "Georgia" serif (system) · body → system-ui / -apple-system
   Signature: Full-bleed "magazine cover" event banner with a vertical rule + 
              oversized rotated category label, borrowed from editorial fashion.
   ──────────────────────────────────────────────────────────────────────────── */

const SAND   = '#C8B99A';
const TAUPE  = '#9A8F82';
const INK    = '#1C1C1C';
const FOOTINK    = '#1c1c1cef';
const CREAM  = '#F7F5F0';
const WHITE  = '#FFFFFF';

const FlashealoApp = () => {
  const navigate = useNavigate();
  const [eventosPublicos, setEventosPublicos] = useState([]);
  const [cargandoEventos, setCargandoEventos] = useState(true);
  const [scrolled, setScrolled] = useState(false);

useEffect(() => {
    const fetchEventos = async () => {
      setCargandoEventos(true);
      const { data } = await supabase
        .from('eventos')
        .select('*')
        // MAGIA AQUÍ: Solo traemos eventos donde la contraseña sea nula o esté vacía
        .or('password_cliente.is.null,password_cliente.eq.""')
        .order('fecha_evento', { ascending: false });
      
      if (data) setEventosPublicos(data);
      setCargandoEventos(false);
    };
    
    fetchEventos();
    
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const abrirEvento = (evento) => {
    // Redirige a la vista de GaleriaCliente.jsx usando el slug (o el id como respaldo)
    const ruta = evento.url_slug ? `/g/${evento.url_slug}` : `/g/${evento.id}`;
    navigate(ruta);
    window.scrollTo(0, 0);
  };

  return (
    <div style={{ background: CREAM, color: INK, fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh' }}>

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 50,
        padding: scrolled ? '16px 48px' : '28px 48px',
        background: scrolled ? 'rgba(247,245,240,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.06)' : 'none',
        transition: 'all 0.6s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxSizing: 'border-box',
      }}>
        <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 2, height: 22, background: SAND, display: 'inline-block', borderRadius: 1 }} />
          <span style={{ fontFamily: 'Georgia, serif', fontSize: 16, letterSpacing: '0.18em', textTransform: 'uppercase', color: INK, transition: 'color 0.5s ease' }}>
            Flashealo
          </span>
        </div>
        <div className="nav-links" style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
          {['Eventos', 'Nosotros', 'Contacto'].map(item => (
            <button key={item} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
              color: TAUPE,
              transition: 'color 0.4s ease', fontWeight: 500, padding: 0,
            }}
              onMouseEnter={e => e.target.style.color = INK}
              onMouseLeave={e => e.target.style.color = TAUPE}
            >{item}</button>
          ))}
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {/* ══════════════════════════════════════════════════════════════════
            VISTA ÚNICA — LANDING (PORTAFOLIO DE EVENTOS)
        ══════════════════════════════════════════════════════════════════ */}
        <motion.main key="landing"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ paddingTop: 140, paddingBottom: 120, minHeight: '100vh', maxWidth: 1280, margin: '0 auto', padding: '140px 48px 120px' }}
        >
          {/* Page header */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }} style={{ marginBottom: 80 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: TAUPE, marginBottom: 20 }}>
              Galerías Privadas
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(48px, 7vw, 88px)', fontWeight: 300, lineHeight: 1.05, letterSpacing: '-0.02em', margin: 0, color: INK }}>
                Momentos<br />
                <span style={{ color: TAUPE, fontStyle: 'italic' }}>inmortalizados.</span>
              </h1>
            </div>
            {/* Thin rule */}
            <div style={{ width: 64, height: 1, background: SAND, marginTop: 40 }} />
          </motion.div>

          {/* Events grid */}
          {cargandoEventos ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '120px 0' }}>
              <Loader2 size={36} className="animate-spin" style={{ color: SAND }} strokeWidth={1} />
            </div>
          ) : eventosPublicos.length === 0 ? (
            <p style={{ color: TAUPE, textAlign: 'center', padding: '80px 0', fontStyle: 'italic' }}>Colecciones no disponibles actualmente.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '64px 48px' }}>
              {eventosPublicos.map((evento, i) => (
                <motion.div
                  key={evento.id}
                  initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12, duration: 0.8 }}
                  onClick={() => abrirEvento(evento)}
                  style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 0 }}
                >
                  {/* Image container — 4:5 portrait ratio */}
                  <div style={{ width: '100%', paddingBottom: '125%', position: 'relative', overflow: 'hidden', background: '#E8E4DE' }}>
                    <img
                      src={evento.portada_url || 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=800&auto=format&fit=crop'}
                      alt={evento.nombre}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 1.8s cubic-bezier(0.22,1,0.36,1)', filter: 'saturate(0.88)' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    />
                    {/* Edition label */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)',
                      padding: '40px 24px 20px',
                    }}>
                      <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                        {evento.fecha_evento}
                      </span>
                      <span style={{ color: WHITE, fontFamily: 'Georgia, serif', fontSize: 22, letterSpacing: '0.04em', fontWeight: 300 }}>
                        {evento.nombre}
                      </span>
                    </div>
                  </div>

                  {/* Card footer */}
                  <div style={{ paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid rgba(0,0,0,0.08)` }}>
                    <span style={{ fontSize: 11, color: TAUPE, letterSpacing: '0.08em' }}>Ver galería</span>
                    <ArrowUpRight size={14} style={{ color: SAND }} strokeWidth={1.5} />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.main>
      </AnimatePresence>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="footer-premium" style={{ background: FOOTINK, marginTop: 0 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ width: 2, height: 16, background: SAND, display: 'inline-block', borderRadius: 1 }} />
              <span style={{ fontFamily: 'Georgia, serif', fontSize: 14, letterSpacing: '0.18em', textTransform: 'uppercase', color: WHITE }}>Flashealo</span>
            </div>
            <p style={{ fontSize: 8, color: 'rgba(255, 255, 255, 0.43)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>Tecnología &amp; Fotografía</p>
          </div>
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            <a href="#" style={{ color: 'rgba(255,255,255,0.4)', transition: 'color 0.4s ease', display: 'flex' }}
              onMouseEnter={e => e.currentTarget.style.color = WHITE} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
              </svg>
            </a>
            <a href="#" style={{ color: 'rgba(255,255,255,0.4)', transition: 'color 0.4s ease', display: 'flex' }}
              onMouseEnter={e => e.currentTarget.style.color = WHITE} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
              <Mail size={18} strokeWidth={1} />
            </a>
          </div>
        </div>
      </footer>

      <style>{`
        .footer-premium {
          padding: 12px 38px; /* Tamaño compacto para Desktop */
        }
        @media (max-width: 480px) {
          .footer-premium {
            padding: 10px 20px; /* Aún más pequeño y limpio para Móvil */
          }
        }
      `}</style>
    </div>
  );
};

export default FlashealoApp;