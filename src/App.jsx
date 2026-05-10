import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/authContext';
import PrivateRoute from './auth/PrivateRoute';

import Landing     from './pages/landing';
import AdminLayout from './pages/admin/adminLayout';
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
            <PrivateRoute>
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
            <Route path="notificaciones" element={<Proximamente nombre="Notificaciones" />} />
            <Route path="reportes"    element={<Proximamente nombre="Reportes" />} />
            <Route path="perfil"      element={<Perfil />} />
          </Route>

          {/* Cualquier ruta no encontrada */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
