import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Importación de Componentes
import FlashealoApp from './FlashealoApp';
import AdminDashboard from './AdminDashboard'; 
import GaleriaCliente from './GaleriaCliente'; 
import Cliente from './ClientGallery'; 
// 👇 1. IMPORTAMOS EL NUEVO COMPONENTE
import ResultadosAtleta from './ResultadosAtleta'; 
import HomeEmpresa from './home/HomeEmpresa';
import PaginaSport from './PaginaSport';
import RegistroFotografo from './RegistroFotografo';
import { lineaDelHost, ADMIN_EN_PRINCIPAL, urlAdminPrincipal, urlReservas } from './marca/anfitrion';
import { useParams } from 'react-router-dom';

// En una línea (sport.*) no hay panel propio: se envía al admin único de la empresa.
const IrAlAdmin = () => {
  window.location.replace(urlAdminPrincipal(window.location.host));
  return null;
};

// /f/<carpeta> era una página provisional: el portal de reservas de cada fotógrafo está en reservas.flashealo.do/<carpeta>.
const IrAReservas = () => {
  const { slug } = useParams();
  const destino = urlReservas(window.location.host, slug);
  if (destino) { window.location.replace(destino); return null; }
  return <Navigate to="/" replace />;
};

const App = () => {
  // En sport.flashealo.do la raíz es la pantalla de deportes; en el resto, la home de la empresa.
  const linea = typeof window !== 'undefined' ? lineaDelHost(window.location.host) : null;
  return (
    <Routes>
      {/* Home de la empresa: presenta las líneas de negocio */}
      <Route path="/" element={linea === 'sport' ? <PaginaSport /> : <HomeEmpresa />} />

      {/* Deportes como página propia (luego, sport.flashealo.do) */}
      <Route path="/sport" element={<PaginaSport />} />

      {/* La web anterior (tres temas en una página) se conserva mientras se migra su contenido */}
      <Route path="/inicio-anterior" element={<FlashealoApp />} />
      
      {/* RUTA 2: Dashboard Administrativo */}
      <Route path="/admin" element={linea && ADMIN_EN_PRINCIPAL ? <IrAlAdmin /> : <AdminDashboard />} />
      
      {/* Alta de fotógrafos: queda pendiente hasta que el superadmin la aprueba */}
      <Route path="/registro" element={<RegistroFotografo />} />

      {/* Reservas de cada fotógrafo: se atienden en reservas.flashealo.do/<carpeta> */}
      <Route path="/f/:slug" element={<IrAReservas />} />

      {/* RUTA 3: Galería del Cliente */}
      <Route path="/cliente" element={<Cliente />} />

      {/* RUTA 4: Galería dinámica por slug del evento */}
      <Route path="/g/:slug" element={<GaleriaCliente />} />

      {/* 👇 2. AGREGAMOS LA NUEVA RUTA PARA LOS RESULTADOS DE LA SELFIE */}
      <Route path="/mis-resultados" element={<ResultadosAtleta />} />

      {/* RUTA FALLBACK: Si alguien escribe una URL que no existe, lo manda al inicio. 
          ¡Ojo! Esto siempre debe ir al final. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;