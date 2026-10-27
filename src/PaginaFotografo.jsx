import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabasePublico } from './supabaseClient';

const soloDigitos = (s) => String(s || '').replace(/\D/g, '');

export default function PaginaFotografo() {
  const { slug } = useParams();
  const [p, setP] = useState(undefined); // undefined = cargando, null = no existe
  const [f, setF] = useState({ nombre: '', correo: '', telefono: '', servicio: '', fecha: '', mensaje: '', whatsapp: true });
  const [estado, setEstado] = useState('formulario'); // formulario | enviando | listo
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    supabasePublico.rpc('perfil_publico', { p_slug: slug }).then(({ data }) => { if (vivo) setP(data || null); });
    return () => { vivo = false; };
  }, [slug]);

  useEffect(() => { if (p) document.title = `${p.nombre} · Reservas`; }, [p]);

  if (p === undefined) return <main style={{ minHeight: '100vh', background: 'var(--fl-lino)' }} aria-busy="true" />;
  if (p === null) return (
    <main style={{ minHeight: '100vh', background: 'var(--fl-lino)', display: 'grid', placeItems: 'center', padding: '2rem var(--fl-margen)' }}>
      <div style={{ maxWidth: '26rem' }}>
        <h1 className="fl-titulo" style={{ fontSize: '2.2rem', margin: '0 0 1rem' }}>Esta página no existe</h1>
        <p className="fl-parrafo">Revisa el enlace que te compartieron o escribe al fotógrafo directamente.</p>
        <p style={{ marginTop: '2rem' }}><Link className="fl-boton fl-boton-linea" to="/">Ir al inicio</Link></p>
      </div>
    </main>
  );

  const wa = soloDigitos(p.whatsapp);
  const cambiar = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (!f.correo.trim() && !f.telefono.trim()) { setError('Déjanos un correo o un teléfono para poder responderte.'); return; }
    setEstado('enviando');
    const { error: err } = await supabasePublico.rpc('crear_reserva', {
      p_slug: p.slug, p_nombre: f.nombre, p_correo: f.correo, p_telefono: f.telefono,
      p_servicio: f.servicio, p_fecha: f.fecha || null, p_mensaje: f.mensaje, p_whatsapp: f.whatsapp,
    });
    if (err) {
      setEstado('formulario');
      setError(/cerradas/i.test(err.message) ? 'Las reservas están cerradas por ahora.' : /demasiadas/i.test(err.message) ? 'Ya enviaste varias solicitudes. Espera un rato e inténtalo otra vez.' : 'No se pudo enviar la solicitud. Inténtalo otra vez o escribe por WhatsApp.');
      return;
    }
    setEstado('listo');
  };

  const textoWa = encodeURIComponent(`Hola ${p.nombre}, quisiera información sobre tus servicios.`);
  const seccion = { maxWidth: '44rem', margin: '0 auto', padding: '0 var(--fl-margen)' };

  return (
    <main style={{ minHeight: '100vh', background: 'var(--fl-lino)', color: 'var(--fl-texto)', paddingBottom: '5rem' }}>
      <header style={{ ...seccion, padding: '3.5rem var(--fl-margen) 2.5rem' }}>
        <h1 className="fl-titulo" style={{ fontSize: 'clamp(2.6rem, 8vw, 4.4rem)', margin: 0 }}>{p.nombre}</h1>
        {p.bio && <p className="fl-parrafo" style={{ maxWidth: '36rem', margin: '1.25rem 0 0', whiteSpace: 'pre-wrap' }}>{p.bio}</p>}
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
          {wa && <a className="fl-parrafo" style={{ color: 'var(--fl-texto)' }} href={`https://wa.me/${wa}?text=${textoWa}`} target="_blank" rel="noreferrer">WhatsApp</a>}
          {p.instagram && <a className="fl-parrafo" style={{ color: 'var(--fl-texto)' }} href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noreferrer">Instagram @{p.instagram}</a>}
        </div>
      </header>

      {p.servicios.length > 0 && (
        <section style={seccion} aria-labelledby="serv">
          <h2 id="serv" className="fl-titulo" style={{ fontSize: '1.7rem', margin: '0 0 1rem' }}>Servicios</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: '1px solid var(--fl-borde)' }}>
            {p.servicios.map((s, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid var(--fl-borde)', alignItems: 'baseline' }}>
                <span style={{ fontSize: '1.05rem' }}>{s.nombre}</span>
                <span className="fl-parrafo" style={{ textAlign: 'right' }}>{s.precio ? `Desde ${s.precio}` : ''}{s.detalle ? ` · ${s.detalle}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section style={{ ...seccion, marginTop: '3.5rem' }} aria-labelledby="reserva">
        <h2 id="reserva" className="fl-titulo" style={{ fontSize: '1.7rem', margin: '0 0 1rem' }}>Pide tu reserva</h2>
        {!p.reservas_abiertas ? (
          <p className="fl-parrafo">Por ahora no recibo solicitudes por esta página.{wa ? ' Escríbeme por WhatsApp.' : ''}</p>
        ) : estado === 'listo' ? (
          <div>
            <p className="fl-parrafo">Recibí tu solicitud. {p.nombre} te responderá pronto para confirmar los detalles.</p>
            {wa && <p style={{ marginTop: '1.25rem' }}><a className="fl-boton fl-boton-linea" href={`https://wa.me/${wa}?text=${textoWa}`} target="_blank" rel="noreferrer">Escribir por WhatsApp</a></p>}
          </div>
        ) : (
          <form onSubmit={enviar} style={{ display: 'grid', gap: '1rem' }}>
            <input className="fl-campo" required placeholder="Nombre completo" value={f.nombre} onChange={(e) => cambiar('nombre', e.target.value)} autoComplete="name" disabled={estado === 'enviando'} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <input className="fl-campo" type="email" placeholder="Correo electrónico" value={f.correo} onChange={(e) => cambiar('correo', e.target.value)} autoComplete="email" disabled={estado === 'enviando'} />
              <input className="fl-campo" type="tel" placeholder="Teléfono / WhatsApp" value={f.telefono} onChange={(e) => cambiar('telefono', e.target.value)} autoComplete="tel" disabled={estado === 'enviando'} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {p.servicios.length > 0 ? (
                <select className="fl-campo" value={f.servicio} onChange={(e) => cambiar('servicio', e.target.value)} disabled={estado === 'enviando'} aria-label="Servicio">
                  <option value="">Servicio (opcional)</option>
                  {p.servicios.map((s, i) => <option key={i} value={s.nombre}>{s.nombre}</option>)}
                </select>
              ) : (
                <input className="fl-campo" placeholder="¿Qué necesitas?" value={f.servicio} onChange={(e) => cambiar('servicio', e.target.value)} disabled={estado === 'enviando'} />
              )}
              <input className="fl-campo" type="date" aria-label="Fecha del evento" value={f.fecha} onChange={(e) => cambiar('fecha', e.target.value)} disabled={estado === 'enviando'} />
            </div>
            <textarea className="fl-campo" rows={4} placeholder="Cuéntame lo que tienes en mente" value={f.mensaje} onChange={(e) => cambiar('mensaje', e.target.value)} disabled={estado === 'enviando'} maxLength={2000} />
            <label className="fl-parrafo" style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', fontSize: '0.9rem' }}>
              <input type="checkbox" checked={f.whatsapp} onChange={(e) => cambiar('whatsapp', e.target.checked)} /> Prefiero que me respondan por WhatsApp
            </label>
            {error && <p role="alert" style={{ color: 'var(--fl-error)', fontSize: '0.9rem', margin: 0 }}>{error}</p>}
            <div><button type="submit" className="fl-boton" disabled={estado === 'enviando'}>{estado === 'enviando' ? 'Enviando…' : 'Enviar solicitud'}</button></div>
          </form>
        )}
      </section>

      <footer style={{ ...seccion, marginTop: '4rem' }}>
        <p className="fl-parrafo" style={{ fontSize: '0.8rem' }}>Página creada con <Link to="/" style={{ color: 'inherit' }}>Flashealo</Link></p>
      </footer>
    </main>
  );
}
