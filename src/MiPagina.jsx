import React, { useCallback, useEffect, useState } from 'react';
import { Copy, ExternalLink, X, Sparkles, Plus, Trash2, Star } from 'lucide-react';
import { supabase } from './supabaseClient';
import { urlAdmin, urlFotoPublica } from './urlFotos';
import { leerTodo } from './marca/paginar';
import { urlPrincipal } from './marca/anfitrion';
import { PLANTILLAS, normalizarPlantilla } from './marca/plantillas';

const INK = '#181816';
const TAUPE = '#5A5955';
const BORDER = '#E2DFD9';
const SAND = '#B8975A';
const MAX = 12;
const MINIATURA = (ruta) => urlAdmin(ruta) || urlFotoPublica(ruta);

const h2 = { fontFamily: 'var(--fl-serif)', fontSize: 22, fontWeight: 400, margin: '0 0 6px', color: INK };
const ayuda = { fontSize: 13, color: TAUPE, margin: '0 0 14px', lineHeight: 1.5 };
const boton = { padding: '10px 16px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, border: `1px solid ${INK}`, background: 'transparent', color: INK, borderRadius: 3, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' };
const botonRelleno = { ...boton, background: INK, color: '#F9F8F5' };
const campo = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 14, border: `1px solid ${BORDER}`, borderRadius: 3, background: '#fff', color: INK, fontFamily: 'inherit' };
const etiqueta = { display: 'block', fontSize: 12, color: TAUPE, margin: '0 0 4px' };
const seccion = { marginBottom: 44 };

// Llama a la IA del servidor con la sesión del fotógrafo.
async function llamarIA(cuerpo) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Tu sesión terminó. Vuelve a entrar.');
  const r = await fetch('/api/pagina-ia', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  let j = {};
  try { j = await r.json(); } catch { /* sin cuerpo */ }
  if (!r.ok) throw new Error(j.error || 'No se pudo completar la acción de IA.');
  return j;
}

// "Mi página": enlace público, plantilla, datos (descripción, servicios, contacto) y portafolio de fotos.
export default function MiPagina({ slug, fotografoId, avisar }) {
  const [plantilla, setPlantilla] = useState('editorial');
  const [recomendada, setRecomendada] = useState(null); // { id, motivo }
  const [datos, setDatos] = useState({ nombre: '', bio: '', whatsapp: '', instagram: '', reservas_abiertas: true, servicios: [] });
  const [datosGuardados, setDatosGuardados] = useState(null);
  const [elegidas, setElegidas] = useState([]);
  const [guardadas, setGuardadas] = useState([]);
  const [portada, setPortada] = useState('');
  const [portadaGuardada, setPortadaGuardada] = useState('');
  const [colecciones, setColecciones] = useState([]);
  const [coleccion, setColeccion] = useState(null);
  const [fotos, setFotos] = useState(null);
  const [ocupado, setOcupado] = useState('');
  const [infoIA, setInfoIA] = useState('');
  const [formIA, setFormIA] = useState({ ciudad: '', estilo: '', tipos: '', experiencia: '', tono: 'cercano' });
  const [abrirBio, setAbrirBio] = useState(false);

  const enlace = `${urlPrincipal(window.location.host).replace(/\/$/, '')}/f/${slug}`;

  const cargar = useCallback(async () => {
    const { data: p } = await supabase.rpc('perfil_publico', { p_slug: slug });
    if (p) {
      const d = { nombre: p.nombre || '', bio: p.bio || '', whatsapp: p.whatsapp || '', instagram: p.instagram || '', reservas_abiertas: p.reservas_abiertas !== false, servicios: Array.isArray(p.servicios) ? p.servicios : [] };
      setDatos(d); setDatosGuardados(JSON.stringify(d));
      setPlantilla(normalizarPlantilla(p.plantilla));
      const lista = Array.isArray(p.portafolio) ? p.portafolio : [];
      setElegidas(lista); setGuardadas(lista);
      const pt = typeof p.portada === 'string' ? p.portada : '';
      setPortada(pt); setPortadaGuardada(pt);
    }
    if (fotografoId) {
      const { data: evs } = await supabase.from('eventos').select('id,nombre,tiene_clave,created_at').eq('fotografo_id', fotografoId).order('created_at', { ascending: false });
      setColecciones(evs || []);
    }
  }, [slug, fotografoId]);
  useEffect(() => { cargar(); }, [cargar]);

  const copiar = async () => { try { await navigator.clipboard.writeText(enlace); avisar('exito', 'Enlace copiado.'); } catch { avisar('error', 'No se pudo copiar. Selecciónalo y cópialo a mano.'); } };
  const errorBD = (error) => (/migraci|function|does not exist|schema cache/i.test(error.message) ? 'No se pudo guardar. ¿Ya aplicaste las migraciones 0014 y 0015?' : error.message);

  // ── Plantilla ──
  const usarPlantilla = async (id) => {
    setOcupado('plantilla');
    const { error } = await supabase.rpc('guardar_mi_plantilla', { p_plantilla: id });
    setOcupado('');
    if (error) { avisar('error', errorBD(error)); return; }
    setPlantilla(id);
    avisar('exito', 'Plantilla cambiada. Ya se ve en tu página.');
  };
  const recomendarConIA = async () => {
    setOcupado('recomendar');
    try { const r = await llamarIA({ accion: 'plantilla', rutas: elegidas }); setRecomendada(r.plantilla); }
    catch (e) { avisar('error', e.message); }
    setOcupado('');
  };

  // ── Datos de la página ──
  const cambiaDatos = JSON.stringify(datos) !== datosGuardados;
  const poner = (k, v) => setDatos((d) => ({ ...d, [k]: v }));
  const ponerServicio = (i, k, v) => setDatos((d) => ({ ...d, servicios: d.servicios.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));
  const guardarDatos = async () => {
    setOcupado('datos');
    const { error } = await supabase.rpc('guardar_mi_perfil', { p_nombre: datos.nombre, p_perfil: { bio: datos.bio, whatsapp: datos.whatsapp, instagram: datos.instagram, reservas_abiertas: datos.reservas_abiertas, servicios: datos.servicios } });
    setOcupado('');
    if (error) { avisar('error', errorBD(error)); return; }
    await cargar();
    avisar('exito', 'Datos guardados. Ya se ven en tu página.');
  };
  const redactarConIA = async () => {
    setOcupado('bio'); setInfoIA('');
    try {
      const r = await llamarIA({ accion: 'bio', nombre: datos.nombre, ciudad: formIA.ciudad, estilo: formIA.estilo, experiencia: formIA.experiencia, tono: formIA.tono, tipos: formIA.tipos.split(',').map((t) => t.trim()).filter(Boolean) });
      setDatos((d) => {
        const nombres = new Set(d.servicios.map((s) => String(s.nombre || '').trim().toLowerCase()));
        const nuevos = (r.servicios || []).filter((s) => !nombres.has(String(s.nombre).toLowerCase())).map((s) => ({ nombre: s.nombre, detalle: s.detalle, precio: '' }));
        return { ...d, bio: r.bio, servicios: [...d.servicios, ...nuevos].slice(0, 12) };
      });
      setInfoIA('Listo: revisa el texto, ponles precio a los servicios nuevos y pulsa «Guardar datos».');
      setAbrirBio(false);
    } catch (e) { avisar('error', e.message); }
    setOcupado('');
  };

  // ── Portafolio ──
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
  const portadaEfectiva = elegidas.includes(portada) ? portada : '';
  const hayCambios = JSON.stringify(elegidas) !== JSON.stringify(guardadas) || portadaEfectiva !== portadaGuardada;
  const guardarPortafolio = async () => {
    setOcupado('portafolio');
    let { error } = await supabase.rpc('guardar_mi_portafolio', { p_rutas: elegidas });
    if (!error) ({ error } = await supabase.rpc('guardar_mi_portada', { p_ruta: portadaEfectiva }));
    setOcupado('');
    if (error) { avisar('error', /portada/i.test(error.message) && /function|schema cache/i.test(error.message) ? 'Falta aplicar la migración 0016 en la NAS.' : errorBD(error)); return; }
    setGuardadas(elegidas); setPortada(portadaEfectiva); setPortadaGuardada(portadaEfectiva);
    avisar('exito', 'Portafolio guardado. Ya se ve en tu página.');
  };
  const elegirConIA = async () => {
    setOcupado('fotos'); setInfoIA('');
    try {
      const r = await llamarIA({ accion: 'fotos' });
      setElegidas(r.fotos.map((f) => f.ruta));
      if (r.plantilla) setRecomendada(r.plantilla);
      setInfoIA(`Analicé ${r.analizadas} fotos y separé ${r.fotos.length}: las más nítidas, bien iluminadas y distintas entre sí. Revísalas y pulsa «Guardar portafolio». No detecta ojos cerrados ni expresiones: eso lo decides tú.`);
    } catch (e) { avisar('error', e.message); }
    setOcupado('');
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px 80px' }}>
      <h1 style={{ fontFamily: 'var(--fl-serif)', fontSize: 36, fontWeight: 300, margin: 0, color: INK }}>Mi página</h1>
      <p style={{ margin: '6px 0 28px', fontSize: 13, color: TAUPE }}>Tu tarjeta de presentación en internet: tus mejores fotos, tus servicios y un botón para reservar.</p>

      <div style={{ border: `1px solid ${BORDER}`, background: '#fff', borderRadius: 4, padding: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 40 }}>
        <code style={{ fontSize: 13, color: INK, wordBreak: 'break-all', flex: 1, minWidth: 200 }}>{enlace}</code>
        <button type="button" style={boton} onClick={copiar}><Copy size={13} /> Copiar</button>
        <a style={boton} href={enlace} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Ver</a>
      </div>

      {infoIA && <div role="status" style={{ border: `1px solid ${SAND}`, background: '#FBF7EE', color: INK, borderRadius: 4, padding: '12px 14px', fontSize: 13, lineHeight: 1.5, marginBottom: 32 }}>{infoIA}</div>}

      {/* ── Plantilla ── */}
      <section style={seccion} aria-label="Plantilla">
        <h2 style={h2}>Plantilla</h2>
        <p style={ayuda}>Cambia el diseño con un clic; tus fotos y tus datos se quedan igual. «Vista previa» abre tu página con esa plantilla sin guardarla.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 14 }}>
          {PLANTILLAS.map((p) => {
            const activa = plantilla === p.id;
            return (
              <div key={p.id} style={{ border: activa ? `2px solid ${INK}` : `1px solid ${BORDER}`, borderRadius: 6, background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div aria-hidden="true" style={{ height: 70, background: p.paleta[0], display: 'flex', alignItems: 'flex-end', gap: 6, padding: 10, borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ width: 34, height: 6, background: p.paleta[1], borderRadius: 2 }} />
                  <span style={{ width: 14, height: 6, background: p.paleta[2], borderRadius: 2 }} />
                </div>
                <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontFamily: 'var(--fl-serif)', fontSize: 17, color: INK }}>{p.nombre}</div>
                  {recomendada && recomendada.id === p.id && <div style={{ fontSize: 11, color: '#7A5C1E', fontWeight: 700 }}>Recomendada por la IA</div>}
                  <div style={{ fontSize: 12, color: TAUPE, lineHeight: 1.45, flex: 1 }}>{p.descripcion}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <a href={`${enlace}?plantilla=${p.id}`} target="_blank" rel="noreferrer" style={{ ...boton, padding: '7px 10px', fontSize: 10 }}>Vista previa</a>
                    <button type="button" disabled={activa || ocupado === 'plantilla'} onClick={() => usarPlantilla(p.id)} style={{ ...(activa ? boton : botonRelleno), padding: '7px 10px', fontSize: 10, opacity: activa ? 0.6 : 1, cursor: activa ? 'default' : 'pointer' }}>{activa ? 'En uso' : 'Usar'}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={recomendarConIA} disabled={!elegidas.length || ocupado === 'recomendar'} style={{ ...boton, opacity: elegidas.length ? 1 : 0.5 }} title={elegidas.length ? undefined : 'Elige primero algunas fotos del portafolio'}>
          <Sparkles size={13} /> {ocupado === 'recomendar' ? 'Analizando…' : 'Recomendar con IA'}
        </button>
        {recomendada && <p style={{ ...ayuda, margin: '10px 0 0' }}>{recomendada.motivo}</p>}
      </section>

      {/* ── Datos ── */}
      <section style={seccion} aria-label="Datos de la página">
        <h2 style={h2}>Tus datos</h2>
        <p style={ayuda}>Es lo que ven tus clientes: quién eres, qué ofreces y cómo contactarte.</p>
        <div style={{ display: 'grid', gap: 14 }}>
          <div><label style={etiqueta} htmlFor="mp-nombre">Nombre</label><input id="mp-nombre" style={campo} maxLength={80} value={datos.nombre} onChange={(e) => poner('nombre', e.target.value)} /></div>
          <div>
            <label style={etiqueta} htmlFor="mp-bio">Descripción ({datos.bio.length}/600)</label>
            <textarea id="mp-bio" style={{ ...campo, minHeight: 96, resize: 'vertical' }} maxLength={600} value={datos.bio} onChange={(e) => poner('bio', e.target.value)} />
            <button type="button" onClick={() => setAbrirBio((v) => !v)} style={{ ...boton, marginTop: 8 }}><Sparkles size={13} /> Escribir con IA</button>
          </div>
          {abrirBio && (
            <div style={{ border: `1px solid ${BORDER}`, background: '#fff', borderRadius: 4, padding: 16, display: 'grid', gap: 12 }}>
              <p style={{ ...ayuda, margin: 0 }}>Contesta esto y la IA redacta tu descripción y tus servicios. Solo usa lo que escribas aquí; no inventa premios ni precios.</p>
              <div><label style={etiqueta} htmlFor="ia-ciudad">Ciudad o zona</label><input id="ia-ciudad" style={campo} maxLength={60} value={formIA.ciudad} onChange={(e) => setFormIA({ ...formIA, ciudad: e.target.value })} placeholder="Santo Domingo" /></div>
              <div><label style={etiqueta} htmlFor="ia-estilo">¿Cómo describirías tu estilo?</label><input id="ia-estilo" style={campo} maxLength={120} value={formIA.estilo} onChange={(e) => setFormIA({ ...formIA, estilo: e.target.value })} placeholder="Natural, cálido, momentos espontáneos" /></div>
              <div><label style={etiqueta} htmlFor="ia-tipos">Tipos de sesión, separados por coma</label><input id="ia-tipos" style={campo} value={formIA.tipos} onChange={(e) => setFormIA({ ...formIA, tipos: e.target.value })} placeholder="Cumpleaños infantiles, sesiones en casa, retratos" /></div>
              <div><label style={etiqueta} htmlFor="ia-exp">Experiencia (opcional)</label><input id="ia-exp" style={campo} maxLength={60} value={formIA.experiencia} onChange={(e) => setFormIA({ ...formIA, experiencia: e.target.value })} placeholder="Más de 5 años" /></div>
              <div><label style={etiqueta} htmlFor="ia-tono">Tono</label>
                <select id="ia-tono" style={campo} value={formIA.tono} onChange={(e) => setFormIA({ ...formIA, tono: e.target.value })}>
                  <option value="cercano">Cercano</option><option value="elegante">Elegante</option><option value="profesional">Profesional</option>
                </select></div>
              <div><button type="button" style={botonRelleno} disabled={ocupado === 'bio'} onClick={redactarConIA}>{ocupado === 'bio' ? 'Escribiendo…' : 'Redactar'}</button></div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div><label style={etiqueta} htmlFor="mp-wa">WhatsApp (con código de país)</label><input id="mp-wa" style={campo} inputMode="numeric" maxLength={20} value={datos.whatsapp} onChange={(e) => poner('whatsapp', e.target.value)} placeholder="18290000000" /></div>
            <div><label style={etiqueta} htmlFor="mp-ig">Instagram (sin @)</label><input id="mp-ig" style={campo} maxLength={40} value={datos.instagram} onChange={(e) => poner('instagram', e.target.value)} /></div>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, color: INK }}>
            <input type="checkbox" checked={datos.reservas_abiertas} onChange={(e) => poner('reservas_abiertas', e.target.checked)} /> Estoy recibiendo reservas
          </label>
          <div>
            <div style={etiqueta}>Servicios</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {datos.servicios.map((s, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr) minmax(0,2fr) auto', gap: 8, alignItems: 'center' }}>
                  <input aria-label="Nombre del servicio" style={campo} maxLength={60} value={s.nombre || ''} onChange={(e) => ponerServicio(i, 'nombre', e.target.value)} placeholder="Cumpleaños" />
                  <input aria-label="Precio" style={campo} maxLength={40} value={s.precio || ''} onChange={(e) => ponerServicio(i, 'precio', e.target.value)} placeholder="RD$8,000" />
                  <input aria-label="Detalle" style={campo} maxLength={80} value={s.detalle || ''} onChange={(e) => ponerServicio(i, 'detalle', e.target.value)} placeholder="por 5 horas" />
                  <button type="button" aria-label="Quitar servicio" onClick={() => setDatos((d) => ({ ...d, servicios: d.servicios.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TAUPE, padding: 6 }}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
            {datos.servicios.length < 12 && <button type="button" style={{ ...boton, marginTop: 10 }} onClick={() => setDatos((d) => ({ ...d, servicios: [...d.servicios, { nombre: '', precio: '', detalle: '' }] }))}><Plus size={13} /> Añadir servicio</button>}
          </div>
        </div>
        <button type="button" onClick={guardarDatos} disabled={!cambiaDatos || ocupado === 'datos'} style={{ ...(cambiaDatos ? botonRelleno : boton), marginTop: 18, opacity: cambiaDatos ? 1 : 0.5, cursor: cambiaDatos ? 'pointer' : 'default' }}>{ocupado === 'datos' ? 'Guardando…' : 'Guardar datos'}</button>
      </section>

      {/* ── Portafolio ── */}
      <section aria-label="Portafolio">
        <h2 style={h2}>Portafolio ({elegidas.length} de {MAX})</h2>
        <p style={ayuda}>Elige las fotos que quieres mostrar. Solo se pueden usar fotos de colecciones sin contraseña.</p>
        <button type="button" onClick={elegirConIA} disabled={ocupado === 'fotos'} style={{ ...boton, marginBottom: 14 }}><Sparkles size={13} /> {ocupado === 'fotos' ? 'Analizando tus fotos…' : 'Elegir las mejores con IA'}</button>

        {elegidas.length > 0 && (
          <>
            <p style={{ ...ayuda, margin: '0 0 8px' }}>Toca la estrella para elegir la foto que va detrás de tu nombre (plantilla Revista). Si no eliges, se usa la primera.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8, marginBottom: 16 }}>
              {elegidas.map((r, i) => {
                const esPortada = (portadaEfectiva || elegidas[0]) === r;
                return (
                  <div key={r} style={{ position: 'relative', aspectRatio: '1', background: BORDER, outline: esPortada ? `3px solid ${SAND}` : 'none' }}>
                    <img src={MINIATURA(r)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <button type="button" onClick={() => setPortada(r)} aria-pressed={esPortada} aria-label={esPortada ? 'Es la foto de portada' : 'Usar como foto de portada'} title="Usar como portada"
                      style={{ position: 'absolute', top: 4, left: 4, width: 24, height: 24, borderRadius: '50%', border: 'none', background: esPortada ? SAND : 'rgba(24,24,22,0.8)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Star size={13} fill={esPortada ? '#fff' : 'none'} /></button>
                    <button type="button" onClick={() => alternar(r)} aria-label="Quitar del portafolio" style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(24,24,22,0.8)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
                    {esPortada && <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: SAND, color: '#fff', fontSize: 10, textAlign: 'center', padding: '2px 0', fontWeight: 600 }}>Portada</span>}
                  </div>
                );
              })}
            </div>
          </>
        )}
        <button type="button" onClick={guardarPortafolio} disabled={!hayCambios || ocupado === 'portafolio'} style={{ ...(hayCambios ? botonRelleno : boton), opacity: hayCambios ? 1 : 0.5, cursor: hayCambios ? 'pointer' : 'default', marginBottom: 32 }}>
          {ocupado === 'portafolio' ? 'Guardando…' : 'Guardar portafolio'}
        </button>

        <h3 style={{ ...h2, fontSize: 18 }}>Elegir a mano</h3>
        {colecciones.length === 0 ? (
          <p style={{ fontSize: 14, color: TAUPE }}>Aún no tienes colecciones. Crea una y sube fotos para armar tu portafolio.</p>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {colecciones.map((ev) => {
              const sel = coleccion && coleccion.id === ev.id;
              return (
                <button key={ev.id} type="button" disabled={ev.tiene_clave} onClick={() => abrirColeccion(ev)} title={ev.tiene_clave ? 'Tiene contraseña: no se puede usar en el portafolio' : undefined}
                  style={{ ...boton, padding: '8px 14px', letterSpacing: '0.04em', textTransform: 'none', fontWeight: sel ? 700 : 500, background: sel ? INK : 'transparent', color: sel ? '#F9F8F5' : (ev.tiene_clave ? TAUPE : INK), opacity: ev.tiene_clave ? 0.5 : 1, cursor: ev.tiene_clave ? 'not-allowed' : 'pointer' }}>
                  {ev.nombre}{ev.tiene_clave ? ' (con contraseña)' : ''}
                </button>
              );
            })}
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
      </section>
    </div>
  );
}
