import {useNavigate, useLocation, Outlet} from 'react-router-dom';
import {useAuth} from '../../auth/authContext';

const NAV = [
  { section: 'PRINCIPAL', items: [
    { id: 'dashboard',  label: 'Dashboard',     icon: '📊', path: '/admin/dashboard' },
  ]},
  { section: 'ADMINISTRACIÓN', items: [
    { id: 'usuarios',   label: 'Usuarios',       icon: '👥', path: '/admin/usuarios' },
    { id: 'roles',      label: 'Roles',          icon: '🛡', path: '/admin/roles' },
    { id: 'barberos',   label: 'Barberos',       icon: '✂',  path: '/admin/barberos' },
    { id: 'clientes',   label: 'Clientes',       icon: '😊', path: '/admin/clientes' },
  ]},
  { section: 'OPERACIÓN', items: [
    { id: 'servicios',  label: 'Servicios',      icon: '🗒', path: '/admin/servicios' },
    { id: 'horarios',   label: 'Horarios',       icon: '🕐', path: '/admin/horarios' },
    { id: 'citas',      label: 'Citas / Agenda', icon: '📅', path: '/admin/citas' },
    { id: 'asistencia', label: 'Asistencia',     icon: '✅', path: '/admin/asistencia' },
  ]},
  { section: 'COMERCIAL', items: [
    { id: 'promociones',label: 'Promociones',    icon: '🏷', path: '/admin/promociones' },
    { id: 'pagos',      label: 'Pagos',          icon: '💳', path: '/admin/pagos' },
    { id: 'inventario', label: 'Inventario',     icon: '📦', path: '/admin/inventario' },
  ]},
  { section: 'ANÁLISIS', items: [
    { id: 'notificaciones', label: 'Notificaciones', icon: '🔔', path: '/admin/notificaciones' },
    { id: 'reportes',   label: 'Reportes',       icon: '📈', path: '/admin/reportes' },
  ]},
  { section: 'SISTEMA', items: [
    { id: 'perfil',     label: 'Perfil',         icon: '👤', path: '/admin/perfil' },
  ]},
];
 
// Título de cada página para el topbar
const PAGE_INFO = {
  dashboard:  { title: 'Dashboard',             sub: 'Resumen operativo de Blessed Barber Club' },
  usuarios:   { title: 'Gestión de usuarios',   sub: 'Crea, edita y controla accesos del sistema' },
  roles:      { title: 'Gestión de roles',      sub: 'Define los tipos de usuario y permisos principales' },
  barberos:   { title: 'Gestión de barberos',   sub: 'Administra datos, especialidades y estado del personal' },
  clientes:   { title: 'Gestión de clientes',   sub: 'Consulta clientes, historial y frecuencia de visitas' },
  servicios:  { title: 'Servicios',             sub: 'Gestiona los servicios disponibles' },
  horarios:   { title: 'Horarios',              sub: 'Configura la disponibilidad de los barberos' },
  citas:      { title: 'Citas / Agenda',        sub: 'Administra las citas del día' },
  asistencia: { title: 'Asistencia',            sub: 'Control de asistencia del personal' },
  promociones:{ title: 'Promociones',           sub: 'Gestiona descuentos y ofertas' },
  pagos:      { title: 'Pagos',                 sub: 'Registro de pagos y transacciones' },
  inventario: { title: 'Inventario',            sub: 'Control de productos y stock' },
  notificaciones:{ title: 'Notificaciones',     sub: 'Alertas y mensajes del sistema' },
  reportes:   { title: 'Reportes',              sub: 'Análisis y estadísticas' },
  perfil:     { title: 'Perfil',                sub: 'Datos de la cuenta administradora' },
};
 
export default function AdminLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
 
  // Obtener el ID de la ruta actual
  const currentId = location.pathname.split('/admin/')[1] || 'dashboard';
  const info      = PAGE_INFO[currentId] || { title: 'Panel', sub: '' };
 
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };
 
  return (
    <div className="admin-wrapper">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>Blessed Barber</h2>
          <span>Club Admin</span>
        </div>
 
        <nav className="sidebar-nav">
          {NAV.map(section => (
            <div key={section.section}>
              <div className="nav-section-label">{section.section}</div>
              {section.items.map(item => (
                <button
                  key={item.id}
                  className={`nav-item ${currentId === item.id ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  <span className="icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
 
          {/* Cerrar sesión */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', marginTop: 16, paddingTop: 12 }}>
            <button className="nav-item" onClick={handleLogout} style={{ color: '#f87171' }}>
              <span className="icon">🚪</span>
              Cerrar sesión
            </button>
          </div>
        </nav>
      </aside>
 
      {/* ── Contenido principal ── */}
      <div className="admin-main">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <h1>{info.title}</h1>
            <p>{info.sub}</p>
          </div>
          <div className="topbar-right">
            <div style={{ position: 'relative' }}>
              <input placeholder="🔍 Buscar..." style={{
                border: '1px solid #e5e7eb', borderRadius: 14, padding: '10px 16px',
                fontSize: 14, outline: 'none', width: 220, fontFamily: "'DM Sans',sans-serif",
              }} />
            </div>
            <div className="user-chip">
              {usuario?.nombre || 'Administrador'}
            </div>
          </div>
        </div>
 
        {/* Páginas */}
        <div className="page-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
