import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/global.css'
import './styles/components.css'
import './styles/auth.css'
import './styles/landing.css'
import './styles/admin.css'
import './styles/barberos.css'
import './styles/cliente.css'
import './styles/dashboard.css'
import './styles/roles.css'
import './styles/usuarios.css'
import './styles/bitacora.css'
import './styles/horarios.css'
import './styles/asistencia.css'
import './styles/servicios.css'
import './styles/citas.css'
import './styles/perfil.css'
import './styles/clientePortal.css'
import App from './App.jsx'

// main.jsx monta React en el div root e importa todos los estilos globales
// y por modulo. App.jsx se encarga de las rutas.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
