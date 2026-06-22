import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/authContext';
import NotificationBell from '../../components/NotificationBell';

const NAV = [
  {
    id: 'seguridad',
    label: 'Gestion de Seguridad y Auditoria',
    icon: 'SG',
    items: [
      { id: 'roles', label: 'CU04 Gestionar roles', path: '/admin/roles', permiso: 'roles.ver' },
      { id: 'bitacora', label: 'CU17 Consultar bitacora', path: '/admin/bitacora', permiso: 'bitacora.ver' },
    ],
  },
  {
    id: 'usuarios-personal',
    label: 'Gestion de Usuarios y Personal',
    icon: 'UP',
    items: [
      { id: 'usuarios', label: 'CU03 Gestionar usuarios', path: '/admin/usuarios', permiso: 'usuarios.ver' },
      { id: 'barberos', label: 'CU05 Gestionar barberos', path: '/admin/barberos', permiso: 'barberos.ver' },
    ],
  },
  {
    id: 'clientes',
    label: 'Gestion de Clientes',
    icon: 'CL',
    items: [
      { id: 'clientes', label: 'CU06 Gestionar clientes', path: '/admin/clientes', permiso: 'clientes.ver' },
    ],
  },
  {
    id: 'servicios-atencion',
    label: 'Gestion de Servicios y Atencion',
    icon: 'SA',
    items: [
      { id: 'asistencia', label: 'CU09 Gestionar asistencia', path: '/admin/asistencia', permiso: 'asistencia.ver' },
      { id: 'horarios', label: 'CU08 Gestionar horarios laborales', path: '/admin/horarios', permiso: 'horarios.ver' },
      { id: 'servicios', label: 'CU10 Gestionar servicios', path: '/admin/servicios', permiso: 'servicios.ver' },
      { id: 'atencion-servicios', label: 'Registrar atencion de servicios', path: '/admin/atencion-servicios', permiso: 'atenciones.ver' },
    ],
  },
  {
    id: 'agenda-citas',
    label: 'Gestion de Agenda y Citas',
    icon: 'AC',
    items: [
      { id: 'citas', label: 'CU11 Gestionar citas', path: '/admin/citas', permiso: 'citas.ver' },
      { id: 'promociones', label: 'CU12 Gestionar promociones', path: '/admin/promociones', permiso: 'promociones.ver' },
      { id: 'disponibilidad', label: 'CU24 Consultar disponibilidad de horarios', path: '/admin/disponibilidad' },
      { id: 'notificaciones', label: 'CU16 Gestionar notificaciones', path: '/admin/notificaciones', permiso: 'notificaciones.ver' },
    ],
  },
  {
    id: 'inventario',
    label: 'Gestion de Inventario',
    icon: 'GI',
    items: [
      { id: 'categorias-inventario', label: 'CU22 Gestionar categorias', path: '/admin/categorias-inventario', permiso: 'inventario.ver' },
      { id: 'productos', label: 'CU15 Gestionar productos', path: '/admin/productos', permiso: 'inventario.ver' },
      { id: 'insumos', label: 'CU16 Gestionar insumos', path: '/admin/insumos', permiso: 'inventario.ver' },
    ],
  },
  {
    id: 'ventas-caja',
    label: 'Gestion de Ventas y Caja',
    icon: 'VC',
    items: [
      { id: 'metodos-pago', label: 'CU13 Gestionar metodos de pago', path: '/admin/metodos-pago', permiso: 'metodos_pago.ver' },
      { id: 'planes-comision', label: 'CU14 Gestionar planes de comision', path: '/admin/planes-comision', permiso: 'comisiones.ver' },
      { id: 'caja', label: 'CU18 Gestionar caja', path: '/admin/caja', permiso: 'caja.ver' },
      { id: 'ventas', label: 'CU20 Gestionar ventas', path: '/admin/ventas', permiso: 'ventas.ver' },
      { id: 'movimientos-caja', label: 'CU21 Gestionar movimientos de caja', path: '/admin/movimientos-caja', permiso: 'caja.movimientos.ver' },
      { id: 'comprobantes', label: 'CU25 Generar comprobante', path: '/admin/comprobantes', permiso: 'ventas.ver' },
    ],
  },
  {
    id: 'reportes-gerenciales',
    label: 'Gestion de Reportes Gerenciales',
    icon: 'RG',
    items: [
      { id: 'reportes', label: 'CU19 Generar reportes', path: '/admin/reportes', permiso: 'reportes.ver' },
    ],
  },
];

const PAGE_INFO = {
  dashboard: { title: 'Dashboard', sub: 'Resumen operativo de Blessed Barber Club' },
  usuarios: { title: 'Gestion de usuarios', sub: 'Crea, edita y controla accesos del sistema' },
  roles: { title: 'Gestion de roles', sub: 'Define tipos de usuario y permisos principales' },
  barberos: { title: 'Gestion de barberos', sub: 'Administra datos, especialidades y estado del personal' },
  clientes: { title: 'Gestion de clientes', sub: 'Consulta clientes, historial y frecuencia de visitas' },
  servicios: { title: 'Gestion de servicios', sub: 'Administra categorias, servicios, duracion y precio' },
  horarios: { title: 'Horarios laborales', sub: 'Configura disponibilidad de barberos y bloqueos de agenda' },
  citas: { title: 'Citas / Agenda', sub: 'Administra reservas, horarios y atencion diaria' },
  asistencia: { title: 'Asistencia', sub: 'Control de asistencia y disponibilidad del personal' },
  promociones: { title: 'Promociones', sub: 'Gestiona descuentos y ofertas comerciales' },
  disponibilidad: { title: 'Disponibilidad de horarios', sub: 'Consulta horarios libres por servicio, fecha y barbero' },
  'metodos-pago': { title: 'Metodos de pago', sub: 'Configura las formas de pago aceptadas por la barberia' },
  'planes-comision': { title: 'Planes de comision', sub: 'Define porcentajes de ganancia para barberos y barberia' },
  caja: { title: 'Caja', sub: 'Gestiona apertura, cierre y control de caja' },
  ventas: { title: 'Ventas', sub: 'Registra y consulta ventas de la barberia' },
  'movimientos-caja': { title: 'Movimientos de caja', sub: 'Controla ingresos y egresos de caja' },
  comprobantes: { title: 'Comprobantes', sub: 'Genera comprobantes de venta y atencion' },
  'atencion-servicios': { title: 'Atencion de servicios', sub: 'Registra la atencion realizada al cliente' },
  'categorias-inventario': { title: 'Categorias de inventario', sub: 'Organiza productos e insumos por categoria' },
  productos: { title: 'Productos', sub: 'Controla productos disponibles para venta o uso interno' },
  insumos: { title: 'Insumos', sub: 'Gestiona insumos usados en servicios de barberia' },
  inventario: { title: 'Inventario', sub: 'Control de productos, insumos y stock' },
  pagos: { title: 'Pagos', sub: 'Registro de pagos y transacciones' },
  notificaciones: { title: 'Notificaciones', sub: 'Alertas y mensajes para clientes y administracion' },
  reportes: { title: 'Reportes gerenciales', sub: 'Genera reportes para la toma de decisiones' },
  bitacora: { title: 'Bitacora', sub: 'Control de entradas, salidas y acciones del sistema' },
  perfil: { title: 'Perfil', sub: 'Datos de la cuenta administradora' },
};

function grupoActivo(grupo, currentId) {
  return grupo.items.some(item => item.id === currentId);
}

function estadoInicial(currentId) {
  return NAV.reduce((acc, grupo) => {
    acc[grupo.id] = grupoActivo(grupo, currentId);
    return acc;
  }, {});
}

// AdminLayout arma la estructura privada del administrador:
// barra lateral por paquetes de casos de uso, topbar, cierre de sesion y Outlet.
export default function AdminLayout() {
  const { usuario, logout, puede } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentId = location.pathname.split('/admin/')[1] || 'dashboard';
  const info = PAGE_INFO[currentId] || { title: 'Panel', sub: '' };
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('admin_sidebar_open') !== 'false');
  const [openGroups, setOpenGroups] = useState(() => estadoInicial(currentId));

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_open', String(next));
      return next;
    });
  };

  const toggleGroup = grupoId => {
    setOpenGroups(prev => ({ ...prev, [grupoId]: !prev[grupoId] }));
  };

  const irA = (item, grupoId) => {
    setOpenGroups(prev => ({ ...prev, [grupoId]: true }));
    navigate(item.path);
  };

  return (
    <div className={`admin-wrapper ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : 'is-hidden'}`}>
        <div className="sidebar-logo">
          <h2>Blessed Barber</h2>
          <span>Club Admin</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item nav-dashboard ${currentId === 'dashboard' ? 'active' : ''}`}
            onClick={() => navigate('/admin/dashboard')}
          >
            <span className="icon">DB</span>
            Dashboard
          </button>

          <div className="nav-section-label">Paquetes de casos de uso</div>

          {NAV.map(grupo => {
            const itemsVisibles = grupo.items.filter(item => !item.permiso || puede(item.permiso));
            if (itemsVisibles.length === 0) return null;
            const activo = grupoActivo(grupo, currentId);
            const abierto = openGroups[grupo.id] || activo;

            return (
              <div key={grupo.id} className={`nav-package ${activo ? 'active' : ''}`}>
                <button className="nav-package-header" onClick={() => toggleGroup(grupo.id)}>
                  <span className="package-icon">{grupo.icon}</span>
                  <span>{grupo.label}</span>
                  <strong>{abierto ? '^' : 'v'}</strong>
                </button>

                {abierto && (
                  <div className="nav-package-items">
                    {itemsVisibles.map(item => (
                      <button
                        key={item.id}
                        className={`nav-case-item ${currentId === item.id ? 'active' : ''}`}
                        onClick={() => irA(item, grupo.id)}
                      >
                        <span />
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="nav-section-label">Sistema</div>
          <button className={`nav-item ${currentId === 'perfil' ? 'active' : ''}`} onClick={() => navigate('/admin/perfil')}>
            <span className="icon">PF</span>
            Perfil
          </button>

          <div className="sidebar-session">
            <button className="nav-item logout" onClick={handleLogout}>
              <span className="icon">CS</span>
              Cerrar sesion
            </button>
          </div>
        </nav>
      </aside>

      <div className="admin-main">
        <div className="topbar">
          <div className="topbar-left">
            <button
              className="sidebar-toggle"
              type="button"
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? 'Ocultar menu' : 'Mostrar menu'}
              title={sidebarOpen ? 'Ocultar menu' : 'Mostrar menu'}
            >
              <span>{sidebarOpen ? 'x' : '='}</span>
            </button>
            <div>
              <h1>{info.title}</h1>
              <p>{info.sub}</p>
            </div>
          </div>
          <div className="topbar-right">
            <input className="admin-search" placeholder="Buscar..." />
            <NotificationBell />
            <div className="user-chip">
              {usuario?.nombre || 'Administrador'}
            </div>
          </div>
        </div>

        <div className="page-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
