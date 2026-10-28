import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { supabasePublico } from './supabaseClient';
import { urlFotoPublica } from './urlFotos';
import { urlReservas, urlPrincipal } from './marca/anfitrion';
import { normalizarPlantilla } from './marca/plantillas';

// Cada plantilla es un conjunto de colores, tipografía y distribución. Los datos del fotógrafo son los mismos en todas.
const SERIF = "var(--fl-serif, Georgia, 'Times New Roman', serif)";
const SANS = "var(--fl-sans, 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif)";

const TEMAS = {
  editorial: { fondo: '#F9F8F5', texto: '#181816', suave: '#5A5955', acento: '#B8975A', linea: '#E2DFD9', titulo: SERIF, pesoTitulo: 300, mayusTitulo: false, cols: 3, hueco: 12, ancho: 1100 },
  oscura: { fondo: '#0E0E0D', texto: '#F2F0EA', suave: '#9A968C', acento: '#D9B36B', linea: '#2A2927', titulo: SANS, pesoTitulo: 600, mayusTitulo: true, cols: 2, hueco: 6, ancho: 1240 },
  revista: { fondo: '#F4EFE6', texto: '#1B1B19', suave: '#5E5A52', acento: '#C8553D', linea: '#DCD4C5', titulo: SERIF, pesoTitulo: 400, mayusTitulo: false, cols: 2, hueco: 14, ancho: 1100 },
  minimal: { fondo: '#FFFFFF', texto: '#111111', suave: '#6B6B6B', acento: '#111111', linea: '#EAEAEA', titulo: SANS, pesoTitulo: 200, mayusTitulo: false, cols: 4, hueco: 4, ancho: 1000 },
};

const CSS = `
.fp-cols { column-gap: var(--fp-hueco); column-count: var(--fp-cols); }
.fp-cuadros { display: grid; gap: var(--fp-hueco); grid-template-columns: repeat(var(--fp-cols), 1fr); }
@media (max-width: 760px) { .fp-cols { column-count: 2; } .fp-cuadros { grid-template-columns: repeat(2, 1fr); } .fp-dos { grid-template-columns: 1fr !important; } }
.fp-foto { transition: opacity .25s ease; } .fp-foto:hover { opacity: .88; }
.fp-btn:focus-visible, .fp-foto:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { .fp-foto { transition: none; } }
`;

// Página pública de cada fotógrafo: www.flashealo.do/f/<carpeta>. Con ?plantilla=<id> se previsualiza otra plantilla sin guardarla.
export default function PaginaFotografo() {
  const { slug } = useParams();
  const [params] = useSearchParams();
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

  if (perfil === undefined) return <div style={{ minHeight: '100vh', background: '#F9F8F5' }} aria-busy="true" />;
  if (perfil === null) {
    return (
      <main style={{ minHeight: '100vh', background: '#F9F8F5', color: '#181816', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <h1 style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 32, margin: '0 0 12px' }}>No encontramos esta página</h1>
          <p style={{ color: '#5A5955', margin: '0 0 20px' }}>Revisa que el enlace esté bien escrito.</p>
          <a href={urlPrincipal(window.location.host)} style={{ color: '#181816' }}>Ir al inicio</a>
        </div>
      </main>
    );
  }

  const id = normalizarPlantilla(params.get('plantilla') || perfil.plantilla);
  const t = TEMAS[id];
  const reservar = urlReservas(window.location.host, perfil.slug);
  const whatsapp = String(perfil.whatsapp || '').replace(/\D/g, '');
  const instagram = String(perfil.instagram || '').replace(/[^A-Za-z0-9._]/g, '');
  const fotos = Array.isArray(perfil.portafolio) ? perfil.portafolio.filter((r) => typeof r === 'string' && r.trim()) : [];
  const servicios = Array.isArray(perfil.servicios) ? perfil.servicios : [];
  const abiertas = perfil.reservas_abiertas !== false;
  const portada = id === 'revista' && fotos.length > 0 ? fotos[0] : null;
  const galeria = portada ? fotos.slice(1) : fotos;

  const oscuro = id === 'oscura';
  const boton = (relleno, sobreFoto = false) => {
    const claro = '#F4EFE6';
    const borde = sobreFoto ? 'rgba(244,239,230,0.55)' : t.linea;
    return {
      display: 'inline-flex', alignItems: 'center', padding: '13px 24px', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, textDecoration: 'none',
      borderRadius: id === 'revista' ? 999 : 2, fontFamily: SANS,
      border: `1px solid ${relleno ? (sobreFoto ? claro : oscuro ? t.acento : t.texto) : borde}`,
      background: relleno ? (sobreFoto ? claro : oscuro ? t.acento : t.texto) : 'transparent',
      color: relleno ? (sobreFoto ? '#1B1B19' : oscuro ? '#0E0E0D' : t.fondo) : (sobreFoto ? claro : t.texto),
    };
  };

  const nombre = (
    <h1 style={{ fontFamily: t.titulo, fontWeight: t.pesoTitulo, textTransform: t.mayusTitulo ? 'uppercase' : 'none', letterSpacing: id === 'oscura' ? '0.03em' : id === 'minimal' ? '-0.02em' : '-0.01em',
      fontSize: id === 'revista' ? 'clamp(48px, 11vw, 132px)' : id === 'minimal' ? 'clamp(36px, 7vw, 72px)' : 'clamp(40px, 8vw, 84px)', lineHeight: 1, margin: 0 }}>{perfil.nombre}</h1>
  );

  const acciones = (centrado, sobreFoto = false) => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: centrado ? 'center' : 'flex-start', marginTop: 32 }}>
      {reservar && abiertas && <a className="fp-btn" href={reservar} style={boton(true, sobreFoto)}>Reservar una sesión</a>}
      {reservar && !abiertas && <span style={{ ...boton(false, sobreFoto), opacity: 0.75 }}>Reservas cerradas por ahora</span>}
      {whatsapp && <a className="fp-btn" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" style={boton(false, sobreFoto)}>Escribir por WhatsApp</a>}
      {instagram && <a className="fp-btn" href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer" style={{ ...boton(false, sobreFoto), opacity: 0.8 }}>@{instagram}</a>}
    </div>
  );

  const foto = (ruta, estilo = {}) => (
    <button key={ruta} type="button" className="fp-foto" onClick={() => setGrande(urlFotoPublica(ruta))} aria-label="Ver foto en grande"
      style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: t.linea, cursor: 'zoom-in', ...estilo }}>
      <img src={urlFotoPublica(ruta)} alt="" decoding="async" style={{ display: 'block', width: '100%', height: estilo.aspectRatio ? '100%' : 'auto', objectFit: 'cover', minHeight: 100 }} />
    </button>
  );

  const rejilla = () => {
    if (galeria.length === 0) return null;
    const vars = { '--fp-cols': t.cols, '--fp-hueco': `${t.hueco}px` };
    if (id === 'minimal') return <div className="fp-cuadros" style={vars}>{galeria.map((r) => foto(r, { aspectRatio: '1 / 1' }))}</div>;
    return <div className="fp-cols" style={vars}>{galeria.map((r) => foto(r, { breakInside: 'avoid', marginBottom: t.hueco }))}</div>;
  };

  const lista = () => servicios.length > 0 && (
    <section aria-label="Servicios" style={{ maxWidth: t.ancho, margin: '0 auto', padding: id === 'revista' ? '24px 24px 72px' : '0 24px 72px', textAlign: id === 'minimal' ? 'center' : 'left' }}>
      <h2 style={{ fontFamily: t.titulo, fontWeight: id === 'oscura' ? 600 : id === 'minimal' ? 300 : 400, textTransform: t.mayusTitulo ? 'uppercase' : 'none', letterSpacing: id === 'oscura' ? '0.08em' : 0, fontSize: id === 'oscura' ? 16 : 28, margin: '0 0 16px' }}>Servicios</h2>
      {id === 'revista' ? (
        <div className="fp-dos" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {servicios.map((s, i) => (
            <div key={i} style={{ background: t.fondo === '#F4EFE6' ? '#fff' : t.fondo, border: `1px solid ${t.linea}`, borderRadius: 14, padding: '22px 22px 20px' }}>
              <div style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1.2 }}>{s.nombre}</div>
              {s.detalle && <div style={{ color: t.suave, fontSize: 14, marginTop: 4 }}>{s.detalle}</div>}
              {s.precio && <div style={{ color: t.acento, fontWeight: 700, fontSize: 18, marginTop: 14 }}>{s.precio}</div>}
            </div>
          ))}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: `1px solid ${t.linea}` }}>
          {servicios.map((s, i) => (
            <li key={i} style={{ display: 'flex', justifyContent: id === 'minimal' ? 'center' : 'space-between', gap: 16, alignItems: 'baseline', padding: '18px 0', borderBottom: `1px solid ${t.linea}`, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18 }}>{s.nombre}{s.detalle ? <span style={{ color: t.suave, fontSize: 14 }}>{`, ${s.detalle}`}</span> : null}</span>
              {s.precio && <span style={{ color: t.acento, fontWeight: 600 }}>{s.precio}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <main style={{ background: t.fondo, color: t.texto, minHeight: '100vh', fontFamily: SANS }}>
      <style>{CSS}</style>

      {id === 'revista' ? (
        <header style={{ position: 'relative', minHeight: '88vh', display: 'flex', alignItems: 'flex-end', background: '#1B1B19', color: '#F4EFE6', overflow: 'hidden' }}>
          {portada && <img src={urlFotoPublica(portada)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(27,27,25,0) 25%, rgba(27,27,25,0.82) 100%)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: t.ancho, margin: '0 auto', padding: '0 24px 56px' }}>
            {nombre}
            {perfil.bio && <p style={{ maxWidth: 560, fontSize: 18, lineHeight: 1.55, margin: '20px 0 0', color: 'rgba(244,239,230,0.88)' }}>{perfil.bio}</p>}
            {acciones(false, true)}
          </div>
        </header>
      ) : id === 'minimal' ? (
        <header style={{ maxWidth: t.ancho, margin: '0 auto', padding: '88px 24px 48px', textAlign: 'center' }}>
          {nombre}
          {perfil.bio && <p style={{ maxWidth: 520, fontSize: 16, lineHeight: 1.7, color: t.suave, margin: '22px auto 0', fontWeight: 300 }}>{perfil.bio}</p>}
          {acciones(true)}
        </header>
      ) : (
        <header style={{ maxWidth: t.ancho, margin: '0 auto', padding: id === 'oscura' ? '56px 24px 32px' : '72px 24px 40px' }}>
          {nombre}
          {perfil.bio && <p style={{ maxWidth: 620, fontSize: id === 'oscura' ? 16 : 18, lineHeight: 1.6, color: t.suave, margin: '24px 0 0' }}>{perfil.bio}</p>}
          {acciones(false)}
        </header>
      )}

      {galeria.length > 0 && (
        <section aria-label="Portafolio" style={{ maxWidth: t.ancho, margin: '0 auto', padding: id === 'revista' ? '40px 24px 32px' : '0 24px 56px' }}>
          {rejilla()}
        </section>
      )}

      {lista()}

      <footer style={{ maxWidth: t.ancho, margin: '0 auto', padding: '0 24px 40px', fontSize: 12, textAlign: id === 'minimal' ? 'center' : 'left' }}>
        <Link to="/" style={{ color: t.suave }}>Página creada con Flashealo</Link>
      </footer>

      {grande && (
        <div role="dialog" aria-modal="true" aria-label="Foto en grande" onClick={() => setGrande(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(14,14,13,0.94)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, cursor: 'zoom-out' }}>
          <img src={grande} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
      )}
    </main>
  );
}
