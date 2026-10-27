import React, { useCallback, useEffect, useState } from 'react';
import { Copy, ExternalLink, X } from 'lucide-react';
import { supabase } from './supabaseClient';
import { urlAdmin, urlFotoPublica } from './urlFotos';
import { leerTodo } from './marca/paginar';
import { urlPrincipal } from './marca/anfitrion';

const INK = '#181816';
const TAUPE = '#5A5955';
const BORDER = '#E2DFD9';
const MAX = 12;
const MINIATURA = (ruta) => urlAdmin(ruta) || urlFotoPublica(ruta);

// "Mi página": el enlace público del fotógrafo y las fotos (hasta 12) que muestra como portafolio.
export default function MiPagina({ slug, fotografoId, avisar }) {
  const [elegidas, setElegidas] = useState([]);
  const [guardadas, setGuardadas] = useState([]);
  const [colecciones, setColecciones] = useState([]);
  const [coleccion, setColeccion] = useState(null);
  const [fotos, setFotos] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const enlace = `${urlPrincipal(window.location.host).replace(/\/$/, '')}/f/${slug}`;
  const boton = { padding: '10px 16px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, border: `1px solid ${INK}`, background: 'transparent', color: INK, borderRadius: 3, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' };

  const cargar = useCallback(async () => {
    const { data: p } = await supabase.rpc('perfil_publico', { p_slug: slug });
    const lista = p && Array.isArray(p.portafolio) ? p.portafolio : [];
    setElegidas(lista); setGuardadas(lista);
    if (fotografoId) {
      const { data: evs } = await supabase.from('eventos').select('id,nombre,tiene_clave,created_at').eq('fotografo_id', fotografoId).order('created_at', { ascending: false });
      setColecciones(evs || []);
    }
  }, [slug, fotografoId]);
  useEffect(() => { cargar(); }, [cargar]);

  const abrirColeccion = async (ev) => {
    setColeccion(ev); setFotos(null);
    try {
      const filas = await leerTodo((d, h) => supabase.from('fotografias').select('url_original').eq('evento_id', ev.id).not('url_watermark', 'is', null).order('created_at', { ascending: true }).order('id', { ascending: true }).range(d, h));
      setFotos((filas || []).map((f) => f.url_original).filter(Boolean));
    } catch { setFotos([]); avisar('error', 'No se pudieron cargar las fotos de esta colección.'); }
  };

  const alternar = (ruta) => setElegidas((prev) => {
    if (prev.includes(ruta)) return prev.filter((r) => r !== ruta);
    if (prev.length >= MAX) { avisar('error', `Puedes elegir hasta ${MAX} fotos. Quita una para añadir otra.`); return prev; }
    return [...prev, ruta];
  });

  const hayCambios = JSON.stringify(elegidas) !== JSON.stringify(guardadas);
  const guardar = async () => {
    setGuardando(true);
    const { error } = await supabase.rpc('guardar_mi_portafolio', { p_rutas: elegidas });
    setGuardando(false);
    if (error) { avisar('error', /migraci|function|does not exist/i.test(error.message) ? 'No se pudo guardar. ¿Ya aplicaste la migración 0014?' : error.message); return; }
    setGuardadas(elegidas);
    avisar('exito', 'Portafolio guardado. Ya se ve en tu página.');
  };
  const copiar = async () => { try { await navigator.clipboard.writeText(enlace); avisar('exito', 'Enlace copiado.'); } catch { avisar('error', 'No se pudo copiar. Selecciónalo y cópialo a mano.'); } };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px 80px' }}>
      <h1 style={{ fontFamily: 'var(--fl-serif)', fontSize: 36, fontWeight: 300, margin: 0, color: INK }}>Mi página</h1>
      <p style={{ margin: '6px 0 28px', fontSize: 13, color: TAUPE }}>Tu tarjeta de presentación en internet: tus mejores fotos, tus servicios y un botón para reservar.</p>

      <div style={{ border: `1px solid ${BORDER}`, background: '#fff', borderRadius: 4, padding: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <code style={{ fontSize: 13, color: INK, wordBreak: 'break-all', flex: 1, minWidth: 200 }}>{enlace}</code>
        <button type="button" style={boton} onClick={copiar}><Copy size={13} /> Copiar</button>
        <a style={boton} href={enlace} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Ver</a>
      </div>
      <p style={{ fontSize: 13, color: TAUPE, margin: '0 0 32px' }}>Tu descripción, servicios, precios y WhatsApp se editan en Reservas, dentro de «Mi negocio».</p>

      <h2 style={{ fontFamily: 'var(--fl-serif)', fontSize: 22, fontWeight: 400, margin: '0 0 6px', color: INK }}>Portafolio ({elegidas.length} de {MAX})</h2>
      <p style={{ fontSize: 13, color: TAUPE, margin: '0 0 14px' }}>Elige las fotos que quieres mostrar. Solo se pueden usar fotos de colecciones sin contraseña.</p>

      {elegidas.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8, marginBottom: 16 }}>
          {elegidas.map((r) => (
            <div key={r} style={{ position: 'relative', aspectRatio: '1', background: BORDER }}>
              <img src={MINIATURA(r)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button type="button" onClick={() => alternar(r)} aria-label="Quitar del portafolio" style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(24,24,22,0.8)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={guardar} disabled={!hayCambios || guardando} style={{ ...boton, background: hayCambios ? INK : 'transparent', color: hayCambios ? '#F9F8F5' : TAUPE, borderColor: hayCambios ? INK : BORDER, cursor: hayCambios && !guardando ? 'pointer' : 'default', marginBottom: 36 }}>
        {guardando ? 'Guardando…' : 'Guardar portafolio'}
      </button>

      <h2 style={{ fontFamily: 'var(--fl-serif)', fontSize: 22, fontWeight: 400, margin: '0 0 12px', color: INK }}>Elegir fotos</h2>
      {colecciones.length === 0 ? (
        <p style={{ fontSize: 14, color: TAUPE }}>Aún no tienes colecciones. Crea una y sube fotos para armar tu portafolio.</p>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {colecciones.map((ev) => (
            <button key={ev.id} type="button" disabled={ev.tiene_clave} onClick={() => abrirColeccion(ev)} title={ev.tiene_clave ? 'Tiene contraseña: no se puede usar en el portafolio' : undefined}
              style={{ ...boton, padding: '8px 14px', letterSpacing: '0.04em', textTransform: 'none', fontWeight: coleccion && coleccion.id === ev.id ? 700 : 500, background: coleccion && coleccion.id === ev.id ? INK : 'transparent', color: coleccion && coleccion.id === ev.id ? '#F9F8F5' : (ev.tiene_clave ? TAUPE : INK), opacity: ev.tiene_clave ? 0.5 : 1, cursor: ev.tiene_clave ? 'not-allowed' : 'pointer' }}>
              {ev.nombre}{ev.tiene_clave ? ' (con contraseña)' : ''}
            </button>
          ))}
        </div>
      )}
      {coleccion && fotos === null && <p style={{ fontSize: 14, color: TAUPE }}>Cargando fotos…</p>}
      {coleccion && fotos && fotos.length === 0 && <p style={{ fontSize: 14, color: TAUPE }}>Esta colección todavía no tiene fotos listas.</p>}
      {fotos && fotos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 6 }}>
          {fotos.slice(0, 300).map((r) => {
            const marcada = elegidas.includes(r);
            return (
              <button key={r} type="button" onClick={() => alternar(r)} aria-pressed={marcada} aria-label={marcada ? 'Quitar del portafolio' : 'Añadir al portafolio'}
                style={{ position: 'relative', aspectRatio: '1', padding: 0, border: marcada ? `3px solid ${INK}` : `1px solid ${BORDER}`, background: BORDER, cursor: 'pointer' }}>
                <img src={MINIATURA(r)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: marcada ? 0.75 : 1 }} />
              </button>
            );
          })}
        </div>
      )}
      {fotos && fotos.length > 300 && <p style={{ fontSize: 12, color: TAUPE, marginTop: 10 }}>Se muestran las primeras 300 fotos de esta colección.</p>}
    </div>
  );
}
