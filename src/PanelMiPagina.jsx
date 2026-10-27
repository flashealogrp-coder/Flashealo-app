import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Copy, ExternalLink } from 'lucide-react';
import { supabase } from './supabaseClient';

const INK = '#181816';
const TAUPE = '#5A5955';
const BORDER = '#E2DFD9';

export default function PanelMiPagina({ avisar, slug, onNombre }) {
  const [f, setF] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data, error } = await supabase.rpc('perfil_publico', { p_slug: slug });
      if (!vivo) return;
      if (error || !data) { avisar('error', 'No se pudo cargar tu página. ¿Ya aplicaste la migración 0010?'); setF({ nombre: '', bio: '', whatsapp: '', instagram: '', reservas_abiertas: true, servicios: [] }); return; }
      setF({ nombre: data.nombre || '', bio: data.bio || '', whatsapp: data.whatsapp || '', instagram: data.instagram || '', reservas_abiertas: data.reservas_abiertas !== false, servicios: data.servicios || [] });
    })();
    return () => { vivo = false; };
  }, [slug, avisar]);

  if (!f) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#5A5955]" size={28} /></div>;

  const url = `${window.location.origin}/f/${slug}`;
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setServ = (i, k, v) => setF((p) => ({ ...p, servicios: p.servicios.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));

  const guardar = async (e) => {
    e.preventDefault();
    if (f.nombre.trim().length < 2) { avisar('error', 'Escribe el nombre que verán tus clientes.'); return; }
    setGuardando(true);
    const { error } = await supabase.rpc('guardar_mi_perfil', {
      p_nombre: f.nombre,
      p_perfil: { bio: f.bio, whatsapp: f.whatsapp, instagram: f.instagram, reservas_abiertas: f.reservas_abiertas, servicios: f.servicios },
    });
    setGuardando(false);
    if (error) { avisar('error', 'No se pudo guardar tu página.'); return; }
    avisar('exito', 'Tu página está actualizada.');
    if (onNombre) onNombre(f.nombre.trim());
  };

  const copiar = async () => { try { await navigator.clipboard.writeText(url); avisar('exito', 'Enlace copiado.'); } catch { avisar('error', 'No se pudo copiar. Selecciónalo y cópialo a mano.'); } };

  const campo = { padding: '10px 12px', border: `1px solid ${BORDER}`, background: '#fff', fontSize: 14, borderRadius: 3, outline: 'none', color: INK, width: '100%', marginTop: 4 };
  const etiqueta = { fontSize: 11, color: TAUPE, display: 'block' };
  const boton = { padding: '8px 14px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, border: `1px solid ${INK}`, background: 'transparent', color: INK, borderRadius: 3, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 32px 80px' }}>
      <h1 style={{ fontFamily: 'var(--fl-serif)', fontSize: 36, fontWeight: 300, margin: 0, color: INK }}>Mi página</h1>
      <p style={{ margin: '6px 0 24px', fontSize: 13, color: TAUPE }}>Es la página pública donde tus clientes ven tus servicios y te piden una reserva.</p>

      <div style={{ border: `1px solid ${BORDER}`, background: '#fff', borderRadius: 4, padding: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
        <code style={{ fontSize: 13, color: INK, wordBreak: 'break-all', flex: 1, minWidth: 200 }}>{url}</code>
        <button type="button" style={boton} onClick={copiar}><Copy size={13} /> Copiar</button>
        <a style={{ ...boton, textDecoration: 'none' }} href={`/f/${slug}`} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Ver</a>
      </div>

      <form onSubmit={guardar} style={{ display: 'grid', gap: 18 }}>
        <label style={etiqueta}>Nombre que ven tus clientes<input style={campo} maxLength={80} value={f.nombre} onChange={(e) => set('nombre', e.target.value)} /></label>
        <label style={etiqueta}>Presentación (máx. 600 caracteres)<textarea style={{ ...campo, minHeight: 100, resize: 'vertical' }} maxLength={600} value={f.bio} onChange={(e) => set('bio', e.target.value)} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <label style={etiqueta}>WhatsApp (con código de país)<input style={campo} inputMode="tel" placeholder="18095551234" value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} /></label>
          <label style={etiqueta}>Instagram (sin @)<input style={campo} value={f.instagram} onChange={(e) => set('instagram', e.target.value)} /></label>
        </div>

        <fieldset style={{ border: `1px solid ${BORDER}`, borderRadius: 4, padding: 16, margin: 0 }}>
          <legend style={{ fontSize: 12, color: TAUPE, padding: '0 6px' }}>Servicios y precios</legend>
          <div style={{ display: 'grid', gap: 12 }}>
            {f.servicios.length === 0 && <p style={{ fontSize: 13, color: TAUPE, margin: 0 }}>Añade lo que ofreces. Si lo dejas vacío, tus clientes solo verán el formulario.</p>}
            {f.servicios.map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr) minmax(0,1.2fr) auto', gap: 8, alignItems: 'end' }}>
                <label style={etiqueta}>Servicio<input style={campo} maxLength={60} value={s.nombre || ''} onChange={(e) => setServ(i, 'nombre', e.target.value)} /></label>
                <label style={etiqueta}>Desde<input style={campo} maxLength={40} placeholder="RD$5,000" value={s.precio || ''} onChange={(e) => setServ(i, 'precio', e.target.value)} /></label>
                <label style={etiqueta}>Detalle<input style={campo} maxLength={80} placeholder="por 1 hora" value={s.detalle || ''} onChange={(e) => setServ(i, 'detalle', e.target.value)} /></label>
                <button type="button" aria-label="Quitar servicio" onClick={() => set('servicios', f.servicios.filter((_, j) => j !== i))} style={{ ...boton, padding: '10px' }}><Trash2 size={14} /></button>
              </div>
            ))}
            {f.servicios.length < 12 && <div><button type="button" style={boton} onClick={() => set('servicios', [...f.servicios, { nombre: '', precio: '', detalle: '' }])}><Plus size={13} /> Añadir servicio</button></div>}
          </div>
        </fieldset>

        <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: INK }}>
          <input type="checkbox" checked={f.reservas_abiertas} onChange={(e) => set('reservas_abiertas', e.target.checked)} />
          Recibir solicitudes de reserva
        </label>

        <div><button type="submit" disabled={guardando} style={{ ...boton, background: INK, color: '#F9F8F5', padding: '12px 24px' }}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button></div>
      </form>
    </div>
  );
}
