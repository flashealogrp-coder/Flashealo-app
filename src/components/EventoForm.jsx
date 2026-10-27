import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Save, Upload, Settings, Sparkles } from 'lucide-react';

const EventoForm = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    slug: '',
    tipo_reconocimiento: 'hibrido',
    es_gratis: true,
    precio_foto: 0.00,
    fecha_evento: '', // Nuevo
    ubicacion: '',    // Nuevo
    descripcion: ''   // Nuevo
  });

    const [logoFile, setLogoFile] = useState(null);
    const [portadaFile, setPortadaFile] = useState(null);
    const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Función para subir archivos a un bucket llamado 'assets'
    const uploadAsset = async (file, path) => {
    const { data, error } = await supabase.storage
        .from('assets') // Asegúrate de tener este bucket creado
        .upload(path, file);
    return data ? data.path : null;
    };

    const { data, error } = await supabase
      .from('eventos')
      .insert([formData]);

    if (error) alert("Error al guardar: " + error.message);
    else alert("¡Evento creado con éxito!");
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-fl-lino p-8 rounded-sm shadow-sm border border-fl-borde max-w-2xl mx-auto">
      <h2 className="font-serif text-3xl font-light mb-6 flex items-center gap-2">
        <Sparkles size={22} className="text-fl-laton" /> Configurar Nuevo Evento
      </h2>

      {/* Datos Básicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="fl-etiqueta block mb-2">Nombre del Evento</label>
          <input 
            className="fl-campo"
            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
            placeholder="Ej: Torneo Nacional Pickleball 2026"
          />
        </div>
        <div>
          <label className="fl-etiqueta block mb-2">Slug (URL)</label>
          <input 
            className="fl-campo"
            onChange={(e) => setFormData({...formData, slug: e.target.value})}
            placeholder="pickleball-nacional-2026"
          />
        </div>
      </div>
<div className="bg-fl-arena p-6 rounded-sm mb-8 border border-fl-borde">
        <h3 className="font-serif text-xl font-normal mb-4">Logística del Evento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="fl-etiqueta block mb-2">Fecha</label>
            <input 
              type="date" 
              className="fl-campo"
              onChange={(e) => setFormData({...formData, fecha_evento: e.target.value})}
            />
          </div>
          <div>
            <label className="fl-etiqueta block mb-2">Ubicación</label>
            <input 
              className="fl-campo"
              placeholder="Ej: Centro Olímpico, SD"
              onChange={(e) => setFormData({...formData, ubicacion: e.target.value})}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="fl-etiqueta block mb-2">Descripción breve</label>
          <textarea 
            className="fl-campo"
            rows="2"
            onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
          />
        </div>
      </div>

        <div className="grid grid-cols-2 gap-4">
        <div>
            <label className="fl-etiqueta block mb-2">Logo (400x400)</label>
            <input type="file" onChange={(e) => setLogoFile(e.target.files[0])} />
        </div>
        <div>
            <label className="fl-etiqueta block mb-2">Portada (1200x630)</label>
            <input type="file" onChange={(e) => setPortadaFile(e.target.files[0])} />
        </div>
        </div>

      {/* Configuración del Motor (Modular) */}
      <div className="bg-[#EFECE6] p-6 rounded-sm mb-8">
        <h3 className="font-serif text-xl font-normal mb-4 flex items-center gap-2"><Settings size={18}/> Lógica del Motor de IA</h3>
        <select 
          className="w-full p-3 rounded-sm border border-fl-borde mb-4"
          onChange={(e) => setFormData({...formData, tipo_reconocimiento: e.target.value})}
        >
          <option value="hibrido">Híbrido (Facial + Color + Contexto) - RECOMENDADO</option>
          <option value="facial">Facial Puro (Eventos Sociales)</option>
          <option value="ocr">OCR (Maratones - Reconocimiento de Dorsales)</option>
        </select>
      </div>

      {/* Monetización */}
      <div className="flex items-center gap-6 mb-8">
        <label className="flex items-center gap-2 font-bold cursor-pointer">
          <input type="checkbox" checked={formData.es_gratis} onChange={(e) => setFormData({...formData, es_gratis: e.target.checked})} />
          Es un evento gratuito
        </label>
        {!formData.es_gratis && (
          <input 
            type="number" 
            className="p-2 border rounded-sm w-24"
            placeholder="Precio"
            onChange={(e) => setFormData({...formData, precio_foto: e.target.value})}
          />
        )}
      </div>

      <button 
        disabled={loading}
        className="fl-boton w-full"
      >
        {loading ? "Guardando..." : <><Save size={16}/> Guardar configuración del evento</>}
      </button>
    </form>
  );
};

export default EventoForm;