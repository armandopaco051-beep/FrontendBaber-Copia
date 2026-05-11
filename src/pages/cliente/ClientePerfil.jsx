import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/authContext';
import api from '../../api/axiosConfig';
import { formatApiError } from './clienteUtils';

const EMPTY_PERFIL = { codigo: '', nombre: '', apellido: '', telefono: '', correo: '', rol: 'cliente' };
const EMPTY_PASSWORD = { password_actual: '', nueva_password: '', confirmar_password: '' };

function normalizarPerfil(data) {
  const perfil = data?.usuario || data?.perfil || data?.user || data || {};
  const rol = perfil.rol || perfil.id_rol?.nombre || perfil.id_rol_nombre || perfil.nombre_rol || 'cliente';

  return {
    codigo: perfil.codigo || perfil.id || '',
    nombre: perfil.nombre || '',
    apellido: perfil.apellido || '',
    telefono: perfil.telefono || '',
    correo: perfil.correo || perfil.email || '',
    rol: String(rol).toLowerCase(),
  };
}

// Perfil del cliente.
// Muestra datos de cuenta, permite actualizar datos personales y cambiar contrasena.
export default function ClientePerfil() {
  const { usuario } = useAuth();
  const [perfil, setPerfil] = useState({ ...EMPTY_PERFIL });
  const [password, setPassword] = useState({ ...EMPTY_PASSWORD });
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  const nombreCompleto = `${perfil.nombre || usuario?.nombre || ''} ${perfil.apellido || usuario?.apellido || ''}`.trim() || 'Cliente';
  const correoVisible = perfil.correo || usuario?.correo || 'Sin correo registrado';
  const iniciales = nombreCompleto
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(parte => parte[0])
    .join('')
    .toUpperCase();

  const cargar = async () => {
    try {
      const response = await api.get('usuario/perfil/');
      setPerfil(normalizarPerfil(response.data));
    } catch (e) {
      setMensaje(formatApiError(e.response?.data, 'No se pudo cargar tu perfil.'));
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const guardarPerfil = async () => {
    setLoading(true);
    setMensaje('');

    try {
      const payload = {
        nombre: perfil.nombre,
        apellido: perfil.apellido,
        telefono: perfil.telefono,
        correo: perfil.correo,
      };
      const response = await api.put('usuario/perfil/', payload);
      setPerfil(normalizarPerfil(response.data));
      setMensaje('Perfil actualizado correctamente.');
    } catch (e) {
      setMensaje(formatApiError(e.response?.data, 'No se pudo actualizar el perfil.'));
    } finally {
      setLoading(false);
    }
  };

  const cambiarPassword = async () => {
    if (password.nueva_password !== password.confirmar_password) {
      setMensaje('La confirmacion no coincide.');
      return;
    }

    setLoading(true);
    setMensaje('');

    try {
      await api.put('usuario/perfil/password/', password);
      setPassword({ ...EMPTY_PASSWORD });
      setMensaje('Contrasena actualizada correctamente.');
    } catch (e) {
      setMensaje(formatApiError(e.response?.data, 'No se pudo cambiar la contrasena.'));
    } finally {
      setLoading(false);
    }
  };

  const limpiarPassword = () => {
    setPassword({ ...EMPTY_PASSWORD });
    setMensaje('');
  };

  return (
    <div className="cliente-page cliente-profile-page">
      {mensaje && <div className={`cliente-alert ${mensaje.includes('correctamente') ? 'success' : 'error'}`}>{mensaje}</div>}

      <div className="card cliente-profile-card">
        <div className="cliente-profile-summary">
          <div className="cliente-profile-avatar">{iniciales || 'CL'}</div>
          <div>
            <h2>{nombreCompleto}</h2>
            <p>{correoVisible}</p>
            <span>Sesion activa</span>
          </div>
        </div>

        <div className="cliente-profile-divider" />

        <div className="cliente-profile-grid">
          <div className="form-group">
            <label>Codigo</label>
            <input className="input-field" value={perfil.codigo || usuario?.codigo || ''} disabled />
          </div>
          <div className="form-group">
            <label>Rol</label>
            <input className="input-field" value={perfil.rol || usuario?.rol || 'cliente'} disabled />
          </div>
          <div className="form-group">
            <label>Nombre</label>
            <input className="input-field" value={perfil.nombre} onChange={e => setPerfil({ ...perfil, nombre: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Apellido</label>
            <input className="input-field" value={perfil.apellido} onChange={e => setPerfil({ ...perfil, apellido: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Telefono</label>
            <input className="input-field" value={perfil.telefono} onChange={e => setPerfil({ ...perfil, telefono: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Correo electronico</label>
            <input className="input-field" type="email" value={perfil.correo} onChange={e => setPerfil({ ...perfil, correo: e.target.value })} />
          </div>
        </div>

        <div className="cliente-profile-actions">
          <button className="btn-outline" onClick={cargar} disabled={loading}>Recargar</button>
          <button className="btn-gold" onClick={guardarPerfil} disabled={loading}>Guardar cambios</button>
        </div>
      </div>

      <div className="card cliente-password-card">
        <h3>Cambiar contrasena</h3>
        <div className="cliente-password-grid">
          <div className="form-group">
            <label>Contrasena actual</label>
            <input className="input-field" type="password" value={password.password_actual} onChange={e => setPassword({ ...password, password_actual: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Nueva contrasena</label>
            <input className="input-field" type="password" value={password.nueva_password} onChange={e => setPassword({ ...password, nueva_password: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Confirmar contrasena</label>
            <input className="input-field" type="password" value={password.confirmar_password} onChange={e => setPassword({ ...password, confirmar_password: e.target.value })} />
          </div>
        </div>

        <div className="cliente-profile-actions">
          <button className="btn-outline" onClick={limpiarPassword} disabled={loading}>Limpiar</button>
          <button className="btn-gold" onClick={cambiarPassword} disabled={loading}>Actualizar contrasena</button>
        </div>
      </div>
    </div>
  );
}
