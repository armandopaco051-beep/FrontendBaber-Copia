import { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';

const EMPTY = { codigo: '', nombre: '', apellido: '', telefono: '', correo: '', password: '', id_rol: '' };

// Toast muestra mensajes temporales de exito o error despues de cada accion CRUD.
function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return <div className={`toast ${type}`}>{type === 'success' ? 'OK' : 'Error'} {msg}</div>;
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

// Modulo CU3: Gestion de usuarios.
// Consume seguridad/usuarios/ para listar, crear, editar y eliminar usuarios,
// y seguridad/roles/ para asignar un rol al usuario.
export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editCod, setEditCod] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // READ: carga usuarios y roles para llenar la tabla y el select de roles.
  const cargar = async () => {
    try {
      const [u, r] = await Promise.all([
        api.get('seguridad/usuarios/'),
        api.get('seguridad/roles/'),
      ]);
      setUsuarios(u.data);
      setRoles(r.data);
    } catch {
      showToast('Error al cargar datos', 'error');
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  // Prepara el modal de creacion limpiando el formulario.
  const abrirCrear = () => {
    setForm({ ...EMPTY });
    setModal('crear');
  };

  const limpiarFormulario = () => {
    setForm({ ...EMPTY });
  };

  // Carga los datos del usuario seleccionado en el formulario de edicion.
  const abrirEditar = (u) => {
    setForm({
      codigo: u.codigo,
      nombre: u.nombre,
      apellido: u.apellido,
      telefono: u.telefono,
      correo: u.correo,
      password: '',
      id_rol: u.id_rol,
    });
    setEditCod(u.codigo);
    setModal('editar');
  };

  const abrirVer = (u) => {
    setForm(u);
    setModal('ver');
  };

  const cerrar = () => {
    setModal(null);
    setForm({ ...EMPTY });
  };

  // CREATE/UPDATE: si el modal es crear hace POST; si es editar hace PUT.
  const guardar = async () => {
    setLoading(true);
    try {
      if (modal === 'crear') {
        await api.post('seguridad/usuarios/', form);
        showToast('Usuario creado correctamente');
      } else {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await api.put(`seguridad/usuarios/${editCod}/`, payload);
        showToast('Usuario actualizado correctamente');
      }
      cerrar();
      cargar();
    } catch (e) {
      showToast(formatApiError(e.response?.data), 'error');
    } finally {
      setLoading(false);
    }
  };

  // DELETE: elimina el usuario por codigo y refresca la tabla.
  const eliminar = async (codigo) => {
    if (!confirm('Eliminar este usuario?')) return;

    try {
      await api.delete(`seguridad/usuarios/${codigo}/`);
      showToast('Usuario eliminado');
      cargar();
    } catch (e) {
      showToast(e.response?.data?.error || 'Error al eliminar', 'error');
    }
  };

  const filtrados = usuarios.filter(u =>
    [u.codigo, u.nombre, u.apellido, u.correo].some(v => v?.toLowerCase().includes(buscar.toLowerCase()))
  );

  const getRolNombre = (id) => roles.find(r => r.id === id)?.nombre || '-';

  return (
    <div>
      <div className="card">
        <div className="usuarios-header">
          <div>
            <h3 className="usuarios-title">Gestion de usuarios</h3>
            <p className="usuarios-subtitle">Crea, edita y controla accesos del sistema.</p>
          </div>
          <button className="btn-gold" onClick={abrirCrear}>+ Nuevo usuario</button>
        </div>

        <div className="search-box usuarios-search">
          <span className="icon">Buscar</span>
          <input placeholder="Buscar por usuario, nombre, correo o CI..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>

        <table className="tabla">
          <thead>
            <tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={5} className="usuarios-empty">No se encontraron usuarios.</td></tr>
            ) : filtrados.map(u => (
              <tr key={u.codigo}>
                <td className="usuarios-code">{u.codigo}</td>
                <td>{u.nombre} {u.apellido}</td>
                <td>{u.rol || getRolNombre(u.id_rol)}</td>
                <td><span className="badge badge-green">Activo</span></td>
                <td className="usuarios-actions">
                  <button className="btn-outline" onClick={() => abrirVer(u)}>Ver</button>
                  <button className="btn-outline" onClick={() => abrirEditar(u)}>Editar</button>
                  <button className="btn-outline usuarios-delete" onClick={() => eliminar(u.codigo)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crear' ? 'Nuevo usuario' : 'Editar usuario'}</h3>
            <p>{modal === 'crear' ? 'Completa los datos del nuevo usuario.' : 'Modifica los datos del usuario.'}</p>

            <div className="form-row">
              <div className="form-group">
                <label>Codigo</label>
                <input className="input-field" placeholder="Ej: CLIE001" value={form.codigo}
                  autoComplete="off"
                  onChange={e => setForm({ ...form, codigo: e.target.value })} disabled={modal === 'editar'} />
              </div>
              <div className="form-group">
                <label>Rol</label>
                <select className="input-field" value={form.id_rol} autoComplete="off" onChange={e => setForm({ ...form, id_rol: Number(e.target.value) })}>
                  <option value="">Seleccionar rol</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Nombre</label>
                <input className="input-field" placeholder="Nombre" value={form.nombre} autoComplete="off" onChange={e => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Apellido</label>
                <input className="input-field" placeholder="Apellido" value={form.apellido} autoComplete="off" onChange={e => setForm({ ...form, apellido: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Correo</label>
              <input className="input-field" type="email" placeholder="correo@gmail.com" value={form.correo} autoComplete="new-email" onChange={e => setForm({ ...form, correo: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Telefono</label>
                <input className="input-field" placeholder="70000000" value={form.telefono} autoComplete="off" onChange={e => setForm({ ...form, telefono: e.target.value })} />
              </div>
              <div className="form-group">
                <label>{modal === 'editar' ? 'Nueva contrasena (opcional)' : 'Contrasena'}</label>
                <input className="input-field" type="password" placeholder="******" value={form.password} autoComplete="new-password" onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>

            <div className="usuarios-modal-actions">
              <button className="btn-outline usuarios-modal-button" onClick={cerrar}>Cancelar</button>
              {modal === 'crear' && (
                <button className="btn-outline usuarios-modal-button" onClick={limpiarFormulario}>Limpiar</button>
              )}
              <button className="btn-gold usuarios-modal-button" onClick={guardar} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'ver' && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Detalle de usuario</h3>
            <p>Informacion completa del usuario seleccionado.</p>
            <div className="usuarios-detail-grid">
              {[
                ['Codigo', form.codigo],
                ['Nombre', form.nombre],
                ['Apellido', form.apellido],
                ['Telefono', form.telefono],
                ['Correo', form.correo],
                ['Rol', form.rol || getRolNombre(form.id_rol)],
              ].map(([label, val]) => (
                <div key={label} className="usuarios-detail-row">
                  <span className="usuarios-detail-label">{label}</span>
                  <span className="usuarios-detail-value">{val}</span>
                </div>
              ))}
            </div>
            <button className="btn-gold usuarios-close-button" onClick={cerrar}>Cerrar</button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
