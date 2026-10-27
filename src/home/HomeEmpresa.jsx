import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CONTACTO,
  FOTO_PORTADA,
  PORTAFOLIO,
  SERVICIOS,
  visibles,
  whatsappUrl,
} from '../marca/servicios.js';
import { urlDeLinea } from '../marca/anfitrion.js';
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

function ItemMenu({ servicio, alElegir }) {
  const { nombre, descripcion, desde, detallePrecio, estado, subdominio } = servicio;
  const host = typeof window !== 'undefined' ? window.location.host : '';
  const href = subdominio ? urlDeLinea(subdominio, host, servicio.href) : servicio.href;
  const activa = estado === 'activa' && href;

  const contenido = (
    <>
      <span className="fh-item-texto">
        <span className="fh-item-nombre">{nombre}</span>
        <span className="fh-item-desc">{descripcion}</span>
      </span>
      <span className="fh-item-lado">
        {activa ? (
          <>
            {desde && (
              <span className="fh-item-precio">
                <span className="fl-etiqueta">Desde</span> {desde}
                <span className="fh-detalle"> {detallePrecio}</span>
              </span>
            )}
            <span className="fl-etiqueta fh-ir">
              {desde ? 'Reservar' : 'Entrar'} <Flecha />
            </span>
          </>
        ) : (
          <span className="fl-etiqueta">Próximamente</span>
        )}
      </span>
    </>
  );

  if (!activa) {
    return (
      <li className="fh-item fh-item-pausado">
        <div className="fh-item-interior" aria-label={`${nombre}, próximamente`}>
          {contenido}
        </div>
      </li>
    );
  }
  const enlace = href.startsWith('/') ? (
    <Link className="fh-item-interior" to={href} onClick={alElegir}>
      {contenido}
    </Link>
  ) : (
    <a className="fh-item-interior" href={href} onClick={alElegir}>
      {contenido}
    </a>
  );
  return <li className="fh-item">{enlace}</li>;
}

const PASOS = [
  {
    titulo: 'Pides tu fecha',
    texto: 'Nos escribes por WhatsApp o llenas la solicitud con el día y el lugar. Te respondemos si está libre.',
  },
  {
    titulo: 'Apartamos tu fecha',
    texto: 'Cuando confirmamos, tu fecha queda apartada. Solo falta el pago para dejarla confirmada.',
  },
  {
    titulo: 'Recibes tu enlace privado',
    texto: 'Después del evento subimos las fotos a una galería privada. Se abre desde el celular y se comparte por WhatsApp.',
  },
];

export default function HomeEmpresa() {
  // `revelar` decide la entrada con telón; el telón se quita solo al terminar.
  const [revelar] = useState(debeDestellar);
  const [telon, setTelon] = useState(revelar);
  const servicios = visibles(SERVICIOS);
  const [menu, setMenu] = useState(false);
  const cajaMenu = useRef(null);
  const botonMenu = useRef(null);

  useEffect(() => {
    if (!menu) return undefined;
    const cerrarFuera = (e) => {
      if (cajaMenu.current && !cajaMenu.current.contains(e.target)) setMenu(false);
    };
    const cerrarEsc = (e) => {
      if (e.key === 'Escape') {
        setMenu(false);
        botonMenu.current?.focus();
      }
    };
    document.addEventListener('pointerdown', cerrarFuera);
    document.addEventListener('keydown', cerrarEsc);
    return () => {
      document.removeEventListener('pointerdown', cerrarFuera);
      document.removeEventListener('keydown', cerrarEsc);
    };
  }, [menu]);

  const abrirMenu = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMenu(true);
  };

  useEffect(() => {
    if (!revelar) return;
    try {
      window.sessionStorage.setItem(CLAVE_DESTELLO, '1');
    } catch {
      /* sin almacenamiento: la entrada puede repetirse, no pasa nada */
    }
  }, [revelar]);

  const estiloPortada = FOTO_PORTADA ? { '--fh-foto': `url(${FOTO_PORTADA})` } : undefined;

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
          <div className="fh-menu" ref={cajaMenu}>
            <button
              type="button"
              ref={botonMenu}
              className="fl-etiqueta fh-menu-boton"
              aria-expanded={menu}
              aria-controls="menu-servicios"
              onClick={() => setMenu((v) => !v)}
            >
              Servicios <span className={`fh-menu-flecha${menu ? ' fh-abierto' : ''}`} aria-hidden="true" />
            </button>
            {menu && (
              <div className="fh-menu-panel" id="menu-servicios">
                <ul className="fh-items">
                  {servicios.map((s) => (
                    <ItemMenu key={s.id} servicio={s} alElegir={() => setMenu(false)} />
                  ))}
                </ul>
              </div>
            )}
          </div>
          <a className="fl-etiqueta" href="#como">
            Cómo funciona
          </a>
          <a className="fl-etiqueta" href="#contacto">
            Contacto
          </a>
          <a className="fl-boton fl-boton-pildora" href={whatsappUrl()} target="_blank" rel="noreferrer">
            WhatsApp <Flecha />
          </a>
        </nav>
      </header>

      <main>
        <section className="fh-portada" style={estiloPortada}>
          <div className="fh-contenedor fh-portada-rejilla">
            <h1 className="fl-titulo fh-titulo fh-aparece" style={{ '--d': '0.8s' }}>
              Fotografía para los momentos que importan.
            </h1>
            <div className="fh-portada-lado fh-aparece" style={{ '--d': '1.05s' }}>
              <p className="fl-parrafo">
                Cumpleaños, sesiones y eventos deportivos. Recibes tus fotos en un enlace privado, listo para compartir
                por WhatsApp.
              </p>
              <div className="fh-acciones">
                <a className="fl-boton" href={whatsappUrl()} target="_blank" rel="noreferrer">
                  Escribir por WhatsApp <Flecha />
                </a>
                <a className="fl-boton fl-boton-linea" href="#servicios" onClick={abrirMenu}>
                  Ver servicios <Flecha />
                </a>
              </div>
            </div>
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

        <section className="fh-seccion fh-arena" id="como" aria-labelledby="t-como">
          <div className="fh-contenedor">
            <h2 className="fl-titulo fh-h2" id="t-como">
              Así recibes tus fotos
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

        <section className="fh-seccion fh-contacto" id="contacto" aria-labelledby="t-contacto">
          <div className="fh-contenedor">
            <h2 className="fl-titulo fh-h2 fh-h2-grande" id="t-contacto">
              Cuéntanos tu fecha.
            </h2>
            <p className="fl-parrafo fh-contacto-texto">
              Atendemos los viernes desde las 6 pm, y los sábados y domingos todo el día.
            </p>
            <div className="fh-acciones">
              <a className="fl-boton" href={whatsappUrl()} target="_blank" rel="noreferrer">
                Escribir por WhatsApp <Flecha />
              </a>
              <a className="fl-boton fl-boton-linea" href="https://reservas.flashealo.do">
                Solicitar una reserva <Flecha />
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
          <span className="fl-etiqueta">© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
