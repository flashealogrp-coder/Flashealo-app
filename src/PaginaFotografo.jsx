import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabasePublico } from './supabaseClient';
import FlashealoApp from './FlashealoApp';

// /f/<carpeta>: la web de reservas de un fotógrafo. Es el mismo diseño de siempre, con sus datos.
export default function PaginaFotografo() {
  const { slug } = useParams();
  const [p, setP] = useState(undefined); // undefined = cargando, null = no existe

  useEffect(() => {
    let vivo = true;
    setP(undefined);
    supabasePublico.rpc('perfil_publico', { p_slug: slug }).then(({ data }) => { if (vivo) setP(data || null); });
    return () => { vivo = false; };
  }, [slug]);

  if (p === undefined) return <main style={{ minHeight: '100vh', background: '#F9F8F5' }} aria-busy="true" />;
  if (p === null) return (
    <main style={{ minHeight: '100vh', background: 'var(--fl-lino)', display: 'grid', placeItems: 'center', padding: '2rem var(--fl-margen)' }}>
      <div style={{ maxWidth: '26rem' }}>
        <h1 className="fl-titulo" style={{ fontSize: '2.2rem', margin: '0 0 1rem' }}>Esta página no existe</h1>
        <p className="fl-parrafo">Revisa el enlace que te compartieron o escribe al fotógrafo directamente.</p>
        <p style={{ marginTop: '2rem' }}><Link className="fl-boton fl-boton-linea" to="/">Ir al inicio</Link></p>
      </div>
    </main>
  );
  return <FlashealoApp fotografo={p} />;
}
