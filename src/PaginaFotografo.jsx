import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabasePublico } from './supabaseClient';
import { urlFotoPublica } from './urlFotos';
import { urlReservas, urlPrincipal } from './marca/anfitrion';

const INK = '#181816';
const TAUPE = '#5A5955';
const CREAM = '#F9F8F5';
const SAND = '#B8975A';
const BORDER = '#E2DFD9';

// Página pública de cada fotógrafo: www.flashealo.do/f/<carpeta>. Muestra lo que él eligió (bio, portafolio, servicios) y lleva a sus reservas.
export default function PaginaFotografo() {
  const { slug } = useParams();
  const [perfil, setPerfil] = useState(undefined); // undefined = cargando, null = no existe
  const [grande, setGrande] = useState(null);

  useEffect(() => {
    let vivo = true;
    setPerfil(undefined);
    supabasePublico.rpc('perfil_publico', { p_slug: String(slug || '') }).then(
      ({ data, error }) => { if (vivo) setPerfil(!error && data && typeof data === 'object' ? data : null); },
      () => { if (vivo) setPerfil(null); },
    );
    return () => { vivo = false; };
  }, [slug]);

  useEffect(() => {
    if (perfil && perfil.nombre) document.title = perfil.nombre;
    return () => { document.title = 'Flashealo'; };
  }, [perfil]);

  useEffect(() => {
    if (!grande) return undefined;
    const alTecla = (e) => { if (e.key === 'Escape') setGrande(null); };
    window.addEventListener('keydown', alTecla);
    return () => window.removeEventListener('keydown', alTecla);
  }, [grande]);

  if (perfil === undefined) {
    return <div style={{ minHeight: '100vh', background: CREAM }} aria-busy="true" />;
  }
  if (perfil === null) {
    return (
      <main style={{ minHeight: '100vh', background: CREAM, color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fl-serif)', fontWeight: 300, fontSize: 32, margin: '0 0 12px' }}>No encontramos esta página</h1>
          <p style={{ color: TAUPE, margin: '0 0 20px' }}>Revisa que el enlace esté bien escrito.</p>
          <a href={urlPrincipal(window.location.host)} style={{ color: INK }}>Ir al inicio</a>
        </div>
      </main>
    );
  }

  const host = window.location.host;
  const reservar = urlReservas(host, perfil.slug);
  const whatsapp = String(perfil.whatsapp || '').replace(/\D/g, '');
  const instagram = String(perfil.instagram || '').replace(/[^A-Za-z0-9._]/g, '');
  const fotos = Array.isArray(perfil.portafolio) ? perfil.portafolio.filter((r) => typeof r === 'string' && r.trim()) : [];
  const servicios = Array.isArray(perfil.servicios) ? perfil.servicios : [];
  const abiertas = perfil.reservas_abiertas !== false;

  const boton = { display: 'inline-flex', alignItems: 'center', padding: '13px 24px', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, borderRadius: 2, textDecoration: 'none', border: `1px solid ${INK}` };

  return (
    <main style={{ background: CREAM, color: INK, minHeight: '100vh' }}>
      <header style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 24px 40px' }}>
        <h1 style={{ fontFamily: 'var(--fl-serif)', fontWeight: 300, fontSize: 'clamp(40px, 8vw, 84px)', lineHeight: 1.02, margin: 0, letterSpacing: '-0.01em' }}>{perfil.nombre}</h1>
        {perfil.bio && <p style={{ maxWidth: 620, fontSize: 18, lineHeight: 1.6, color: TAUPE, margin: '24px 0 0' }}>{perfil.bio}</p>}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 32 }}>
          {reservar && abiertas && <a href={reservar} style={{ ...boton, background: INK, color: CREAM }}>Reservar una sesión</a>}
          {reservar && !abiertas && <span style={{ ...boton, borderColor: BORDER, color: TAUPE }}>Reservas cerradas por ahora</span>}
          {whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" style={{ ...boton, background: 'transparent', color: INK }}>Escribir por WhatsApp</a>}
          {instagram && <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer" style={{ ...boton, borderColor: BORDER, color: TAUPE }}>@{instagram}</a>}
        </div>
      </header>

      {fotos.length > 0 && (
        <section aria-label="Portafolio" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 56px' }}>
          <div style={{ columnGap: 12, columnCount: 3 }} className="fl-portafolio">
            {fotos.map((ruta) => (
              <button key={ruta} type="button" onClick={() => setGrande(urlFotoPublica(ruta))} aria-label="Ver foto en grande"
                style={{ display: 'block', width: '100%', padding: 0, margin: '0 0 12px', border: 'none', background: BORDER, cursor: 'zoom-in', breakInside: 'avoid' }}>
                <img src={urlFotoPublica(ruta)} alt="" decoding="async" style={{ display: 'block', width: '100%', height: 'auto', minHeight: 120 }} />
              </button>
            ))}
          </div>
        </section>
      )}

      {servicios.length > 0 && (
        <section aria-label="Servicios" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 72px' }}>
          <h2 style={{ fontFamily: 'var(--fl-serif)', fontWeight: 400, fontSize: 28, margin: '0 0 16px' }}>Servicios</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: `1px solid ${BORDER}` }}>
            {servicios.map((s, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline', padding: '18px 0', borderBottom: `1px solid ${BORDER}`, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18 }}>{s.nombre}{s.detalle ? <span style={{ color: TAUPE, fontSize: 14 }}>{`, ${s.detalle}`}</span> : null}</span>
                {s.precio && <span style={{ color: SAND, fontWeight: 600 }}>{s.precio}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 40px', fontSize: 12, color: TAUPE }}>
        <Link to="/" style={{ color: TAUPE }}>Página creada con Flashealo</Link>
      </footer>

      {grande && (
        <div role="dialog" aria-modal="true" aria-label="Foto en grande" onClick={() => setGrande(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(24,24,22,0.92)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, cursor: 'zoom-out' }}>
          <img src={grande} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
      )}
    </main>
  );
}
