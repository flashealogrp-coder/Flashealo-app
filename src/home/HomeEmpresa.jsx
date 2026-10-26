import React, { useEffect, useState } from 'react';
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
import '../marca/tokens.css';
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

function FilaServicio({ servicio }) {
  const { nombre, descripcion, desde, detallePrecio, acento, estado, subdominio } = servicio;
  const host = typeof window !== 'undefined' ? window.location.host : '';
  const href = subdominio ? urlDeLinea(subdominio, host, servicio.href) : servicio.href;
  const activa = estado === 'activa' && href;
  const contenido = (
    <>
      <span className="fh-fila-nombre">{nombre}</span>
      <span className="fh-fila-texto">{descripcion}</span>
      <span className="fh-fila-meta">
        {activa && desde ? (
          <>
            <span className="fh-precio">Desde {desde}</span>
            <span className="fh-detalle">{detallePrecio}</span>
          </>
        ) : activa ? (
          <span className="fh-ver">Ver</span>
        ) : (
          <span className="fh-pronto">Próximamente</span>
        )}
      </span>
    </>
  );

  const estilo = { '--acento': acento };

  if (!activa) {
    return (
      <li className="fh-fila fh-fila-pausada" style={estilo}>
        <div className="fh-fila-interior" aria-label={`${nombre}, próximamente`}>
          {contenido}
        </div>
      </li>
    );
  }

  const enlace = href.startsWith('/') ? (
    <Link className="fh-fila-interior" to={href}>
      {contenido}
    </Link>
  ) : (
    <a className="fh-fila-interior" href={href}>
      {contenido}
    </a>
  );

  return (
    <li className="fh-fila" style={estilo}>
      {enlace}
    </li>
  );
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
  // `revelar` decide la animación de entrada del titular; `destello` es solo la capa de luz, que se quita sola al terminar.
  const [revelar] = useState(debeDestellar);
  const [destello, setDestello] = useState(revelar);
  const servicios = visibles(SERVICIOS);

  useEffect(() => {
    if (!revelar) return;
    try {
      window.sessionStorage.setItem(CLAVE_DESTELLO, '1');
    } catch {
      /* sin almacenamiento: el destello puede repetirse, no pasa nada */
    }
  }, [revelar]);

  const clasePortada = `fh-portada${revelar ? ' fh-con-destello' : ''}`;
  const estiloPortada = FOTO_PORTADA ? { '--fh-foto': `url(${FOTO_PORTADA})` } : undefined;

  return (
    <div className="fh">
      {destello && <div className="fh-destello" aria-hidden="true" onAnimationEnd={() => setDestello(false)} />}

      <header className="fh-cabecera">
        <div className="fh-cabecera-interior">
          <a className="fh-marca" href="/" aria-label="Flashealo, inicio">
            <span className="fh-marca-barra" aria-hidden="true" />
            FLASHEALO
          </a>
          <nav className="fh-nav" aria-label="Principal">
            <a href="#servicios">Servicios</a>
            <a href="#como">Cómo funciona</a>
            <a href="#contacto">Contacto</a>
            <a className="fh-boton fh-boton-chico" href={whatsappUrl()} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className={clasePortada} style={estiloPortada}>
          <div className="fh-portada-interior">
            <h1 className="fh-titulo fh-aparece" style={{ '--d': '0.25s' }}>
              Fotografía para los momentos que importan.
            </h1>
            <p className="fh-bajada fh-aparece" style={{ '--d': '0.55s' }}>
              Cumpleaños, sesiones y eventos deportivos. Recibes tus fotos en un enlace privado, listo para compartir por
              WhatsApp.
            </p>
            <div className="fh-acciones fh-aparece" style={{ '--d': '0.8s' }}>
              <a className="fh-boton" href={whatsappUrl()} target="_blank" rel="noreferrer">
                Escribir por WhatsApp
              </a>
              <a className="fh-boton fh-boton-claro" href="#servicios">
                Ver servicios
              </a>
            </div>
          </div>
        </section>

        <section className="fh-seccion" id="servicios" aria-labelledby="t-servicios">
          <div className="fh-contenedor">
            <h2 className="fh-h2" id="t-servicios">
              Elige lo que necesitas
            </h2>
            <ul className="fh-lista">
              {servicios.map((s) => (
                <FilaServicio key={s.id} servicio={s} />
              ))}
            </ul>
          </div>
        </section>

        {PORTAFOLIO.length > 0 && (
          <section className="fh-seccion fh-portafolio" aria-label="Portafolio">
            <div className="fh-contenedor fh-columnas">
              {PORTAFOLIO.map((f) => (
                <img key={f.src} src={f.src} alt={f.alt || ''} loading="lazy" decoding="async" />
              ))}
            </div>
          </section>
        )}

        <section className="fh-seccion fh-claro" id="como" aria-labelledby="t-como">
          <div className="fh-contenedor">
            <h2 className="fh-h2" id="t-como">
              Así recibes tus fotos
            </h2>
            <ol className="fh-pasos">
              {PASOS.map((p, i) => (
                <li key={p.titulo} className="fh-paso">
                  <span className="fh-paso-numero" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3>{p.titulo}</h3>
                  <p>{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="fh-seccion fh-contacto" id="contacto" aria-labelledby="t-contacto">
          <div className="fh-contenedor">
            <h2 className="fh-h2 fh-h2-grande" id="t-contacto">
              Cuéntanos tu fecha.
            </h2>
            <p className="fh-bajada">
              Atendemos los viernes desde las 6 pm, y los sábados y domingos todo el día.
            </p>
            <div className="fh-acciones">
              <a className="fh-boton" href={whatsappUrl()} target="_blank" rel="noreferrer">
                Escribir por WhatsApp
              </a>
              <a className="fh-boton fh-boton-claro" href="https://reservas.flashealo.do">
                Solicitar una reserva
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
        <div className="fh-contenedor">
          <span>© {new Date().getFullYear()} Flashealo</span>
        </div>
      </footer>
    </div>
  );
}
