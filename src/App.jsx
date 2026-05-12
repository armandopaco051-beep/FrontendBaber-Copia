import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/authContext';
import PrivateRoute from './auth/PrivateRoute';

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
import Citas       from './pages/admin/citas';
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
            <PrivateRoute allowedRoles={['administrador', 'barbero']} allowedRoleIds={[1, 2]} redirectTo="/cliente/inicio">
              <AdminLayout />
            </PrivateRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"   element={<Dashboard />} />

            {/* CU3 */ }
            <Route path="usuarios"    element={<Usuarios />} />
            {/* CU4 */}
            <Route path="roles"       element={<Roles />} />
            {/* CU5 */}
            <Route path="barberos"    element={<Barberos />} />
            <Route path="clientes"    element={<Clientes />} />
            <Route path="bitacora"    element={<Bitacora />} />

            {/* Próximos ciclos */}
            <Route path="servicios"   element={<Servicios />} />
            <Route path="horarios"    element={<Horarios />} />
            <Route path="citas"       element={<Citas />} />
            <Route path="asistencia"  element={<Asistencia />} />
            <Route path="promociones" element={<Proximamente nombre="Promociones" />} />
            <Route path="pagos"       element={<Proximamente nombre="Pagos" />} />
            <Route path="inventario"  element={<Proximamente nombre="Inventario" />} />
            <Route path="atencion-servicios" element={<Proximamente nombre="Registrar atencion de servicios" />} />
            <Route path="categorias-inventario" element={<Proximamente nombre="Gestionar categorias" />} />
            <Route path="productos" element={<Proximamente nombre="Gestionar producto" />} />
            <Route path="insumos" element={<Proximamente nombre="Gestionar insumos" />} />
            <Route path="metodos-pago" element={<Proximamente nombre="Gestionar metodos de pago" />} />
            <Route path="caja" element={<Proximamente nombre="Gestionar caja" />} />
            <Route path="ventas" element={<Proximamente nombre="Gestionar ventas" />} />
            <Route path="movimientos-caja" element={<Proximamente nombre="Gestionar movimientos de caja" />} />
            <Route path="comprobantes" element={<Proximamente nombre="Generar comprobante" />} />
            <Route path="notificaciones" element={<Proximamente nombre="Notificaciones" />} />
            <Route path="reportes"    element={<Proximamente nombre="Reportes" />} />
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
