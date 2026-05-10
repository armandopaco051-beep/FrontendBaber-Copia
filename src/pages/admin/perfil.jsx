import { jwtDecode } from 'jwt-decode';
import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { useAuth } from '../../auth/authContext';

const EMPTY_PERFIL = { codigo: '', nombre: '', apellido: '', telefono: '', correo: '', rol: '' };
const EMPTY_PASSWORD = { password_actual: '', nueva_password: '', confirmar_password: '' };

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return <div className={`toast ${type}`}>{type === 'success' ? 'OK' : 'Error'} {msg}</div>;
}

function decodeToken() {
  const token = localStorage.getItem('access_token');
  if (!token) return null;

  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

// Normaliza respuestas diferentes del backend para llenar los datos del perfil.
function normalizePerfil(data) {
  const perfil = data?.usuario || data?.perfil || data?.user || data || {};
  const rol = perfil.rol?.nombre || perfil.id_rol?.nombre || perfil.nombre_rol || perfil.rol || perfil.role || '';

  return {
    codigo: perfil.codigo || perfil.id_usuario || perfil.id || '',
    nombre: perfil.nombre || perfil.first_name || '',
    apellido: perfil.apellido || perfil.last_name || '',
    telefono: perfil.telefono || perfil.celular || '',
    correo: perfil.correo || perfil.email || '',
    rol,
  };
}

function formatApiError(data) {
  if (!data) return 'Error al guardar';
  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;

  return Object.entries(data)
    .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join(' | ');
}

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(perfil) {
  const nombre = perfil?.nombre || perfil?.correo || 'A';
  const apellido = perfil?.apellido || '';
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

function valueOrDash(value) {
  return value || '-';
}

// Perfil del usuario autenticado.
// Usa GET/PUT usuario/perfil/ para datos personales y
// PUT usuario/perfil/password/ para cambiar contrasena.
export default function Perfil() {
  const { usuario } = useAuth();
  const tokenInfo = useMemo(() => decodeToken(), []);
  const [perfil, setPerfil] = useState({
    ...EMPTY_PERFIL,
    codigo: usuario?.codigo || tokenInfo?.codigo || '',
    nombre: usuario?.nombre || tokenInfo?.nombre || '',
    apellido: usuario?.apellido || tokenInfo?.apellido || '',
    correo: usuario?.correo || tokenInfo?.correo || tokenInfo?.email || '',
    rol: usuario?.rol || tokenInfo?.rol || tokenInfo?.role || '',
  });
  const [passwordForm, setPasswordForm] = useState({ ...EMPTY_PASSWORD });
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // READ: obtiene el perfil real del backend; si falta algo usa el JWT.
  const cargarPerfil = async () => {
    try {
      const response = await api.get('usuario/perfil/');
      setPerfil(prev => ({ ...prev, ...normalizePerfil(response.data) }));
    } catch (e) {
      showToast(formatApiError(e.response?.data) || 'No se pudo cargar el perfil', 'error');
    }
  };

  useEffect(() => { cargarPerfil(); }, []); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  // UPDATE: actualiza nombre, apellido, telefono y correo.
  const guardarPerfil = async () => {
    setLoadingPerfil(true);

    const payload = {
      nombre: perfil.nombre,
      apellido: perfil.apellido,
      telefono: perfil.telefono,
      correo: perfil.correo,
    };

    try {
      const response = await api.put('usuario/perfil/', payload);
      setPerfil(prev => ({ ...prev, ...normalizePerfil(response.data) }));
      showToast('Perfil actualizado correctamente');
    } catch (e) {
      showToast(formatApiError(e.response?.data), 'error');
    } finally {
      setLoadingPerfil(false);
    }
  };

  // UPDATE password: valida confirmacion y envia contrasena actual/nueva.
  const cambiarPassword = async () => {
    if (!passwordForm.password_actual) return showToast('Ingresa tu contrasena actual', 'error');
    if (!passwordForm.nueva_password) return showToast('Ingresa la nueva contrasena', 'error');
    if (passwordForm.nueva_password !== passwordForm.confirmar_password) {
      return showToast('La confirmacion no coincide', 'error');
    }

    setLoadingPassword(true);

    try {
      await api.put('usuario/perfil/password/', passwordForm);
      setPasswordForm({ ...EMPTY_PASSWORD });
      showToast('Contrasena actualizada correctamente');
    } catch (e) {
      showToast(formatApiError(e.response?.data), 'error');
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div>
      <div className="perfil-grid">
        <div className="card perfil-main-card">
          <div className="perfil-hero">
            <div className="perfil-avatar">{getInitials(perfil)}</div>
            <div>
              <h3 className="perfil-title">{valueOrDash(`${perfil.nombre || ''} ${perfil.apellido || ''}`.trim())}</h3>
              <p className="perfil-subtitle">{valueOrDash(perfil.correo)}</p>
              <span className="badge badge-green">Sesion activa</span>
            </div>
          </div>

          <div className="perfil-form-grid">
            <div className="form-group">
              <label>Codigo</label>
              <input className="input-field" value={perfil.codigo} disabled />
            </div>
            <div className="form-group">
              <label>Rol</label>
              <input className="input-field" value={perfil.rol} disabled />
            </div>
            <div className="form-group">
              <label>Nombre</label>
              <input className="input-field" value={perfil.nombre} autoComplete="off" onChange={e => setPerfil({ ...perfil, nombre: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Apellido</label>
              <input className="input-field" value={perfil.apellido} autoComplete="off" onChange={e => setPerfil({ ...perfil, apellido: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Telefono</label>
              <input className="input-field" value={perfil.telefono} autoComplete="off" onChange={e => setPerfil({ ...perfil, telefono: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Correo electronico</label>
              <input className="input-field" type="email" value={perfil.correo} autoComplete="new-email" onChange={e => setPerfil({ ...perfil, correo: e.target.value })} />
            </div>
          </div>

          <div className="perfil-actions">
            <button className="btn-outline" onClick={cargarPerfil}>Recargar</button>
            <button className="btn-gold" onClick={guardarPerfil} disabled={loadingPerfil}>
              {loadingPerfil ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>

        <div className="card perfil-session-card">
          <h3 className="perfil-section-title">Datos de sesion</h3>
          <div className="perfil-session-list">
            <div>
              <span>Inicio del token</span>
              <strong>{formatDate(tokenInfo?.iat)}</strong>
            </div>
            <div>
              <span>Vencimiento</span>
              <strong>{formatDate(tokenInfo?.exp)}</strong>
            </div>
            <div>
              <span>Tipo de acceso</span>
              <strong>{tokenInfo ? 'JWT' : 'No disponible'}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="card perfil-password-card">
        <h3 className="perfil-section-title">Cambiar contrasena</h3>
        <div className="perfil-password-grid">
          <div className="form-group">
            <label>Contrasena actual</label>
            <input className="input-field" type="password" value={passwordForm.password_actual} autoComplete="current-password" onChange={e => setPasswordForm({ ...passwordForm, password_actual: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Nueva contrasena</label>
            <input className="input-field" type="password" value={passwordForm.nueva_password} autoComplete="new-password" onChange={e => setPasswordForm({ ...passwordForm, nueva_password: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Confirmar contrasena</label>
            <input className="input-field" type="password" value={passwordForm.confirmar_password} autoComplete="new-password" onChange={e => setPasswordForm({ ...passwordForm, confirmar_password: e.target.value })} />
          </div>
        </div>
        <div className="perfil-actions">
          <button className="btn-outline" onClick={() => setPasswordForm({ ...EMPTY_PASSWORD })}>Limpiar</button>
          <button className="btn-gold" onClick={cambiarPassword} disabled={loadingPassword}>
            {loadingPassword ? 'Actualizando...' : 'Actualizar contrasena'}
          </button>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
