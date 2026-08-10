import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { UserMinus, Combine, Loader2, Hash, Trash2, Edit2, User, AlertTriangle, Check, X, Zap, ArrowLeft, ScanFace, ScanLine } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://muvzhnnsdnztlhynuipd.supabase.co";

// 🌟 LEYENDO TU DOMINIO PÚBLICO DESDE EL .ENV
const R2_PUBLIC_URL = import.meta.env.VITE_R2_DOMINIO_PUBLICO || "https://cdn.flashealo.do"; 

const fotoUrl = (path, optimizada = false) => {
  if (!path) return null;
  
  let cleanPath = path;
  // Si por error la DB guardó la URL completa de Supabase, la limpiamos y extraemos solo la ruta útil
  if (cleanPath.startsWith('http')) {
    try {
      const url = new URL(cleanPath);
      cleanPath = url.pathname;
      if (cleanPath.includes('fotos/')) {
          cleanPath = cleanPath.split('fotos/')[1]; // Extrae "originales/foto.jpg"
      }
    } catch(e) {}
  }

  // Asegurarnos de que no empiece con un slash (/)
  if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);

  const base = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
  
  // 1. Avatares (ya son súper ligeros)
  if (cleanPath.includes('avatares/')) {
    return `${base}/${cleanPath}`;
  }

  // 2. Modo rápido para Grillas
  if (optimizada) {
    let optimizedPath = cleanPath;
    if (optimizedPath.includes('originales/')) {
      optimizedPath = optimizedPath.replace('originales/', 'watermarks/');
    } else if (!optimizedPath.includes('watermarks/')) {
      const nombreArchivo = optimizedPath.split('/').pop();
      optimizedPath = `watermarks/${nombreArchivo}`;
    }
    return `${base}/${optimizedPath}`;
  }

  // 3. Original HD
  return `${base}/${cleanPath}`;
};

const SAND   = '#C8B99A';
const TAUPE  = '#9A8F82';
const INK    = '#1C1C1C';
const CREAM  = '#FDFCF8';

// 🌟 NUEVO COMPONENTE: Imagen Inteligente con Loader 🌟
const CargadorImagen = ({ src, alt, className }) => {
  const [cargada, setCargada] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={`relative flex items-center justify-center bg-[#0A0A0A] ${className}`}>
      {/* Spinner de carga elegante */}
      {!cargada && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="animate-spin text-[#C8B99A]/40" size={24} />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setCargada(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover transition-opacity duration-500 ${cargada ? 'opacity-100 filter saturate-50 group-hover:saturate-100' : 'opacity-0'}`}
      />
      {/* Si la miniatura no existe en la nube, muestra un icono de alerta sutil */}
      {error && <AlertTriangle size={24} className="text-red-900/50 absolute" title="Foto no encontrada" />}
    </div>
  );
};


const BoundingBox = ({ bbox, color, label, esCuerpo }) => {
  if (!bbox) return null;
  return (
    <div className="absolute z-10 pointer-events-none transition-all duration-300 group" style={{ left: `${bbox.x}%`, top: `${bbox.y}%`, width: `${bbox.w}%`, height: `${bbox.h}%` }}>
      <div className="absolute inset-0 border-[2px] rounded-sm transition-colors duration-300" style={{ borderColor: color, borderStyle: esCuerpo ? 'dashed' : 'solid', boxShadow: esCuerpo ? 'none' : `0 0 12px ${color}88` }} />
      {!esCuerpo && label && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-sm shadow-sm whitespace-nowrap">
          <span className="text-white text-[10px] uppercase tracking-[0.2em] leading-none">{label}</span>
        </div>
      )}
    </div>
  );
};

const InteractiveZoomImage = ({ zoomCara }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    setPos({ x: ((e.clientX - left) / width) * 100, y: ((e.clientY - top) / height) * 100 });
  };

  return (
    <div className="flex-1 relative overflow-hidden border h-[50vh] w-full flex items-center justify-center rounded-sm bg-[#111] border-[#333]">
      <div 
        className="relative inline-block max-w-full max-h-full leading-none cursor-crosshair"
        onMouseEnter={() => setIsZoomed(true)} onMouseLeave={() => setIsZoomed(false)} onMouseMove={handleMouseMove}
        style={{ transform: isZoomed ? 'scale(2.5)' : 'scale(1)', transformOrigin: `${pos.x}% ${pos.y}%`, transition: 'transform 0.2s ease-out' }}
      >
        <img src={fotoUrl(zoomCara.photo_url, true)} className="max-h-[50vh] w-auto max-w-full block filter saturate-[0.8]" alt="Contexto" draggable={false} />
        <BoundingBox bbox={zoomCara.bbox} color={SAND} label="Auditoría" />
      </div>
      {!isZoomed && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full pointer-events-none text-white text-[9px] uppercase tracking-widest opacity-60">Pasa el mouse para explorar</div>}
    </div>
  );
};

export default function ReviewPanel({ evento, onVolver, onEjecutarIA, procesandoIA }) {
  const isOCR = evento.tipo_reconocimiento === 'ocr';
  const [vista, setVista] = useState(isOCR ? 'corredores' : 'perfiles'); 
  const [zoomCara, setZoomCara] = useState(null);

  // 🌟 NUEVO: Estado para el Resumen (Header)
  const [stats, setStats] = useState({ caras: 0, dorsales: 0, dudas: 0, cargando: true });

  // Estados Perfiles (Facial)
  const [listaJugadores, setListaJugadores] = useState([]);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [fotosDelJugador, setFotosDelJugador] = useState([]);
  const [cargandoPerfiles, setCargandoPerfiles] = useState(false);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombreTemporal, setNombreTemporal] = useState('');
  
  const [fusionando, setFusionando] = useState(false);
  const [candidatosFusion, setCandidatosFusion] = useState([]);

  // Estados OCR
  const [listaCorredores, setListaCorredores] = useState([]);
  const [corredorSeleccionado, setCorredorSeleccionado] = useState(null);
  const [fotosDelCorredor, setFotosDelCorredor] = useState([]);
  const [cargandoCorredores, setCargandoCorredores] = useState(false);
  const [dorsalTemporal, setDorsalTemporal] = useState('');

  // Estados Dudas
  const [fotoDudosa, setFotoDudosa] = useState(null);
  const [candidatosDuda, setCandidatosDuda] = useState([]);
  const [cargandoDudas, setCargandoDudas] = useState(false);

  // 🌟 NUEVO: Función para cargar las estadísticas iniciales
  const cargarStats = useCallback(async () => {
    setStats(prev => ({ ...prev, cargando: true }));
    const [resCaras, resDorsales, resDudas] = await Promise.all([
      supabase.from('identities').select('id', { count: 'exact' }).eq('evento_id', evento.id),
      supabase.from('etiquetas_fotos').select('id', { count: 'exact' }).eq('evento_id', evento.id),
      supabase.from('face_detections').select('id', { count: 'exact' }).eq('evento_id', evento.id).is('identity_id', null)
    ]);
    setStats({ caras: resCaras.count || 0, dorsales: resDorsales.count || 0, dudas: resDudas.count || 0, cargando: false });
  }, [evento.id]);

  useEffect(() => { cargarStats(); }, [cargarStats]);

  const cargarCorredores = useCallback(async () => { 
    setCargandoCorredores(true);
    const { data } = await supabase.from('corredores').select('*').eq('evento_id', evento.id);
    setListaCorredores(data || []); 
    if (data?.length > 0 && !corredorSeleccionado) seleccionarCorredor(data[0]); 
    setCargandoCorredores(false);
  }, [evento.id, corredorSeleccionado]);

  const seleccionarCorredor = async (corredor) => { 
    setCorredorSeleccionado(corredor); setCargandoCorredores(true);
    const { data } = await supabase.from('etiquetas_fotos').select('*').eq('corredor_id', corredor.id);
    setFotosDelCorredor(data || []); 
    setDorsalTemporal(corredor.dorsal || '');
    setCargandoCorredores(false);
  };

  const guardarDorsalGlobal = async () => { 
    const num = dorsalTemporal.trim().toUpperCase(); 
    if (num === (corredorSeleccionado.dorsal || '')) return;
    await supabase.from('corredores').update({ dorsal: num }).eq('id', corredorSeleccionado.id);
    await supabase.from('etiquetas_fotos').update({ dorsal: num }).eq('corredor_id', corredorSeleccionado.id);
    setCorredorSeleccionado(prev => ({ ...prev, dorsal: num })); 
    setListaCorredores(prev => prev.map(c => c.id === corredorSeleccionado.id ? { ...c, dorsal: num } : c)); 
  };

  const cargarJugadores = useCallback(async () => { 
    setCargandoPerfiles(true);
    const { data } = await supabase.from('identities').select('id, display_name, avatar_url, embedding_promedio').eq('evento_id', evento.id).order('display_name');
    if (data) { setListaJugadores(data); if (data.length > 0 && !jugadorSeleccionado) seleccionarJugador(data[0]); }
    setCargandoPerfiles(false);
  }, [evento.id, jugadorSeleccionado]);

  const seleccionarJugador = async (jugador) => { 
    setJugadorSeleccionado(jugador); setEditandoNombre(false); setFusionando(false); setCargandoPerfiles(true);
    const { data } = await supabase.from('face_detections').select('*').eq('identity_id', jugador.id).eq('evento_id', evento.id);
    if (data) {
      const mapa = {};
      data.forEach(det => {
        const key = det.photo_url;
        if (!mapa[key]) mapa[key] = { photo_url: key, detecciones: [] };
        mapa[key].detecciones.push(det);
      });
      setFotosDelJugador(Object.values(mapa));
    }
    setCargandoPerfiles(false);
  };

  const guardarNombre = async () => {
    if (!nombreTemporal.trim()) return;
    await supabase.from('identities').update({ display_name: nombreTemporal.trim() }).eq('id', jugadorSeleccionado.id);
    setJugadorSeleccionado(prev => ({ ...prev, display_name: nombreTemporal.trim() })); 
    setListaJugadores(prev => prev.map(j => (j.id === jugadorSeleccionado.id ? { ...j, display_name: nombreTemporal.trim() } : j))); 
    setEditandoNombre(false);
  };

  const iniciarFusion = async () => {
    setFusionando(true);
    if (jugadorSeleccionado?.embedding_promedio) {
      const { data } = await supabase.rpc('sugerir_candidatos', { huella_dudosa: jugadorSeleccionado.embedding_promedio, limite_resultados: 4, id_evento: evento.id });
      setCandidatosFusion((data || []).filter(s => s.id_identidad !== jugadorSeleccionado.id));
    }
  };

  const fusionarConJugador = async (idDestino) => {
    await supabase.from('face_detections').update({ identity_id: idDestino }).eq('identity_id', jugadorSeleccionado.id);
    await supabase.from('identities').delete().eq('id', jugadorSeleccionado.id);
    setJugadorSeleccionado(null); cargarJugadores(); cargarStats();
  };

  const destruirPerfilFalso = async () => {
    await supabase.from('face_detections').delete().eq('identity_id', jugadorSeleccionado.id);
    await supabase.from('identities').delete().eq('id', jugadorSeleccionado.id);
    setJugadorSeleccionado(null); cargarJugadores(); cargarStats();
  };

  const cargarDudas = useCallback(async () => { 
    setCargandoDudas(true);
    const { data } = await supabase.from('face_detections').select('*').eq('evento_id', evento.id).is('identity_id', null).limit(1);
    if (data && data.length > 0) {
      setFotoDudosa(data[0]);
      const { data: sugerencias } = await supabase.rpc('sugerir_candidatos', { huella_dudosa: data[0].embedding, limite_resultados: 3, id_evento: evento.id });
      setCandidatosDuda(sugerencias || []);
    } else { setFotoDudosa(null); }
    setCargandoDudas(false);
  }, [evento.id]);

  useEffect(() => {
    if (vista === 'perfiles') cargarJugadores();
    else if (vista === 'corredores') cargarCorredores();
    else if (vista === 'dudas') cargarDudas();
  }, [vista, cargarJugadores, cargarCorredores, cargarDudas]);

  const iaEjecutada = stats.caras > 0 || stats.dorsales > 0 || stats.dudas > 0;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans flex flex-col relative overflow-hidden">
      
{/* ─── CABECERA UNIFICADA Y COMPACTA (STICKY BAR) ─── */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-3 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#222]">
        
        {/* 1. IZQUIERDA: VOLVER Y TÍTULO */}
        <div className="flex items-center gap-4">
          <button onClick={onVolver} className="text-gray-400 hover:text-white transition-colors" title="Volver al Panel">
            <ArrowLeft size={18} />
          </button>
          <div className="w-[1px] h-5 bg-[#333]"></div>
          <div>
             <h1 className="text-base font-serif text-white leading-none truncate max-w-[200px]">{evento.nombre}</h1>
             <p className="text-[9px] uppercase tracking-widest text-[#C8B99A] mt-1">Sala IA</p>
          </div>
        </div>

        {/* 2. CENTRO: ESTADÍSTICAS COMPACTAS (Píldora) */}
        {!stats.cargando && iaEjecutada ? (
          <div className="hidden md:flex items-center gap-4 bg-[#111] border border-[#222] rounded-full px-4 py-1.5 shadow-inner">
            <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-widest">
               <ScanFace size={13}/> <span className="text-white font-bold text-xs">{stats.caras}</span>
            </div>
            <div className="w-[1px] h-3 bg-[#333]"></div>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-widest">
               <ScanLine size={13}/> <span className="text-white font-bold text-xs">{stats.dorsales}</span>
            </div>
            <div className="w-[1px] h-3 bg-[#333]"></div>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-widest">
               <AlertTriangle size={13} className={stats.dudas > 0 ? 'text-red-400' : ''}/> 
               <span className={stats.dudas > 0 ? 'text-red-400 font-bold text-xs' : 'text-white font-bold text-xs'}>{stats.dudas}</span>
            </div>
          </div>
        ) : procesandoIA ? (
          <div className="flex items-center gap-2 text-[10px] text-amber-500 uppercase tracking-widest">
             <Loader2 className="animate-spin" size={14}/> Procesando IA...
          </div>
        ) : null}

        {/* 3. DERECHA: PESTAÑAS Y ACCIONES */}
        <div className="flex items-center gap-4">
          
          {/* Selector de Vistas (Estilo Toggle Switch de iOS) */}
          <div className="flex items-center bg-[#111] p-0.5 rounded border border-[#222]">
            {isOCR ? (
               <button onClick={() => setVista('corredores')} className="px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold bg-[#222] text-white rounded-sm shadow-sm flex items-center gap-2"><Hash size={13}/> OCR</button>
            ) : (
               <>
                 <button onClick={() => setVista('perfiles')} className={`px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-sm transition-all flex items-center gap-2 ${vista === 'perfiles' ? 'bg-[#222] text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}>
                    <User size={13}/> Identidades
                 </button>
                 <button onClick={() => setVista('dudas')} className={`px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-sm transition-all flex items-center gap-2 ${vista === 'dudas' ? 'bg-red-900/30 text-red-400 shadow-sm' : 'text-gray-500 hover:text-red-400'}`}>
                    <AlertTriangle size={13}/> Dudas {stats.dudas > 0 && `(${stats.dudas})`}
                 </button>
               </>
            )}
          </div>

          <div className="w-[1px] h-5 bg-[#333]"></div>

          {/* Botón Acción IA Compacto */}
          <button onClick={() => { onEjecutarIA(); setTimeout(cargarStats, 5000); }} className="flex items-center gap-2 px-3 py-1.5 bg-[#C8B99A] text-black hover:bg-white transition-colors text-[10px] uppercase tracking-widest font-bold rounded-sm shadow-[0_0_10px_rgba(200,185,154,0.2)]">
             <Zap size={14}/> {iaEjecutada ? 'Re-escanear' : 'Iniciar IA'}
          </button>
        </div>
      </header>

      {/* ─── CUERPO INFERIOR (SIDEBAR Y PANEL CENTRAL) ─── */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR */}
        {vista !== 'dudas' && (
          <aside className="w-80 border-r border-[#222] bg-[#0A0A0A] flex flex-col shrink-0">
            <div className="flex-1 overflow-y-auto custom-scrollbar-dark p-2">
              
              {/* 🌟 AQUI EMPIEZA LA MAGIA DE LAZY LOADING EN PERFILES 🌟 */}
              {vista === 'perfiles' && listaJugadores.map(j => (
                <button key={j.id} onClick={() => seleccionarJugador(j)} className={`w-full flex items-center gap-3 p-3 mb-1 transition-all ${jugadorSeleccionado?.id === j.id ? 'bg-[#222] text-white' : 'hover:bg-[#111] text-gray-400'}`}>
<div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {fotosDelJugador.map((foto, idx) => (
                  <div key={idx} className="relative aspect-square bg-[#050505] border border-[#222] group cursor-zoom-in overflow-hidden" onClick={() => setZoomCara({ photo_url: foto.photo_url, bbox: foto.detecciones[0]?.bbox, identidad: jugadorSeleccionado })}>
                    
                    {/* 🌟 Usamos el Cargador Inteligente en vez del <img /> */}
                    <CargadorImagen 
                      src={fotoUrl(foto.photo_url, true)} 
                      className="w-full h-full group-hover:opacity-100 opacity-60" 
                      alt="Contexto"
                    />

                    <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {foto.detecciones.map(det => (
                        <button key={det.id} onClick={(e) => { e.stopPropagation(); supabase.from('face_detections').update({identity_id:null}).eq('id',det.id).then(()=>{seleccionarJugador(jugadorSeleccionado); cargarStats();}); }} className="text-red-400 hover:text-red-500 text-[10px] uppercase font-bold flex items-center gap-1" title="Desvincular"><UserMinus size={12}/> Quitar</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
                  <span className="font-serif text-sm truncate">{j.display_name}</span>
                </button>
              ))}

              {/* 🌟 AQUI EMPIEZA LA MAGIA DE LAZY LOADING EN OCR 🌟 */}
              {vista === 'corredores' && listaCorredores.map(c => {
                const valido = c.dorsal && c.dorsal !== '';
                return (
                  <button key={c.id} onClick={() => seleccionarCorredor(c)} className={`w-full flex items-center gap-3 p-3 mb-1 transition-all ${corredorSeleccionado?.id === c.id ? 'bg-[#222] text-white' : 'hover:bg-[#111] text-gray-400'}`}>
<div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {fotosDelCorredor.map((f, idx) => (
                  <div key={idx} className="relative aspect-square bg-[#050505] border border-[#222] cursor-zoom-in overflow-hidden" onClick={() => setZoomCara({ photo_url: f.photo_url, bbox: f.bbox_cuerpo || f.bbox })}>
                    
                    {/* 🌟 Usamos el Cargador Inteligente en OCR */}
                    <CargadorImagen 
                      src={fotoUrl(f.photo_url, true)} 
                      className="w-full h-full group-hover:opacity-100 opacity-60" 
                      alt="Contexto"
                    />

                    <BoundingBox bbox={f.bbox} color={SAND} label={`#${f.dorsal}`} />
                  </div>
                ))}
              </div>
                    <span className="font-serif text-sm truncate">{valido ? `#${c.dorsal}` : '⚠️ Sin número'}</span>
                  </button>
                )
              })}
            </div>
          </aside>
        )}

        {/* PANEL CENTRAL */}
        <main className="flex-1 bg-[#111] overflow-y-auto p-8 custom-scrollbar-dark relative">
          
          {/* VISTA PERFILES */}
          {vista === 'perfiles' && jugadorSeleccionado ? (
            <div className="max-w-5xl mx-auto pb-12">
              <div className="flex items-center justify-between border-b border-[#333] pb-6 mb-8">
                <div className="flex items-center gap-6">
                  <img src={fotoUrl(jugadorSeleccionado.avatar_url)} className="w-24 h-24 rounded-full object-cover shadow-2xl border border-[#333]" alt="" />
                  <div>
                    {editandoNombre ? (
                      <div className="flex items-center gap-3">
                        <input type="text" value={nombreTemporal} onChange={e=>setNombreTemporal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&guardarNombre()} autoFocus className="text-3xl font-serif bg-transparent border-b border-[#555] outline-none text-white w-64" />
                        <button onClick={guardarNombre} className="bg-white text-black p-2 rounded-full"><Check size={16}/></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 group">
                        <h2 className="text-4xl font-serif">{jugadorSeleccionado.display_name}</h2>
                        <button onClick={() => {setNombreTemporal(jugadorSeleccionado.display_name); setEditandoNombre(true);}} className="text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all"><Edit2 size={16}/></button>
                      </div>
                    )}
                    <p className="text-[10px] uppercase tracking-widest text-[#C8B99A] mt-2">{fotosDelJugador.length} FOTOS VINCULADAS</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={iniciarFusion} className="bg-[#222] text-white px-4 py-2 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 hover:bg-[#333] transition-colors"><Combine size={14}/> Fusionar</button>
                  <button onClick={() => { if(window.confirm('Eliminar perfil?')) destruirPerfilFalso(); }} className="bg-red-900/30 text-red-400 px-4 py-2 hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>

              {fusionando && candidatosFusion.length > 0 && (
                <div className="bg-[#222] p-6 mb-8 border border-[#333]">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-amber-500 mb-4 flex items-center gap-2"><Zap size={16}/> Sugerencias de Fusión IA</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {candidatosFusion.map(c => (
                      <button key={c.id_identidad} onClick={()=>fusionarConJugador(c.id_identidad)} className="bg-[#111] p-4 flex flex-col items-center hover:bg-white hover:text-black transition-all group">
                        <img src={fotoUrl(c.avatar)} className="w-16 h-16 rounded-full object-cover mb-3 grayscale group-hover:grayscale-0 transition-all" alt=""/>
                        <span className="font-serif text-sm">{c.nombre_jugador}</span>
                        <span className="text-[10px] font-bold mt-1 text-green-500">{Math.round(c.porcentaje_similitud * 100)}% Match</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* 🌟 LAZY LOADING EN LAS FOTOS DE LOS JUGADORES 🌟 */}
                {fotosDelJugador.map((foto, idx) => (
                  <div key={idx} className="relative aspect-square bg-[#050505] border border-[#222] group cursor-zoom-in overflow-hidden" onClick={() => setZoomCara({ photo_url: foto.photo_url, bbox: foto.detecciones[0]?.bbox, identidad: jugadorSeleccionado })}>
                    <img 
                      src={fotoUrl(foto.photo_url, true)} 
                      loading="lazy" 
                      decoding="async" 
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity filter saturate-50 group-hover:saturate-100" 
                      alt=""
                    />
                    <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {foto.detecciones.map(det => (
                        <button key={det.id} onClick={(e) => { e.stopPropagation(); supabase.from('face_detections').update({identity_id:null}).eq('id',det.id).then(()=>{seleccionarJugador(jugadorSeleccionado); cargarStats();}); }} className="text-red-400 hover:text-red-500 text-[10px] uppercase font-bold flex items-center gap-1" title="Desvincular"><UserMinus size={12}/> Quitar</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : vista === 'perfiles' && (
            <div className="h-full flex flex-col items-center justify-center opacity-30">
              <User size={64} className="mb-4" />
              <p className="font-serif text-xl">Selecciona un perfil en la barra lateral</p>
            </div>
          )}

          {/* VISTA DUDAS */}
          {vista === 'dudas' && (
            <div className="h-full flex items-center justify-center">
              {!fotoDudosa ? (
                <div className="text-center text-gray-500"><Check size={48} className="mx-auto mb-4 text-[#22C55E]" /><h2 className="font-serif text-2xl">Todo Limpio</h2><p className="text-xs uppercase tracking-widest mt-2">No hay rostros huérfanos.</p></div>
              ) : (
                <div className="bg-[#1A1A1A] p-8 border border-[#333] max-w-4xl w-full flex gap-12">
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-full aspect-[3/4] bg-black relative border-2 border-white/10 mb-6 overflow-hidden">
                      <img src={fotoUrl(fotoDudosa.photo_url, true)} className="w-full h-full object-cover opacity-50 blur-sm" alt=""/>
                      <div className="absolute border-2 border-[#C8B99A] shadow-[0_0_0_999px_rgba(0,0,0,0.8)] z-10" style={{ left: `${fotoDudosa.bbox.x}%`, top: `${fotoDudosa.bbox.y}%`, width: `${fotoDudosa.bbox.w}%`, height: `${fotoDudosa.bbox.h}%` }}>
                        <img src={fotoUrl(fotoDudosa.photo_url, true)} className="absolute w-[9999%] max-w-none" style={{ left: `-${(fotoDudosa.bbox.x / fotoDudosa.bbox.w) * 100}%`, top: `-${(fotoDudosa.bbox.y / fotoDudosa.bbox.h) * 100}%`, width: `${(100 / fotoDudosa.bbox.w) * 100}%` }} alt=""/>
                      </div>
                    </div>
                    <button onClick={async () => { await supabase.from('face_detections').delete().eq('id', fotoDudosa.id); cargarDudas(); cargarStats(); }} className="text-red-500 hover:text-red-400 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2"><Trash2 size={14}/> Descartar Rostro</button>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-3xl font-serif mb-2 text-white">¿Quién es?</h2>
                    <p className="text-[#9A8F82] text-xs uppercase tracking-widest mb-8">Asigna el rostro al perfil correcto</p>
                    <div className="flex flex-col gap-3">
                      {candidatosDuda.map(c => (
                        <button key={c.id_identidad} onClick={async () => { await supabase.from('face_detections').update({identity_id: c.id_identidad}).eq('id', fotoDudosa.id); cargarDudas(); cargarStats(); }} className="flex items-center gap-4 bg-[#222] hover:bg-white hover:text-black p-3 transition-colors group text-left">
                          <img src={fotoUrl(c.avatar)} className="w-12 h-12 rounded-full object-cover filter grayscale group-hover:grayscale-0" alt=""/>
                          <div className="flex-1">
                            <span className="font-serif block">{c.nombre_jugador}</span>
                            <span className="text-[10px] font-bold text-[#C8B99A]">{Math.round(c.porcentaje_similitud * 100)}% Coincidencia IA</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VISTA CORREDORES OCR */}
          {vista === 'corredores' && corredorSeleccionado && (
            <div className="max-w-5xl mx-auto pb-12">
              <div className="flex items-center gap-6 border-b border-[#333] pb-6 mb-8">
                <img src={fotoUrl(corredorSeleccionado.avatar_url, true)} className="w-20 h-28 object-cover border border-[#333]" alt=""/>
                <div>
                  <div className="flex items-center gap-2">
                    <Hash size={24} className="text-[#9A8F82]"/>
                    <input type="text" value={dorsalTemporal} onChange={e=>setDorsalTemporal(e.target.value)} onBlur={guardarDorsalGlobal} onKeyDown={e=>e.key==='Enter'&&e.target.blur()} className="text-5xl font-serif bg-transparent outline-none text-white uppercase placeholder-gray-800" placeholder="000" />
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-[#9A8F82] mt-2">{fotosDelCorredor.length} IMÁGENES ASOCIADAS</p>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* 🌟 LAZY LOADING EN LAS FOTOS DE LOS CORREDORES 🌟 */}
                {fotosDelCorredor.map((f, idx) => (
                  <div key={idx} className="relative aspect-square bg-[#050505] border border-[#222] cursor-zoom-in" onClick={() => setZoomCara({ photo_url: f.photo_url, bbox: f.bbox_cuerpo || f.bbox })}>
                    <img 
                      src={fotoUrl(f.photo_url, true)} 
                      loading="lazy" 
                      decoding="async" 
                      className="w-full h-full object-cover opacity-60 filter saturate-50 hover:opacity-100 transition-opacity" 
                      alt=""
                    />
                    <BoundingBox bbox={f.bbox} color={SAND} label={`#${f.dorsal}`} />
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ─── MODAL ZOOM (LUPA MÁGICA) ─── */}
      <AnimatePresence>
        {zoomCara && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setZoomCara(null)}>
            <div className="p-6 max-w-5xl w-full flex gap-8 items-center border border-[#333] bg-[#0A0A0A]" onClick={e => e.stopPropagation()}>
              <InteractiveZoomImage zoomCara={zoomCara} />
              {zoomCara.identidad && (
                <div className="w-80 flex flex-col items-center">
                  <img src={fotoUrl(zoomCara.identidad.avatar_url)} className="w-32 h-32 rounded-full border border-[#333] object-cover mb-4" alt=""/>
                  <input type="text" defaultValue={zoomCara.identidad.display_name} onBlur={e => { supabase.from('identities').update({display_name: e.target.value}).eq('id', zoomCara.identidad.id).then(()=>cargarJugadores()); }} onKeyDown={e=>e.key==='Enter'&&e.target.blur()} className="w-full text-center text-2xl font-serif bg-transparent border-b border-[#333] outline-none text-white focus:border-white pb-2" />
                  <p className="text-[9px] uppercase tracking-widest text-[#9A8F82] mt-3">Editar Nombre y presionar Enter</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}