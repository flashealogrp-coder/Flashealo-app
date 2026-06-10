import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { RefreshCw, UserMinus, Combine, ArrowLeft, Hash, PlusCircle, Trash2, Edit2, ChevronLeft, ChevronRight, User, Image as ImageIcon, AlertTriangle, XCircle, Check, X } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://muvzhnnsdnztlhynuipd.supabase.co";
const FACE_COLORS = ['#00FF88', '#FF3366', '#33AAFF', '#FFD700', '#FF6B35', '#A855F7', '#22D3EE', '#FB923C', '#F43F5E', '#84CC16'];

const fotoUrl = (path, optimizada = false) => {
  if (!path) return null;
  const base = SUPABASE_URL.endsWith('/') ? SUPABASE_URL.slice(0, -1) : SUPABASE_URL;
  
  // CACHE BUSTER: Agregamos un parámetro de versión para obligar 
  // al servidor de Supabase a ignorar los recortes viejos de ayer.
  const version = "limpieza_total_v1";

  if (optimizada) {
    return `${base}/storage/v1/render/image/public/fotos/${path}?quality=50&format=webp&v=${version}`;
  }
  return `${base}/storage/v1/object/public/fotos/${path}?v=${version}`;
};

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
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap pointer-events-auto">
          <span className="text-white text-[10px] font-black tracking-wider leading-none">
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
      <div className="absolute inset-0 border-[3px] rounded-sm transition-colors duration-300" style={{ borderColor: esPendiente ? '#EF4444' : color, boxShadow: esPendiente ? '0 0 16px rgba(239,68,68,0.8)' : `0 0 12px ${color}88` }} />
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
    <div className="min-h-screen bg-[#F5F2EB] text-[#1A1A1A] font-sans selection:bg-black selection:text-white relative">
      
      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-40 bg-[#F5F2EB]/80 backdrop-blur-xl border-b border-black/5 px-6 md:px-12 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onVolver} className="p-3 bg-white hover:bg-gray-100 rounded-2xl shadow-sm border border-black/5 transition-all"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">{evento.nombre}</h1>
            <p className="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-widest">AUDITORÍA · {evento.tipo_reconocimiento.toUpperCase()}</p>
          </div>
        </div>
        <nav className="flex bg-white rounded-full p-1.5 shadow-sm border border-black/5">
          {(isOCR ? [
            { id: 'corredores', label: 'Grupos ReID', icon: User },
            { id: 'revisar_ocr', label: 'Foto por Foto', icon: ImageIcon }
          ] : [
            { id: 'perfiles', label: 'Perfiles', icon: User },
            { id: 'revisar', label: 'Revisar', icon: ImageIcon },
            { id: 'dudas', label: 'Dudas', icon: AlertTriangle }
          ]).map((tab) => (
            <button key={tab.id} onClick={() => setVista(tab.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 uppercase tracking-wide ${vista === tab.id ? 'bg-[#1A1A1A] text-white shadow-md' : 'text-gray-400 hover:text-[#1A1A1A] hover:bg-gray-50'}`}>
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="p-6 md:p-8 max-w-[100rem] mx-auto">
        
        {/* ════════ VISTA: CORREDORES (OCR RE-ID) ════════ */}
        {vista === 'corredores' && isOCR && (
          <div className="flex flex-col lg:flex-row gap-8 relative">
            <aside className="w-full lg:w-80 shrink-0 bg-white rounded-3xl shadow-sm border border-black/5 p-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-4 px-2">
                <span className="font-bold text-xs uppercase tracking-widest text-gray-400">Pendientes Arriba</span>
                <span className="bg-gray-100 text-[#1A1A1A] text-xs font-bold px-2 py-0.5 rounded-full">{listaCorredores.length}</span>
              </div>
              {cargandoCorredores && listaCorredores.length === 0 ? (
                <div className="flex justify-center py-8 text-gray-300"><RefreshCw className="animate-spin" size={20} /></div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {corredoresOrdenados.map((c, i) => {
                    const validado = c.dorsal && c.dorsal.trim() !== '';
                    return (
                      <button
                        key={c.id}
                        onClick={() => seleccionarCorredor(c)}
                        className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all text-left group border ${
                          corredorSeleccionado?.id === c.id ? 'bg-[#1A1A1A] text-white shadow-md border-black' : 
                          validado ? 'bg-gray-50 border-transparent hover:border-gray-200 opacity-60 hover:opacity-100' : 'bg-white border-transparent hover:border-gray-200 shadow-sm'
                        }`}
                      >
                        <img src={fotoUrl(c.avatar_url, true)} loading="lazy" className="w-10 h-16 rounded-xl object-cover bg-gray-200 shrink-0" alt="" />
                        <div>
                          <span className="font-black text-base block">{validado ? `#${c.dorsal}` : '⚠️ Sin Número'}</span>
                          <span className="text-[10px] uppercase font-bold block opacity-50">Grupo ReID</span>
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
                  <div className="bg-white rounded-3xl shadow-sm border border-black/5 p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6 w-full">
                      <img src={fotoUrl(corredorSeleccionado.avatar_url, true)} className="w-20 h-28 rounded-2xl object-cover shadow-sm ring-4 ring-white shrink-0" alt="" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 border-b-2 border-transparent focus-within:border-black transition-colors w-full max-w-xs pb-1 mb-2">
                          <Hash className="text-gray-400" size={24}/>
                          <input 
                            type="text" 
                            value={dorsalTemporal} 
                            onChange={(e) => setDorsalTemporal(e.target.value)} 
                            onBlur={guardarDorsalGlobal}
                            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} 
                            placeholder="ESCRIBE AQUÍ..." 
                            className="text-4xl font-black bg-transparent outline-none w-full uppercase placeholder:text-gray-200" 
                          />
                        </div>
                        <p className="text-gray-400 text-sm mt-1 font-medium">
                          <span className="font-bold text-[#1A1A1A]">{fotosDelCorredor.length}</span> fotografías asociadas. Escribe y haz clic fuera para guardar.
                        </p>
                      </div>
                    </div>
                    <button onClick={eliminarCorredorFalso} className="p-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shrink-0"><Trash2 size={18} /></button>
                  </div>

                  {/* NUEVA ESTRUCTURA "HUGGING" PARA QUE LA CAJA Y LA FOTO COINCIDAN */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 z-10">
                    {fotosDelCorredor.map((f) => (
                      <div key={f.id} className="bg-white p-3 rounded-2xl shadow-sm border border-black/5 flex flex-col items-center justify-center group">
                        
                        {/* El wrapper ajustado milimétricamente a la imagen */}
                        <div className="flex justify-center bg-gray-50 rounded-xl overflow-hidden w-full h-full">
                          <div 
                            className="relative inline-block leading-none max-w-full cursor-zoom-in"
                            onClick={() => setZoomCara({ photo_url: f.photo_url, bbox: f.bbox_cuerpo || f.bbox })}
                          >
                            <img 
                              src={fotoUrl(f.photo_url, true)} 
                              className="max-h-[60vh] w-auto max-w-full block" 
                              alt="Foto Original" 
                            />
                            <BoundingBox bbox={f.bbox_cuerpo} color="#33AAFF" esCuerpo={true} />
                            <BoundingBox bbox={f.bbox} color="#00FF88" label={f.dorsal ? `#${f.dorsal}` : '⚠️'} />
                          </div>
                        </div>

                        <div className="w-full mt-3 pt-3 border-t border-gray-100 flex justify-between items-center px-1">
                          <span className="text-[10px] font-black text-gray-400 uppercase">
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

        {/* ════════ VISTA: REVISAR OCR FOTO POR FOTO (COMPLEMENTO) ════════ */}
        {vista === 'revisar_ocr' && isOCR && (
          <div className="max-w-6xl mx-auto">
            {cargandoRevisar ? (
              <div className="flex justify-center items-center h-64 text-gray-400 font-bold"><RefreshCw className="animate-spin mr-2" /> Cargando galería...</div>
            ) : fotosRevisar.length === 0 ? (
              <div className="bg-white text-gray-400 p-12 rounded-3xl text-center font-bold text-lg border border-dashed border-gray-200">No se detectaron etiquetas en este maratón.</div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-3xl shadow-sm border border-black/5">
                  <div className="px-4">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Auditoría por Fotografía</span>
                    <div className="text-2xl font-black mt-1 text-[#1A1A1A]">{idxRevisar + 1} <span className="text-gray-300 font-medium">/</span> {fotosRevisar.length}</div>
                  </div>
                  <div className="flex items-center gap-2 pr-2">
                    <button onClick={() => setIdxRevisar(p => Math.max(0, p - 1))} disabled={idxRevisar === 0} className="p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 disabled:opacity-30 transition-all text-[#1A1A1A]"><ChevronLeft size={20} /></button>
                    <button onClick={() => setIdxRevisar(p => Math.min(fotosRevisar.length - 1, p + 1))} disabled={idxRevisar === fotosRevisar.length - 1} className="p-4 rounded-2xl bg-[#1A1A1A] hover:bg-black text-white disabled:opacity-30 transition-all"><ChevronRight size={20} /></button>
                  </div>
                </div>

                {fotoRevisarActual && (
                  <div className="flex flex-col lg:flex-row gap-6">
                    
                    <div className="lg:w-[65%] bg-white rounded-3xl shadow-sm border border-black/5 p-4 flex items-center justify-center">
                      <div className="flex items-center justify-center w-full h-full bg-gray-50 rounded-xl overflow-hidden">
                        <div className={`relative inline-block leading-none max-w-full ${modoAñadirDorsal ? 'cursor-crosshair ring-4 ring-blue-500 rounded-xl' : ''}`}>
                          <img src={fotoUrl(fotoRevisarActual.photo_url)} onClick={manejarClicImagenOCR} alt="Foto" className="max-h-[70vh] w-auto max-w-full block rounded-xl" />
                          {fotoRevisarActual.etiquetas?.map((tag) => (
                            <BoundingBox key={`cuerpo-${tag.id}`} bbox={tag.bbox_cuerpo} color="#33AAFF" esCuerpo={true} />
                          ))}
                          {fotoRevisarActual.etiquetas?.map((tag) => (
                            <BoundingBox key={`dorsal-${tag.id}`} bbox={tag.bbox} color={tag.dorsal ? '#00FF88' : '#FFD700'} label={tag.dorsal ? `#${tag.dorsal}` : '⚠️ CORREGIR'} onQuitar={() => borrarDorsalIndividual(tag.id)}/>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="lg:w-[35%] flex flex-col gap-4">
                      <div className="bg-white rounded-3xl shadow-sm border border-black/5 p-6">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-5">Dorsales en esta Imagen</p>
                        <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                          {fotoRevisarActual.etiquetas?.map((tag) => (
                            <div key={tag.id} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-gray-50 focus-within:border-black transition-all">
                              <div className="flex-1">
                                <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider mb-0.5">Número</span>
                                <input defaultValue={tag.dorsal} onBlur={(e) => actualizarDorsalIndividual(tag.id, e.target.value)} className="w-full font-black text-xl bg-transparent outline-none uppercase" placeholder="VACÍO" />
                              </div>
                              <button onClick={() => borrarDorsalIndividual(tag.id)} className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-white transition-all"><Trash2 size={16} /></button>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => setModoAñadirDorsal(!modoAñadirDorsal)} className={`w-full mt-4 py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${modoAñadirDorsal ? 'bg-blue-600 text-white' : 'bg-gray-100 text-[#1A1A1A] hover:bg-gray-200'}`}>
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

        {/* ════════ VISTA 1: PERFILES (SOLO FACIAL ORIGINAL) ════════ */}
        {vista === 'perfiles' && !isOCR && (
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="w-full lg:w-72 shrink-0 bg-white rounded-3xl shadow-sm border border-black/5 p-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-4 px-2">
                <span className="font-bold text-xs uppercase tracking-widest text-gray-400">Jugadores</span>
                <span className="bg-gray-100 text-[#1A1A1A] text-xs font-bold px-2 py-0.5 rounded-full">{listaJugadores.length}</span>
              </div>
              {cargandoPerfiles && listaJugadores.length === 0 ? (
                <div className="flex justify-center py-8 text-gray-300"><RefreshCw className="animate-spin" size={20} /></div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {listaJugadores.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => seleccionarJugador(j)}
                      className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all text-left group ${
                        jugadorSeleccionado?.id === j.id ? 'bg-[#1A1A1A] text-white shadow-md' : 'hover:bg-gray-50 bg-white border border-transparent hover:border-gray-100'
                      }`}
                    >
                      <img src={fotoUrl(j.avatar_url)} className="w-10 h-10 rounded-full object-cover bg-gray-200 border-2 border-white/10 shrink-0" alt="" />
                      <span className="font-bold text-sm truncate">{j.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </aside>

            <div className="flex-1 min-w-0">
              {jugadorSeleccionado && (
                <>
                  <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/5 p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6 w-full">
                      <img src={fotoUrl(jugadorSeleccionado.avatar_url)} className="w-20 h-20 rounded-full object-cover shadow-[0_4px_12px_rgba(0,0,0,0.15)] ring-4 ring-white" alt="" />
                      <div className="flex-1 min-w-0">
                        {editandoNombre ? (
                          <div className="flex items-center gap-3">
                            <input type="text" value={nombreTemporal} onChange={(e) => setNombreTemporal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && guardarNombre()} autoFocus className="text-2xl font-black bg-gray-50 border-2 border-gray-200 focus:border-black rounded-xl px-4 py-1.5 outline-none w-full max-w-xs transition-colors" />
                            <button onClick={guardarNombre} className="bg-[#1A1A1A] text-white p-2.5 rounded-xl hover:bg-black transition-colors"><Check size={18} /></button>
                            <button onClick={() => setEditandoNombre(false)} className="bg-gray-100 text-gray-400 p-2.5 rounded-xl hover:text-black transition-colors"><X size={18} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-black truncate">{jugadorSeleccionado.display_name}</h2>
                            <button onClick={iniciarEdicionNombre} className="text-gray-300 hover:text-black transition-colors p-2 rounded-xl hover:bg-gray-100"><Edit2 size={16} /></button>
                          </div>
                        )}
                        <p className="text-gray-400 text-sm mt-1">
                          <span className="font-bold text-[#1A1A1A]">{fotosDelJugador.length}</span> fotos únicas · <span className="font-bold text-[#1A1A1A]">{fotosDelJugador.reduce((acc, f) => acc + f.detecciones.length, 0)}</span> detecciones
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setFusionando(!fusionando)} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${fusionando ? 'bg-blue-100 text-blue-700 shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} title="Mover estas fotos a otro jugador">
                        <Combine size={16} /> {fusionando ? 'Cancelar Fusión' : 'Fusionar Perfil'}
                      </button>
                      <button onClick={() => { if(window.confirm('¿Seguro que deseas eliminar este perfil por completo?')) destruirPerfilFalso(); }} className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all" title="Destruir perfil falso permanentemente">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {cargandoPerfiles ? (
                    <div className="flex justify-center items-center h-48 text-gray-400"><RefreshCw className="animate-spin mr-2" size={18} /> Cargando datos...</div>
                  ) : fusionando ? (
                    <div className="bg-blue-50 border border-blue-100 p-8 rounded-3xl animate-in fade-in slide-in-from-top-4">
                      <div className="flex items-center gap-3 mb-2"><Combine className="text-blue-500" size={24} /><h3 className="text-2xl font-black text-blue-900">¿Quién es realmente esta persona?</h3></div>
                      <p className="text-blue-700 text-sm mb-8">Selecciona el perfil real a continuación. Todas las fotos de <b>{jugadorSeleccionado.display_name}</b> se moverán a ese perfil. Este perfil será eliminado.</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                        {listaJugadores.filter(j => j.id !== jugadorSeleccionado.id).map(j => (
                          <button key={j.id} onClick={() => fusionarConJugador(j.id)} className="bg-white p-3 rounded-2xl flex items-center gap-3 hover:shadow-md hover:-translate-y-1 transition-all border border-blue-100/50 text-left">
                            <img src={fotoUrl(j.avatar_url)} className="w-10 h-10 rounded-full object-cover shrink-0"/>
                            <span className="font-bold text-sm truncate text-blue-900">{j.display_name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* MULTI-GRID GRANDE Y COMPLETO CON HUGGING EXACTO */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 z-10">
                      {fotosDelJugador.map(({ photo_url, detecciones }) => (
                        <div 
                          key={photo_url} 
                          className="relative rounded-2xl bg-white shadow-sm border border-black/5 p-3 flex flex-col justify-between group"
                        >
                          <div className="flex items-center justify-center w-full bg-gray-50 rounded-xl overflow-hidden h-full">
                            <div 
                              className="relative inline-block leading-none max-w-full cursor-zoom-in"
                              onClick={() => {
                                if (detecciones && detecciones.length > 0) {
                                  setZoomCara({ photo_url, bbox: detecciones[0].bbox });
                                }
                              }}
                            >
                              <img 
                                src={fotoUrl(photo_url, true)} 
                                loading="lazy" 
                                className="w-auto max-w-full max-h-[65vh] block select-none rounded-lg" 
                                alt="" 
                              />
                              
                              {detecciones.map((det) => (
                                <div 
                                  key={det.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setZoomCara({ photo_url, bbox: det.bbox });
                                  }}
                                  className="absolute border-2 border-[#00FF88] shadow-[0_0_12px_#00FF8888] hover:bg-[#00FF88]/20 transition-all rounded-sm z-20 pointer-events-auto cursor-zoom-in"
                                  style={{ left: `${det.bbox.x}%`, top: `${det.bbox.y}%`, width: `${det.bbox.w}%`, height: `${det.bbox.h}%` }}
                                  title="Enfocar este rostro"
                                />
                              ))}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between px-1 w-full">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                              {detecciones.length === 1 ? '1 Rostro Registrado' : `${detecciones.length} Rostros`}
                            </span>
                            <div className="flex gap-1.5">
                              {detecciones.map((det) => (
                                <button 
                                  key={det.id} 
                                  onClick={(e) => { e.stopPropagation(); desvincularDeteccion(det.id); }} 
                                  className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-xl transition-colors text-xs font-bold flex items-center gap-1 shadow-sm"
                                >
                                  <UserMinus size={13} /> Desvincular
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

        {/* ════════ VISTA 2: REVISAR FOTOS (SOLO FACIAL ORIGINAL) ════════ */}
        {vista === 'revisar' && !isOCR && (
          <div className="max-w-5xl mx-auto">
             {cargandoRevisar ? (
              <div className="flex justify-center items-center h-64 text-gray-400 font-bold"><RefreshCw className="animate-spin mr-2" /> Cargando todas las fotos...</div>
            ) : fotosRevisar.length === 0 ? (
              <div className="bg-white text-gray-400 p-12 rounded-3xl text-center font-bold text-lg border border-dashed border-gray-200">No hay fotos registradas.</div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-3xl shadow-sm border border-black/5">
                  <div className="px-4">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Auditoría General</span>
                    <div className="text-2xl font-black mt-1 text-[#1A1A1A]">{idxRevisar + 1} <span className="text-gray-300 font-medium">/</span> {fotosRevisar.length}</div>
                  </div>
                  <div className="flex items-center gap-2 pr-2">
                    <button onClick={() => setIdxRevisar(p => Math.max(0, p - 1))} disabled={idxRevisar === 0} className="p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 disabled:opacity-30 transition-all text-[#1A1A1A]"><ChevronLeft size={20} /></button>
                    <button onClick={() => setIdxRevisar(p => Math.min(fotosRevisar.length - 1, p + 1))} disabled={idxRevisar === fotosRevisar.length - 1} className="p-4 rounded-2xl bg-[#1A1A1A] hover:bg-black text-white disabled:opacity-30 transition-all"><ChevronRight size={20} /></button>
                  </div>
                </div>

                {fotoRevisarActual && (
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-[65%] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/5 p-4 flex items-center justify-center">
                      <div className="flex items-center justify-center w-full h-full bg-gray-50 rounded-xl overflow-hidden">
                        <div className="relative inline-block leading-none max-w-full">
                          <img src={fotoUrl(fotoRevisarActual.photo_url)} alt="Foto" className="max-h-[70vh] w-auto max-w-full block rounded-xl" />
                          {fotoRevisarActual.caras?.map((cara, idx) => (
                            <FaceBadge key={cara.id} cara={cara} color={FACE_COLORS[idx % FACE_COLORS.length]} esPendiente={confirmDelete === cara.id} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="lg:w-[35%] flex flex-col gap-4">
                      <div className="bg-white rounded-3xl shadow-sm border border-black/5 p-6">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-5">Rostros Detectados ({fotoRevisarActual.caras?.length || 0})</p>
                        <div className="flex flex-col gap-3">
                          {fotoRevisarActual.caras?.map((cara, idx) => {
                            const ident = identidadMap[cara.identity_id];
                            const color = FACE_COLORS[idx % FACE_COLORS.length];
                            const esPendiente = confirmDelete === cara.id;

                            return (
                              <div key={cara.id} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${esPendiente ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                                <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ background: color }} />
                                {ident ? (
                                  <img src={fotoUrl(ident.avatar_url)} className="w-10 h-10 rounded-full object-cover bg-gray-200 border border-white shrink-0" alt="" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gray-200 border border-white shrink-0 flex items-center justify-center"><span className="text-gray-400 font-bold text-xs">?</span></div>
                                )}
                                <span className="flex-1 text-sm font-bold truncate text-[#1A1A1A]">{ident ? ident.display_name : <span className="text-gray-400 italic">Sin asignar</span>}</span>

                                {!esPendiente ? (
                                  <button onClick={() => setConfirmDelete(cara.id)} className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-white transition-all"><Trash2 size={16} /></button>
                                ) : (
                                  <div className="flex gap-1">
                                    <button onClick={() => borrarCaraDefinitivamente(cara.id)} className="text-[10px] font-bold uppercase tracking-wider bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors shadow-sm">Borrar</button>
                                    <button onClick={() => setConfirmDelete(null)} className="text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-300 transition-colors">No</button>
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

        {/* ════════ VISTA 3: CARAS DUDOSAS (SOLO FACIAL ORIGINAL) ════════ */}
        {vista === 'dudas' && !isOCR && (
          <div className="max-w-5xl mx-auto">
             {cargandoDudas ? (
              <div className="flex justify-center items-center h-64 text-gray-400 font-bold"><RefreshCw className="animate-spin mr-2" /> Analizando rostros dudosos...</div>
            ) : !fotoDudosa ? (
              <div className="bg-green-50 text-green-700 p-12 rounded-3xl text-center shadow-sm border border-green-200">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"><Check size={32} className="text-green-600"/></div>
                <h3 className="font-black text-2xl mb-2">¡Bandeja Limpia!</h3>
                <p className="font-medium">No hay caras dudosas pendientes de asignación.</p>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col md:flex-row gap-12">
                <div className="w-full md:w-[45%] flex flex-col items-center">
                  <div className="flex items-center gap-2 text-amber-600 font-black mb-6 uppercase tracking-[0.2em] text-[10px] bg-amber-50 border border-amber-200 px-4 py-1.5 rounded-full shadow-sm">
                    <AlertTriangle size={14} /> Rostro sin identificar
                  </div>
                  <div className="w-full bg-gray-100 rounded-3xl p-4 flex items-center justify-center">
                    <div className="relative inline-block max-w-full shadow-lg border-4 border-white rounded-xl overflow-hidden leading-none">
                      <img src={fotoUrl(fotoDudosa.photo_url)} alt="Dudoso" className="max-h-[50vh] w-auto max-w-full block opacity-90" />
                      {fotoDudosa.bbox && (
                        <>
                          <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                          <div 
                            className="absolute border-4 border-amber-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] z-10 rounded-lg"
                            style={{ left: `${fotoDudosa.bbox.x}%`, top: `${fotoDudosa.bbox.y}%`, width: `${fotoDudosa.bbox.w}%`, height: `${fotoDudosa.bbox.h}%` }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                  <button onClick={descartarDuda} className="mt-8 text-xs font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest flex items-center gap-2 transition-colors"><Trash2 size={14}/> Descartar rostro (Basura)</button>
                </div>

                <div className="w-full md:w-[55%] flex flex-col justify-center">
                  <h3 className="text-3xl font-black mb-2 text-[#1A1A1A]">¿Quién es esta persona?</h3>
                  <p className="text-gray-500 mb-8 font-medium">La IA encontró similitudes. Asigna la identidad correcta para enlazar la foto.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {candidatos.map((candidato) => {
                      const porcentaje = Math.round(candidato.porcentaje_similitud * 100);
                      const esAlto = porcentaje > 50;
                      return (
                        <div key={candidato.id_identidad} className="bg-gray-50 p-5 rounded-3xl flex flex-col items-center border border-gray-100 hover:border-gray-300 transition-all hover:-translate-y-1 hover:shadow-md group">
                          <div className="relative mb-4">
                            <img src={fotoUrl(candidato.avatar)} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-sm bg-gray-200" alt="Candidato" />
                            <div className={`absolute -top-2 -right-2 text-[10px] font-black px-2 py-1 rounded-full border-2 border-white shadow-sm ${esAlto ? 'bg-green-500 text-white' : 'bg-amber-400 text-amber-900'}`}>
                              {porcentaje}%
                            </div>
                          </div>
                          <p className="font-bold text-[#1A1A1A] text-sm text-center mb-5 truncate w-full px-2">{candidato.nombre_jugador}</p>
                          <button 
                            onClick={() => asignarDudaAJugador(candidato.id_identidad)}
                            className="w-full bg-white border border-gray-200 text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
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

      {/* ════════ MODAL DE ZOOM "LUPA MÁGICA" ════════ */}
      {zoomCara && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm transition-opacity duration-300" 
          onClick={() => setZoomCara(null)}
        >
          <div 
            className="relative bg-white p-6 rounded-3xl max-w-4xl w-full flex flex-col md:flex-row gap-8 items-center shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setZoomCara(null)} 
              className="absolute top-4 right-4 bg-gray-100 text-gray-500 hover:text-black hover:bg-gray-200 p-2.5 rounded-full transition-colors z-10"
            >
              <X size={20}/>
            </button>

            {/* COLUMNA IZQUIERDA: CONTEXTO GENERAL EXACTO */}
            <div className="flex-1 relative rounded-2xl overflow-hidden bg-gray-50 border border-gray-200 h-[50vh] w-full flex items-center justify-center">
               <div className="relative inline-block max-w-full max-h-full leading-none">
                 <img src={fotoUrl(zoomCara.photo_url, true)} className="max-h-[50vh] w-auto max-w-full block rounded-lg" alt="Contexto" />
                 <BoundingBox bbox={zoomCara.bbox} color="#00FF88" label="Rostro Auditado" />
               </div>
            </div>

            {/* COLUMNA DERECHA: ZOOM MATEMÁTICO REAL */}
            <div className="flex flex-col items-center justify-center w-full md:w-80 shrink-0">
              <div className="text-center mb-6">
                <h3 className="font-black text-2xl uppercase tracking-tight text-[#1A1A1A]">Foco de Rostro</h3>
                <p className="text-xs text-gray-400 font-bold tracking-widest mt-1">Corte Dinámico Seguro</p>
              </div>
              
              <div className="w-64 h-64 rounded-full border-8 border-[#00FF88]/20 overflow-hidden relative shadow-inner bg-gray-900 ring-4 ring-white flex items-center justify-center">
                {zoomCara.bbox && (
                  <img
                    src={fotoUrl(zoomCara.photo_url, false)} 
                    className="w-full h-full object-cover max-w-none"
                    style={{
                      objectPosition: `${zoomCara.bbox.x + (zoomCara.bbox.w / 2)}% ${zoomCara.bbox.y + (zoomCara.bbox.h / 2)}%`,
                      transform: `scale(${100 / Math.max(zoomCara.bbox.w, zoomCara.bbox.h) * 1.5})`
                    }}
                    alt="Zoom"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReviewPanel;