import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Save, ShieldCheck, Loader2, List, Plus, Trash2, Edit3, Settings, Sparkles, Calendar, Image as ImageIcon, CheckCircle } from 'lucide-react';
import ReviewPanel from './ReviewPanel'; 

const AdminPanel = () => {
  const [tabActiva, setTabActiva] = useState('lista'); 
  const [listaEventos, setListaEventos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  
  // Estado para capturar el evento que se va a auditar
  const [eventoParaAuditar, setEventoParaAuditar] = useState(null);

  // Estados del Formulario
  const [eventoEditandoId, setEventoEditandoId] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [portadaFile, setPortadaFile] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '', slug: '', descripcion: '', fecha_evento: '', ubicacion: '', 
    tipo_reconocimiento: 'hibrido', es_gratis: true, precio_galeria: 0.00, 
    logo_url: '', portada_url: ''
  });

  useEffect(() => { cargarEventos(); }, []);

  const cargarEventos = async () => {
    const { data } = await supabase.from('eventos').select('*').order('created_at', { ascending: false });
    if (data) setListaEventos(data);
  };

  const subirArchivo = async (file, subcarpeta) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const fileName = `${subcarpeta}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from('assets').upload(fileName, file);
    if (error) throw error;
    return supabase.storage.from('assets').getPublicUrl(fileName).data.publicUrl;
  };

  const guardarEvento = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      let lUrl = formData.logo_url;
      let pUrl = formData.portada_url;
      if (logoFile) lUrl = await subirArchivo(logoFile, 'logos');
      if (portadaFile) pUrl = await subirArchivo(portadaFile, 'portadas');

      const payload = { ...formData, precio_galeria: formData.es_gratis ? 0 : parseFloat(formData.precio_galeria), logo_url: lUrl, portada_url: pUrl };

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
      setMensaje({ tipo: 'error', texto: "Error: " + err.message });
    } finally { setCargando(false); }
  };

  const resetForm = () => {
    setEventoEditandoId(null);
    setLogoFile(null);
    setPortadaFile(null);
    setFormData({ nombre: '', slug: '', descripcion: '', fecha_evento: '', ubicacion: '', tipo_reconocimiento: 'hibrido', es_gratis: true, precio_galeria: 0, logo_url: '', portada_url: '' });
  };

  const iniciarEdicion = (ev) => {
    setEventoEditandoId(ev.id);
    setFormData(ev);
    setTabActiva('crear');
  };

  // VISTA DE AUDITORÍA (Se muestra si eventoParaAuditar tiene valor)
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1A1A1A] rounded-xl flex items-center justify-center shadow-lg"><ShieldCheck size={20} className="text-white" /></div>
            <div><h1 className="font-bold text-lg uppercase tracking-widest">Flashealo</h1><p className="text-[10px] text-gray-400 font-bold uppercase">Panel de Control</p></div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        {mensaje.texto && (
          <div className={`p-4 rounded-xl mb-6 font-bold text-sm border ${mensaje.tipo === 'exito' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
            {mensaje.texto}
          </div>
        )}

        <div className="flex gap-4 border-b border-gray-200 mb-8">
          <button onClick={() => setTabActiva('lista')} className={`px-6 py-4 font-bold text-xs uppercase ${tabActiva === 'lista' ? 'border-b-2 border-black' : ''}`}>Mis Eventos</button>
          <button onClick={() => { resetForm(); setTabActiva('crear'); }} className={`px-6 py-4 font-bold text-xs uppercase ${tabActiva === 'crear' ? 'border-b-2 border-black' : ''}`}>Nuevo Evento</button>
        </div>

        {tabActiva === 'lista' && (
          <div className="space-y-4">
            {listaEventos.map(ev => (
              <div key={ev.id} className="bg-white p-6 rounded-3xl border flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="font-bold text-lg">{ev.nombre}</h3>
                  <p className="text-sm text-gray-500">{ev.tipo_reconocimiento.toUpperCase()}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEventoParaAuditar(ev)} className="bg-[#1A1A1A] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"><CheckCircle size={14} /> Auditar</button>
                  <button onClick={() => iniciarEdicion(ev)} className="p-2 text-gray-400"><Edit3 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tabActiva === 'crear' && (
          <form onSubmit={guardarEvento} className="bg-white p-8 rounded-3xl shadow-sm border">
            <input className="w-full p-4 mb-4 border rounded-xl" placeholder="Nombre" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
            <button className="w-full bg-black text-white p-4 rounded-xl font-bold">Guardar Evento</button>
          </form>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;