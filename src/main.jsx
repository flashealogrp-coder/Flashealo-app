import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Importamos nuestras dos pantallas principales
import App from './App.jsx'
import AdminPanel from './AdminPanel.jsx'
import ReviewPanel from './ReviewPanel.jsx'

import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* La ruta principal (El Landing Page) */}
        <Route path="/" element={<App />} />
        <Route path="/review" element={<ReviewPanel />} />
        {/* La ruta secreta del panel (El Administrador) */}
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)