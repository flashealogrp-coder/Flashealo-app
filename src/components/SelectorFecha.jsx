import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { MESES, DIAS_CORTOS, leerISO, formatoISO, semanasDelMes, mesMas, sumarDias, textoLargo, hoyISO } from '../marca/fechas';
import './SelectorFecha.css';

// Selector de fecha con el estilo de Flashealo (reemplaza al calendario nativo del navegador).
// value / onChange usan "YYYY-MM-DD"; "" = sin fecha.
export default function SelectorFecha({ value, onChange, min, max, placeholder = 'Elige una fecha', id, disabled, limpiable = true }) {
  const [abierto, setAbierto] = useState(false);
  const inicial = leerISO(value) || leerISO(hoyISO());
  const [vista, setVista] = useState({ a: inicial.a, m: inicial.m });
  const [foco, setFoco] = useState(null);
  const raiz = useRef(null);
  const rejilla = useRef(null);
  const hoy = hoyISO();

  const fueraDeRango = (iso) => (min && iso < min) || (max && iso > max);

  const abrir = () => {
    if (disabled) return;
    const f = leerISO(value) || leerISO(hoy);
    setVista({ a: f.a, m: f.m });
    setFoco(formatoISO(f.a, f.m, f.d));
    setAbierto(true);
  };
  const cerrar = (devolverFoco = true) => { setAbierto(false); if (devolverFoco) raiz.current?.querySelector('.fl-sf-boton')?.focus(); };

  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => { if (raiz.current && !raiz.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('touchstart', fuera);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('touchstart', fuera); };
  }, [abierto]);

  // Lleva el foco del teclado al día activo.
  useEffect(() => {
    if (abierto && foco) rejilla.current?.querySelector(`[data-fecha="${foco}"]`)?.focus();
  }, [abierto, foco, vista]);

  const elegir = (iso) => { if (fueraDeRango(iso)) return; onChange(iso); cerrar(); };

  const moverFoco = (iso) => {
    const f = leerISO(iso); if (!f) return;
    setFoco(iso);
    if (f.a !== vista.a || f.m !== vista.m) setVista({ a: f.a, m: f.m });
  };

  const teclas = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
    const pasos = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (foco && pasos[e.key]) { e.preventDefault(); moverFoco(sumarDias(foco, pasos[e.key])); }
    if (foco && (e.key === 'PageUp' || e.key === 'PageDown')) {
      e.preventDefault();
      const f = leerISO(foco); const n = mesMas(f.a, f.m, e.key === 'PageUp' ? -1 : 1);
      moverFoco(formatoISO(n.a, n.m, Math.min(f.d, new Date(Date.UTC(n.a, n.m + 1, 0)).getUTCDate())));
    }
  };

  const cambiarMes = (delta) => { const n = mesMas(vista.a, vista.m, delta); setVista(n); setFoco(formatoISO(n.a, n.m, 1)); };
  const semanas = semanasDelMes(vista.a, vista.m);
  const etiqueta = textoLargo(value);

  return (
    <div className="fl-sf" ref={raiz} onKeyDown={abierto ? teclas : undefined}>
      <button type="button" id={id} className="fl-sf-boton" onClick={() => (abierto ? cerrar(false) : abrir())} disabled={disabled}
        aria-haspopup="dialog" aria-expanded={abierto}>
        <span className={etiqueta ? '' : 'fl-sf-vacio'}>{etiqueta || placeholder}</span>
        <CalendarDays size={17} strokeWidth={1.4} aria-hidden="true" />
      </button>

      {abierto && (
        <div className="fl-sf-panel" role="dialog" aria-label="Elegir fecha">
          <div className="fl-sf-cab">
            <button type="button" className="fl-sf-nav" onClick={() => cambiarMes(-1)} aria-label="Mes anterior"><ChevronLeft size={18} strokeWidth={1.5} /></button>
            <div className="fl-sf-mes" aria-live="polite">{MESES[vista.m]} {vista.a}</div>
            <button type="button" className="fl-sf-nav" onClick={() => cambiarMes(1)} aria-label="Mes siguiente"><ChevronRight size={18} strokeWidth={1.5} /></button>
          </div>

          <div className="fl-sf-dias" aria-hidden="true">{DIAS_CORTOS.map((d, i) => <span key={i}>{d}</span>)}</div>

          <div className="fl-sf-rejilla" ref={rejilla} role="grid">
            {semanas.map((sem, i) => (
              <div className="fl-sf-semana" role="row" key={i}>
                {sem.map((d, j) => {
                  if (d === null) return <span key={j} className="fl-sf-hueco" role="gridcell" />;
                  const iso = formatoISO(vista.a, vista.m, d);
                  const bloqueado = fueraDeRango(iso);
                  return (
                    <button key={j} type="button" role="gridcell" data-fecha={iso} disabled={bloqueado}
                      tabIndex={iso === foco ? 0 : -1} aria-selected={iso === value} aria-label={textoLargo(iso)}
                      className={`fl-sf-dia${iso === value ? ' es-elegido' : ''}${iso === hoy ? ' es-hoy' : ''}`}
                      onClick={() => elegir(iso)}>{d}</button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="fl-sf-pie">
            <button type="button" className="fl-sf-texto" onClick={() => elegir(hoy)} disabled={fueraDeRango(hoy)}>Hoy</button>
            {limpiable && value ? <button type="button" className="fl-sf-texto" onClick={() => { onChange(''); cerrar(); }}>Quitar fecha</button> : <span />}
          </div>
        </div>
      )}
    </div>
  );
}
