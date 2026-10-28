// Plantillas de la página pública de cada fotógrafo (www.flashealo.do/f/<carpeta>).
// Los identificadores deben coincidir con los de la migración 0015 y con nas/lib/paginaIA.mjs.
export const PLANTILLAS = [
  { id: 'editorial', nombre: 'Editorial', descripcion: 'Fondo crema y letra con serifa. Mucho aire, para bodas, retratos y familias.', paleta: ['#F9F8F5', '#181816', '#B8975A'] },
  { id: 'oscura', nombre: 'Galería oscura', descripcion: 'Fotos grandes sobre fondo negro. Hace brillar el color y los eventos de noche.', paleta: ['#0E0E0D', '#F2F0EA', '#D9B36B'] },
  { id: 'revista', nombre: 'Revista', descripcion: 'Portada a pantalla completa con tu mejor foto. Para quien quiere impactar al entrar.', paleta: ['#1B1B19', '#F4EFE6', '#C8553D'] },
  { id: 'minimal', nombre: 'Minimal', descripcion: 'Blanco, tipografía fina y cuadrícula limpia. Deja hablar solo a las fotos.', paleta: ['#FFFFFF', '#111111', '#111111'] },
];

export const IDS_PLANTILLA = PLANTILLAS.map((p) => p.id);
export const PLANTILLA_INICIAL = 'editorial';

export const normalizarPlantilla = (id) => (IDS_PLANTILLA.includes(id) ? id : PLANTILLA_INICIAL);
