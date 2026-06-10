import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Importación de Componentes
import FlashealoApp from './FlashealoApp';
import AdminDashboard from './AdminDashboard'; // <-- IMPORTAMOS EL NUEVO DASHBOARD
import GaleriaCliente from './GaleriaCliente'; 
import Cliente from './ClientGallery'; 

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<FlashealoApp />} />
      
      {/* RUTA 2: Ahora apunta al Dashboard Administrativo */}
      <Route path="/admin" element={<AdminDashboard />} />
      {/* RUTA 3: Galería del Cliente */}
      <Route path="/cliente" element={<Cliente />} />

      <Route path="/g/:slug" element={<GaleriaCliente />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;