import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; // Ajusta tu ruta
import { ArrowLeft, Loader2, Calendar, MapPin, Download } from 'lucide-react';
import { motion } from 'framer-motion';

const ResultadosAtleta = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Recibimos la selfie y el vector desde FlashealoSport
  const vectorBusqueda = location.state?.vector;
  const selfieAvatar = location.state?.selfieB64;

  const [fotosAgrupadas, setFotosAgrupadas] = useState({});
  const [cargando, setCargando] = useState(true);
  const [totalFotos, setTotalFotos] = useState(0);

  // Si alguien entra directo a /mis-resultados sin tomarse la foto, lo devolvemos
  if (!vectorBusqueda) {
    return <Navigate to="/" />;
  }

  useEffect(() => {
    const buscarFotos = async () => {
      setCargando(true);
      try {
        const { data, error } = await supabase.rpc('buscar_mis_fotos_global', {
          vector_busqueda: vectorBusqueda,
          umbral: 0.55
        });

        if (error) throw error;

        // Agrupamos las fotos por el nombre del evento
        const agrupadas = {};
        let conteo = 0;
        
        if (data) {
          data.forEach(foto => {
            if (!agrupadas[foto.nombre_evento]) {
              agrupadas[foto.nombre_evento] = {
                fecha: foto.fecha_evento,
                fotos: []
              };
            }
            agrupadas[foto.nombre_evento].fotos.push(foto);
            conteo++;
          });
        }

        setFotosAgrupadas(agrupadas);
        setTotalFotos(conteo);

      } catch (err) {
        console.error("Error buscando fotos:", err);
      } finally {
        setCargando(false);
      }
    };

    buscarFotos();
  }, [vectorBusqueda]);

  // Función de utilidad para armar la URL de la foto en Supabase
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://muvzhnnsdnztlhynuipd.supabase.co";
  const getUrl = (path) => `${SUPABASE_URL}/storage/v1/object/public/fotos/${path}`;

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#1C1C1C] font-sans pb-24">
      
      {/* HEADER TIPO PERFIL */}
      <header className="bg-white border-b border-black/5 pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[#9A8F82] hover:text-black transition-colors mb-8"
          >
            <ArrowLeft size={16} /> Volver a buscar
          </button>

          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
            {/* Avatar (La Selfie que se tomó) */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-100 shrink-0"
            >
              <img src={selfieAvatar} alt="Tu Perfil" className="w-full h-full object-cover" />
            </motion.div>

            <div className="mb-2">
              <h1 className="text-4xl md:text-5xl font-serif text-[#1C1C1C] mb-2">Tu Colección</h1>
              {cargando ? (
                <div className="flex items-center gap-2 text-[#9A8F82] text-sm">
                  <Loader2 size={16} className="animate-spin" /> Escaneando base de datos...
                </div>
              ) : (
                <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#9A8F82]">
                  <span className="text-[#E11D48]">{totalFotos}</span> Fotografías encontradas en <span className="text-black">{Object.keys(fotosAgrupadas).length}</span> Eventos
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* GALERÍA AGRUPADA POR EVENTOS */}
      <main className="max-w-6xl mx-auto px-6 mt-12">
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <Loader2 size={40} className="animate-spin text-[#C8B99A] mb-4" />
            <p className="font-serif text-xl text-[#9A8F82]">Analizando vectores biométricos...</p>
          </div>
        ) : totalFotos === 0 ? (
          <div className="text-center py-20 border border-dashed border-black/10 rounded-lg">
            <h3 className="text-2xl font-serif mb-2">No encontramos coincidencias</h3>
            <p className="text-[#9A8F82]">Parece que la cámara no te capturó en los eventos registrados hasta ahora.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-16">
            {Object.entries(fotosAgrupadas).map(([nombreEvento, dataEvento], index) => (
              <motion.section 
                key={nombreEvento}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Título del Evento Separador */}
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-black/5 pb-4 mb-6 gap-4">
                  <div>
                    <h2 className="text-2xl font-serif text-[#1C1C1C] mb-1">{nombreEvento}</h2>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#9A8F82] font-bold">
                      <Calendar size={12} /> {dataEvento.fecha || 'Fecha por confirmar'}
                    </div>
                  </div>
                  <div className="text-[10px] uppercase tracking-widest bg-black/5 px-3 py-1.5 rounded-full font-bold">
                    {dataEvento.fotos.length} Fotos
                  </div>
                </div>

                {/* Grid de Fotos de ese evento */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {dataEvento.fotos.map((foto, idx) => (
                    <motion.div 
                      key={idx}
                      whileHover={{ y: -5 }}
                      className="group relative aspect-[3/4] bg-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer"
                    >
                      <img 
                        src={getUrl(foto.photo_url)} 
                        alt={`Foto de ${nombreEvento}`} 
                        loading="lazy"
                        className="w-full h-full object-cover filter saturate-[0.9] group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Overlay con botón para ver o comprar */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button className="bg-white text-black px-4 py-2 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 hover:bg-[#E11D48] hover:text-white transition-colors">
                          <Download size={14} /> Ver Foto
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ResultadosAtleta;