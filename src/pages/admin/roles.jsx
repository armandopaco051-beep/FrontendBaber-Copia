import { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';

// Toast reutilizable para informar si una operacion de roles fue correcta o fallo.
function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return <div className={`toast ${type}`}>{type === 'success' ? 'OK' : 'Error'} {msg}</div>;
}

const DESC = {
  Administrador: 'Control total del sistema',
  Barbero: 'Atiende citas y servicios',
  Cliente: 'Reserva citas e historial',
};

// Modulo CU4: Gestion de roles.
// Permite listar, crear, editar y eliminar roles consumiendo seguridad/roles/.
export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nombre: '' });
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // READ: obtiene todos los roles del backend.
  const cargar = async () => {
    try {
      const r = await api.get('seguridad/roles/');
      setRoles(r.data);
    } catch {
      showToast('Error al cargar roles', 'error');
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const cerrar = () => {
    setModal(null);
    setForm({ nombre: '' });
    setEditId(null);
  };

  // Abre el modal para registrar un nuevo rol.
  const abrirCrear = () => {
    setForm({ nombre: '' });
    setModal('crear');
  };

  const limpiarFormulario = () => {
    setForm({ nombre: '' });
  };

  // Carga un rol existente para modificarlo.
  const abrirEditar = (r) => {
    setForm({ nombre: r.nombre });
    setEditId(r.id);
    setModal('editar');
  };

  // CREATE/UPDATE: POST al crear y PUT al editar.
  const guardar = async () => {
    if (!form.nombre.trim()) return showToast('El nombre es requerido', 'error');
    setLoading(true);

    try {
      if (modal === 'crear') {
        await api.post('seguridad/roles/', form);
        showToast('Rol creado correctamente');
      } else {
        await api.put(`seguridad/roles/${editId}/`, form);
        showToast('Rol actualizado correctamente');
      }
      cerrar();
      cargar();
    } catch (e) {
      showToast(e.response?.data?.error || 'Error al guardar', 'error');
    } finally {
      setLoading(false);
    }
  };

  // DELETE: elimina un rol por id si el backend lo permite.
  const eliminar = async (id) => {
    if (!confirm('Eliminar este rol?')) return;

    try {
      await api.delete(`seguridad/roles/${id}/`);
      showToast('Rol eliminado');
      cargar();
    } catch (e) {
      showToast(e.response?.data?.error || 'No se puede eliminar', 'error');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="roles-header">
          <div>
            <h3 className="roles-title">Gestion de roles</h3>
            <p className="roles-subtitle">Controla los roles principales del sistema.</p>
          </div>
          <button className="btn-gold" onClick={abrirCrear}>+ Nuevo rol</button>
        </div>

        <table className="tabla">
          <thead>
            <tr><th>Rol</th><th>Descripcion</th><th>Usuarios</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {roles.length === 0 ? (
              <tr><td colSpan={5} className="roles-empty">No hay roles registrados.</td></tr>
            ) : roles.map(r => (
              <tr key={r.id}>
                <td className="roles-name">{r.nombre}</td>
                <td className="roles-muted">{DESC[r.nombre] || 'Rol personalizado'}</td>
                <td>-</td>
                <td><span className="badge badge-green">Activo</span></td>
                <td className="roles-actions">
                  <button className="btn-outline" onClick={() => abrirEditar(r)}>Editar</button>
                  <button className="btn-outline roles-delete" onClick={() => eliminar(r.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crear' ? 'Nuevo rol' : 'Editar rol'}</h3>
            <p>{modal === 'crear' ? 'Define el nombre del nuevo rol.' : 'Modifica el nombre del rol.'}</p>
            <div className="form-group">
              <label>Nombre del rol</label>
              <input className="input-field" placeholder="Ej: Supervisor" value={form.nombre}
                autoComplete="off"
                onChange={e => setForm({ nombre: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && guardar()} />
            </div>
            <div className="roles-modal-actions">
              <button className="btn-outline roles-modal-button" onClick={cerrar}>Cancelar</button>
              {modal === 'crear' && (
                <button className="btn-outline roles-modal-button" onClick={limpiarFormulario}>Limpiar</button>
              )}
              <button className="btn-gold roles-modal-button" onClick={guardar} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
