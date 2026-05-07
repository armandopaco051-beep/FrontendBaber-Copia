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
import Proximamente from './pages/admin/Proximamente';

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

            {/* Próximos ciclos */}
            <Route path="servicios"   element={<Proximamente nombre="Servicios" />} />
            <Route path="horarios"    element={<Proximamente nombre="Horarios" />} />
            <Route path="citas"       element={<Proximamente nombre="Citas / Agenda" />} />
            <Route path="asistencia"  element={<Proximamente nombre="Asistencia" />} />
            <Route path="promociones" element={<Proximamente nombre="Promociones" />} />
            <Route path="pagos"       element={<Proximamente nombre="Pagos" />} />
            <Route path="inventario"  element={<Proximamente nombre="Inventario" />} />
            <Route path="notificaciones" element={<Proximamente nombre="Notificaciones" />} />
            <Route path="reportes"    element={<Proximamente nombre="Reportes" />} />
            <Route path="perfil"      element={<Proximamente nombre="Perfil" />} />
          </Route>

          {/* Cualquier ruta no encontrada */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
