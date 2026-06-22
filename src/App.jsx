import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/authContext';
import PrivateRoute from './auth/PrivateRoute';
import PermissionRoute from './auth/PermissionRoute';

import Landing     from './pages/landing';
import AdminLayout from './pages/admin/adminlayout';
import Dashboard   from './pages/admin/dashboard';
import Usuarios    from './pages/admin/usuarios';
import Roles       from './pages/admin/roles';
import Barberos    from './pages/admin/barberos';
import Clientes    from './pages/admin/cliente';
import Bitacora    from './pages/admin/bitacora';
import Horarios    from './pages/admin/horarios';
import Asistencia  from './pages/admin/asistencia';
import Servicios   from './pages/admin/servicios';
import AtencionServicios from './pages/admin/atencionServicios';
import Citas       from './pages/admin/citas';
import Promociones from './pages/admin/promociones';
import DisponibilidadAdmin from './pages/admin/disponibilidad';
import MetodosPago from './pages/admin/metodosPago';
import PlanesComision from './pages/admin/planesComision';
import Ventas from './pages/admin/ventas';
import Caja from './pages/admin/caja';
import MovimientosCaja from './pages/admin/movimientosCaja';
import Comprobantes from './pages/admin/comprobantes';
import Reportes from './pages/admin/reportes';
import Notificaciones from './pages/admin/notificaciones';
import Productos from './pages/admin/productos';
import Insumos from './pages/admin/insumos';
import Perfil      from './pages/admin/perfil';
import Proximamente from './pages/admin/Proximamente';
import ClienteLayout from './pages/cliente/ClienteLayout';
import ClienteDashboard from './pages/cliente/ClienteDashboard';
import ClienteReservar from './pages/cliente/ClienteReservar';
import ClienteCitas from './pages/cliente/ClienteCitas';
import ClienteHistorial from './pages/cliente/ClienteHistorial';
import ClientePromociones from './pages/cliente/ClientePromociones';
import ClientePerfil from './pages/cliente/ClientePerfil';
import ClienteSoporte from './pages/cliente/ClienteSoporte';

// App.jsx
// Define las rutas del sistema. La landing es publica y el panel admin
// queda protegido por PrivateRoute usando el usuario autenticado del contexto.
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Pública */}
          <Route path="/" element={<Landing />} />

          {/* Admin (protegidas con JWT) */}
          <Route path="/admin" element={
            <PrivateRoute allowedRoles={['administrador', 'barbero', 'cajero']} allowedRoleIds={[1, 2, 4]} redirectTo="/cliente/inicio">
              <AdminLayout />
            </PrivateRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"   element={<Dashboard />} />

            {/* CU3 */ }
            <Route path="usuarios"    element={<PermissionRoute permiso="usuarios.ver"><Usuarios /></PermissionRoute>} />
            {/* CU4 */}
            <Route path="roles"       element={<PermissionRoute permiso="roles.ver"><Roles /></PermissionRoute>} />
            {/* CU5 */}
            <Route path="barberos"    element={<PermissionRoute permiso="barberos.ver"><Barberos /></PermissionRoute>} />
            <Route path="clientes"    element={<PermissionRoute permiso="clientes.ver"><Clientes /></PermissionRoute>} />
            <Route path="bitacora"    element={<PermissionRoute permiso="bitacora.ver"><Bitacora /></PermissionRoute>} />

            {/* Próximos ciclos */}
            <Route path="servicios"   element={<PermissionRoute permiso="servicios.ver"><Servicios /></PermissionRoute>} />
            <Route path="horarios"    element={<PermissionRoute permiso="horarios.ver"><Horarios /></PermissionRoute>} />
            <Route path="citas"       element={<PermissionRoute permiso="citas.ver"><Citas /></PermissionRoute>} />
            <Route path="asistencia"  element={<PermissionRoute permiso="asistencia.ver"><Asistencia /></PermissionRoute>} />
            <Route path="promociones" element={<PermissionRoute permiso="promociones.ver"><Promociones /></PermissionRoute>} />
            <Route path="disponibilidad" element={<DisponibilidadAdmin />} />
            <Route path="metodos-pago" element={<PermissionRoute permiso="metodos_pago.ver"><MetodosPago /></PermissionRoute>} />
            <Route path="planes-comision" element={<PermissionRoute permiso="comisiones.ver"><PlanesComision /></PermissionRoute>} />
            <Route path="pagos"       element={<Proximamente nombre="Pagos" />} />
            <Route path="inventario"  element={<Proximamente nombre="Inventario" />} />
            <Route path="atencion-servicios" element={<PermissionRoute permiso="atenciones.ver"><AtencionServicios /></PermissionRoute>} />
            <Route path="categorias-inventario" element={<PermissionRoute permiso="inventario.ver"><Proximamente nombre="Gestionar categorias" /></PermissionRoute>} />
            <Route path="productos" element={<PermissionRoute permiso="inventario.ver"><Productos /></PermissionRoute>} />
            <Route path="insumos" element={<PermissionRoute permiso="inventario.ver"><Insumos /></PermissionRoute>} />
            <Route path="caja" element={<PermissionRoute permiso="caja.ver"><Caja /></PermissionRoute>} />
            <Route path="ventas" element={<PermissionRoute permiso="ventas.ver"><Ventas /></PermissionRoute>} />
            <Route path="movimientos-caja" element={<PermissionRoute permiso="caja.movimientos.ver"><MovimientosCaja /></PermissionRoute>} />
            <Route path="comprobantes" element={<PermissionRoute permiso="ventas.ver"><Comprobantes /></PermissionRoute>} />
            <Route path="notificaciones" element={<PermissionRoute permiso="notificaciones.ver"><Notificaciones /></PermissionRoute>} />
            <Route path="reportes"    element={<PermissionRoute permiso="reportes.ver"><Reportes /></PermissionRoute>} />
            <Route path="perfil"      element={<Perfil />} />
          </Route>

          {/* Portal cliente: solo rol Cliente o id_rol=3. */}
          <Route path="/cliente" element={
            <PrivateRoute allowedRoles={['cliente']} allowedRoleIds={[3]} redirectTo="/admin/dashboard">
              <ClienteLayout />
            </PrivateRoute>
          }>
            <Route index element={<Navigate to="inicio" replace />} />
            <Route path="inicio" element={<ClienteDashboard />} />
            <Route path="reservar" element={<ClienteReservar />} />
            <Route path="citas" element={<ClienteCitas />} />
            <Route path="historial" element={<ClienteHistorial />} />
            <Route path="promociones" element={<ClientePromociones />} />
            <Route path="perfil" element={<ClientePerfil />} />
            <Route path="soporte" element={<ClienteSoporte />} />
          </Route>

          {/* Cualquier ruta no encontrada */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
