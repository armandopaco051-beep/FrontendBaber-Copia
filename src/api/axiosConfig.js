import axios from 'axios';

const api = axios.create({
 baseURL: 'http://127.0.0.1:8000/api/',
  //baseURL: 'https://backend-barberia-ohjh.onrender.com/api',
  headers: { 'Content-Type': 'application/json' },
});

// Adjunta el token JWT en cada request automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el token expira (401) → limpia sesión y redirige al login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;