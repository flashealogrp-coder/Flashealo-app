import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabasePublico } from './supabaseClient';

const quitarAcentos = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const aCarpeta = (s) => quitarAcentos(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);

export default function RegistroFotografo() {
  const [f, setF] = useState({ nombre: '', slug: '', email: '', whatsapp: '', password: '' });
  const [slugTocado, setSlugTocado] = useState(false);
  const [estado, setEstado] = useState('formulario'); // formulario | enviando | revision | confirmar
  const [error, setError] = useState('');
  const [campoError, setCampoError] = useState(''); // campo donde está el problema: nombre | slug | email | password
  const [detalle, setDetalle] = useState('');

  const fallo = (campo, msg, tecnico = '') => { setCampoError(campo); setError(msg); setDetalle(tecnico); };
  const marca = (campo) => (campoError === campo ? { borderColor: 'var(--fl-error)', boxShadow: 'inset 0 0 0 1px var(--fl-error)' } : undefined);

  const cambiar = (k, v) => setF((p) => {
    const n = { ...p, [k]: v };
    if (k === 'nombre' && !slugTocado) n.slug = aCarpeta(v);
    return n;
  });

  const enviar = async (e) => {
    e.preventDefault();
    fallo('', '');
    if (f.password.length < 8) { fallo('password', 'La contraseña debe tener al menos 8 caracteres.'); return; }
    if (f.slug.length < 3) { fallo('slug', 'Tu nombre de usuario debe tener al menos 3 caracteres (letras, números o guiones).'); return; }
    setEstado('enviando');
    const { data, error: err } = await supabasePublico.auth.signUp({
      email: f.email.trim(),
      password: f.password,
      options: { data: { nombre: f.nombre.trim(), slug: f.slug, whatsapp: f.whatsapp.trim() } },
    });
    if (err) {
      setEstado('formulario');
      const m = err.message || '';
      const tecnico = `${err.status || ''} ${err.code || ''} ${m}`.trim();
      if (/registered|already|exists/i.test(m)) fallo('email', 'Ese correo ya tiene una cuenta. Entra desde "Ya tengo cuenta".');
      else if (/password|weak|contraseña/i.test(m)) fallo('password', 'Esa contraseña no es aceptable. Usa al menos 8 caracteres, mejor con letras y números.');
      else if (/rate|too many|seconds/i.test(m)) fallo('', 'Demasiados intentos seguidos. Espera un minuto e inténtalo de nuevo.', tecnico);
      else if (/signup|disabled/i.test(m)) fallo('', 'Los registros están cerrados por ahora. Escríbenos y te damos acceso.');
      else if (/email|mail|address|domain|invalid/i.test(m)) fallo('email', 'Este correo no se pudo usar. Revísalo o prueba con otro.', tecnico);
      else fallo('', 'No se pudo crear la cuenta. Inténtalo otra vez en un momento; si sigue igual, escríbenos.', tecnico);
      return;
    }
    setEstado(data?.session ? 'revision' : 'confirmar');
  };

  return (
    <main style={{ minHeight: '100vh', background: 'var(--fl-lino)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem var(--fl-margen)' }}>
      <div style={{ width: '100%', maxWidth: '28rem' }}>
        <Link to="/" className="fl-marca" style={{ display: 'inline-block', marginBottom: '2.5rem' }}>FLASHEALO</Link>

        {estado === 'revision' || estado === 'confirmar' ? (
          <div>
            <h1 className="fl-titulo" style={{ fontSize: '2.4rem', margin: '0 0 1rem' }}>Recibimos tu solicitud</h1>
            <p className="fl-parrafo">
              {estado === 'confirmar' ? 'Te enviamos un correo para confirmar tu dirección. Confírmala y ' : 'Ya puedes iniciar sesión. '}
              Revisamos cada solicitud a mano y activamos tu espacio en cuanto la aprobamos. Mientras tanto no verás tus herramientas.
            </p>
            <p style={{ marginTop: '2rem' }}><Link className="fl-boton fl-boton-linea" to="/admin">Ir a iniciar sesión</Link></p>
          </div>
        ) : (
          <form onSubmit={enviar} style={{ display: 'grid', gap: '1rem' }}>
            <h1 className="fl-titulo" style={{ fontSize: '2.4rem', margin: '0 0 0.25rem' }}>Crea tu espacio</h1>
            <p className="fl-parrafo" style={{ margin: '0 0 1rem' }}>Una cuenta por fotógrafo. La revisamos y te avisamos cuando esté lista.</p>
            <input className="fl-campo" required placeholder="Tu nombre o el de tu estudio" value={f.nombre} onChange={(e) => cambiar('nombre', e.target.value)} autoComplete="name" style={marca('nombre')} />
            <div>
              <input className="fl-campo" required placeholder="Nombre de usuario (tu carpeta)" value={f.slug} onChange={(e) => { setSlugTocado(true); cambiar('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }} autoComplete="username" style={marca('slug')} aria-invalid={campoError === 'slug'} />
              <p className="fl-parrafo" style={{ fontSize: '0.8rem', margin: '0.4rem 0 0' }}>Letras minúsculas, números y guiones. No se puede cambiar después de aprobar.</p>
            </div>
            <input className="fl-campo" required type="email" placeholder="Correo electrónico" value={f.email} onChange={(e) => cambiar('email', e.target.value)} autoComplete="email" style={marca('email')} aria-invalid={campoError === 'email'} />
            <input className="fl-campo" placeholder="WhatsApp (opcional)" value={f.whatsapp} onChange={(e) => cambiar('whatsapp', e.target.value)} autoComplete="tel" />
            <input className="fl-campo" required type="password" minLength={8} placeholder="Contraseña (mínimo 8 caracteres)" value={f.password} onChange={(e) => cambiar('password', e.target.value)} autoComplete="new-password" style={marca('password')} aria-invalid={campoError === 'password'} />
            {error && <p role="alert" style={{ color: 'var(--fl-error)', fontSize: '0.9rem', margin: 0 }}>{error}{detalle && <span style={{ display: 'block', opacity: 0.7, fontSize: '0.78rem', marginTop: '0.3rem' }}>Detalle técnico: {detalle}</span>}</p>}
            <button type="submit" className="fl-boton" disabled={estado === 'enviando'}>{estado === 'enviando' ? 'Enviando…' : 'Solicitar acceso'}</button>
            <p className="fl-parrafo" style={{ fontSize: '0.9rem', margin: '0.5rem 0 0' }}>¿Ya tienes cuenta? <Link to="/admin" style={{ color: 'var(--fl-texto)' }}>Ya tengo cuenta</Link></p>
          </form>
        )}
      </div>
    </main>
  );
}
