import React from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { urlReservas } from './marca/anfitrion';

const INK = '#181816';
const TAUPE = '#5A5955';
const BORDER = '#E2DFD9';

// Cada fotógrafo tiene su propio portal de reservas (mismo diseño, datos separados). Aquí está su enlace y cómo entrar a gestionarlo.
export default function PanelReservasPortal({ slug, avisar }) {
  const host = window.location.host;
  const publica = urlReservas(host, slug);
  const panel = urlReservas(host, slug, true);
  const boton = { padding: '10px 16px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, border: `1px solid ${INK}`, background: 'transparent', color: INK, borderRadius: 3, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' };
  const copiar = async () => { try { await navigator.clipboard.writeText(publica); avisar('exito', 'Enlace copiado.'); } catch { avisar('error', 'No se pudo copiar. Selecciónalo y cópialo a mano.'); } };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 32px 80px' }}>
      <h1 style={{ fontFamily: 'var(--fl-serif)', fontSize: 36, fontWeight: 300, margin: 0, color: INK }}>Reservas</h1>
      <p style={{ margin: '6px 0 28px', fontSize: 13, color: TAUPE }}>Tu portal de reservas es solo tuyo: tus clientes, tus horarios y tus pagos no se mezclan con los de nadie más.</p>

      {!publica ? (
        <p style={{ fontSize: 14, color: TAUPE }}>El portal de reservas solo está disponible en la dirección real de Flashealo.</p>
      ) : (
        <>
          <h2 style={{ fontFamily: 'var(--fl-serif)', fontSize: 22, fontWeight: 400, margin: '0 0 8px', color: INK }}>Enlace para tus clientes</h2>
          <div style={{ border: `1px solid ${BORDER}`, background: '#fff', borderRadius: 4, padding: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
            <code style={{ fontSize: 13, color: INK, wordBreak: 'break-all', flex: 1, minWidth: 200 }}>{publica}</code>
            <button type="button" style={boton} onClick={copiar}><Copy size={13} /> Copiar</button>
            <a style={boton} href={publica} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Ver</a>
          </div>

          <h2 style={{ fontFamily: 'var(--fl-serif)', fontSize: 22, fontWeight: 400, margin: '0 0 8px', color: INK }}>Gestionar mis reservas</h2>
          <p style={{ fontSize: 14, color: TAUPE, lineHeight: 1.6, margin: '0 0 16px' }}>
            Ahí apruebas solicitudes, bloqueas fechas y editas tus servicios, horarios, precios y datos de pago en «Mi negocio». Entras con el mismo correo y contraseña de tu cuenta Flashealo.
          </p>
          <a style={{ ...boton, background: INK, color: '#F9F8F5', padding: '12px 22px' }} href={panel} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Abrir mi panel de reservas</a>
        </>
      )}
    </div>
  );
}
