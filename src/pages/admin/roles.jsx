import { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast ${type}`}>{type === 'success' ? '✅' : '❌'} {msg}</div>;
}

const DESC = { Administrador: 'Control total del sistema', Barbero: 'Atiende citas y servicios', Cliente: 'Reserva citas e historial' };

export default function Roles() {
  const [roles,   setRoles]   = useState([]);
  const [modal,   setModal]   = useState(null);
  const [form,    setForm]    = useState({ nombre: '' });
  const [editId,  setEditId]  = useState(null);
  const [toast,   setToast]   = useState(null);
  const [loading, setLoading] = useState(false);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const cargar = async () => {
    try { const r = await api.get('seguridad/roles/'); setRoles(r.data); }
    catch { showToast('Error al cargar roles', 'error'); }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  const cerrar = () => { setModal(null); setForm({ nombre: '' }); setEditId(null); };

  const abrirCrear = () => { setForm({ nombre: '' }); setModal('crear'); };
  const abrirEditar = (r) => { setForm({ nombre: r.nombre }); setEditId(r.id); setModal('editar'); };

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
      cerrar(); cargar();
    } catch (e) {
      showToast(e.response?.data?.error || 'Error al guardar', 'error');
    } finally { setLoading(false); }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este rol?')) return;
    try {
      await api.delete(`seguridad/roles/${id}/`);
      showToast('Rol eliminado');
      cargar();
    } catch (e) { showToast(e.response?.data?.error || 'No se puede eliminar', 'error'); }
  };

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20 }}>Gestión de roles</h3>
            <p style={{ color: '#64748b', fontSize: 13 }}>Controla los roles principales del sistema.</p>
          </div>
          <button className="btn-gold" onClick={abrirCrear}>+ Nuevo rol</button>
        </div>

        <table className="tabla">
          <thead>
            <tr><th>Rol</th><th>Descripción</th><th>Usuarios</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {roles.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#64748b', padding: 30 }}>No hay roles registrados.</td></tr>
            ) : roles.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 700 }}>{r.nombre}</td>
                <td style={{ color: '#64748b' }}>{DESC[r.nombre] || 'Rol personalizado'}</td>
                <td>—</td>
                <td><span className="badge badge-green">Activo</span></td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-outline" onClick={() => abrirEditar(r)}>Editar</button>
                  <button className="btn-outline" onClick={() => eliminar(r.id)} style={{ color: '#ef4444', borderColor: '#fecaca' }}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crear' ? 'Nuevo rol' : 'Editar rol'}</h3>
            <p>{modal === 'crear' ? 'Define el nombre del nuevo rol.' : 'Modifica el nombre del rol.'}</p>
            <div className="form-group">
              <label>Nombre del rol</label>
              <input className="input-field" placeholder="Ej: Supervisor" value={form.nombre}
                onChange={e => setForm({ nombre: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && guardar()} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn-outline" onClick={cerrar} style={{ flex: 1 }}>Cancelar</button>
              <button className="btn-gold" onClick={guardar} disabled={loading} style={{ flex: 1 }}>
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
