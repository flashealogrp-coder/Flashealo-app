import React, { useState, useEffect } from 'react';
import { supabasePublico as supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowUpRight, Search, Camera, Hash, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// IMPORTAMOS EL NUEVO MÓDULO
import CameraBiometrica from './CameraBiometrica';
import { HERO_SPORT } from './marca/sport';
import { resolverPortada } from './marca/portada';
import './sport/sport.css';

const PALABRAS_RULETA = [
  'Baseball', 'Fútbol', 'Maratón', 'Pádel', 'Surf',
  'HYROX', 'Pickleball', 'Triatlón', 'Ciclismo', 'Baloncesto',
  'CrossFit', 'Tenis', 'Voleibol', 'Natación', 'Running',
  'Karate', 'Golf', 'Gimnasia', 'Atletismo',
  'Kickboxing', 'Softbol', 'Automovilismo', 'Rally',
  'Rugby'
];

const CFG_PORTADA = { dominioFotos: import.meta.env.VITE_FOTOS_DOMINIO || '', supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '' };

const FlashealoSport = ({ isMobile }) => {
  const navigate = useNavigate();
  const [eventosSport, setEventosSport] = useState([]);
  const [cargandoEventos, setCargandoEventos] = useState(false);
  const [busquedaEvento, setBusquedaEvento] = useState('');
  const [indicePalabra, setIndicePalabra] = useState(0);
  const [modo, setModo] = useState('selfie');
  const [dorsal, setDorsal] = useState('');
  const [buscandoDorsal, setBuscandoDorsal] = useState(false);
  const [dorsalActivo, setDorsalActivo] = useState(null); // { numero, eventos:Set<string> }
  const [conteoFotos, setConteoFotos] = useState({});

  // Estado que controla si el modal de la cámara se muestra o no
  const [modalCamaraAbierto, setModalCamaraAbierto] = useState(false);

  useEffect(() => {
    let actualIndex = 0;
    let delay = 60; 
    let timeoutId;

    const cambiarPalabra = () => {
      if (actualIndex < PALABRAS_RULETA.length - 1) {
        actualIndex++;
        setIndicePalabra(actualIndex);
        delay += Math.floor(actualIndex * 12); 
        timeoutId = setTimeout(cambiarPalabra, delay);
      }
    };

    timeoutId = setTimeout(cambiarPalabra, delay);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const fetchEventosSport = async () => {
      setCargandoEventos(true);
      const { data } = await supabase
        .from('eventos')
        .select('id,nombre,descripcion,logo_url,banner_url,es_gratis,precio_galeria,fecha_evento,estado,created_at,tipo_reconocimiento,slug,portada_url,configuracion_ui,precio_foto,moneda,requiere_pago_para_ver,ubicacion,url_slug,titulo_about,categoria,url_portada,tiene_clave')
        .eq('categoria', 'sport')
        .eq('tiene_clave', false)
        .neq('estado', 'oculto')
        .order('fecha_evento', { ascending: false });

      if (data) setEventosSport(data);
      setCargandoEventos(false);
    };
    fetchEventosSport();
  }, []);

  // Fotos disponibles por evento (solo lectura, para la credencial).
  useEffect(() => {
    let vivo = true;
    eventosSport.slice(0, 12).forEach(async (ev) => {
      const { count } = await supabase.from('fotografias').select('id', { count: 'exact', head: true }).eq('evento_id', ev.id);
      if (vivo && typeof count === 'number') setConteoFotos((p) => ({ ...p, [ev.id]: count }));
    });
    return () => { vivo = false; };
  }, [eventosSport]);

  // Búsqueda por dorsal: lee las etiquetas públicas y deja visibles los eventos donde aparece ese número.
  const buscarDorsal = async (e) => {
    e.preventDefault();
    const numero = dorsal.trim().toUpperCase().replace(/^#/, '').replace(/[^A-Z0-9-]/g, '');
    if (!numero) return;
    setBuscandoDorsal(true);
    const { data } = await supabase.from('etiquetas_fotos').select('evento_id, fotografias(evento_id)').ilike('dorsal', numero).limit(2000);
    const ids = new Set((data || []).map((r) => r.evento_id || r.fotografias?.evento_id).filter(Boolean));
    setDorsalActivo({ numero, eventos: ids });
    setBuscandoDorsal(false);
  };

  const abrirEvento = (evento) => {
    const ruta = evento.url_slug ? `/g/${evento.url_slug}` : `/g/${evento.id}`;
    navigate(ruta);
    window.scrollTo(0, 0);
  };

// FUNCIÓN QUE RECIBE LAS 3 FOTOS DESDE EL MÓDULO DE LA CÁMARA
// FUNCIÓN QUE RECIBE LAS 3 FOTOS DESDE EL MÓDULO DE LA CÁMARA
  const manejarFotosCapturadas = async (fotosBiometricas) => {
    try {
      setModalCamaraAbierto(false); 
      
      // La selfie se procesa en el NAS (servicio de rostros propio), por la misma dirección de la web.
      const URL_API = '/api/selfie';

      const response = await fetch(URL_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagen_base64: fotosBiometricas.frente })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.vector)) {
        throw new Error(data.error || "No pudimos procesar el rostro.");
      }

      // Viajamos a la nueva página llevando la selfie y el vector
      navigate('/mis-resultados', { 
        state: { 
          vector: data.vector, 
          selfieB64: fotosBiometricas.frente 
        } 
      });

    } catch (error) {
      console.error(error);
      alert(error.message && error.message.length < 140 ? error.message : "Error al analizar el rostro. Revisa tu conexión o iluminación.");
    }
  };


  const eventosFiltrados = eventosSport.filter(evento =>
    evento.nombre.toLowerCase().includes(busquedaEvento.toLowerCase()) &&
    (!dorsalActivo || dorsalActivo.eventos.has(evento.id))
  );

  const hoy = new Date().toISOString().slice(0, 10);
  const etiquetaDe = (ev) => {
    if (String(ev.fecha_evento || '').slice(0, 10) === hoy) return { clase: 'vivo', texto: 'En vivo' };
    const dias = (Date.now() - new Date(ev.created_at || 0).getTime()) / 86400000;
    return dias <= 7 ? { clase: 'nuevo', texto: 'Nuevo' } : null;
  };
  const fechaCorta = (f) => {
    const d = new Date(`${String(f).slice(0, 10)}T12:00:00`);
    return isNaN(d) ? '' : d.toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="fs">
      <div className="fs-ancho">

        <section className="fs-hero">
          <div>
            <h1 className="fs-titulo">
              Encuentra tus fotos de{' '}
              <span className="fs-palabra" aria-live="off">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={PALABRAS_RULETA[indicePalabra]}
                    initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }}
                    transition={{ duration: 0.08, ease: 'easeOut' }} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}
                  >
                    {PALABRAS_RULETA[indicePalabra]}
                  </motion.span>
                </AnimatePresence>
              </span>{' '}
              al instante.
            </h1>
            <p className="fs-lead">
              Una selfie o tu número de dorsal. Reconocemos tu rostro y tu número para reunir todas tus fotografías del evento en segundos.
            </p>

            <div className="fs-barra">
              <div className="fs-modos" role="tablist" aria-label="Tipo de búsqueda">
                <button type="button" role="tab" aria-selected={modo === 'selfie'} className="fs-modo" onClick={() => setModo('selfie')}>
                  <Camera size={16} /> Búsqueda por selfie
                </button>
                <button type="button" role="tab" aria-selected={modo === 'dorsal'} className="fs-modo" onClick={() => setModo('dorsal')}>
                  <Hash size={16} /> Búsqueda por dorsal
                </button>
              </div>

              <div className="fs-panel">
                {modo === 'selfie' ? (
                  <>
                    <button type="button" className="fs-accion" onClick={() => setModalCamaraAbierto(true)}>
                      <Camera size={18} /> Tomar mi selfie <ArrowUpRight size={14} />
                    </button>
                    <p className="fs-ayuda">Buena luz, sin gorra ni lentes. La selfie solo se usa para buscar tus fotos.</p>
                  </>
                ) : (
                  <form className="fs-fila" onSubmit={buscarDorsal}>
                    <label className="fs-input">
                      <Hash size={18} />
                      <input className="fs-dorsal" inputMode="text" autoComplete="off" maxLength={8} placeholder="Ej. 214" aria-label="Número de dorsal" value={dorsal} onChange={(e) => setDorsal(e.target.value)} />
                    </label>
                    <button type="submit" className="fs-accion" disabled={buscandoDorsal || !dorsal.trim()}>
                      {buscandoDorsal ? <Loader2 size={16} className="animate-spin" /> : 'Buscar'}
                    </button>
                  </form>
                )}

                <label className="fs-input">
                  <Search size={18} />
                  <input type="text" placeholder="Buscar evento, lugar o actividad…" aria-label="Buscar evento" value={busquedaEvento} onChange={(e) => setBusquedaEvento(e.target.value)} />
                </label>
              </div>

              <div className="fs-estado"><span className="fs-punto" aria-hidden="true" /> <Zap size={13} aria-hidden="true" /> Reconocimiento IA activo</div>
            </div>

            {dorsalActivo && (
              <p className="fs-aviso" role="status">
                <span>
                  {dorsalActivo.eventos.size > 0
                    ? `Dorsal #${dorsalActivo.numero}: aparece en ${dorsalActivo.eventos.size} ${dorsalActivo.eventos.size === 1 ? 'evento' : 'eventos'}.`
                    : `No encontramos el dorsal #${dorsalActivo.numero} todavía. Las fotos pueden estar en proceso; prueba con tu selfie.`}
                </span>
                <button type="button" onClick={() => { setDorsalActivo(null); setDorsal(''); }}>Limpiar</button>
              </p>
            )}
          </div>

          <figure className="fs-visual" style={{ margin: 0 }}>
            {HERO_SPORT.video ? (
              <video src={HERO_SPORT.video} poster={HERO_SPORT.imagen || undefined} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
            ) : HERO_SPORT.imagen ? (
              <img src={HERO_SPORT.imagen} alt="" />
            ) : (
              <div className="fs-lineas" aria-hidden="true" />
            )}
            <figcaption className="fs-visual-pie">
              <strong>Cada jugada, tu foto.</strong>
              <span>{HERO_SPORT.pie}</span>
            </figcaption>
          </figure>
        </section>

        <section className="fs-seccion" aria-labelledby="fs-recientes">
          <div className="fs-cab">
            <h2 id="fs-recientes">Eventos recientes</h2>
            <span>{eventosFiltrados.length} {eventosFiltrados.length === 1 ? 'evento' : 'eventos'}</span>
          </div>

          {cargandoEventos ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}><Loader2 size={34} className="animate-spin" style={{ color: '#5A5955' }} strokeWidth={1.5} /></div>
          ) : eventosFiltrados.length === 0 ? (
            <div className="fs-vacio">
              <strong>{busquedaEvento || dorsalActivo ? 'Sin resultados' : 'Pronto, nuevos eventos'}</strong>
              {busquedaEvento ? 'No encontramos ningún evento con ese nombre.' : dorsalActivo ? 'Ningún evento coincide con ese dorsal.' : 'Aquí aparecerán las galerías en cuanto se publiquen.'}
            </div>
          ) : (
            <div className="fs-carril">
              {eventosFiltrados.map((evento) => {
                const sello = etiquetaDe(evento);
                const fotos = conteoFotos[evento.id];
                return (
                  <button type="button" key={evento.id} className="fs-ticket" onClick={() => abrirEvento(evento)}>
                    <div className="fs-portada">
                      {(() => { const pt = resolverPortada(evento.portada_url || evento.url_portada, CFG_PORTADA); return pt.src ? <img src={pt.src} alt="" loading="lazy" style={{ objectPosition: pt.pos }} /> : null; })()}
                      {sello && <span className={`fs-sello ${sello.clase}`}>{sello.texto}</span>}
                    </div>
                    <div className="fs-corte" aria-hidden="true" />
                    <div className="fs-cuerpo">
                      <span className="fs-fecha">{fechaCorta(evento.fecha_evento)}{evento.ubicacion ? ` · ${evento.ubicacion}` : ''}</span>
                      <h3 className="fs-nombre">{evento.nombre}</h3>
                      <div className="fs-pie">
                        {fotos > 0 ? <span className="fs-fotos">{fotos.toLocaleString('es-DO')} fotos disponibles</span> : <span />}
                        <span className="fs-ir">Explorar galería <ArrowUpRight size={14} /></span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {/* RENDERIZAMOS EL MÓDULO DE LA CÁMARA */}
      <AnimatePresence>
        <CameraBiometrica
          isOpen={modalCamaraAbierto}
          onClose={() => setModalCamaraAbierto(false)}
          onComplete={manejarFotosCapturadas}
        />
      </AnimatePresence>
    </div>
  );
};

export default FlashealoSport;
