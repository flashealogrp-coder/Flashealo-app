// Líneas de negocio de Flashealo.
// Hoy viven aquí; cuando exista la tabla `servicios` (Fase 2 del plan), la home las lee de la base
// y el interruptor del admin cambia `estado` sin tocar el código.
//
// estado: 'activa'       → aparece en la home y su enlace funciona
//         'proximamente' → aparece, pero sin enlace
//         'apagada'      → no aparece

export const CONTACTO = {
  whatsapp: '18292856200',
  whatsappVisible: '+1 829 285 6200',
  instagram: 'flashealo.studio',
  correo: 'info@flashealo.do',
};

export const SERVICIOS = [
  {
    id: 'eventos',
    nombre: 'Eventos',
    descripcion: 'Cobertura de cumpleaños infantiles y celebraciones, con tus fotos en un enlace privado.',
    desde: 'RD$8,000',
    detallePrecio: 'por 5 horas',
    acento: '#e4a0a8',
    estado: 'activa',
    href: 'https://reservas.flashealo.do',
  },
  {
    id: 'sesiones',
    nombre: 'Sesiones fuera del estudio',
    descripcion: 'Navidad en casa y sesiones a domicilio, en el lugar donde te sientes tú.',
    desde: 'RD$5,000',
    detallePrecio: 'por 1 hora',
    acento: '#c8b99a',
    estado: 'activa',
    href: 'https://reservas.flashealo.do',
  },
  {
    id: 'deportes',
    nombre: 'Deportes',
    descripcion: 'Maratones y torneos. Encuentra tus fotos con una selfie, sin revisar miles.',
    desde: null,
    detallePrecio: null,
    acento: '#ff6a2b',
    estado: 'activa',
    href: '/sport', // ruta interna de respaldo (desarrollo)
    subdominio: 'sport',
  },
  {
    id: 'colegios',
    nombre: 'Colegios',
    descripcion: 'Fotos por curso, con acceso privado para cada familia.',
    desde: null,
    detallePrecio: null,
    acento: '#5fa3a8',
    estado: 'proximamente',
    href: null,
  },
  {
    id: 'estudio',
    nombre: 'Estudio',
    descripcion: 'Retratos y trabajo comercial en estudio.',
    desde: null,
    detallePrecio: null,
    acento: '#eaeaea',
    estado: 'apagada',
    href: null,
  },
];

// Fotos de la portada y del portafolio. Mientras estén vacías, esas secciones no se muestran.
export const FOTO_PORTADA = null; // por ejemplo '/fotos/portada.jpg'
export const PORTAFOLIO = []; // por ejemplo [{ src: '/fotos/uno.jpg', alt: 'Cumpleaños en Santo Domingo' }]

export function visibles(lista = SERVICIOS) {
  return lista.filter((s) => s.estado !== 'apagada');
}

export function whatsappUrl(mensaje) {
  const texto = mensaje || 'Hola, quiero información sobre una sesión o un evento con Flashealo.';
  return `https://wa.me/${CONTACTO.whatsapp}?text=${encodeURIComponent(texto)}`;
}
