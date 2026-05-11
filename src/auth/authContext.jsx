import { createContext, useContext, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../api/axiosConfig';

const AuthContext = createContext(null);

// Lee el JWT guardado, valida su expiracion y arma el objeto usuario
// que usa el panel para mostrar nombre, rol y permitir rutas privadas.
function getUsuarioFromToken(token) {
  if (!token) return null;

  try {
    const payload = jwtDecode(token);
    if (payload.exp * 1000 <= Date.now()) {
      localStorage.clear();
      return null;
    }

    return {
      codigo: payload.codigo,
      correo: payload.correo || payload.email,
      nombre: payload.nombre,
      apellido: payload.apellido,
      rol: payload.rol || payload.role,
      id_rol: payload.id_rol || payload.rol_id || payload.role_id,
    };
  } catch {
    localStorage.clear();
    return null;
  }
}

function getStoredUsuario() {
  return getUsuarioFromToken(localStorage.getItem('access_token'));
}

// AuthProvider centraliza sesion: login, logout y usuario actual.
// Todos los componentes lo consumen mediante useAuth().
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(getStoredUsuario);
  const cargando = false;

  // POST seguridad/login/: autentica correo/contrasena y guarda access/refresh.
  const login = async (correo, password) => {
    const res = await api.post('seguridad/login/', { correo, password });
    const { access, refresh, usuario } = res.data;
    const u = usuario || getUsuarioFromToken(access);
    const tokenUser = getUsuarioFromToken(access);
    const usuarioNormalizado = {
      ...tokenUser,
      ...u,
      id_rol: u?.id_rol?.id || u?.id_rol || u?.rol_id || tokenUser?.id_rol,
      rol: u?.id_rol?.nombre || u?.rol || u?.role || tokenUser?.rol,
    };

    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    setUsuario(usuarioNormalizado);
    return usuarioNormalizado;
  };

  // POST seguridad/logout/: invalida refresh en backend y limpia sesion local.
  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) await api.post('seguridad/logout/', { refresh });
    } catch {
      // El cierre local debe continuar aunque el backend no responda.
    }
    localStorage.clear();
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
