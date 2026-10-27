import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './marca/tokens.css'
import './marca/sistema.css'
import './index.css' // Tailwind y base global
import { BrowserRouter } from 'react-router-dom'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* BrowserRouter envuelve a App, permitiendo que App controle las Rutas */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)