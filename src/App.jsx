import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Importación de Componentes
import FlashealoApp from './FlashealoApp';
import AdminDashboard from './AdminDashboard'; 
import GaleriaCliente from './GaleriaCliente'; 
import Cliente from './ClientGallery'; 
// 👇 1. IMPORTAMOS EL NUEVO COMPONENTE
import ResultadosAtleta from './ResultadosAtleta'; 

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<FlashealoApp />} />
      
      {/* RUTA 2: Dashboard Administrativo */}
      <Route path="/admin" element={<AdminDashboard />} />
      
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