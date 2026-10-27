import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { formatoBytes } from './marca/bytes';

// Espacio que usa el fotógrafo y cuánto le queda. Se actualiza al abrir, cada minuto y cuando termina una subida.
export default function MiEspacio({ actualizar }) {
  const [d, setD] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const r = await fetch('/api/mi-espacio', { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (r.ok) setD(await r.json());
    } catch { /* sin datos: no se muestra nada */ }
  }, []);

  useEffect(() => { cargar(); const t = setInterval(cargar, 60000); return () => clearInterval(t); }, [cargar]);
  useEffect(() => { cargar(); }, [actualizar, cargar]);

  if (!d || d.admin) return null;
  const limite = d.cuota_bytes;
  const pct = limite ? Math.min(100, (d.usado_bytes / limite) * 100) : 0;
  const lleno = limite && pct >= 90;

  return (
    <div style={{ padding: '14px 20px', borderTop: '1px solid var(--fl-borde)' }}>
      <div style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fl-grafito)', marginBottom: 8 }}>Mi espacio</div>
      {limite ? (
        <>
          <div style={{ height: 4, background: 'var(--fl-arena)', borderRadius: 2, overflow: 'hidden' }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Espacio usado">
            <div style={{ width: `${pct}%`, height: '100%', background: lleno ? 'var(--fl-error)' : 'var(--fl-laton)', transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--fl-texto)', marginTop: 8 }}>{formatoBytes(d.libre_bytes)} disponibles</div>
          <div style={{ fontSize: 11, color: 'var(--fl-grafito)', marginTop: 2 }}>{formatoBytes(d.usado_bytes)} de {formatoBytes(limite)}</div>
          {lleno && <div style={{ fontSize: 11, color: 'var(--fl-error)', marginTop: 6 }}>Te queda poco espacio. Escríbenos para ampliar tu plan.</div>}
        </>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--fl-texto)' }}>{formatoBytes(d.usado_bytes)} usados<div style={{ fontSize: 11, color: 'var(--fl-grafito)', marginTop: 2 }}>Sin límite de espacio</div></div>
      )}
    </div>
  );
}
