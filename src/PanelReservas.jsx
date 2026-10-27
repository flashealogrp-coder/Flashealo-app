import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Check, X, RotateCcw, Phone, Mail, MessageCircle } from 'lucide-react';
import { supabase } from './supabaseClient';

const INK = '#181816';
const TAUPE = '#5A5955';
const BORDER = '#E2DFD9';
const ESTADOS = {
  nueva: { texto: 'Nueva', fondo: '#F3E9D2', color: '#7A5B12' },
  confirmada: { texto: 'Confirmada', fondo: '#DDEBE2', color: '#2F5A41' },
  cancelada: { texto: 'Cancelada', fondo: '#ECEAE5', color: '#5A5955' },
};
const FILTROS = [['nueva', 'Nuevas'], ['confirmada', 'Confirmadas'], ['cancelada', 'Canceladas'], ['todas', 'Todas']];

const soloDigitos = (s) => String(s || '').replace(/\D/g, '');
const fechaLarga = (d) => { try { return new Date(`${d}T12:00:00`).toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); } catch { return d; } };
const fechaCorta = (iso) => { try { return new Date(iso).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); } catch { return ''; } };

export default function PanelReservas({ avisar, esSuper, nombreNegocio }) {
  const [filas, setFilas] = useState(null);
  const [filtro, setFiltro] = useState('nueva');
  const [ocupado, setOcupado] = useState(null);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from('reservas').select('*, fotografos(nombre)').order('created_at', { ascending: false }).limit(500);
    if (error) { avisar('error', 'No se pudieron cargar las reservas. ¿Ya aplicaste la migración 0010?'); setFilas([]); return; }
    setFilas(data || []);
  }, [avisar]);
  useEffect(() => { cargar(); }, [cargar]);

  const cambiar = async (r, estado) => {
    setOcupado(r.id);
    const { error } = await supabase.from('reservas').update({ estado }).eq('id', r.id);
    setOcupado(null);
    if (error) { avisar('error', 'No se pudo actualizar la reserva.'); return; }
    setFilas((p) => p.map((x) => (x.id === r.id ? { ...x, estado } : x)));
  };

  if (filas === null) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#5A5955]" size={28} /></div>;

  const cuenta = (e) => filas.filter((r) => r.estado === e).length;
  const visibles = filtro === 'todas' ? filas : filas.filter((r) => r.estado === filtro);
  const boton = { padding: '7px 12px', fontSize: 11, letterSpacing: '0.08em', fontWeight: 600, border: `1px solid ${INK}`, background: 'transparent', color: INK, borderRadius: 3, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };
  const enlace = { color: INK, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'underline', textUnderlineOffset: 3 };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px 80px' }}>
      <h1 style={{ fontFamily: 'var(--fl-serif)', fontSize: 36, fontWeight: 300, margin: 0, color: INK }}>Reservas</h1>
      <p style={{ margin: '6px 0 24px', fontSize: 13, color: TAUPE }}>{esSuper ? 'Todas las solicitudes de todos los fotógrafos.' : 'Las solicitudes que llegan desde tu página pública.'}</p>

      <div role="tablist" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {FILTROS.map(([id, txt]) => (
          <button key={id} role="tab" aria-selected={filtro === id} onClick={() => setFiltro(id)} style={{ ...boton, background: filtro === id ? INK : 'transparent', color: filtro === id ? '#F9F8F5' : INK, borderRadius: 999 }}>
            {txt}{id !== 'todas' ? ` (${cuenta(id)})` : ` (${filas.length})`}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <p style={{ fontSize: 14, color: TAUPE }}>{filas.length === 0 ? 'Todavía no hay solicitudes. Comparte el enlace de tu página para recibirlas.' : 'No hay reservas en esta lista.'}</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {visibles.map((r) => {
            const et = ESTADOS[r.estado] || ESTADOS.nueva;
            const tel = soloDigitos(r.telefono);
            const msg = encodeURIComponent(`Hola ${r.nombre}, te escribo de ${r.fotografos?.nombre || nombreNegocio || 'mi estudio'} por tu solicitud${r.servicio ? ` de ${r.servicio}` : ''}${r.fecha ? ` para el ${fechaLarga(r.fecha)}` : ''}.`);
            return (
              <article key={r.id} style={{ border: `1px solid ${BORDER}`, background: '#fff', borderRadius: 4, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 500, color: INK }}>{r.nombre}</div>
                    <div style={{ fontSize: 13, color: TAUPE, marginTop: 2 }}>{r.servicio || 'Sin servicio indicado'}{r.fecha ? ` · ${fechaLarga(r.fecha)}` : ''}</div>
                    <div style={{ fontSize: 11, color: TAUPE, marginTop: 2 }}>Recibida {fechaCorta(r.created_at)}{esSuper && r.fotografos?.nombre ? ` · ${r.fotografos.nombre}` : ''}</div>
                  </div>
                  <span style={{ background: et.fondo, color: et.color, fontSize: 11, padding: '3px 10px', borderRadius: 999, fontWeight: 500 }}>{et.texto}</span>
                </div>
                {r.mensaje && <p style={{ fontSize: 14, color: INK, margin: '14px 0 0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.mensaje}</p>}
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 14 }}>
                  {tel && <a style={enlace} href={`https://wa.me/${tel}?text=${msg}`} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>}
                  {r.telefono && <a style={enlace} href={`tel:${r.telefono}`}><Phone size={14} /> {r.telefono}</a>}
                  {r.correo && <a style={enlace} href={`mailto:${r.correo}`}><Mail size={14} /> {r.correo}</a>}
                  {r.contactar_whatsapp && tel && <span style={{ fontSize: 12, color: TAUPE }}>Prefiere WhatsApp</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                  {r.estado !== 'confirmada' && <button type="button" disabled={ocupado === r.id} style={boton} onClick={() => cambiar(r, 'confirmada')}><Check size={13} /> Confirmar</button>}
                  {r.estado !== 'cancelada' && <button type="button" disabled={ocupado === r.id} style={boton} onClick={() => cambiar(r, 'cancelada')}><X size={13} /> Cancelar</button>}
                  {r.estado !== 'nueva' && <button type="button" disabled={ocupado === r.id} style={boton} onClick={() => cambiar(r, 'nueva')}><RotateCcw size={13} /> Volver a nueva</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
