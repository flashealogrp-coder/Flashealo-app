import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Asegúrate de que el nombre de tu archivo CSS sea este
import { BrowserRouter } from 'react-router-dom'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* BrowserRouter envuelve a App, permitiendo que App controle las Rutas */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)