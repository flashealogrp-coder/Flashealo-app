import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabasePublico } from './supabaseClient';
import { urlFotoPublica } from './urlFotos';
import { urlReservas, urlPrincipal } from './marca/anfitrion';
import { normalizarPlantilla } from './marca/plantillas';

// Cada plantilla es un conjunto de colores, tipografía y distribución. Los datos del fotógrafo son los mismos en todas.
const SERIF = "var(--fl-serif, Georgia, 'Times New Roman', serif)";
const SANS = "var(--fl-sans, 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif)";
const MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";
const PASTEL = ['#F0D2B4', '#1E7FC4', '#E8C9D6', '#CFE0C3'];

const TEMAS = {
  editorial: { fondo: '#F9F8F5', texto: '#181816', suave: '#5A5955', acento: '#B8975A', linea: '#E2DFD9', tarjeta: '#FFFFFF', titulo: SERIF, ancho: 1100 },
  revista: { fondo: '#F4EFE6', texto: '#1B1B19', suave: '#5E5A52', acento: '#C8553D', linea: '#DCD4C5', tarjeta: '#FFFFFF', titulo: SERIF, ancho: 1100 },
  mosaico: { fondo: '#FFFFFF', texto: '#111111', suave: '#6B6B6B', acento: '#111111', linea: '#E6E6E6', tarjeta: '#FFFFFF', titulo: SANS, ancho: 1240 },
  portada: { fondo: '#0F0F0F', texto: '#F5F5F2', suave: '#9C9C97', acento: '#F5F5F2', linea: '#2C2C2B', tarjeta: '#171717', titulo: SANS, ancho: 1180 },
  collage: { fondo: '#EFECE6', texto: '#111111', suave: '#55524C', acento: '#1E7FC4', linea: '#D8D3C9', tarjeta: '#FFFFFF', titulo: SANS, ancho: 1180 },
  muro: { fondo: '#FFFFFF', texto: '#1A1A1A', suave: '#7A7A7A', acento: '#1A1A1A', linea: '#EAEAEA', tarjeta: '#FFFFFF', titulo: SANS, ancho: 1240 },
};

const CSS = `
.fp-banda { display: grid; gap: var(--fp-hueco, 12px); margin-bottom: var(--fp-hueco, 12px); }
.fp-cols { column-gap: var(--fp-hueco, 16px); column-count: 4; }
.fp-cols > * { break-inside: avoid; margin-bottom: var(--fp-hueco, 16px); }
.fp-dos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.fp-esc { display: grid; grid-template-columns: repeat(2, 1fr); gap: 56px 48px; padding-bottom: 40px; }
.fp-esc > :nth-child(even) { margin-top: 72px; }
.fp-col-hero { position: relative; min-height: 780px; }
.fp-col-hero .a { position: absolute; left: 0; top: 70px; width: 21%; }
.fp-col-hero .b { position: absolute; left: 24%; top: 0; width: 30%; }
.fp-col-hero .c { position: absolute; right: 0; bottom: 0; width: 15%; }
.fp-col-hero .t { position: absolute; left: 60%; top: 60px; right: 0; z-index: 2; }
.fp-foto { transition: opacity .25s ease; } .fp-foto:hover { opacity: .88; }
.fp-btn:focus-visible, .fp-foto:focus-visible, .fp-nav a:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
.fp-nav a { text-decoration: none; color: inherit; } .fp-nav a:hover { text-decoration: underline; text-underline-offset: 5px; }
@media (max-width: 760px) {
  .fp-cols { column-count: 2; }
  .fp-dos { grid-template-columns: 1fr; }
  .fp-esc { gap: 28px 16px; } .fp-esc > :nth-child(even) { margin-top: 36px; }
  .fp-banda-3 { grid-template-columns: repeat(2, 1fr) !important; }
  .fp-banda-3 > :first-child { grid-column: span 2; aspect-ratio: 4 / 3 !important; }
  .fp-col-hero { min-height: 0; display: grid; gap: 16px; }
  .fp-col-hero .a, .fp-col-hero .b, .fp-col-hero .c, .fp-col-hero .t { position: static; width: auto; }
  .fp-col-hero .t { order: -1; }
  .fp-col-hero .a, .fp-col-hero .c { display: none; }
}
@media (prefers-reduced-motion: reduce) { .fp-foto { transition: none; } }
`;

// Reparte las fotos en filas completas: así nunca quedan huecos en la última fila.
const filas = (lista, patron) => {
  const out = [];
  let i = 0; let k = 0;
  while (i < lista.length) { const n = Math.min(patron[k % patron.length], lista.length - i); out.push(lista.slice(i, i + n)); i += n; k += 1; }
  return out;
};

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
  const conPortada = ['revista', 'mosaico', 'portada', 'collage'].includes(id);
  const elegida = typeof perfil.portada === 'string' && fotos.includes(perfil.portada) ? perfil.portada : null;
  const portada = conPortada && fotos.length > 0 ? (elegida || fotos[0]) : null;
  let galeria = portada ? fotos.filter((r) => r !== portada) : fotos;
  // El collage usa dos fotos más como acentos junto a la portada.
  const acentos = id === 'collage' ? galeria.slice(0, 2) : [];
  if (id === 'collage') galeria = galeria.slice(2);

  const url = urlFotoPublica;
  const claroSobreFoto = '#F5F5F2';
  const oscuro = id === 'portada';

  // Botones: `sobreFoto` los pinta claros para leerse encima de una imagen oscura.
  const boton = (relleno, sobreFoto = false) => {
    const base = sobreFoto ? claroSobreFoto : t.texto;
    const textoRelleno = sobreFoto ? '#111111' : t.fondo;
    return {
      display: 'inline-flex', alignItems: 'center', padding: '13px 24px', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, textDecoration: 'none', fontFamily: SANS,
      borderRadius: id === 'revista' ? 999 : id === 'collage' ? 0 : 2,
      border: `1px solid ${relleno ? base : (sobreFoto ? 'rgba(245,245,242,0.55)' : oscuro ? 'rgba(245,245,242,0.4)' : t.linea === '#E6E6E6' || t.linea === '#EAEAEA' ? '#BDBDBD' : t.linea)}`,
      background: relleno ? base : 'transparent', color: relleno ? textoRelleno : base,
    };
  };

  const acciones = (opts = {}) => {
    const { centrado = false, sobreFoto = false, pequeno = false } = opts;
    const est = (rel) => (pequeno ? { ...boton(rel, sobreFoto), padding: '9px 16px', fontSize: 11 } : boton(rel, sobreFoto));
    return (
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: centrado ? 'center' : 'flex-start', marginTop: pequeno ? 16 : 32 }}>
        {reservar && abiertas && <a className="fp-btn" href={reservar} style={est(true)}>Reservar una sesión</a>}
        {reservar && !abiertas && <span style={{ ...est(false), opacity: 0.75 }}>Reservas cerradas por ahora</span>}
        {whatsapp && <a className="fp-btn" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" style={est(false)}>Escribir por WhatsApp</a>}
        {instagram && <a className="fp-btn" href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer" style={{ ...est(false), opacity: 0.85 }}>@{instagram}</a>}
      </div>
    );
  };

  // Una foto clicable. `aspecto` recorta a una proporción fija; sin él conserva la forma original.
  const foto = (ruta, aspecto, extra = {}) => (
    <button key={ruta} type="button" className="fp-foto" onClick={() => setGrande(url(ruta))} aria-label="Ver foto en grande"
      style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: t.linea, cursor: 'zoom-in', aspectRatio: aspecto, overflow: 'hidden', ...extra }}>
      <img src={url(ruta)} alt="" decoding="async" style={{ display: 'block', width: '100%', height: aspecto ? '100%' : 'auto', objectFit: 'cover', minHeight: aspecto ? 0 : 100 }} />
    </button>
  );

  // Filas completas: `patron` dice cuántas fotos lleva cada fila y `aspectos` qué proporción tienen según el número de columnas.
  const bandas = (patron, aspectos, hueco) => (
    <div style={{ '--fp-hueco': `${hueco}px` }}>
      {filas(galeria, patron).map((fila, i) => (
        <div key={i} className={`fp-banda${fila.length === 3 ? ' fp-banda-3' : ''}`} style={{ gridTemplateColumns: `repeat(${fila.length}, 1fr)` }}>
          {fila.map((r) => foto(r, aspectos[fila.length] || aspectos[3]))}
        </div>
      ))}
    </div>
  );

  const titulo = (estilo) => <h1 style={{ margin: 0, fontFamily: t.titulo, ...estilo }}>{perfil.nombre}</h1>;
  const seccionFotos = (relleno, cuerpo) => (galeria.length > 0 ? <section id="galeria" aria-label="Portafolio" style={{ maxWidth: t.ancho, margin: '0 auto', padding: relleno }}>{cuerpo}</section> : null);

  // ── Servicios ──
  const listaServicios = () => servicios.length > 0 && (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: `1px solid ${t.linea}` }}>
      {servicios.map((s, i) => (
        <li key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline', padding: '18px 0', borderBottom: `1px solid ${t.linea}`, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 18 }}>{s.nombre}{s.detalle ? <span style={{ color: t.suave, fontSize: 14 }}>{`, ${s.detalle}`}</span> : null}</span>
          {s.precio && <span style={{ color: oscuro ? t.texto : t.acento, fontWeight: 600 }}>{s.precio}</span>}
        </li>
      ))}
    </ul>
  );
  const tarjetasServicios = (radio, sombra) => servicios.length > 0 && (
    <div className="fp-dos">
      {servicios.map((s, i) => (
        <div key={i} style={{ background: t.tarjeta, border: radio ? `1px solid ${t.linea}` : 'none', borderRadius: radio, padding: '22px 22px 20px', boxShadow: sombra ? `10px 10px 0 ${PASTEL[i % PASTEL.length]}` : 'none' }}>
          <div style={{ fontFamily: id === 'collage' ? SANS : SERIF, fontWeight: id === 'collage' ? 800 : 400, textTransform: id === 'collage' ? 'uppercase' : 'none', fontSize: id === 'collage' ? 20 : 24, lineHeight: 1.2 }}>{s.nombre}</div>
          {s.detalle && <div style={{ color: t.suave, fontSize: 14, marginTop: 4 }}>{s.detalle}</div>}
          {s.precio && <div style={{ color: id === 'collage' ? t.texto : t.acento, fontWeight: 700, fontSize: 18, marginTop: 14 }}>{s.precio}</div>}
        </div>
      ))}
    </div>
  );
  const seccionServicios = (cuerpo, estiloH2, relleno) => servicios.length > 0 && (
    <section id="servicios" aria-label="Servicios" style={{ maxWidth: t.ancho, margin: '0 auto', padding: relleno }}>
      <h2 style={{ fontFamily: t.titulo, margin: '0 0 16px', ...estiloH2 }}>Servicios</h2>
      {cuerpo}
    </section>
  );

  let contenido;

  // ── 1. EDITORIAL: crema, serifa, rejilla de 3 columnas 4:5 ──
  if (id === 'editorial') {
    contenido = (
      <>
        <header style={{ maxWidth: t.ancho, margin: '0 auto', padding: '72px 24px 40px' }}>
          {titulo({ fontWeight: 300, letterSpacing: '-0.01em', fontSize: 'clamp(40px, 8vw, 84px)', lineHeight: 1 })}
          {perfil.bio && <p style={{ maxWidth: 620, fontSize: 18, lineHeight: 1.6, color: t.suave, margin: '24px 0 0' }}>{perfil.bio}</p>}
          {acciones()}
        </header>
        {seccionFotos('0 24px 56px', bandas([3], { 1: '16 / 9', 2: '4 / 3', 3: '4 / 5' }, 12))}
        {seccionServicios(listaServicios(), { fontWeight: 400, fontSize: 28 }, '0 24px 72px')}
      </>
    );
  }

  // ── 2. REVISTA: portada a pantalla completa, rejilla 4:5, tarjetas ──
  if (id === 'revista') {
    contenido = (
      <>
        <header style={{ position: 'relative', minHeight: '88vh', display: 'flex', alignItems: 'flex-end', background: '#1B1B19', color: claroSobreFoto, overflow: 'hidden' }}>
          {portada && <img src={url(portada)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(27,27,25,0) 25%, rgba(27,27,25,0.82) 100%)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: t.ancho, margin: '0 auto', padding: '0 24px 56px' }}>
            {titulo({ fontWeight: 400, letterSpacing: '-0.01em', fontSize: 'clamp(48px, 11vw, 132px)', lineHeight: 1 })}
            {perfil.bio && <p style={{ maxWidth: 560, fontSize: 18, lineHeight: 1.55, margin: '20px 0 0', color: 'rgba(245,245,242,0.88)' }}>{perfil.bio}</p>}
            {acciones({ sobreFoto: true })}
          </div>
        </header>
        {seccionFotos('40px 24px 32px', bandas([3], { 1: '16 / 9', 2: '4 / 3', 3: '4 / 5' }, 16))}
        {seccionServicios(tarjetasServicios(14, false), { fontWeight: 400, fontSize: 28 }, '24px 24px 72px')}
      </>
    );
  }

  // ── 3. MOSAICO: banda oscura con el nombre y fotos pegadas, sin márgenes ──
  if (id === 'mosaico') {
    contenido = (
      <>
        <header style={{ position: 'relative', minHeight: 'clamp(240px, 38vh, 380px)', background: '#2B2B2B', color: claroSobreFoto, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
          {portada && <img src={url(portada)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.55)' }} />}
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'rgba(15,15,15,0.5)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: t.ancho, margin: '0 auto', padding: '32px 32px' }}>
            {titulo({ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: 'clamp(22px, 4vw, 40px)', lineHeight: 1.15 })}
            {acciones({ sobreFoto: true, pequeno: true })}
          </div>
        </header>
        {perfil.bio && <p style={{ maxWidth: 560, textAlign: 'center', fontSize: 14, lineHeight: 1.75, color: t.suave, margin: '0 auto', padding: '36px 24px' }}>{perfil.bio}</p>}
        {galeria.length > 0 && <section id="galeria" aria-label="Portafolio" style={{ maxWidth: 1400, margin: '0 auto' }}>{bandas([3], { 1: '16 / 9', 2: '1 / 1', 3: '1 / 1' }, 2)}</section>}
        {seccionServicios(listaServicios(), { fontWeight: 500, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.2em' }, '56px 24px 72px')}
      </>
    );
  }

  // ── 4. PORTADA: libro de fotografía, negro, nombre muy espaciado, fotos en bandas ──
  if (id === 'portada') {
    contenido = (
      <>
        <header style={{ maxWidth: t.ancho, margin: '0 auto', padding: '64px 24px 32px' }}>
          {titulo({ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.28em', fontSize: 'clamp(28px, 7vw, 84px)', lineHeight: 1.1, textAlign: 'center', paddingLeft: '0.28em' })}
          {portada && <div style={{ marginTop: 40 }}>{foto(portada, '16 / 10')}</div>}
          <div className="fp-dos" style={{ marginTop: 28, alignItems: 'start' }}>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: t.suave, maxWidth: 520 }}>{perfil.bio}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{acciones({ pequeno: true })}</div>
          </div>
        </header>
        {seccionFotos('24px 24px 40px', bandas([1, 2, 3], { 1: '16 / 9', 2: '4 / 3', 3: '4 / 5' }, 10))}
        {seccionServicios(listaServicios(), { fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.28em' }, '24px 24px 72px')}
      </>
    );
  }

  // ── 5. COLLAGE: colores suaves, letras enormes, fotos que se solapan y bloques de color ──
  if (id === 'collage') {
    const palabras = String(perfil.nombre || '').split(/\s+/).filter(Boolean);
    contenido = (
      <>
        <header style={{ maxWidth: t.ancho, margin: '0 auto', padding: '40px 24px 56px' }}>
          <nav className="fp-nav" aria-label="Secciones" style={{ display: 'flex', justifyContent: 'flex-end', gap: 28, fontSize: 14, marginBottom: 32 }}>
            {servicios.length > 0 && <a href="#servicios">Servicios</a>}
            {galeria.length > 0 && <a href="#galeria">Galería</a>}
            {whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">Contacto</a>}
          </nav>
          <div className="fp-col-hero">
            {acentos[0] && <div className="a" style={{ background: '#1E7FC4', padding: 0 }}>{foto(acentos[0], '1 / 1', { background: '#1E7FC4' })}</div>}
            {portada && <div className="b" style={{ boxShadow: `18px 18px 0 ${PASTEL[0]}` }}>{foto(portada, '3 / 4')}</div>}
            {acentos[1] && <div className="c" style={{ boxShadow: `-14px 14px 0 ${PASTEL[0]}` }}>{foto(acentos[1], '4 / 5')}</div>}
            <div className="t">
              <h1 style={{ margin: 0, fontFamily: SANS, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 0.95, fontSize: 'clamp(44px, 7.4vw, 104px)' }}>
                {palabras.map((p, i) => <span key={i} style={{ display: 'block' }}>{p}</span>)}
              </h1>
              {perfil.bio && <p style={{ maxWidth: 400, fontSize: 16, lineHeight: 1.6, color: t.suave, margin: '24px 0 0' }}>{perfil.bio}</p>}
              {acciones({})}
            </div>
          </div>
        </header>
        {galeria.length > 0 && (
          <section id="galeria" aria-label="Portafolio" style={{ maxWidth: t.ancho, margin: '0 auto', padding: '16px 24px 56px' }}>
            <div className="fp-esc">
              {galeria.map((r, i) => <div key={r} style={{ boxShadow: `14px 14px 0 ${PASTEL[i % PASTEL.length]}` }}>{foto(r, i % 2 === 0 ? '4 / 5' : '1 / 1')}</div>)}
            </div>
          </section>
        )}
        {seccionServicios(tarjetasServicios(0, true), { fontWeight: 800, fontSize: 32, textTransform: 'uppercase', letterSpacing: '-0.01em' }, '24px 24px 80px')}
      </>
    );
  }

  // ── 6. MURO: columnas con la forma original de cada foto y navegación en monoespaciada ──
  if (id === 'muro') {
    contenido = (
      <>
        <header style={{ maxWidth: t.ancho, margin: '0 auto', padding: '32px 24px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 24, flexWrap: 'wrap' }}>
          {titulo({ fontWeight: 300, letterSpacing: '0.03em', textTransform: 'uppercase', fontSize: 'clamp(22px, 3vw, 30px)' })}
          <nav className="fp-nav" aria-label="Secciones" style={{ display: 'flex', gap: 28, fontFamily: MONO, fontSize: 13, color: t.suave, flexWrap: 'wrap' }}>
            {galeria.length > 0 && <a href="#galeria">Galería</a>}
            {servicios.length > 0 && <a href="#servicios">Servicios</a>}
            {reservar && abiertas && <a href={reservar}>Reservar</a>}
            {whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a>}
            {instagram && <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer">@{instagram}</a>}
          </nav>
        </header>
        {perfil.bio && <p style={{ maxWidth: t.ancho, margin: '0 auto', padding: '16px 24px 0', fontSize: 15, lineHeight: 1.7, color: t.suave }}><span style={{ display: 'block', maxWidth: 560 }}>{perfil.bio}</span></p>}
        {galeria.length > 0 && (
          <section id="galeria" aria-label="Portafolio" style={{ maxWidth: t.ancho, margin: '0 auto', padding: '32px 24px 40px' }}>
            <div className="fp-cols" style={{ '--fp-hueco': '16px' }}>{galeria.map((r) => <div key={r}>{foto(r)}</div>)}</div>
          </section>
        )}
        {seccionServicios(listaServicios(), { fontFamily: MONO, fontWeight: 400, fontSize: 14 }, '16px 24px 72px')}
      </>
    );
  }

  return (
    <main style={{ background: t.fondo, color: t.texto, minHeight: '100vh', fontFamily: SANS }}>
      <style>{CSS}</style>
      {contenido}
      <div style={{ height: 40 }} />
      {grande && (
        <div role="dialog" aria-modal="true" aria-label="Foto en grande" onClick={() => setGrande(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(14,14,13,0.94)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, cursor: 'zoom-out' }}>
          <img src={grande} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
      )}
    </main>
  );
}
