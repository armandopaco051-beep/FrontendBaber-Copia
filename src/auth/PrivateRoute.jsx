import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './authContext';

// PrivateRoute protege las pantallas internas.
// Si no existe usuario autenticado, redirige al login conservando la ruta origen.
export default function PrivateRoute({ children, allowedRoles = null, allowedRoleIds = null, redirectTo = '/' }) {
  const { usuario, cargando } = useAuth();
  const location = useLocation();

  if (cargando) {
    return (
      <div className="auth-loading">
        Cargando...
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  const rol = String(usuario.rol || '').toLowerCase();
  const idRol = String(usuario.id_rol || '');
  const rolPermitido = allowedRoles ? allowedRoles.map(item => item.toLowerCase()).includes(rol) : false;
  const idPermitido = allowedRoleIds ? allowedRoleIds.map(String).includes(idRol) : false;
  const requiereRol = Boolean(allowedRoles);
  const requiereId = Boolean(allowedRoleIds);

  if ((requiereRol || requiereId) && !rolPermitido && !idPermitido) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
