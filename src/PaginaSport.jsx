import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FlashealoSport from './FlashealoSport';

// Deportes como página propia (/sport). Más adelante vivirá en sport.flashealo.do con la misma pantalla.
export default function PaginaSport() {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const alCambiar = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', alCambiar);
    return () => window.removeEventListener('resize', alCambiar);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#F4F4F5', color: '#09090B' }}>
      <div
        style={{
          background: '#000',
          color: '#fff',
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontFamily: '"Arial Black", Impact, sans-serif', letterSpacing: '0.04em' }}>
          FLASHEALO SPORT
        </Link>
        <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14 }}>
          Volver al inicio
        </Link>
      </div>
      <FlashealoSport isMobile={isMobile} />
    </div>
  );
}
