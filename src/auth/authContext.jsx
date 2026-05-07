import { createContext, useContext, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../api/axiosConfig';

const AuthContext = createContext(null);

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
    };
  } catch {
    localStorage.clear();
    return null;
  }
}

function getStoredUsuario() {
  return getUsuarioFromToken(localStorage.getItem('access_token'));
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(getStoredUsuario);
  const cargando = false;

  const login = async (correo, password) => {
    const res = await api.post('seguridad/login/', { correo, password });
    const { access, refresh, usuario } = res.data;
    const u = usuario || getUsuarioFromToken(access);

    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    setUsuario(u);
    return u;
  };

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
