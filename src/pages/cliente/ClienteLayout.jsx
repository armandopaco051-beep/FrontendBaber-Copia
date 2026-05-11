import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/authContext';
import { useState } from 'react';

const NAV = [
  { path: '/cliente/inicio', label: 'Inicio', icon: 'IN' },
  { path: '/cliente/reservar', label: 'Reservar cita', icon: 'RC' },
  { path: '/cliente/citas', label: 'Mis citas', icon: 'MC' },
  { path: '/cliente/historial', label: 'Historial', icon: 'HS' },
  { path: '/cliente/promociones', label: 'Promociones', icon: 'PR' },
  { path: '/cliente/perfil', label: 'Perfil', icon: 'PF' },
  { path: '/cliente/soporte', label: 'Soporte', icon: 'SP' },
];

// Layout del portal cliente.
// Mantiene una navegacion simple: reservar, consultar citas, historial y perfil.
export default function ClienteLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('cliente_sidebar_open') !== 'false');

  const cerrarSesion = async () => {
    await logout();
    navigate('/');
  };

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev;
      localStorage.setItem('cliente_sidebar_open', String(next));
      return next;
    });
  };

  return (
    <div className={`cliente-shell ${sidebarOpen ? 'cliente-sidebar-open' : 'cliente-sidebar-closed'}`}>
      <aside className={`cliente-sidebar ${sidebarOpen ? 'is-open' : 'is-hidden'}`}>
        <div className="cliente-brand">
          <strong>Blessed Barber</strong>
          <span>Portal Cliente</span>
        </div>

        <nav className="cliente-nav">
          {NAV.map(item => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `cliente-nav-item ${isActive ? 'active' : ''}`}>
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button className="cliente-logout" onClick={cerrarSesion}>Cerrar sesion</button>
      </aside>

      <main className="cliente-main">
        <header className="cliente-topbar">
          <div className="cliente-topbar-left">
            <button
              className="cliente-sidebar-toggle"
              type="button"
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? 'Ocultar menu' : 'Mostrar menu'}
              title={sidebarOpen ? 'Ocultar menu' : 'Mostrar menu'}
            >
              <span>{sidebarOpen ? '×' : '☰'}</span>
            </button>
            <div>
              <h1>Hola, {usuario?.nombre || 'Cliente'}</h1>
              <p>Reserva y consulta tu atencion sin entrar al panel administrativo.</p>
            </div>
          </div>
          <div className="cliente-user-chip">{usuario?.correo || usuario?.rol || 'Cliente'}</div>
        </header>

        <section className="cliente-body">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
