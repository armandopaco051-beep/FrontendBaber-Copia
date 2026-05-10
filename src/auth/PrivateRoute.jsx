import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './authContext';

// PrivateRoute protege las pantallas internas.
// Si no existe usuario autenticado, redirige al login conservando la ruta origen.
export default function PrivateRoute({ children }) {
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

  return children;
}
