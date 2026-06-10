import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { RefreshCw, UserMinus, Combine, ArrowLeft, Loader2, Hash, PlusCircle, Trash2, Edit2, ChevronLeft, ChevronRight, User, Image as ImageIcon, AlertTriangle, XCircle, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://muvzhnnsdnztlhynuipd.supabase.co";
const FACE_COLORS = ['#C8B99A', '#9A8F82', '#1C1C1C', '#D4C5A5', '#A39887'];

const fotoUrl = (path, optimizada = false) => {
  if (!path) return null;
  const base = SUPABASE_URL.endsWith('/') ? SUPABASE_URL.slice(0, -1) : SUPABASE_URL;
  const version = "limpieza_total_v1";

  if (optimizada) {
    return `${base}/storage/v1/render/image/public/fotos/${path}?quality=50&format=webp&v=${version}`;
  }
  return `${base}/storage/v1/object/public/fotos/${path}?v=${version}`;
};

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const SAND   = '#C8B99A';
const TAUPE  = '#9A8F82';
const INK    = '#1C1C1C';
const CREAM  = '#FDFCF8';
const WHITE  = '#FFFFFF';

// ─── Componente: Recuadro Dinámico ──────────────────────────────────
const BoundingBox = ({ bbox, color, label, onQuitar, esCuerpo }) => {
  if (!bbox) return null;
  return (
    <div
      className="absolute z-10 pointer-events-none transition-all duration-300 group"
      style={{ left: `${bbox.x}%`, top: `${bbox.y}%`, width: `${bbox.w}%`, height: `${bbox.h}%` }}
    >
      <div
        className="absolute inset-0 border-[2px] rounded-sm transition-colors duration-300"
        style={{ 
          borderColor: color, 
          borderStyle: esCuerpo ? 'dashed' : 'solid',
          boxShadow: esCuerpo ? 'none' : `0 0 12px ${color}88` 
        }}
      />
      {!esCuerpo && label && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-sm shadow-sm whitespace-nowrap pointer-events-auto">
          <span className="text-white text-[10px] uppercase tracking-[0.2em] leading-none">
            {label}
          </span>
          {onQuitar && (
            <button onClick={(e) => { e.stopPropagation(); onQuitar(); }} className="ml-1 text-white/50 hover:text-red-400 transition-colors">
              <XCircle size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const FaceBadge = ({ cara, color, esPendiente }) => {
  if (!cara.bbox) return null;
  return (
    <div className="absolute z-10 pointer-events-none transition-all duration-300" style={{ left: `${cara.bbox.x}%`, top: `${cara.bbox.y}%`, width: `${cara.bbox.w}%`, height: `${cara.bbox.h}%` }}>
      <div className="absolute inset-0 border-[2px] rounded-sm transition-colors duration-300" style={{ borderColor: esPendiente ? '#EF4444' : color, boxShadow: esPendiente ? '0 0 16px rgba(239,68,68,0.8)' : `0 0 12px ${color}44` }} />
    </div>
  );
};

// ─── Componente: Lupa Interactiva (Hover Zoom) ──────────────────────────────
const InteractiveZoomImage = ({ zoomCara }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setPos({ x, y });
  };

  return (
    <div className="flex-1 relative overflow-hidden border h-[50vh] w-full flex items-center justify-center rounded-sm" style={{ background: CREAM, borderColor: 'rgba(0,0,0,0.06)' }}>
      <div 
        className="relative inline-block max-w-full max-h-full leading-none cursor-crosshair"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
        style={{
          transform: isZoomed ? 'scale(2.5)' : 'scale(1)',
          transformOrigin: `${pos.x}% ${pos.y}%`,
          transition: 'transform 0.2s ease-out'
        }}
      >
        <img src={fotoUrl(zoomCara.photo_url, true)} className="max-h-[50vh] w-auto max-w-full block filter saturate-[0.8]" alt="Contexto" draggable={false} />
        <BoundingBox bbox={zoomCara.bbox} color={SAND} label="Auditoría" />
      </div>
      
      {!isZoomed && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full pointer-events-none text-white text-[9px] uppercase tracking-widest opacity-60">
          Pasa el mouse para explorar
        </div>
      )}
    </div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────
const ReviewPanel = ({ evento, onVolver }) => {
  const isOCR = evento.tipo_reconocimiento === 'ocr';
  const [vista, setVista] = useState(isOCR ? 'corredores' : 'perfiles');
  const [todasIdentidades, setTodasIdentidades] = useState([]);
  
  const [zoomCara, setZoomCara] = useState(null);

  const [listaJugadores, setListaJugadores] = useState([]);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [fotosDelJugador, setFotosDelJugador] = useState([]);
  const [cargandoPerfiles, setCargandoPerfiles] = useState(false);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombreTemporal, setNombreTemporal] = useState('');
  const [fusionando, setFusionando] = useState(false);

  const [listaCorredores, setListaCorredores] = useState([]);
  const [corredorSeleccionado, setCorredorSeleccionado] = useState(null);
  const [fotosDelCorredor, setFotosDelCorredor] = useState([]);
  const [cargandoCorredores, setCargandoCorredores] = useState(false);
  const [dorsalTemporal, setDorsalTemporal] = useState('');

  const [fotosRevisar, setFotosRevisar] = useState([]);
  const [idxRevisar, setIdxRevisar] = useState(0);
  const [cargandoRevisar, setCargandoRevisar] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [modoAñadirDorsal, setModoAñadirDorsal] = useState(false);

  const [fotoDudosa, setFotoDudosa] = useState(null);
  const [candidatos, setCandidatos] = useState([]);
  const [cargandoDudas, setCargandoDudas] = useState(false);

  const cargarCorredores = async () => {
    setCargandoCorredores(true);
    const { data, error } = await supabase.from('corredores').select('*').eq('evento_id', evento.id);
    if (!error) {
      setListaCorredores(data || []);
      if (data && data.length > 0 && !corredorSeleccionado) seleccionarCorredor(data[0]);
    }
    setCargandoCorredores(false);
  };

  const corredoresOrdenados = useMemo(() => {
    return [...listaCorredores].sort((a, b) => {
      const aValido = a.dorsal && a.dorsal.trim() !== '';
      const bValido = b.dorsal && b.dorsal.trim() !== '';
      if (aValido === bValido) return 0;
      return aValido ? 1 : -1;
    });
  }, [listaCorredores]);

  const seleccionarCorredor = async (corredor) => {
    setCorredorSeleccionado(corredor);
    setCargandoCorredores(true);
    const { data } = await supabase.from('etiquetas_fotos').select('*').eq('corredor_id', corredor.id);
    setFotosDelCorredor(data || []);
    setCargandoCorredores(false);
  };

  useEffect(() => {
    if (corredorSeleccionado) setDorsalTemporal(corredorSeleccionado.dorsal || '');
  }, [corredorSeleccionado]);

  const guardarDorsalGlobal = async () => {
    const num = dorsalTemporal.trim().toUpperCase();
    if (num === (corredorSeleccionado.dorsal || '')) return;

    await supabase.from('corredores').update({ dorsal: num }).eq('id', corredorSeleccionado.id);
    await supabase.from('etiquetas_fotos').update({ dorsal: num }).eq('corredor_id', corredorSeleccionado.id);

    setCorredorSeleccionado(prev => ({ ...prev, dorsal: num }));
    setListaCorredores(prev => prev.map(c => c.id === corredorSeleccionado.id ? { ...c, dorsal: num } : c));
    setFotosDelCorredor(prev => prev.map(f => ({ ...f, dorsal: num })));
  };

  const eliminarCorredorFalso = async () => {
    if (window.confirm('¿Deseas disolver este grupo de fotos por completo?')) {
      setCargandoCorredores(true);
      await supabase.from('etiquetas_fotos').delete().eq('corredor_id', corredorSeleccionado.id);
      await supabase.from('corredores').delete().eq('id', corredorSeleccionado.id);
      setCorredorSeleccionado(null);
      cargarCorredores();
    }
  };

  const cargarJugadores = async () => {
    setCargandoPerfiles(true);
    const { data } = await supabase.from('identities').select('id, display_name, avatar_url').eq('evento_id', evento.id).order('display_name');
    if (data) {
      const unicos = Array.from(new Map(data.map((j) => [j.id, j])).values());
      setListaJugadores(unicos);
      if (unicos.length > 0) seleccionarJugador(unicos[0]);
    }
    setCargandoPerfiles(false);
  };

  const seleccionarJugador = async (jugador) => {
    setJugadorSeleccionado(jugador);
    setEditandoNombre(false);
    setFusionando(false);
    setCargandoPerfiles(true);
    const { data } = await supabase.from('face_detections').select('*').eq('identity_id', jugador.id).eq('evento_id', evento.id);
    if (data) {
      const sincDuplicados = Array.from(new Map(data.map((d) => [d.id, d])).values());
      const mapa = {};
      for (const det of sincDuplicados) {
        const key = (det.photo_url || '').trim().toLowerCase();
        if (!mapa[key]) mapa[key] = { photo_url: det.photo_url, detecciones: [] };
        mapa[key].detecciones.push(det);
      }
      setFotosDelJugador(Object.values(mapa));
    }
    setCargandoPerfiles(false);
  };

  const iniciarEdicionNombre = () => { setNombreTemporal(jugadorSeleccionado.display_name); setEditandoNombre(true); };
  
  const guardarNombre = async () => {
    if (!nombreTemporal.trim()) return;
    await supabase.from('identities').update({ display_name: nombreTemporal.trim() }).eq('id', jugadorSeleccionado.id);
    const actualizado = { ...jugadorSeleccionado, display_name: nombreTemporal.trim() };
    setJugadorSeleccionado(actualizado);
    setListaJugadores(prev => prev.map(j => (j.id === actualizado.id ? actualizado : j)));
    setEditandoNombre(false);
  };

  // Función para guardar el nombre directamente desde el modal (Lupa Mágica)
  const actualizarNombreDesdeModal = async (id, nuevoNombre) => {
    const nombreLimpio = nuevoNombre.trim();
    if (!nombreLimpio) return;
    
    await supabase.from('identities').update({ display_name: nombreLimpio }).eq('id', id);
    
    setListaJugadores(prev => prev.map(j => j.id === id ? { ...j, display_name: nombreLimpio } : j));
    if (jugadorSeleccionado?.id === id) {
      setJugadorSeleccionado(prev => ({ ...prev, display_name: nombreLimpio }));
    }
    setZoomCara(prev => ({ ...prev, identidad: { ...prev.identidad, display_name: nombreLimpio } }));
  };

  const desvincularDeteccion = async (faceId) => {
    await supabase.from('face_detections').update({ identity_id: null }).eq('id', faceId);
    setFotosDelJugador(prev => prev.map(foto => ({ ...foto, detecciones: foto.detecciones.filter(d => d.id !== faceId) })).filter(foto => foto.detecciones.length > 0));
  };

  const fusionarConJugador = async (idDestino) => {
    setCargandoPerfiles(true);
    await supabase.from('face_detections').update({ identity_id: idDestino }).eq('identity_id', jugadorSeleccionado.id);
    await supabase.from('identities').delete().eq('id', jugadorSeleccionado.id);
    setFusionando(false);
    setJugadorSeleccionado(null);
    cargarJugadores();
  };

  const destruirPerfilFalso = async () => {
    setCargandoPerfiles(true);
    await supabase.from('face_detections').delete().eq('identity_id', jugadorSeleccionado.id);
    await supabase.from('identities').delete().eq('id', jugadorSeleccionado.id);
    setJugadorSeleccionado(null);
    cargarJugadores();
  };

  const cargarRevisar = async () => {
    setCargandoRevisar(true);
    if (isOCR) {
      const { data } = await supabase.from('etiquetas_fotos').select('*').eq('evento_id', evento.id);
      if (data) {
        const mapa = {};
        data.forEach(tag => {
          const key = tag.photo_url;
          if (!mapa[key]) mapa[key] = { photo_url: key, foto_id: tag.foto_id, etiquetas: [] };
          mapa[key].etiquetas.push(tag);
        });
        setFotosRevisar(Object.values(mapa));
      }
    } else {
      const { data: identidades } = await supabase.from('identities').select('id, display_name, avatar_url').eq('evento_id', evento.id);
      if (identidades) setTodasIdentidades(identidades);

      const { data } = await supabase.from('face_detections').select('*').eq('evento_id', evento.id).order('photo_url', { ascending: true });
      if (data) {
        const mapa = {};
        data.forEach(det => {
          const key = (det.photo_url || '').trim().toLowerCase();
          if (!mapa[key]) mapa[key] = { photo_url: det.photo_url, caras: [] };
          mapa[key].caras.push(det);
        });
        setFotosRevisar(Object.values(mapa));
      }
    }
    setIdxRevisar(0);
    setCargandoRevisar(false);
  };

  const actualizarDorsalIndividual = async (id, nuevoDorsal) => {
    await supabase.from('etiquetas_fotos').update({ dorsal: nuevoDorsal.trim().toUpperCase() }).eq('id', id);
    setFotosRevisar(prev => prev.map(foto => ({
      ...foto, etiquetas: foto.etiquetas ? foto.etiquetas.map(t => t.id === id ? { ...t, dorsal: nuevoDorsal.trim().toUpperCase() } : t) : []
    })));
  };

  const borrarDorsalIndividual = async (id) => {
    await supabase.from('etiquetas_fotos').delete().eq('id', id);
    setFotosRevisar(prev => prev.map(foto => ({
      ...foto, etiquetas: foto.etiquetas ? foto.etiquetas.filter(t => t.id !== id) : []
    })));
  };

  const manejarClicImagenOCR = async (e) => {
    if (!modoAñadirDorsal || !isOCR || !fotoRevisarActual) return;
    const rect = e.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const bbox_manual = { x: x - 3, y: y - 2, w: 6, h: 4 };

    const { data, error } = await supabase.from('etiquetas_fotos').insert({
      photo_url: fotoRevisarActual.photo_url, foto_id: fotoRevisarActual.foto_id,
      evento_id: evento.id, dorsal: "NUEVO", bbox: bbox_manual, confianza: 1.0
    }).select();

    if (!error && data) {
      setFotosRevisar(prev => prev.map(foto => {
        if (foto.photo_url === fotoRevisarActual.photo_url) return { ...foto, etiquetas: [...(foto.etiquetas || []), data[0]] };
        return foto;
      }));
    }
    setModoAñadirDorsal(false);
  };

  const borrarCaraDefinitivamente = async (faceId) => {
    await supabase.from('face_detections').delete().eq('id', faceId);
    setConfirmDelete(null);
    setFotosRevisar(prev => prev.map(foto => ({ ...foto, caras: foto.caras.filter(c => c.id !== faceId) })).filter(foto => foto.caras.length > 0));
    setIdxRevisar(prev => Math.max(0, prev));
  };

  const cargarDudas = async () => {
    setCargandoDudas(true);
    const { data } = await supabase.from('face_detections').select('*').eq('evento_id', evento.id).is('identity_id', null).limit(1);
    if (data && data.length > 0) {
      const huerfana = data[0];
      setFotoDudosa(huerfana);
      const { data: sugerencias } = await supabase.rpc('sugerir_candidatos', { huella_dudosa: huerfana.embedding, limite_resultados: 3, id_evento: evento.id });
      setCandidatos(sugerencias || []);
    } else {
      setFotoDudosa(null);
    }
    setCargandoDudas(false);
  };

  const asignarDudaAJugador = async (idIdentidad) => {
    setCargandoDudas(true);
    await supabase.from('face_detections').update({ identity_id: idIdentidad }).eq('id', fotoDudosa.id);
    cargarDudas(); 
  };

  const descartarDuda = async () => {
    setCargandoDudas(true);
    await supabase.from('face_detections').delete().eq('id', fotoDudosa.id);
    cargarDudas();
  };

  useEffect(() => {
    if (vista === 'perfiles') cargarJugadores();
    else if (vista === 'corredores') cargarCorredores();
    else if (vista === 'revisar' || vista === 'revisar_ocr') cargarRevisar();
    else if (vista === 'dudas') cargarDudas();
  }, [vista, evento.id]);

  const identidadMap = Object.fromEntries(todasIdentidades.map((i) => [i.id, i]));
  const fotoRevisarActual = fotosRevisar[idxRevisar] ?? null;

  return (
    <div className="min-h-screen font-sans selection:bg-black selection:text-white relative" style={{ background: CREAM, color: INK }}>
      
      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b px-6 md:px-12 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6" style={{ background: 'rgba(253, 252, 248, 0.9)', borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-4">
          <button onClick={onVolver} className="p-3 bg-transparent hover:bg-gray-100 rounded-none transition-all flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-medium" style={{ color: TAUPE }}>
            <ArrowLeft size={16} /> Volver
          </button>
          <div>
            <h1 className="text-3xl font-light tracking-wide leading-none" style={{ fontFamily: 'Georgia, serif', color: INK }}>{evento.nombre}</h1>
            <p className="text-[9px] mt-1 font-bold uppercase tracking-[0.3em]" style={{ color: TAUPE }}>Auditoría · {evento.tipo_reconocimiento}</p>
          </div>
        </div>
        <nav className="flex bg-transparent rounded-none p-1 border" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
          {(isOCR ? [
            { id: 'corredores', label: 'Grupos ReID', icon: User },
            { id: 'revisar_ocr', label: 'Foto por Foto', icon: ImageIcon }
          ] : [
            { id: 'perfiles', label: 'Perfiles', icon: User },
            { id: 'revisar', label: 'Revisar', icon: ImageIcon },
            { id: 'dudas', label: 'Dudas', icon: AlertTriangle }
          ]).map((tab) => (
            <button key={tab.id} onClick={() => setVista(tab.id)} className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-bold transition-all duration-300 uppercase tracking-[0.2em] ${vista === tab.id ? 'shadow-sm' : 'hover:bg-gray-50'}`} style={{ background: vista === tab.id ? INK : 'transparent', color: vista === tab.id ? WHITE : TAUPE }}>
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="p-6 md:p-8 max-w-[100rem] mx-auto">
        
        {/* ════════ VISTA: CORREDORES (OCR RE-ID) ════════ */}
        {vista === 'corredores' && isOCR && (
          <div className="flex flex-col lg:flex-row gap-8 relative">
            <aside className="w-full lg:w-80 shrink-0 bg-white rounded-none shadow-sm border p-5 max-h-[80vh] overflow-y-auto custom-scrollbar" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-4 px-2">
                <span className="font-bold text-[10px] uppercase tracking-[0.2em]" style={{ color: TAUPE }}>Pendientes</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-none" style={{ background: CREAM, color: INK }}>{listaCorredores.length}</span>
              </div>
              {cargandoCorredores && listaCorredores.length === 0 ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={20} style={{ color: SAND }} /></div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {corredoresOrdenados.map((c, i) => {
                    const validado = c.dorsal && c.dorsal.trim() !== '';
                    return (
                      <button
                        key={c.id}
                        onClick={() => seleccionarCorredor(c)}
                        className={`flex items-center gap-3 p-2.5 rounded-none transition-all text-left group border ${
                          corredorSeleccionado?.id === c.id ? 'shadow-sm border' : 
                          validado ? 'border-transparent opacity-60 hover:opacity-100' : 'bg-white border-transparent hover:border-gray-200 shadow-sm'
                        }`}
                        style={{ background: corredorSeleccionado?.id === c.id ? INK : (validado ? CREAM : WHITE), color: corredorSeleccionado?.id === c.id ? WHITE : INK, borderColor: corredorSeleccionado?.id === c.id ? 'transparent' : 'rgba(0,0,0,0.05)' }}
                      >
                        <img src={fotoUrl(c.avatar_url, true)} loading="lazy" className="w-10 h-16 rounded-none object-cover shrink-0 filter saturate-[0.8]" style={{ background: CREAM }} alt="" />
                        <div>
                          <span className="font-serif text-base block">{validado ? `#${c.dorsal}` : '⚠️ Sin Número'}</span>
                          <span className="text-[9px] uppercase tracking-[0.2em] block opacity-50">Grupo ReID</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </aside>

            <div className="flex-1 min-w-0">
              {corredorSeleccionado && (
                <>
                  <div className="bg-white rounded-none shadow-sm border p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-6" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center gap-6 w-full">
                      <img src={fotoUrl(corredorSeleccionado.avatar_url, true)} className="w-20 h-28 rounded-none object-cover shadow-sm shrink-0 filter saturate-[0.8]" alt="" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 border-b-2 border-transparent focus-within:border-black transition-colors w-full max-w-xs pb-1 mb-2">
                          <Hash size={24} style={{ color: TAUPE }}/>
                          <input 
                            type="text" 
                            value={dorsalTemporal} 
                            onChange={(e) => setDorsalTemporal(e.target.value)} 
                            onBlur={guardarDorsalGlobal}
                            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} 
                            placeholder="ESCRIBE AQUÍ..." 
                            className="text-4xl font-serif bg-transparent outline-none w-full uppercase placeholder:text-gray-200" 
                            style={{ color: INK }}
                          />
                        </div>
                        <p className="text-[10px] uppercase tracking-[0.1em] mt-2" style={{ color: TAUPE }}>
                          <span className="font-bold" style={{ color: INK }}>{fotosDelCorredor.length}</span> fotografías asociadas.
                        </p>
                      </div>
                    </div>
                    <button onClick={eliminarCorredorFalso} className="p-3 rounded-none transition-all shrink-0" style={{ background: '#FDF8F8', color: '#C0392B' }}><Trash2 size={18} /></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 z-10">
                    {fotosDelCorredor.map((f) => (
                      <div key={f.id} className="bg-white p-3 rounded-none shadow-sm border flex flex-col items-center justify-center group" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                        <div className="flex justify-center rounded-none overflow-hidden w-full h-full" style={{ background: CREAM }}>
                          <div 
                            className="relative inline-block leading-none max-w-full cursor-zoom-in"
                            onClick={() => setZoomCara({ photo_url: f.photo_url, bbox: f.bbox_cuerpo || f.bbox, identidad: null })}
                          >
                            <img 
                              src={fotoUrl(f.photo_url, true)} 
                              className="max-h-[60vh] w-auto max-w-full block filter saturate-[0.9]" 
                              alt="Foto Original" 
                            />
                            <BoundingBox bbox={f.bbox_cuerpo} color={SAND} esCuerpo={true} />
                            <BoundingBox bbox={f.bbox} color={SAND} label={f.dorsal ? `#${f.dorsal}` : '⚠️'} />
                          </div>
                        </div>

                        <div className="w-full mt-3 pt-3 flex justify-between items-center px-1" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                          <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: TAUPE }}>
                            {f.dorsal ? `Dorsal ${f.dorsal}` : 'Sin dorsal'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ════════ VISTA: REVISAR OCR FOTO POR FOTO ════════ */}
        {vista === 'revisar_ocr' && isOCR && (
          <div className="max-w-6xl mx-auto">
            {cargandoRevisar ? (
              <div className="flex justify-center items-center h-64 text-sm font-bold uppercase tracking-[0.2em]" style={{ color: TAUPE }}><Loader2 className="animate-spin mr-2" /> Cargando galería...</div>
            ) : fotosRevisar.length === 0 ? (
              <div className="bg-white p-12 rounded-none text-center font-serif text-lg border border-dashed" style={{ color: TAUPE, borderColor: 'rgba(0,0,0,0.1)' }}>No se detectaron etiquetas.</div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-none shadow-sm border" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                  <div className="px-4">
                    <span className="text-[9px] uppercase tracking-[0.3em]" style={{ color: TAUPE }}>Auditoría por Fotografía</span>
                    <div className="text-3xl font-serif mt-1" style={{ color: INK }}>{idxRevisar + 1} <span style={{ color: 'rgba(0,0,0,0.2)' }}>/</span> {fotosRevisar.length}</div>
                  </div>
                  <div className="flex items-center gap-2 pr-2">
                    <button onClick={() => setIdxRevisar(p => Math.max(0, p - 1))} disabled={idxRevisar === 0} className="p-4 rounded-none disabled:opacity-30 transition-all" style={{ background: CREAM, color: INK }}><ChevronLeft size={20} /></button>
                    <button onClick={() => setIdxRevisar(p => Math.min(fotosRevisar.length - 1, p + 1))} disabled={idxRevisar === fotosRevisar.length - 1} className="p-4 rounded-none disabled:opacity-30 transition-all" style={{ background: INK, color: WHITE }}><ChevronRight size={20} /></button>
                  </div>
                </div>

                {fotoRevisarActual && (
                  <div className="flex flex-col lg:flex-row gap-6">
                    
                    <div className="lg:w-[65%] bg-white rounded-none shadow-sm border p-4 flex items-center justify-center" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                      <div className="flex items-center justify-center w-full h-full rounded-none overflow-hidden" style={{ background: CREAM }}>
                        <div className={`relative inline-block leading-none max-w-full ${modoAñadirDorsal ? 'cursor-crosshair ring-2 ring-[#1C1C1C]' : ''}`}>
                          <img src={fotoUrl(fotoRevisarActual.photo_url)} onClick={manejarClicImagenOCR} alt="Foto" className="max-h-[70vh] w-auto max-w-full block filter saturate-[0.9]" />
                          {fotoRevisarActual.etiquetas?.map((tag) => (
                            <BoundingBox key={`cuerpo-${tag.id}`} bbox={tag.bbox_cuerpo} color={SAND} esCuerpo={true} />
                          ))}
                          {fotoRevisarActual.etiquetas?.map((tag) => (
                            <BoundingBox key={`dorsal-${tag.id}`} bbox={tag.bbox} color={tag.dorsal ? SAND : '#C0392B'} label={tag.dorsal ? `#${tag.dorsal}` : '⚠️ CORREGIR'} onQuitar={() => borrarDorsalIndividual(tag.id)}/>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="lg:w-[35%] flex flex-col gap-4">
                      <div className="bg-white rounded-none shadow-sm border p-6" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                        <p className="text-[10px] uppercase tracking-[0.2em] mb-5" style={{ color: TAUPE }}>Dorsales en esta Imagen</p>
                        <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                          {fotoRevisarActual.etiquetas?.map((tag) => (
                            <div key={tag.id} className="flex items-center gap-3 p-3 rounded-none border focus-within:border-black transition-all" style={{ background: CREAM, borderColor: 'rgba(0,0,0,0.05)' }}>
                              <div className="flex-1">
                                <span className="text-[8px] uppercase tracking-[0.3em] mb-1" style={{ color: TAUPE }}>Número</span>
                                <input defaultValue={tag.dorsal} onBlur={(e) => actualizarDorsalIndividual(tag.id, e.target.value)} className="w-full font-serif text-xl bg-transparent outline-none uppercase" style={{ color: INK }} placeholder="VACÍO" />
                              </div>
                              <button onClick={() => borrarDorsalIndividual(tag.id)} className="p-2 transition-all" style={{ color: '#C0392B' }}><Trash2 size={16} /></button>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => setModoAñadirDorsal(!modoAñadirDorsal)} className="w-full mt-6 py-3.5 rounded-none text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all" style={{ background: modoAñadirDorsal ? INK : CREAM, color: modoAñadirDorsal ? WHITE : INK }}>
                          <PlusCircle size={14}/> {modoAñadirDorsal ? 'Haz clic en la imagen...' : 'Añadir Dorsal Manual'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ════════ VISTA 1: PERFILES (FACIAL) ════════ */}
        {vista === 'perfiles' && !isOCR && (
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="w-full lg:w-72 shrink-0 bg-white rounded-none shadow-sm border p-5 max-h-[80vh] overflow-y-auto custom-scrollbar" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-4 px-2">
                <span className="font-bold text-[10px] uppercase tracking-[0.2em]" style={{ color: TAUPE }}>Perfiles</span>
                <span className="text-xs font-bold px-2 py-0.5" style={{ background: CREAM, color: INK }}>{listaJugadores.length}</span>
              </div>
              {cargandoPerfiles && listaJugadores.length === 0 ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={20} style={{ color: SAND }} /></div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {listaJugadores.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => seleccionarJugador(j)}
                      className={`flex items-center gap-3 p-2.5 rounded-none transition-all text-left group border ${
                        jugadorSeleccionado?.id === j.id ? 'shadow-sm border' : 'hover:bg-gray-50 bg-white border-transparent hover:border-gray-100'
                      }`}
                      style={{ background: jugadorSeleccionado?.id === j.id ? INK : WHITE, color: jugadorSeleccionado?.id === j.id ? WHITE : INK, borderColor: jugadorSeleccionado?.id === j.id ? 'transparent' : 'rgba(0,0,0,0.05)' }}
                    >
                      <img src={fotoUrl(j.avatar_url)} className="w-10 h-10 rounded-full object-cover shrink-0 filter saturate-[0.8]" style={{ background: CREAM }} alt="" />
                      <span className="font-serif text-sm truncate">{j.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </aside>

            <div className="flex-1 min-w-0">
              {jugadorSeleccionado && (
                <>
                  <div className="bg-white rounded-none shadow-sm border p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-6" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center gap-6 w-full">
                      <img src={fotoUrl(jugadorSeleccionado.avatar_url)} className="w-20 h-20 rounded-full object-cover shadow-sm shrink-0 filter saturate-[0.8]" alt="" />
                      <div className="flex-1 min-w-0">
                        {editandoNombre ? (
                          <div className="flex items-center gap-3 mb-2">
                            <input type="text" value={nombreTemporal} onChange={(e) => setNombreTemporal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && guardarNombre()} autoFocus className="text-2xl font-serif border-b focus:border-black px-2 py-1 outline-none w-full max-w-xs transition-colors" style={{ background: CREAM, color: INK, borderColor: 'rgba(0,0,0,0.1)' }} />
                            <button onClick={guardarNombre} className="p-2 transition-colors" style={{ background: INK, color: WHITE }}><Check size={16} /></button>
                            <button onClick={() => setEditandoNombre(false)} className="p-2 transition-colors" style={{ background: CREAM, color: INK }}><X size={16} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-3xl font-serif truncate" style={{ color: INK }}>{jugadorSeleccionado.display_name}</h2>
                            <button onClick={iniciarEdicionNombre} className="p-2 rounded-none transition-colors" style={{ color: TAUPE }}><Edit2 size={14} /></button>
                          </div>
                        )}
                        <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: TAUPE }}>
                          <span className="font-bold" style={{ color: INK }}>{fotosDelJugador.length}</span> fotos únicas · <span className="font-bold" style={{ color: INK }}>{fotosDelJugador.reduce((acc, f) => acc + f.detecciones.length, 0)}</span> detecciones
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setFusionando(!fusionando)} className="px-4 py-2.5 rounded-none text-[9px] uppercase tracking-[0.2em] transition-all flex items-center gap-2" style={{ background: fusionando ? INK : CREAM, color: fusionando ? WHITE : INK }}>
                        <Combine size={14} /> {fusionando ? 'Cancelar Fusión' : 'Fusionar Perfil'}
                      </button>
                      <button onClick={() => { if(window.confirm('¿Seguro que deseas eliminar este perfil por completo?')) destruirPerfilFalso(); }} className="p-2.5 rounded-none transition-all" style={{ background: '#FDF8F8', color: '#C0392B' }} title="Destruir perfil falso permanentemente">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {cargandoPerfiles ? (
                    <div className="flex justify-center items-center h-48 text-[10px] uppercase tracking-[0.3em]" style={{ color: TAUPE }}><Loader2 className="animate-spin mr-2" size={18} /> Cargando datos...</div>
                  ) : fusionando ? (
                    <div className="p-8 rounded-none border mb-6" style={{ background: CREAM, borderColor: SAND }}>
                      <div className="flex items-center gap-3 mb-4"><Combine size={20} style={{ color: INK }} /><h3 className="text-xl font-serif" style={{ color: INK }}>¿Quién es realmente esta persona?</h3></div>
                      <p className="text-xs mb-8" style={{ color: TAUPE }}>Selecciona el perfil real a continuación. Todas las fotos de <b>{jugadorSeleccionado.display_name}</b> se moverán a ese perfil. Este perfil será eliminado.</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                        {listaJugadores.filter(j => j.id !== jugadorSeleccionado.id).map(j => (
                          <button key={j.id} onClick={() => fusionarConJugador(j.id)} className="bg-white p-3 rounded-none flex items-center gap-3 border text-left transition-all hover:shadow-md" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                            <img src={fotoUrl(j.avatar_url)} className="w-10 h-10 rounded-full object-cover shrink-0 filter saturate-[0.8]"/>
                            <span className="font-serif text-sm truncate" style={{ color: INK }}>{j.display_name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 z-10">
                      {fotosDelJugador.map(({ photo_url, detecciones }) => (
                        <div key={photo_url} className="relative bg-white shadow-sm border p-3 flex flex-col justify-between group rounded-none" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                          <div className="flex items-center justify-center w-full rounded-none overflow-hidden h-full" style={{ background: CREAM }}>
                            <div className="relative inline-block leading-none max-w-full cursor-zoom-in" onClick={() => { if (detecciones && detecciones.length > 0) { setZoomCara({ photo_url, bbox: detecciones[0].bbox, identidad: jugadorSeleccionado }); }}}>
                              <img src={fotoUrl(photo_url, true)} loading="lazy" className="w-auto max-w-full max-h-[40vh] block select-none filter saturate-[0.9]" alt="" />
                              {detecciones.map((det) => (
                                <div 
                                  key={det.id}
                                  onClick={(e) => { e.stopPropagation(); setZoomCara({ photo_url, bbox: det.bbox, identidad: jugadorSeleccionado }); }}
                                  className="absolute border-[2px] transition-all rounded-sm z-20 pointer-events-auto cursor-zoom-in hover:bg-white/20"
                                  style={{ left: `${det.bbox.x}%`, top: `${det.bbox.y}%`, width: `${det.bbox.w}%`, height: `${det.bbox.h}%`, borderColor: SAND }}
                                  title="Enfocar este rostro"
                                />
                              ))}
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between px-1 w-full" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 12 }}>
                            <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: TAUPE }}>
                              {detecciones.length === 1 ? '1 Rostro' : `${detecciones.length} Rostros`}
                            </span>
                            <div className="flex gap-1.5">
                              {detecciones.map((det) => (
                                <button 
                                  key={det.id} 
                                  onClick={(e) => { e.stopPropagation(); desvincularDeteccion(det.id); }} 
                                  className="px-2 py-1 transition-colors text-[9px] uppercase tracking-wider flex items-center gap-1"
                                  style={{ background: '#FDF8F8', color: '#C0392B' }}
                                >
                                  <UserMinus size={10} /> Desvincular
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ════════ VISTA 2: REVISAR FOTOS (FACIAL) ════════ */}
        {vista === 'revisar' && !isOCR && (
          <div className="max-w-5xl mx-auto">
             {cargandoRevisar ? (
              <div className="flex justify-center items-center h-64 text-[10px] uppercase tracking-[0.3em]" style={{ color: TAUPE }}><Loader2 className="animate-spin mr-2" /> Cargando galería...</div>
            ) : fotosRevisar.length === 0 ? (
              <div className="bg-white p-12 text-center font-serif text-lg border border-dashed" style={{ color: TAUPE, borderColor: 'rgba(0,0,0,0.1)' }}>No hay fotos registradas.</div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6 bg-white p-4 shadow-sm border" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                  <div className="px-4">
                    <span className="text-[9px] uppercase tracking-[0.3em]" style={{ color: TAUPE }}>Auditoría General</span>
                    <div className="text-3xl font-serif mt-1" style={{ color: INK }}>{idxRevisar + 1} <span style={{ color: 'rgba(0,0,0,0.2)' }}>/</span> {fotosRevisar.length}</div>
                  </div>
                  <div className="flex items-center gap-2 pr-2">
                    <button onClick={() => setIdxRevisar(p => Math.max(0, p - 1))} disabled={idxRevisar === 0} className="p-4 disabled:opacity-30 transition-all" style={{ background: CREAM, color: INK }}><ChevronLeft size={20} /></button>
                    <button onClick={() => setIdxRevisar(p => Math.min(fotosRevisar.length - 1, p + 1))} disabled={idxRevisar === fotosRevisar.length - 1} className="p-4 disabled:opacity-30 transition-all" style={{ background: INK, color: WHITE }}><ChevronRight size={20} /></button>
                  </div>
                </div>

                {fotoRevisarActual && (
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-[65%] bg-white shadow-sm border p-4 flex items-center justify-center" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                      <div className="flex items-center justify-center w-full h-full overflow-hidden" style={{ background: CREAM }}>
                        <div className="relative inline-block leading-none max-w-full">
                          <img src={fotoUrl(fotoRevisarActual.photo_url)} alt="Foto" className="max-h-[70vh] w-auto max-w-full block filter saturate-[0.9]" />
                          {fotoRevisarActual.caras?.map((cara, idx) => (
                            <FaceBadge key={cara.id} cara={cara} color={SAND} esPendiente={confirmDelete === cara.id} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="lg:w-[35%] flex flex-col gap-4">
                      <div className="bg-white shadow-sm border p-6" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                        <p className="text-[9px] uppercase tracking-[0.3em] mb-5" style={{ color: TAUPE }}>Rostros Detectados ({fotoRevisarActual.caras?.length || 0})</p>
                        <div className="flex flex-col gap-3">
                          {fotoRevisarActual.caras?.map((cara, idx) => {
                            const ident = identidadMap[cara.identity_id];
                            const esPendiente = confirmDelete === cara.id;

                            return (
                              <div key={cara.id} className="flex items-center gap-3 p-3 border transition-all" style={{ background: esPendiente ? '#FDF8F8' : CREAM, borderColor: esPendiente ? '#C0392B' : 'rgba(0,0,0,0.05)' }}>
                                {ident ? (
                                  <img src={fotoUrl(ident.avatar_url)} className="w-10 h-10 rounded-full object-cover shrink-0 filter saturate-[0.8]" alt="" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0" style={{ background: WHITE, borderColor: 'rgba(0,0,0,0.1)' }}><span className="font-serif text-xs" style={{ color: TAUPE }}>?</span></div>
                                )}
                                <span className="flex-1 text-sm font-serif truncate" style={{ color: INK }}>{ident ? ident.display_name : <span style={{ color: TAUPE, fontStyle: 'italic' }}>Sin asignar</span>}</span>

                                {!esPendiente ? (
                                  <button onClick={() => setConfirmDelete(cara.id)} className="p-2 transition-all hover:bg-white" style={{ color: TAUPE }}><Trash2 size={16} /></button>
                                ) : (
                                  <div className="flex gap-1">
                                    <button onClick={() => borrarCaraDefinitivamente(cara.id)} className="text-[8px] uppercase tracking-wider px-3 py-1.5 transition-colors" style={{ background: '#C0392B', color: WHITE }}>Borrar</button>
                                    <button onClick={() => setConfirmDelete(null)} className="text-[8px] uppercase tracking-wider px-3 py-1.5 transition-colors border" style={{ background: WHITE, color: INK, borderColor: 'rgba(0,0,0,0.1)' }}>No</button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ════════ VISTA 3: CARAS DUDOSAS (FACIAL) ════════ */}
        {vista === 'dudas' && !isOCR && (
          <div className="max-w-5xl mx-auto">
             {cargandoDudas ? (
              <div className="flex justify-center items-center h-64 text-[10px] uppercase tracking-[0.3em]" style={{ color: TAUPE }}><Loader2 className="animate-spin mr-2" /> Analizando rostros...</div>
            ) : !fotoDudosa ? (
              <div className="p-12 text-center border" style={{ background: '#F8FBF8', borderColor: '#E2F0E2', color: '#2E7D32' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: WHITE }}><Check size={24} /></div>
                <h3 className="font-serif text-2xl mb-2">¡Colección Limpia!</h3>
                <p className="text-xs uppercase tracking-widest font-medium opacity-70">No hay rostros dudosos pendientes.</p>
              </div>
            ) : (
              <div className="bg-white p-8 shadow-sm border flex flex-col md:flex-row gap-12" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                <div className="w-full md:w-[45%] flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-6 uppercase tracking-[0.3em] text-[9px] border px-4 py-1.5" style={{ background: '#FFFDF5', color: '#D4AF37', borderColor: '#F5E6B3' }}>
                    <AlertTriangle size={12} /> Rostro sin identificar
                  </div>
                  <div className="w-full rounded-none p-4 flex items-center justify-center" style={{ background: CREAM }}>
                    <div className="relative inline-block max-w-full shadow-lg border-4 border-white overflow-hidden leading-none">
                      <img src={fotoUrl(fotoDudosa.photo_url)} alt="Dudoso" className="max-h-[50vh] w-auto max-w-full block filter saturate-[0.8]" />
                      {fotoDudosa.bbox && (
                        <>
                          <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                          <div 
                            className="absolute border-[2px] shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] z-10"
                            style={{ left: `${fotoDudosa.bbox.x}%`, top: `${fotoDudosa.bbox.y}%`, width: `${fotoDudosa.bbox.w}%`, height: `${fotoDudosa.bbox.h}%`, borderColor: SAND }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                  <button onClick={descartarDuda} className="mt-8 text-[9px] uppercase tracking-[0.3em] flex items-center gap-2 transition-colors hover:text-[#C0392B]" style={{ color: TAUPE }}><Trash2 size={12}/> Descartar rostro</button>
                </div>

                <div className="w-full md:w-[55%] flex flex-col justify-center">
                  <h3 className="text-3xl font-serif mb-4" style={{ color: INK }}>¿Quién es esta persona?</h3>
                  <p className="text-xs mb-8" style={{ color: TAUPE }}>La IA encontró similitudes. Asigna la identidad correcta para enlazar la foto.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {candidatos.map((candidato) => {
                      const porcentaje = Math.round(candidato.porcentaje_similitud * 100);
                      const esAlto = porcentaje > 50;
                      return (
                        <div key={candidato.id_identidad} className="p-5 flex flex-col items-center border transition-all hover:shadow-md group" style={{ background: WHITE, borderColor: 'rgba(0,0,0,0.06)' }}>
                          <div className="relative mb-4">
                            <img src={fotoUrl(candidato.avatar)} className="w-20 h-20 rounded-full object-cover border-4 shadow-sm filter saturate-[0.8]" style={{ borderColor: WHITE, background: CREAM }} alt="Candidato" />
                            <div className={`absolute -top-2 -right-2 text-[9px] font-bold px-2 py-1 rounded-full border-2 shadow-sm`} style={{ background: esAlto ? '#2E7D32' : '#D4AF37', color: WHITE, borderColor: WHITE }}>
                              {porcentaje}%
                            </div>
                          </div>
                          <p className="font-serif text-[#1A1A1A] text-sm text-center mb-5 truncate w-full px-2">{candidato.nombre_jugador}</p>
                          <button 
                            onClick={() => asignarDudaAJugador(candidato.id_identidad)}
                            className="w-full py-2.5 text-[9px] uppercase tracking-widest transition-all"
                            style={{ background: CREAM, color: INK }}
                            onMouseEnter={e => e.target.style.background = INK} onMouseLeave={e => e.target.style.background = CREAM}
                          >
                            Seleccionar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ════════ MODAL DE ZOOM "LUPA MÁGICA Y COMPARADOR" ════════ */}
      <AnimatePresence>
        {zoomCara && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md transition-opacity duration-300" 
            style={{ background: 'rgba(253,252,248,0.96)' }}
            onClick={() => setZoomCara(null)}
          >
            <div 
              className="relative bg-white p-6 max-w-5xl w-full flex flex-col md:flex-row gap-8 items-center shadow-2xl border rounded-sm" 
              style={{ borderColor: 'rgba(0,0,0,0.06)' }}
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setZoomCara(null)} 
                className="absolute top-4 right-4 p-2 transition-colors z-10"
                style={{ color: TAUPE }}
              >
                <X size={20}/>
              </button>

              {/* LUPA INTERACTIVA (Izquierda) */}
              <InteractiveZoomImage zoomCara={zoomCara} />

              {/* COLUMNA DERECHA: AVATAR Y EDICIÓN RÁPIDA DE NOMBRE */}
              <div className="flex flex-col items-center justify-center w-full md:w-80 shrink-0">
                <div className="text-center mb-8">
                  <h3 className="font-serif text-3xl text-[#1A1A1A] mb-1">Identidad</h3>
                  <p className="text-[9px] uppercase tracking-[0.3em]" style={{ color: TAUPE }}>Perfil Asignado</p>
                </div>
                
                {zoomCara.identidad ? (
                  <div className="flex flex-col items-center w-full px-4">
                    <div className="w-32 h-32 rounded-full overflow-hidden shadow-sm border-[3px] border-white ring-1 ring-black/5 mb-6" style={{ background: CREAM }}>
                      <img src={fotoUrl(zoomCara.identidad.avatar_url)} className="w-full h-full object-cover filter saturate-[0.8]" alt="Perfil Oficial" />
                    </div>
                    
                    <input 
                      type="text" 
                      defaultValue={zoomCara.identidad.display_name}
                      onBlur={(e) => actualizarNombreDesdeModal(zoomCara.identidad.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.target.blur();
                        }
                      }}
                      className="w-full font-serif text-2xl text-center bg-transparent border-b outline-none transition-colors pb-2 focus:border-black"
                      style={{ color: INK, borderColor: 'rgba(0,0,0,0.1)' }}
                      placeholder="Nombre de la persona"
                    />
                    <p className="text-[9px] uppercase tracking-[0.2em] mt-3 text-center" style={{ color: TAUPE }}>
                      Escribe y presiona Enter para guardar
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-32 h-32 rounded-full border border-dashed flex items-center justify-center mx-auto mb-6" style={{ borderColor: TAUPE, background: CREAM }}>
                      <span className="font-serif text-3xl" style={{ color: TAUPE }}>?</span>
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: TAUPE }}>Rostro sin perfil</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ReviewPanel;