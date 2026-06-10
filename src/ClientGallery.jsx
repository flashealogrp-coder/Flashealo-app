import React, { useState, useEffect } from 'react';
import { Lock, ChevronDown, Instagram, Twitter, Mail } from 'lucide-react';

// ==========================================
// ESTILOS GLOBALES RECOMENDADOS (En tu CSS):
// font-serif: 'Cormorant Garamond', serif;
// font-sans: 'Inter', sans-serif;
// ==========================================

const ClientGallery = ({ eventoMock }) => {
  // Simulamos los datos del evento que vendrían de Supabase
  const evento = eventoMock || {
    nombre: "Maratón Punta Cana 2026",
    fecha: "12 de Octubre, 2026",
    fotografo: "FLASHEALO Studios",
    cover: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=2070&auto=format&fit=crop",
    requierePassword: true,
    fotos: [
      "https://images.unsplash.com/photo-1530549387722-1c109d062faf?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1571008882533-8120e6fbf193?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1505250469679-20330d5ec223?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1000&auto=format&fit=crop"
    ]
  };

  const [autenticado, setAutenticado] = useState(!evento.requierePassword);
  const [passwordInput, setPasswordInput] = useState('');
  const [scrolled, setScrolled] = useState(false);

  // Efecto sutil para el Navbar al hacer scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    // Aquí iría la validación real con Supabase
    if (passwordInput === '1234') setAutenticado(true);
  };

  // ─── PANTALLA DE CONTRASEÑA MINIMALISTA ───
  if (!autenticado) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center p-6 font-sans text-[#1a1a1a]">
        <div className="max-w-md w-full animate-in fade-in zoom-in duration-1000">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-4">{evento.fotografo}</p>
            <h1 className="text-4xl md:text-5xl font-serif tracking-wide">{evento.nombre}</h1>
            <p className="mt-4 text-sm text-gray-500 font-light">{evento.fecha}</p>
          </div>
          
          <form onSubmit={handleLogin} className="flex flex-col items-center gap-8">
            <div className="relative w-full max-w-xs">
              <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
              <input 
                type="password" 
                placeholder="Contraseña de la galería"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-transparent border-b border-gray-300 py-3 pl-8 outline-none focus:border-black transition-colors text-center tracking-widest font-light placeholder:text-gray-300 placeholder:tracking-normal"
              />
            </div>
            <button 
              type="submit" 
              className="px-12 py-3 bg-[#1a1a1a] text-white text-xs uppercase tracking-[0.2em] hover:bg-black transition-colors duration-500"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── GALERÍA EDITORIAL PRINCIPAL ───
  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#1a1a1a] font-sans selection:bg-[#1a1a1a] selection:text-white">
      
      {/* NAVBAR FLOTANTE */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-700 ${scrolled ? 'bg-[#FDFCF8]/80 backdrop-blur-md border-b border-gray-100 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.2em] font-medium">{evento.fotografo}</span>
          <div className="hidden md:flex gap-8 text-xs uppercase tracking-[0.2em] text-gray-500">
            <button className="hover:text-black transition-colors duration-500">Portfolio</button>
            <button className="hover:text-black transition-colors duration-500">Contacto</button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION CINEMATOGRÁFICO */}
      <header className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        {/* Imagen de fondo con zoom sutil (Ken Burns effect) */}
        <div className="absolute inset-0 z-0">
          <img 
            src={evento.cover} 
            alt="Cover" 
            className="w-full h-full object-cover animate-[subtleZoom_20s_ease-in-out_infinite]"
          />
          {/* Overlay suave para legibilidad */}
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Texto del Hero */}
        <div className="relative z-10 text-center text-white px-6 mt-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          <p className="text-xs md:text-sm uppercase tracking-[0.4em] font-light mb-6 opacity-80">{evento.fecha}</p>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-light tracking-wide leading-tight mb-8">
            {evento.nombre}
          </h1>
          <button onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })} className="inline-flex flex-col items-center opacity-70 hover:opacity-100 transition-opacity duration-500 mt-12 cursor-pointer">
            <span className="text-[10px] uppercase tracking-[0.2em] mb-4">Ver Colección</span>
            <ChevronDown size={20} className="animate-bounce" strokeWidth={1} />
          </button>
        </div>
      </header>

      {/* INTRODUCCIÓN / ABOUT (Espacios inmensos) */}
      <section className="py-32 px-6 max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-serif mb-8 italic text-gray-800">
          "Capturando la energía, el sudor y la gloria de cada kilómetro."
        </h2>
        <p className="text-gray-500 font-light leading-relaxed tracking-wide text-sm md:text-base">
          Esta colección es un tributo visual a la dedicación de cada participante. Navega a través de los momentos destacados, encuentra tu número de dorsal y revive la emoción de cruzar la línea de meta. Diseñado meticulosamente para preservar tus recuerdos con la más alta calidad.
        </p>
      </section>

      {/* GALERÍA MASONRY EDITORIAL */}
      <main className="max-w-[100rem] mx-auto px-6 md:px-12 pb-32">
        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
          {evento.fotos.map((src, index) => (
            <div 
              key={index} 
              className="relative group overflow-hidden bg-gray-100 break-inside-avoid"
            >
              <img 
                src={src} 
                alt={`Captura ${index + 1}`} 
                className="w-full h-auto object-cover transform group-hover:scale-[1.03] transition-transform duration-[1.5s] ease-out"
                loading="lazy"
              />
              
              {/* Overlay minimalista al hacer hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-700 opacity-0 group-hover:opacity-100 flex items-end justify-center pb-8 pointer-events-none">
                <span className="text-white text-[10px] uppercase tracking-[0.2em] backdrop-blur-md bg-white/10 px-6 py-2">
                  Ampliar Fotografía
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* SECCIÓN TRABAJOS DESTACADOS / CTA ELEGANTE */}
      <section className="bg-gray-50 py-32 px-6">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-6">Busca tu fotografía</span>
          <h2 className="text-4xl md:text-5xl font-serif mb-10 text-[#1a1a1a]">Encuentra tu dorsal</h2>
          <div className="flex w-full max-w-md border-b border-gray-300 pb-2 focus-within:border-black transition-colors duration-500">
            <input 
              type="text" 
              placeholder="EJ. 1405" 
              className="w-full bg-transparent outline-none text-center text-2xl font-serif placeholder:text-gray-300"
            />
          </div>
          <button className="mt-12 px-12 py-4 bg-[#1a1a1a] text-white text-[10px] uppercase tracking-[0.3em] hover:bg-black hover:px-14 transition-all duration-500">
            Buscar en la Colección
          </button>
        </div>
      </section>

      {/* FOOTER ESPACIOSO */}
      <footer className="bg-[#FDFCF8] py-24 px-6 md:px-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="text-center md:text-left">
            <h3 className="font-serif text-2xl tracking-widest mb-2">{evento.fotografo}</h3>
            <p className="text-xs text-gray-400 tracking-[0.1em] font-light">Fotografía Editorial & Deportiva</p>
          </div>
          
          <div className="flex gap-8">
            <a href="#" className="text-gray-400 hover:text-black transition-colors duration-500"><Instagram strokeWidth={1.5} size={20}/></a>
            <a href="#" className="text-gray-400 hover:text-black transition-colors duration-500"><Twitter strokeWidth={1.5} size={20}/></a>
            <a href="#" className="text-gray-400 hover:text-black transition-colors duration-500"><Mail strokeWidth={1.5} size={20}/></a>
          </div>

          <div className="text-center md:text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">© 2026 FLASHEALO</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-300 mt-1">Diseñado con excelencia</p>
          </div>
        </div>
      </footer>

      {/* ESTILO PARA LA ANIMACIÓN DEL HERO (Ken Burns) */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes subtleZoom {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}} />
    </div>
  );
};

export default ClientGallery;