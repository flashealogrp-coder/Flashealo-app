import React, { useEffect, useMemo } from 'react';
import { X, Download, Printer } from 'lucide-react';
import { qrComoSvg } from '../marca/qr';

const INK = '#181816';
const TAUPE = '#5A5955';
const BORDER = '#E2DFD9';

// Código QR de la galería para imprimirlo (mesa del evento, tarjeta, pantalla). Se genera aquí, sin servicios externos.
export default function QrEvento({ url, nombre, onClose }) {
  const svg = useMemo(() => { try { return qrComoSvg(url, { escala: 8 }); } catch { return null; } }, [url]);

  useEffect(() => {
    const alTecla = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', alTecla);
    return () => window.removeEventListener('keydown', alTecla);
  }, [onClose]);

  const nombreArchivo = `qr-${String(nombre || 'galeria').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'galeria'}`;

  const descargar = () => {
    if (!svg) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    a.download = `${nombreArchivo}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const imprimir = () => {
    if (!svg) return;
    const w = window.open('', '_blank', 'width=720,height=900');
    if (!w) return;
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(nombre || 'Galería')}</title><style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:Georgia,serif;color:#181816;text-align:center}svg{width:70vmin;height:70vmin}h1{font-weight:400;font-size:28px;margin:0 0 8px}p{font-size:16px;margin:16px 0 0;color:#5A5955}</style><h1>${esc(nombre || '')}</h1>${svg}<p>Escanea para ver tus fotos</p>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const boton = { padding: '10px 16px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, border: `1px solid ${INK}`, background: 'transparent', color: INK, borderRadius: 3, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 };

  return (
    <div role="dialog" aria-modal="true" aria-label="Código QR de la galería" onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(24,24,22,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#F9F8F5', border: `1px solid ${BORDER}`, borderRadius: 6, padding: 28, width: 'min(440px, 100%)', position: 'relative' }}>
        <button type="button" onClick={onClose} aria-label="Cerrar" style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: TAUPE }}><X size={18} /></button>
        <h2 style={{ fontFamily: 'var(--fl-serif)', fontSize: 24, fontWeight: 400, margin: '0 0 6px', color: INK }}>QR de la galería</h2>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: TAUPE, lineHeight: 1.5 }}>Imprímelo o ponlo en una pantalla: los invitados lo escanean y ven la galería.</p>
        {svg ? (
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, padding: 12, borderRadius: 4, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: svg.replace(/width="\d+" height="\d+"/, 'style="width:100%;height:auto"') }} />
        ) : (
          <p style={{ fontSize: 13, color: '#A3392B' }}>El enlace es demasiado largo para un QR. Acorta el enlace de la colección y vuelve a intentarlo.</p>
        )}
        <code style={{ display: 'block', fontSize: 12, color: INK, wordBreak: 'break-all', margin: '14px 0 18px' }}>{url}</code>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" style={boton} onClick={imprimir} disabled={!svg}><Printer size={13} /> Imprimir</button>
          <button type="button" style={boton} onClick={descargar} disabled={!svg}><Download size={13} /> Descargar SVG</button>
        </div>
      </div>
    </div>
  );
}
