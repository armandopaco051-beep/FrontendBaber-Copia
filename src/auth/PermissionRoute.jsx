import { Navigate } from 'react-router-dom';
import { useAuth } from './authContext';

export default function PermissionRoute({ permiso, children, redirectTo = '/admin/dashboard' }) {
  const { puede } = useAuth();

  if (permiso && !puede(permiso)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
