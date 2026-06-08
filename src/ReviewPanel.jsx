import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  RefreshCw, 
  UserMinus, 
  Edit2, 
  Save, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Trash2, 
  User, 
  Image as ImageIcon, 
  AlertTriangle, 
  XCircle, 
  Check, 
  Combine,
  ArrowLeft
} from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://muvzhnnsdnztlhynuipd.supabase.co";
const FACE_COLORS = ['#00FF88', '#FF3366', '#33AAFF', '#FFD700', '#FF6B35', '#A855F7', '#22D3EE', '#FB923C', '#F43F5E', '#84CC16'];

const fotoUrl = (path) => path ? `${SUPABASE_URL}/storage/v1/object/public/fotos/${path}` : null;

// ─── Badge de cara sobre la imagen (Sleek) ──────────────────────────────────
const FaceBadge = ({ cara, color, identidad, onQuitar, esPendiente }) => {
  if (!cara.bbox) return null;
  return (
    <div
      className="absolute z-10 pointer-events-none transition-all duration-300"
      style={{ left: `${cara.bbox.x}%`, top: `${cara.bbox.y}%`, width: `${cara.bbox.w}%`, height: `${cara.bbox.h}%` }}
    >
      <div
        className="absolute inset-0 border-[3px] rounded-sm transition-colors duration-300"
        style={{ borderColor: esPendiente ? '#EF4444' : color, boxShadow: esPendiente ? '0 0 16px rgba(239,68,68,0.8)' : `0 0 12px ${color}88` }}
      />
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/85 backdrop-blur-md px-2 py-1 rounded-full shadow-lg whitespace-nowrap pointer-events-auto transition-transform hover:scale-105">
        {identidad?.avatar_url && (
          <img src={fotoUrl(identidad.avatar_url)} className="w-6 h-6 rounded-full object-cover border border-white/20 shrink-0 bg-gray-800" alt="" />
        )}
        <span className="text-white text-[11px] font-bold max-w-[80px] truncate leading-none">
          {identidad?.display_name ?? 'Desconocido'}
        </span>
        {onQuitar && (
          <button onClick={() => onQuitar(cara.id)} className="ml-1 text-white/50 hover:text-red-400 transition-colors" title="Borrar cara">
            <XCircle size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────
const ReviewPanel = ({ evento, onVolver }) => {
  const [vista, setVista] = useState('perfiles');
  const [todasIdentidades, setTodasIdentidades] = useState([]);

  // ── 1. Perfiles ──
  const [listaJugadores, setListaJugadores] = useState([]);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [fotosDelJugador, setFotosDelJugador] = useState([]);
  const [cargandoPerfiles, setCargandoPerfiles] = useState(false);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombreTemporal, setNombreTemporal] = useState('');
  const [fusionando, setFusionando] = useState(false); // NUEVO: Estado de Fusión

  // ── 2. Revisar Fotos ──
  
  const [fotosRevisar, setFotosRevisar] = useState([]);
  const [idxRevisar, setIdxRevisar] = useState(0);
  const [cargandoRevisar, setCargandoRevisar] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ── 3. Caras Dudosas ──
  const [fotoDudosa, setFotoDudosa] = useState(null);
  const [candidatos, setCandidatos] = useState([]);
  const [cargandoDudas, setCargandoDudas] = useState(false);
    
  // ═══════════════════════════════════════════════════════════════
  // 1. LÓGICA PERFILES (EDICIÓN Y FUSIÓN)
  // ═══════════════════════════════════════════════════════════════
  const cargarJugadores = async () => {
    setCargandoPerfiles(true);
    const { data } = await supabase.from('identities').select('id, display_name, avatar_url').order('display_name');
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
    const { data } = await supabase.from('face_detections').select('*').eq('identity_id', jugador.id);
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



  
  const iniciarEdicionNombre = () => {
    setNombreTemporal(jugadorSeleccionado.display_name);
    setEditandoNombre(true);
  };

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

  // NUEVO: Función para absorber un perfil falso en uno real
  const fusionarConJugador = async (idDestino) => {
    setCargandoPerfiles(true);
    // 1. Mover todas las fotos al jugador real (El algoritmo aprenderá de estas nuevas caras)
    await supabase.from('face_detections').update({ identity_id: idDestino }).eq('identity_id', jugadorSeleccionado.id);
    // 2. Eliminar el perfil falso (Ej: Jugador_20)
    await supabase.from('identities').delete().eq('id', jugadorSeleccionado.id);
    
    setFusionando(false);
    setJugadorSeleccionado(null);
    cargarJugadores(); // Recargar la lista limpia
  };

  // NUEVO: Función para destruir un perfil que no es una persona (Ej: Una lámpara detectada como cara)
  const destruirPerfilFalso = async () => {
    setCargandoPerfiles(true);
    await supabase.from('face_detections').delete().eq('identity_id', jugadorSeleccionado.id);
    await supabase.from('identities').delete().eq('id', jugadorSeleccionado.id);
    setJugadorSeleccionado(null);
    cargarJugadores();
  };

  // ═══════════════════════════════════════════════════════════════
  // 2. LÓGICA REVISAR FOTOS
  // ═══════════════════════════════════════════════════════════════
  const cargarRevisar = async () => {
    setCargandoRevisar(true);
    const { data: identidades } = await supabase.from('identities').select('id, display_name, avatar_url');
    if (identidades) setTodasIdentidades(identidades);

    const { data } = await supabase.from('face_detections').select('*').order('photo_url', { ascending: true });
    if (data) {
      const mapa = {};
      data.forEach(det => {
        const key = (det.photo_url || '').trim().toLowerCase();
        if (!mapa[key]) mapa[key] = { photo_url: det.photo_url, caras: [] };
        mapa[key].caras.push(det);
      });
      setFotosRevisar(Object.values(mapa));
    }
    setIdxRevisar(0);
    setCargandoRevisar(false);
  };

  const borrarCaraDefinitivamente = async (faceId) => {
    await supabase.from('face_detections').delete().eq('id', faceId);
    setConfirmDelete(null);
    setFotosRevisar(prev => prev.map(foto => ({ ...foto, caras: foto.caras.filter(c => c.id !== faceId) })).filter(foto => foto.caras.length > 0));
    setIdxRevisar(prev => Math.max(0, prev));
  };

  // ═══════════════════════════════════════════════════════════════
  // 3. LÓGICA CARAS DUDOSAS
  // ═══════════════════════════════════════════════════════════════
  const cargarDudas = async () => {
    setCargandoDudas(true);
    const { data } = await supabase.from('face_detections').select('*').is('identity_id', null).limit(1);
    
    if (data && data.length > 0) {
      const huerfana = data[0];
      setFotoDudosa(huerfana);
      const { data: sugerencias } = await supabase.rpc('sugerir_candidatos', { huella_dudosa: huerfana.embedding, limite_resultados: 3 });
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
    else if (vista === 'revisar') cargarRevisar();
    else if (vista === 'dudas') cargarDudas();
  }, [vista]);

  const identidadMap = Object.fromEntries(todasIdentidades.map((i) => [i.id, i]));
  const fotoRevisarActual = fotosRevisar[idxRevisar] ?? null;

  return (
    <div className="min-h-screen bg-[#F5F2EB] text-[#1A1A1A] font-sans selection:bg-black selection:text-white">
      
<header className="
  sticky top-0 z-50
  border-b border-black/5
  bg-[#F5F2EB]/70
  backdrop-blur-2xl
">
  <div className="
    h-20
    px-5 md:px-8
    grid grid-cols-[auto_1fr_auto]
    items-center
    gap-4
  ">

    {/* LEFT */}
    <div className="flex items-center gap-3 min-w-fit">

      <button
        onClick={onVolver}
        className="
          group
          h-11 w-11
          flex items-center justify-center
          rounded-2xl
          bg-white/80
          border border-black/5
          shadow-[0_1px_2px_rgba(0,0,0,0.04)]
          hover:bg-white
          hover:shadow-md
          transition-all duration-200
        "
      >
        <ArrowLeft
          size={18}
          className="
            text-[#111]
            transition-transform
            group-hover:-translate-x-0.5
          "
        />
      </button>

      <div className="hidden md:block leading-none">
        <h1 className="
          text-[30px]
          font-black
          tracking-tight
          text-[#111]
        ">
          Flashealo AI
        </h1>

        <p className="
          text-[15px]
          uppercase
          tracking-[0.28em]
          text-orange-400
          font-bold
          mt-1
        ">
          Auditor
        </p>
      </div>

    </div>

    {/* CENTER */}
    <div className="
      flex flex-col items-center justify-center
      min-w-0
      text-center
      px-4
    ">
      <div className="
        max-w-[700px]
        truncate
        text-[20px] md:text-[28px]
        leading-none
        font-black
        tracking-[-0.04em]
        text-[#111]
      ">
        {evento.nombre}
      </div>

      <h2 className="
        text-[10px]
        uppercase
        tracking-[0.35em]
        text-gray-400
        font-bold
        mb-1
      ">
        {evento.tipo_reconocimiento}
      </h2>



    </div>

    {/* RIGHT */}
    <nav className="
      flex items-center
      gap-1
      bg-white/75
      border border-black/5
      rounded-2xl
      p-1
      shadow-[0_1px_2px_rgba(0,0,0,0.04)]
      backdrop-blur-xl
    ">
      {[
        { id: 'perfiles', label: 'Perfiles', icon: User },
        { id: 'revisar', label: 'Revisar', icon: ImageIcon },
        { id: 'dudas', label: 'Dudas', icon: AlertTriangle }
      ].map((tab) => {
        const active = vista === tab.id

        return (
          <button
            key={tab.id}
            onClick={() => setVista(tab.id)}
            className={`
              relative
              h-10
              px-4
              rounded-xl
              flex items-center gap-2
              text-[11px]
              uppercase
              tracking-wide
              font-bold
              whitespace-nowrap
              transition-all duration-300
              ${
                active
                  ? `
                    bg-[#111]
                    text-white
                    shadow-md
                  `
                  : `
                    text-gray-400
                    hover:text-[#111]
                    hover:bg-black/[0.03]
                  `
              }
            `}
          >
            <tab.icon size={14} />
            <span className="hidden lg:block">
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>

  </div>
</header>

      <main className="p-6 md:p-8 max-w-[100rem] mx-auto">
        
        {/* =========================================================
            VISTA 1: PERFILES
            ========================================================= */}
        {vista === 'perfiles' && (
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
                            <button onClick={guardarNombre} className="bg-[#1A1A1A] text-white p-2.5 rounded-xl hover:bg-black transition-colors"><Save size={18} /></button>
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

                    {/* BOTONES DE FUSIÓN Y DESTRUCCIÓN */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={() => setFusionando(!fusionando)} 
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${fusionando ? 'bg-blue-100 text-blue-700 shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        title="Mover estas fotos a otro jugador"
                      >
                        <Combine size={16} /> {fusionando ? 'Cancelar Fusión' : 'Fusionar Perfil'}
                      </button>
                      <button 
                        onClick={() => { if(window.confirm('¿Seguro que deseas eliminar este perfil por completo?')) destruirPerfilFalso(); }} 
                        className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all" 
                        title="Destruir perfil falso permanentemente"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {cargandoPerfiles ? (
                    <div className="flex justify-center items-center h-48 text-gray-400"><RefreshCw className="animate-spin mr-2" size={18} /> Cargando datos...</div>
                  ) : fusionando ? (
                    /* PANEL DE FUSIÓN (Si el botón Fusionar está activo) */
                    <div className="bg-blue-50 border border-blue-100 p-8 rounded-3xl animate-in fade-in slide-in-from-top-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Combine className="text-blue-500" size={24} />
                        <h3 className="text-2xl font-black text-blue-900">¿Quién es realmente esta persona?</h3>
                      </div>
                      <p className="text-blue-700 text-sm mb-8">
                        Selecciona el perfil real a continuación. Todas las fotos de <b>{jugadorSeleccionado.display_name}</b> se moverán a ese perfil, y el algoritmo aprenderá a reconocerlo mejor desde este ángulo. Este perfil será eliminado.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                        {listaJugadores.filter(j => j.id !== jugadorSeleccionado.id).map(j => (
                          <button 
                            key={j.id} 
                            onClick={() => fusionarConJugador(j.id)} 
                            className="bg-white p-3 rounded-2xl flex items-center gap-3 hover:shadow-md hover:-translate-y-1 transition-all border border-blue-100/50 text-left"
                          >
                            <img src={fotoUrl(j.avatar_url)} className="w-10 h-10 rounded-full object-cover shrink-0"/>
                            <span className="font-bold text-sm truncate text-blue-900">{j.display_name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : fotosDelJugador.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center text-gray-400 border border-dashed border-gray-200 font-medium">Este perfil se quedó sin fotos asignadas.</div>
                  ) : (
                    /* GALERÍA NORMAL DEL PERFIL */
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {fotosDelJugador.map(({ photo_url, detecciones }) => (
                        <div key={photo_url} className="relative group rounded-2xl overflow-hidden bg-gray-100 shadow-sm border border-black/5 aspect-square">
                          <img src={fotoUrl(photo_url)} className="w-full h-full object-cover" alt="" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px] z-20">
                            {detecciones.map((det) => (
                              <button key={det.id} onClick={() => desvincularDeteccion(det.id)} className="bg-white text-red-500 px-4 py-2 rounded-full hover:scale-105 transition-all flex items-center gap-2 font-bold text-xs shadow-xl">
                                <UserMinus size={14} /> Quitar cara
                              </button>
                            ))}
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

        {/* =========================================================
            VISTA 2: REVISAR FOTOS
            ========================================================= */}
        {vista === 'revisar' && (
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
                    <div className="text-2xl font-black mt-1 text-[#1A1A1A]">
                      {idxRevisar + 1} <span className="text-gray-300 font-medium">/</span> {fotosRevisar.length}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pr-2">
                    <button onClick={() => setIdxRevisar(p => Math.max(0, p - 1))} disabled={idxRevisar === 0} className="p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 disabled:opacity-30 transition-all text-[#1A1A1A]"><ChevronLeft size={20} /></button>
                    <button onClick={() => setIdxRevisar(p => Math.min(fotosRevisar.length - 1, p + 1))} disabled={idxRevisar === fotosRevisar.length - 1} className="p-4 rounded-2xl bg-[#1A1A1A] hover:bg-black text-white disabled:opacity-30 transition-all"><ChevronRight size={20} /></button>
                  </div>
                </div>

                {fotoRevisarActual && (
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-[65%] bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/5 p-2">
                      <div className="relative rounded-2xl overflow-hidden bg-gray-100">
                        <img src={fotoUrl(fotoRevisarActual.photo_url)} alt="Foto" className="w-full h-auto block" />
                        {fotoRevisarActual.caras.map((cara, idx) => (
                          <FaceBadge
                            key={cara.id}
                            cara={cara}
                            color={FACE_COLORS[idx % FACE_COLORS.length]}
                            identidad={identidadMap[cara.identity_id]}
                            esPendiente={confirmDelete === cara.id}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="lg:w-[35%] flex flex-col gap-4">
                      <div className="bg-white rounded-3xl shadow-sm border border-black/5 p-6">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-5">Rostros Detectados ({fotoRevisarActual.caras.length})</p>
                        <div className="flex flex-col gap-3">
                          {fotoRevisarActual.caras.map((cara, idx) => {
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

        {/* =========================================================
            VISTA 3: CARAS DUDOSAS
            ========================================================= */}
        {vista === 'dudas' && (
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
                  <div className="w-full relative rounded-3xl overflow-hidden shadow-lg border-4 border-white bg-gray-100">
                    <img src={fotoUrl(fotoDudosa.photo_url)} alt="Dudoso" className="w-full h-auto block opacity-80" />
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

                  {candidatos.length === 0 && (
                     <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 text-center text-gray-500 font-medium text-sm">
                       No hay perfiles registrados en este evento para comparar.
                     </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ReviewPanel;