import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './authContext';

export default function PrivateRoute({ children }) {
  const { usuario, cargando } = useAuth();
  const location = useLocation();

  if (cargando) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
        color: '#0f172a',
      }}>
        Cargando...
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}
