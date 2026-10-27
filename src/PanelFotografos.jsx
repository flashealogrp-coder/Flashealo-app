import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Check, Pause, Play, UserPlus } from 'lucide-react';
import { supabase } from './supabaseClient';

const INK = '#181816';
const TAUPE = '#5A5955';
const SAND = '#C8B69E';
const BORDER = '#E2DFD9';
const GB = 1073741824;

const formatoEspacio = (bytes) => {
  if (bytes == null) return '—';
  if (bytes >= GB) return `${(bytes / GB).toFixed(bytes >= 10 * GB ? 0 : 1)} GB`;
  return `${Math.max(0, Math.round(bytes / 1048576))} MB`;
};
const fechaCorta = (iso) => { try { return new Date(iso).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };
const slugValido = (s) => /^[a-z0-9][a-z0-9-]{2,30}$/.test(s);

const ETIQUETA = {
  pendiente: { texto: 'Por aprobar', fondo: '#F3E9D2', color: '#7A5B12' },
  activo: { texto: 'Activa', fondo: '#DDEBE2', color: '#2F5A41' },
  suspendido: { texto: 'Suspendida', fondo: '#F2DAD6', color: '#8C2F23' },
};

export default function PanelFotografos({ avisar }) {
  const [filas, setFilas] = useState(null);
  const [uso, setUso] = useState({});
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(null);
  const [edit, setEdit] = useState({});            // id -> { slug, cuota }
  const [altaAbierta, setAltaAbierta] = useState(false);
  const [alta, setAlta] = useState({ email: '', slug: '', nombre: '', cuota: '50' });

  const cargar = useCallback(async () => {
    setError('');
    const { data, error: e } = await supabase.from('fotografos').select('*, eventos(count)').order('creado_en', { ascending: false });
    if (e) { setError('No se pudo cargar la lista. ¿Ya aplicaste la migración 0008?'); setFilas([]); return; }
    setFilas(data || []);
    // espacio usado en el NAS (si el servidor no responde, simplemente no se muestra)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const slugs = (data || []).filter((f) => f.estado !== 'pendiente').map((f) => f.slug);
      if (slugs.length) {
        const r = await fetch('/api/ia', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }, body: JSON.stringify({ accion: 'uso_fotografos', slugs }) });
        if (r.ok) setUso((await r.json()).uso || {});
      }
    } catch { /* sin datos de espacio */ }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (f, cambios, textoOk) => {
    setOcupado(f.id);
    const { error: e } = await supabase.from('fotografos').update(cambios).eq('id', f.id);
    setOcupado(null);
    if (e) { avisar('error', /carpeta/i.test(e.message) ? 'La carpeta de una cuenta aprobada no se puede cambiar.' : 'No se pudo guardar el cambio.'); return false; }
    avisar('exito', textoOk);
    await cargar();
    return true;
  };

  const aprobar = async (f) => {
    const e = edit[f.id] || {};
    const slug = (e.slug ?? f.slug).trim().toLowerCase();
    if (!slugValido(slug)) { avisar('error', 'La carpeta debe tener entre 3 y 31 letras minúsculas, números o guiones.'); return; }
    const gb = e.cuota === '' ? null : Number(e.cuota ?? 50);
    if (gb !== null && (!Number.isFinite(gb) || gb <= 0)) { avisar('error', 'Escribe una cuota en GB mayor que cero, o déjala vacía para sin límite.'); return; }
    if (!window.confirm(`¿Aprobar a ${f.nombre}? Tendrá su espacio en la carpeta "${slug}" con ${gb === null ? 'espacio sin límite' : gb + ' GB'}.`)) return;
    await guardar(f, { slug, estado: 'activo', plan: 'beta', cuota_bytes: gb === null ? null : Math.round(gb * GB) }, `${f.nombre} ya tiene su espacio.`);
  };

  const cambiarEstado = async (f, estado) => {
    const pregunta = estado === 'suspendido'
      ? `¿Suspender a ${f.nombre}? Sus colecciones dejan de verse y no podrá entrar al panel. Sus archivos se conservan.`
      : `¿Reactivar a ${f.nombre}?`;
    if (!window.confirm(pregunta)) return;
    await guardar(f, { estado }, estado === 'suspendido' ? 'Cuenta suspendida.' : 'Cuenta reactivada.');
  };

  const guardarCuota = async (f) => {
    const v = edit[f.id]?.cuota;
    const gb = v === '' ? null : Number(v);
    if (gb !== null && (!Number.isFinite(gb) || gb <= 0)) { avisar('error', 'Escribe una cuota en GB mayor que cero, o déjala vacía para sin límite.'); return; }
    if (await guardar(f, { cuota_bytes: gb === null ? null : Math.round(gb * GB) }, 'Cuota actualizada.')) setEdit((p) => { const n = { ...p }; delete n[f.id]; return n; });
  };

  const darDeAlta = async (ev) => {
    ev.preventDefault();
    const slug = alta.slug.trim().toLowerCase();
    if (!slugValido(slug)) { avisar('error', 'La carpeta debe tener entre 3 y 31 letras minúsculas, números o guiones.'); return; }
    setOcupado('alta');
    const gb = alta.cuota === '' ? null : Number(alta.cuota);
    const { error: e } = await supabase.rpc('alta_fotografo', { p_email: alta.email.trim(), p_slug: slug, p_nombre: alta.nombre.trim() || slug, p_cuota_gb: gb });
    setOcupado(null);
    if (e) { avisar('error', e.message?.includes('No existe un usuario') ? 'Ese correo todavía no tiene cuenta. Pídele que se registre primero.' : e.message || 'No se pudo dar de alta.'); return; }
    avisar('exito', 'Fotógrafo dado de alta.');
    setAlta({ email: '', slug: '', nombre: '', cuota: '50' }); setAltaAbierta(false);
    await cargar();
  };

  if (filas === null) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#5A5955]" size={28} /></div>;

  const pendientes = filas.filter((f) => f.estado === 'pendiente');
  const cuentas = filas.filter((f) => f.estado !== 'pendiente');
  const campo = { padding: '8px 10px', border: `1px solid ${BORDER}`, background: '#fff', fontSize: 13, borderRadius: 3, outline: 'none', color: INK };
  const boton = (oscuro) => ({ padding: '8px 16px', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, border: `1px solid ${INK}`, background: oscuro ? INK : 'transparent', color: oscuro ? '#F9F8F5' : INK, borderRadius: 3, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 });

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fl-serif)', fontSize: 36, fontWeight: 300, margin: 0, color: INK }}>Fotógrafos</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: TAUPE }}>{cuentas.length} {cuentas.length === 1 ? 'cuenta' : 'cuentas'}{pendientes.length > 0 ? ` · ${pendientes.length} por aprobar` : ''}</p>
        </div>
        <button type="button" style={boton(false)} onClick={() => setAltaAbierta((v) => !v)}><UserPlus size={14} /> Dar de alta por correo</button>
      </div>

      {error && <p style={{ color: '#A3392B', fontSize: 13, marginBottom: 16 }}>{error}</p>}

      {altaAbierta && (
        <form onSubmit={darDeAlta} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, padding: 20, border: `1px solid ${BORDER}`, background: '#fff', borderRadius: 4, marginBottom: 32, alignItems: 'end' }}>
          <label style={{ fontSize: 11, color: TAUPE }}>Correo con el que se registró<input required type="email" value={alta.email} onChange={(e) => setAlta({ ...alta, email: e.target.value })} style={{ ...campo, width: '100%', marginTop: 4 }} /></label>
          <label style={{ fontSize: 11, color: TAUPE }}>Nombre visible<input value={alta.nombre} onChange={(e) => setAlta({ ...alta, nombre: e.target.value })} style={{ ...campo, width: '100%', marginTop: 4 }} /></label>
          <label style={{ fontSize: 11, color: TAUPE }}>Carpeta (su espacio)<input required value={alta.slug} onChange={(e) => setAlta({ ...alta, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} style={{ ...campo, width: '100%', marginTop: 4 }} /></label>
          <label style={{ fontSize: 11, color: TAUPE }}>Cuota en GB (vacío = sin límite)<input type="number" min="1" value={alta.cuota} onChange={(e) => setAlta({ ...alta, cuota: e.target.value })} style={{ ...campo, width: '100%', marginTop: 4 }} /></label>
          <button type="submit" disabled={ocupado === 'alta'} style={boton(true)}>{ocupado === 'alta' ? 'Guardando…' : 'Dar de alta'}</button>
        </form>
      )}

      {pendientes.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: 'var(--fl-serif)', fontSize: 24, fontWeight: 400, margin: '0 0 12px', color: INK }}>Solicitudes por aprobar</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {pendientes.map((f) => {
              const e = edit[f.id] || {};
              return (
                <div key={f.id} style={{ border: `1px solid ${SAND}`, background: '#fff', borderRadius: 4, padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'end' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 500, color: INK }}>{f.nombre}</div>
                    <div style={{ fontSize: 12, color: TAUPE, marginTop: 2, wordBreak: 'break-all' }}>{f.email || 'sin correo'}</div>
                    {f.contacto && <div style={{ fontSize: 12, color: TAUPE }}>{f.contacto}</div>}
                    <div style={{ fontSize: 11, color: TAUPE, marginTop: 4 }}>Solicitó el {fechaCorta(f.creado_en)}</div>
                  </div>
                  <label style={{ fontSize: 11, color: TAUPE }}>Carpeta<input value={e.slug ?? f.slug} onChange={(ev) => setEdit((p) => ({ ...p, [f.id]: { ...p[f.id], slug: ev.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') } }))} style={{ ...campo, width: '100%', marginTop: 4 }} /></label>
                  <label style={{ fontSize: 11, color: TAUPE }}>Cuota en GB (vacío = sin límite)<input type="number" min="1" value={e.cuota ?? '50'} onChange={(ev) => setEdit((p) => ({ ...p, [f.id]: { ...p[f.id], cuota: ev.target.value } }))} style={{ ...campo, width: '100%', marginTop: 4 }} /></label>
                  <button type="button" disabled={ocupado === f.id} onClick={() => aprobar(f)} style={boton(true)}><Check size={14} /> {ocupado === f.id ? 'Guardando…' : 'Aprobar'}</button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 style={{ fontFamily: 'var(--fl-serif)', fontSize: 24, fontWeight: 400, margin: '0 0 12px', color: INK }}>Cuentas</h2>
        {cuentas.length === 0 ? (
          <p style={{ fontSize: 14, color: TAUPE }}>Todavía no hay cuentas aprobadas. Cuando alguien se registre aparecerá arriba para aprobarlo.</p>
        ) : (
          <div style={{ border: `1px solid ${BORDER}`, background: '#fff', borderRadius: 4, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: TAUPE, fontSize: 11, letterSpacing: '0.08em' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 500 }}>Fotógrafo</th>
                  <th style={{ padding: '12px 8px', fontWeight: 500 }}>Estado</th>
                  <th style={{ padding: '12px 8px', fontWeight: 500 }}>Colecciones</th>
                  <th style={{ padding: '12px 8px', fontWeight: 500 }}>Espacio</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500 }} />
                </tr>
              </thead>
              <tbody>
                {cuentas.map((f) => {
                  const et = ETIQUETA[f.estado] || ETIQUETA.activo;
                  const usado = uso[f.slug];
                  const pct = f.cuota_bytes && usado != null ? Math.min(100, (usado / f.cuota_bytes) * 100) : null;
                  const editando = edit[f.id]?.cuota !== undefined;
                  return (
                    <tr key={f.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 500, color: INK }}>{f.nombre}</div>
                        <div style={{ fontSize: 11, color: TAUPE }}>{f.slug}{f.email ? ` · ${f.email}` : ''}</div>
                      </td>
                      <td style={{ padding: '14px 8px' }}><span style={{ background: et.fondo, color: et.color, fontSize: 11, padding: '3px 10px', borderRadius: 999, fontWeight: 500 }}>{et.texto}</span></td>
                      <td style={{ padding: '14px 8px', color: INK }}>{f.eventos?.[0]?.count ?? 0}</td>
                      <td style={{ padding: '14px 8px', minWidth: 190 }}>
                        {editando ? (
                          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            <input type="number" min="1" placeholder="sin límite" value={edit[f.id].cuota} onChange={(ev) => setEdit((p) => ({ ...p, [f.id]: { ...p[f.id], cuota: ev.target.value } }))} style={{ ...campo, width: 90 }} /> GB
                            <button type="button" onClick={() => guardarCuota(f)} style={{ ...boton(true), padding: '6px 10px' }}>Guardar</button>
                          </span>
                        ) : (
                          <button type="button" title="Cambiar cuota" onClick={() => setEdit((p) => ({ ...p, [f.id]: { ...p[f.id], cuota: f.cuota_bytes ? String(Math.round((f.cuota_bytes / GB) * 10) / 10) : '' } }))} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: INK }}>
                            <div>{formatoEspacio(usado)} de {f.cuota_bytes ? formatoEspacio(f.cuota_bytes) : 'sin límite'}</div>
                            {pct !== null && <div style={{ height: 4, background: BORDER, borderRadius: 2, marginTop: 5, width: 150 }}><div style={{ width: `${pct}%`, height: '100%', background: pct > 90 ? '#A3392B' : INK, borderRadius: 2 }} /></div>}
                          </button>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {f.estado === 'activo' && <button type="button" disabled={ocupado === f.id} onClick={() => cambiarEstado(f, 'suspendido')} style={boton(false)}><Pause size={13} /> Suspender</button>}
                        {f.estado === 'suspendido' && <button type="button" disabled={ocupado === f.id} onClick={() => cambiarEstado(f, 'activo')} style={boton(false)}><Play size={13} /> Reactivar</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
