import React, { useEffect, useState } from 'react';
import FlashealoSport from './FlashealoSport';
import { urlPrincipal } from './marca/anfitrion';

// Deportes como página propia (/sport). Más adelante vivirá en sport.flashealo.do con la misma pantalla.
export default function PaginaSport() {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const alCambiar = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', alCambiar);
    return () => window.removeEventListener('resize', alCambiar);
  }, []);

  const inicio = urlPrincipal(typeof window !== 'undefined' ? window.location.host : '');
  return (
    <div style={{ minHeight: '100vh', background: '#F9F8F5', color: '#181816' }}>
      <header className="fl-pildora">
        <a href={inicio} className="fl-marca" aria-label="Flashealo, inicio">
          FLASHEALO <span className="fl-etiqueta" style={{ marginLeft: 10, letterSpacing: '0.2em' }}>Sport</span>
        </a>
        <a href={inicio} className="fl-boton fl-boton-linea fl-boton-pildora">
          Inicio <span className="fl-flecha" aria-hidden="true">↗</span>
        </a>
      </header>
      <FlashealoSport isMobile={isMobile} />
    </div>
  );
}
