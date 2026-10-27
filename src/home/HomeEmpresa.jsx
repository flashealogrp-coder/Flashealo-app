import React, { useEffect, useState } from 'react';
import {
  CONTACTO,
  PORTAFOLIO,
  whatsappUrl,
} from '../marca/servicios.js';
import './home.css';

const CLAVE_DESTELLO = 'flashealo-destello';

// El destello de cámara se muestra una sola vez por visita y nunca si la persona pidió menos movimiento.
function debeDestellar() {
  try {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if (window.sessionStorage.getItem(CLAVE_DESTELLO)) return false;
    return true;
  } catch {
    return false;
  }
}

function IconoInstagram() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconoCorreo() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </svg>
  );
}

function Flecha() {
  return (
    <span className="fl-flecha" aria-hidden="true">
      ↗
    </span>
  );
}

const MENSAJE_ACCESO = 'Hola, soy fotógrafo/a y quiero solicitar acceso al portal de Flashealo.';

// Lo que hace el panel de cada fotógrafo. Todo esto existe hoy en el sistema.
const INCLUYE = [
  {
    titulo: 'Subida masiva',
    texto: 'Arrastra una carpeta completa. Las fotos se reparten solas en sets de hasta 500, y si una falla se reintenta sin detener las demás.',
  },
  {
    titulo: 'Sets en pestañas',
    texto: 'Divide un cumpleaños en invitados, decoración o familia. Tu cliente entra directo al set que busca.',
  },
  {
    titulo: 'Cada persona encuentra sus fotos',
    texto: 'El reconocimiento facial agrupa a cada persona y tus clientes se encuentran con una selfie, sin revisar miles de fotos. En el mosaico, las fotos se encuadran sobre las caras.',
  },
  {
    titulo: 'Tú decides la descarga',
    texto: 'Un interruptor por colección para bajar fotos en tamaño real y otro para llevarse todo en un zip. Las fotos se ven sin marca de agua.',
  },
  {
    titulo: 'Tu diseño',
    texto: 'Portada, tipografía, colores y orden de la galería, con vista previa antes de publicar.',
  },
  {
    titulo: 'Privado y separado',
    texto: 'Contraseña por colección. Cada fotógrafo ve solo sus colecciones, sus clientes y sus archivos, y lo que borras se elimina de verdad.',
  },
];

const PASOS = [
  {
    titulo: 'Creas tu cuenta',
    texto: 'Te registras con tu nombre, tu correo y el usuario que será tu carpeta.',
  },
  {
    titulo: 'Activamos tu espacio',
    texto: 'Revisamos tu solicitud y activamos tu espacio de almacenamiento.',
  },
  {
    titulo: 'Subes y compartes',
    texto: 'Creas tu colección, subes tus fotos y envías el enlace a tus clientes.',
  },
];

const PREGUNTAS = [
  {
    p: '¿Cuánto cuesta?',
    r: 'Todavía estamos definiendo los planes junto al primer grupo de fotógrafos. Escríbenos y te contamos cómo es el acceso inicial.',
  },
  {
    p: '¿Mis clientes tienen que crear una cuenta?',
    r: 'No. Entran con el enlace de la colección, y con contraseña si tú decides ponerla.',
  },
  {
    p: '¿Puedo cobrar las descargas?',
    r: 'Estamos conectando los pagos con tarjetas locales. Mientras tanto, tú decides si la descarga de cada colección está abierta o cerrada.',
  },
  {
    p: '¿Dónde se guardan mis fotos?',
    r: 'En los servidores de Flashealo, no en plataformas de terceros. El público nunca ve tus originales: la galería usa una versión liviana de cada foto.',
  },
];

// Ejemplo ilustrativo del producto: una colección con sets en pestañas. Cada bloque de color es una foto.
const SETS = [
  { id: 'todas', nombre: 'Todas', total: '1.240' },
  { id: 'invitados', nombre: 'Invitados', total: '560' },
  { id: 'decoracion', nombre: 'Decoración', total: '280' },
  { id: 'familia', nombre: 'Familia', total: '400' },
];
const BLOQUES = [
  { set: 'invitados', clase: 'g', tono: 0 },
  { set: 'familia', clase: 'p', tono: 2 },
  { set: 'decoracion', clase: 'a', tono: 1 },
  { set: 'invitados', clase: 'p', tono: 3 },
  { set: 'familia', clase: 'p', tono: 0 },
  { set: 'invitados', clase: 'a', tono: 2 },
  { set: 'decoracion', clase: 'p', tono: 3 },
  { set: 'familia', clase: 'a', tono: 1 },
  { set: 'invitados', clase: 'p', tono: 1 },
  { set: 'decoracion', clase: 'a', tono: 0 },
];

function EjemploColeccion() {
  const [activo, setActivo] = useState('todas');
  const bloques = BLOQUES.filter((b) => activo === 'todas' || b.set === activo);
  return (
    <figure className="fh-isla">
      <div className="fh-isla-marco" aria-hidden="true">
        <div className="fh-isla-cabecera">
          <span className="fh-isla-titulo">Cumpleaños de Sofía</span>
          <span className="fh-isla-interruptores">
            <span className="fh-chip">Descarga: sí</span>
            <span className="fh-chip fh-chip-apagado">Zip completo: no</span>
          </span>
        </div>
        <div className="fh-isla-sets" role="tablist" aria-label="Sets de la colección de ejemplo">
          {SETS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              tabIndex={-1}
              aria-selected={activo === s.id}
              className={`fh-isla-set${activo === s.id ? ' fh-activo' : ''}`}
              onClick={() => setActivo(s.id)}
            >
              {s.nombre} <span>{s.total}</span>
            </button>
          ))}
        </div>
        <div className="fh-isla-mosaico">
          {bloques.map((b, i) => (
            <span key={`${activo}-${i}`} className={`fh-bloque fh-bloque-${b.clase} fh-tono-${b.tono}`} />
          ))}
        </div>
      </div>
      <figcaption className="fl-etiqueta fh-isla-nota">
        Ejemplo ilustrativo. Toca un set para ver cómo lo recorre tu cliente.
      </figcaption>
    </figure>
  );
}

export default function HomeEmpresa() {
  // `revelar` decide la entrada con telón; el telón se quita solo al terminar.
  const [revelar] = useState(debeDestellar);
  const [telon, setTelon] = useState(revelar);
  const acceso = '/registro';
  const accesoWhatsapp = whatsappUrl(MENSAJE_ACCESO);

  useEffect(() => {
    if (!revelar) return;
    try {
      window.sessionStorage.setItem(CLAVE_DESTELLO, '1');
    } catch {
      /* sin almacenamiento: la entrada puede repetirse, no pasa nada */
    }
  }, [revelar]);

  return (
    <div className={`fh${revelar ? ' fh-con-telon' : ''}`}>
      {telon && (
        <div className="fh-telon" aria-hidden="true" onAnimationEnd={() => setTelon(false)}>
          <span>FLASHEALO</span>
        </div>
      )}

      <header className="fl-pildora fh-pildora">
        <a className="fh-marca" href="/" aria-label="Flashealo, inicio">
          FLASHEALO
        </a>
        <nav className="fh-nav" aria-label="Principal">
          <a className="fl-etiqueta" href="#incluye">
            Qué incluye
          </a>
          <a className="fl-etiqueta" href="#como">
            Cómo empiezas
          </a>
          <a className="fl-etiqueta" href="#preguntas">
            Preguntas
          </a>
          <a className="fl-etiqueta fh-entrar" href="/mi-espacio">
            Entrar a mi espacio
          </a>
          <a className="fl-boton fl-boton-pildora" href={acceso}>
            Solicitar acceso <Flecha />
          </a>
        </nav>
      </header>

      <main>
        <section className="fh-portada">
          <div className="fh-contenedor fh-portada-rejilla">
            <h1 className="fl-titulo fh-titulo fh-aparece" style={{ '--d': '0.8s' }}>
              Cada fotógrafo, con su propio espacio.
            </h1>
            <div className="fh-portada-lado fh-aparece" style={{ '--d': '1.05s' }}>
              <p className="fl-parrafo">
                Sube miles de fotos, arma galerías privadas con tu marca y deja que tus clientes encuentren las suyas con
                una selfie. Tu trabajo queda separado del de los demás.
              </p>
              <div className="fh-acciones">
                <a className="fl-boton" href={acceso}>
                  Solicitar acceso <Flecha />
                </a>
                <a className="fl-boton fl-boton-linea" href="#incluye">
                  Ver qué incluye <Flecha />
                </a>
              </div>
              <p className="fh-nota">Revisamos cada solicitud a mano y te avisamos cuando tu espacio esté listo.</p>
            </div>
          </div>
          <div className="fh-contenedor fh-aparece" style={{ '--d': '1.3s' }}>
            <EjemploColeccion />
          </div>
        </section>

        {PORTAFOLIO.length > 0 && (
          <section className="fh-seccion fh-portafolio" aria-label="Portafolio">
            <div className="fh-contenedor fh-galeria">
              {PORTAFOLIO.map((f, i) => (
                <figure key={f.src} className={`fh-foto fh-foto-${i % 6}`}>
                  <img src={f.src} alt={f.alt || ''} loading="lazy" decoding="async" />
                </figure>
              ))}
            </div>
          </section>
        )}

        <section className="fh-seccion" id="incluye" aria-labelledby="t-incluye">
          <div className="fh-contenedor fh-incluye">
            <h2 className="fl-titulo fh-h2 fh-incluye-titulo" id="t-incluye">
              Lo que haces desde tu panel
            </h2>
            <ul className="fh-filas">
              {INCLUYE.map((f) => (
                <li key={f.titulo} className="fh-fila">
                  <h3>{f.titulo}</h3>
                  <p className="fl-parrafo">{f.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="fh-seccion fh-arena" id="como" aria-labelledby="t-como">
          <div className="fh-contenedor">
            <h2 className="fl-titulo fh-h2" id="t-como">
              Cómo empiezas
            </h2>
            <ol className="fh-pasos">
              {PASOS.map((p, i) => (
                <li key={p.titulo} className="fh-paso">
                  <span className="fh-paso-numero" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3>{p.titulo}</h3>
                  <p className="fl-parrafo">{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="fh-seccion" id="preguntas" aria-labelledby="t-preguntas">
          <div className="fh-contenedor fh-incluye">
            <h2 className="fl-titulo fh-h2 fh-incluye-titulo" id="t-preguntas">
              Preguntas
            </h2>
            <div className="fh-faq">
              {PREGUNTAS.map((q) => (
                <details key={q.p} className="fh-pregunta">
                  <summary>{q.p}</summary>
                  <p className="fl-parrafo">{q.r}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="fh-seccion fh-contacto" id="contacto" aria-labelledby="t-contacto">
          <div className="fh-contenedor">
            <h2 className="fl-titulo fh-h2 fh-h2-grande" id="t-contacto">
              Solicita tu espacio.
            </h2>
            <p className="fl-parrafo fh-contacto-texto">
              Cuéntanos qué fotografía haces y cuántos eventos cubres al mes. Te respondemos personalmente.
            </p>
            <div className="fh-acciones">
              <a className="fl-boton" href={accesoWhatsapp} target="_blank" rel="noreferrer">
                Escribir por WhatsApp <Flecha />
              </a>
            </div>
            <ul className="fh-contactos">
              <li>
                <a href={`https://wa.me/${CONTACTO.whatsapp}`} target="_blank" rel="noreferrer">
                  {CONTACTO.whatsappVisible}
                </a>
              </li>
              <li>
                <a href={`https://www.instagram.com/${CONTACTO.instagram}/`} target="_blank" rel="noreferrer">
                  <IconoInstagram /> @{CONTACTO.instagram}
                </a>
              </li>
              <li>
                <a href={`mailto:${CONTACTO.correo}`}>
                  <IconoCorreo /> {CONTACTO.correo}
                </a>
              </li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="fh-pie">
        <div className="fh-contenedor fh-pie-fila">
          <span className="fh-marca">FLASHEALO</span>
          <span className="fl-etiqueta">
            <a href="/mi-espacio" style={{ color: 'inherit' }}>Entrar a mi espacio</a> · © {new Date().getFullYear()}
          </span>
        </div>
      </footer>
    </div>
  );
}
