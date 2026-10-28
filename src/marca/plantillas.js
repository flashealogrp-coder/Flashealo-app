// Plantillas de la página pública de cada fotógrafo (www.flashealo.do/f/<carpeta>).
// Los identificadores deben coincidir con los de la migración 0017 y con nas/lib/paginaIA.mjs.
export const PLANTILLAS = [
  { id: 'editorial', nombre: 'Editorial', descripcion: 'Fondo crema y letra con serifa. Mucho aire, para bodas, retratos y familias.', paleta: ['#F9F8F5', '#181816', '#B8975A'] },
  { id: 'revista', nombre: 'Revista', descripcion: 'Portada a pantalla completa con tu mejor foto. Para quien quiere impactar al entrar.', paleta: ['#1B1B19', '#F4EFE6', '#C8553D'] },
  { id: 'mosaico', nombre: 'Mosaico', descripcion: 'Banda oscura con tu nombre y fotos pegadas en cuadrícula, sin márgenes. Estilo galería de arte.', paleta: ['#2B2B2B', '#FFFFFF', '#111111'] },
  { id: 'portada', nombre: 'Portada', descripcion: 'Fondo negro, nombre grande y fotos en bandas como las páginas de un libro de fotografía.', paleta: ['#0F0F0F', '#F5F5F2', '#8C8C88'] },
  { id: 'collage', nombre: 'Collage', descripcion: 'Colores suaves, letras enormes y fotos que se solapan. Divertida, para marcas con personalidad.', paleta: ['#EFECE6', '#111111', '#1E7FC4'] },
  { id: 'muro', nombre: 'Muro', descripcion: 'Fotos con su forma original en columnas, como un muro. Sobria y rápida de recorrer.', paleta: ['#FFFFFF', '#1A1A1A', '#8A8A8A'] },
];

// Nombres de plantillas anteriores que aún pueden estar guardados.
const ANTIGUAS = { oscura: 'portada', minimal: 'mosaico' };

export const IDS_PLANTILLA = PLANTILLAS.map((p) => p.id);
export const PLANTILLA_INICIAL = 'editorial';

export const normalizarPlantilla = (id) => {
  const v = ANTIGUAS[id] || id;
  return IDS_PLANTILLA.includes(v) ? v : PLANTILLA_INICIAL;
};
