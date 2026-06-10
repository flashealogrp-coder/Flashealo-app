import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Save, ShieldCheck, Loader2, List, Plus, Trash2, Edit3, Settings, Sparkles, Calendar, Image as ImageIcon, CheckCircle } from 'lucide-react';
import ReviewPanel from './ReviewPanel'; 

const AdminPanel = () => {
  const [tabActiva, setTabActiva] = useState('lista'); 
  const [listaEventos, setListaEventos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const [eventoParaAuditar, setEventoParaAuditar] = useState(null);

  // ESTADOS DEL FORMULARIO UNIFICADO
  const [eventoEditandoId, setEventoEditandoId] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [portadaFile, setPortadaFile] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre: '', 
    slug: '', 
    descripcion: '', 
    fecha_evento: '', 
    ubicacion: '', 
    tipo_reconocimiento: 'hibrido', 
    es_gratis: true, 
    precio_galeria: 0.00, 
    logo_url: '', 
    portada_url: ''
  });

  useEffect(() => { cargarEventos(); }, []);

  const cargarEventos = async () => {
    const { data } = await supabase.from('eventos').select('*').order('created_at', { ascending: false });
    if (data) setListaEventos(data);
  };

  // Función mejorada para subir imágenes sin errores 400
  const subirArchivo = async (file, subcarpeta) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const fileName = `${subcarpeta}/${Date.now()}_${safeName}`;
    
    const { error } = await supabase.storage.from('assets').upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    
    const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const guardarEvento = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      let lUrl = formData.logo_url;
      let pUrl = formData.portada_url;

      if (logoFile) lUrl = await subirArchivo(logoFile, 'logos');
      if (portadaFile) pUrl = await subirArchivo(portadaFile, 'portadas');

      const payload = { 
        ...formData, 
        precio_galeria: formData.es_gratis ? 0 : parseFloat(formData.precio_galeria),
        logo_url: lUrl, 
        portada_url: pUrl 
      };

      if (eventoEditandoId) {
        await supabase.from('eventos').update(payload).eq('id', eventoEditandoId);
      } else {
        await supabase.from('eventos').insert([payload]);
      }
      
      setMensaje({ tipo: 'exito', texto: '¡Evento guardado con éxito!' });
      resetForm();
      cargarEventos();
      setTabActiva('lista');
    } catch (err) {
      setMensaje({ tipo: 'error', texto: "Error al guardar: " + err.message });
    } finally {
      setCargando(false);
    }
  };

  const iniciarEdicion = (ev) => {
    setEventoEditandoId(ev.id);
    setFormData({
      nombre: ev.nombre || '', 
      slug: ev.slug || '', 
      descripcion: ev.descripcion || '', 
      fecha_evento: ev.fecha_evento || '', 
      ubicacion: ev.ubicacion || '',
      tipo_reconocimiento: ev.tipo_reconocimiento || 'hibrido', 
      es_gratis: ev.es_gratis,
      precio_galeria: ev.precio_galeria || 0, 
      logo_url: ev.logo_url || '', 
      portada_url: ev.portada_url || ''
    });
    setLogoFile(null);
    setPortadaFile(null);
    setTabActiva('crear');
  };

  const resetForm = () => {
    setEventoEditandoId(null);
    setLogoFile(null);
    setPortadaFile(null);
    setFormData({ nombre: '', slug: '', descripcion: '', fecha_evento: '', ubicacion: '', tipo_reconocimiento: 'hibrido', es_gratis: true, precio_galeria: 0, logo_url: '', portada_url: '' });
  };
  
  if (eventoParaAuditar) {
    return (
      <ReviewPanel 
        key={eventoParaAuditar.id} 
        evento={eventoParaAuditar} 
        onVolver={() => setEventoParaAuditar(null)} 
      />
    );
  }
  
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A] font-sans">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1A1A1A] rounded-xl flex items-center justify-center shadow-lg"><ShieldCheck size={20} className="text-white" /></div>
            <div><h1 className="font-bold text-lg uppercase tracking-widest">Flashealo</h1><p className="text-[10px] text-gray-400 font-bold uppercase">Panel de Control</p></div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-6 pt-8 pb-4">
        <div className="flex gap-4 border-b border-gray-200">
          <button onClick={() => setTabActiva('lista')} className={`flex items-center gap-2 px-6 py-4 font-bold uppercase tracking-widest text-xs border-b-2 ${tabActiva === 'lista' ? 'border-[#1A1A1A] text-[#1A1A1A]' : 'border-transparent text-gray-400'}`}><List size={16} /> Mis Eventos</button>
          <button onClick={() => { resetForm(); setTabActiva('crear'); }} className={`flex items-center gap-2 px-6 py-4 font-bold uppercase tracking-widest text-xs border-b-2 ${tabActiva === 'crear' ? 'border-[#1A1A1A] text-[#1A1A1A]' : 'border-transparent text-gray-400'}`}><Plus size={16} /> Nuevo Evento</button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-6">
        
        {mensaje.texto && (
          <div className={`p-4 rounded-xl mb-6 font-bold text-sm border ${mensaje.tipo === 'exito' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
            {mensaje.texto}
          </div>
        )}

        {/* ====================================
            PESTAÑA: LISTA DE EVENTOS
            ==================================== */}
        {tabActiva === 'lista' && (
          <div className="space-y-4">
            {listaEventos.length === 0 && <p className="text-center text-gray-400 py-12">No hay eventos creados. Ve a "Nuevo Evento".</p>}
            {listaEventos.map(ev => (
              <div key={ev.id} className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                    {ev.logo_url ? <img src={ev.logo_url} className="w-full h-full object-cover" alt="logo" /> : <ImageIcon className="text-gray-400" size={24} />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg leading-tight">{ev.nombre}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Calendar size={14}/> {ev.fecha_evento || 'Sin fecha'} • {ev.tipo_reconocimiento.toUpperCase()}
                    </p>
                  </div>
                </div>
                
                {/* BOTONERA ACTUALIZADA (Sleek) */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setEventoParaAuditar(ev)} 
                    className="flex items-center gap-2 bg-[#1A1A1A] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-black transition-transform active:scale-95 shadow-sm"
                  >
                    <CheckCircle size={16} /> Auditar
                  </button>
                  <div className="w-px h-6 bg-gray-200 mx-2"></div> {/* Separador */}
                  <button onClick={() => iniciarEdicion(ev)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Evento">
                    <Edit3 size={18} />
                  </button>
                  <button onClick={async () => { if(window.confirm("¿Seguro que deseas eliminar este evento?")) { await supabase.from('eventos').delete().eq('id', ev.id); cargarEventos(); } }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar Evento">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ====================================
            PESTAÑA: CREAR / EDITAR EVENTO 
            ==================================== */}
        {tabActiva === 'crear' && (
          <form onSubmit={guardarEvento} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
              <Sparkles className="text-amber-500" /> {eventoEditandoId ? 'Editar Configuración del Evento' : 'Configurar Nuevo Evento'}
            </h2>

            {/* Datos Básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Nombre del Evento</label>
                <input required className="w-full p-4 rounded-xl border border-gray-200 focus:border-black outline-none font-medium" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} placeholder="Ej: Torneo Nacional Pickleball 2026" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Slug (URL amigable)</label>
                <input required className="w-full p-4 rounded-xl border border-gray-200 focus:border-black outline-none font-medium" value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/ /g, '-')})} placeholder="ej-torneo-nacional" />
              </div>
            </div>

            {/* Logística */}
            <div className="bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-100">
              <h3 className="font-bold mb-6 text-sm uppercase tracking-wider">Logística del Evento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Fecha</label>
                  <input type="date" required className="w-full p-4 rounded-xl border border-gray-200 outline-none" value={formData.fecha_evento} onChange={(e) => setFormData({...formData, fecha_evento: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Ubicación</label>
                  <input className="w-full p-4 rounded-xl border border-gray-200 outline-none" placeholder="Ej: Centro Olímpico, SD" value={formData.ubicacion} onChange={(e) => setFormData({...formData, ubicacion: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Descripción breve</label>
                <textarea rows="2" className="w-full p-4 rounded-xl border border-gray-200 outline-none resize-none" value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} />
              </div>
            </div>

            {/* Branding / Imágenes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="border-2 border-dashed border-gray-200 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                <label className="block text-xs font-bold uppercase mb-2 w-full">Logo (Cuadrado)</label>
                <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-black hover:file:bg-gray-200 cursor-pointer" />
                {formData.logo_url && !logoFile && <p className="text-xs text-green-600 mt-2 font-bold">Logo actual cargado</p>}
              </div>
              <div className="border-2 border-dashed border-gray-200 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                <label className="block text-xs font-bold uppercase mb-2 w-full">Portada (Horizontal)</label>
                <input type="file" accept="image/*" onChange={(e) => setPortadaFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-black hover:file:bg-gray-200 cursor-pointer" />
                {formData.portada_url && !portadaFile && <p className="text-xs text-green-600 mt-2 font-bold">Portada actual cargada</p>}
              </div>
            </div>

            {/* Configuración del Motor */}
            <div className="bg-[#F5F2EB] p-6 rounded-2xl mb-8">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Settings size={18}/> Lógica del Motor de IA</h3>
              <select className="w-full p-4 rounded-xl border border-gray-200 font-bold outline-none" value={formData.tipo_reconocimiento} onChange={(e) => setFormData({...formData, tipo_reconocimiento: e.target.value})}>
                <option value="hibrido">Híbrido (Facial + Color + Contexto) - RECOMENDADO</option>
                <option value="facial">Facial Puro (Eventos Sociales)</option>
                <option value="ocr">OCR (Maratones / Dorsales)</option>
              </select>
            </div>

            {/* Monetización */}
            <div className="flex items-center gap-6 mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <label className="flex items-center gap-3 font-bold cursor-pointer text-sm">
                <input type="checkbox" className="w-5 h-5 accent-black" checked={formData.es_gratis} onChange={(e) => setFormData({...formData, es_gratis: e.target.checked})} />
                Este es un evento gratuito
              </label>
              {!formData.es_gratis && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-400">$</span>
                  <input type="number" step="0.01" className="p-3 border border-gray-200 rounded-xl w-32 outline-none font-bold" placeholder="Precio (USD)" value={formData.precio_galeria} onChange={(e) => setFormData({...formData, precio_galeria: e.target.value})} />
                </div>
              )}
            </div>

            <button disabled={cargando} className="w-full bg-[#1A1A1A] text-white py-5 rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 text-lg">
              {cargando ? <><Loader2 className="animate-spin" size={20}/> Guardando...</> : <><Save size={20}/> {eventoEditandoId ? 'Actualizar Evento' : 'Crear Evento'}</>}
            </button>
          </form>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;