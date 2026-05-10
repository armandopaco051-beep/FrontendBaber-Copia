import { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return <div className={`toast ${type}`}>{type === 'success' ? 'OK' : 'Error'} {msg}</div>;
}

const EMPTY = { codigo: '', nombre: '', apellido: '', telefono: '', correo: '', password: '', especialidad: '' };

// Convierte errores del backend a texto para explicar validaciones en pantalla.
function formatApiError(data) {
  if (!data) return 'Error al guardar';
  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;

  return Object.entries(data)
    .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join(' | ');
}

// Modulo CU5: Gestion de barberos.
// Hace CRUD contra seguridad/barberos/. El backend asigna el rol Barbero y
// el frontend captura especialidad para mostrarla en la tabla.
export default function Barberos() {
  const [barberos, setBarberos] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editCod, setEditCod] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // READ: obtiene todos los barberos registrados.
  const cargar = async () => {
    try {
      const r = await api.get('seguridad/barberos/');
      setBarberos(r.data);
    } catch {
      showToast('Error al cargar barberos', 'error');
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const cerrar = () => {
    setModal(null);
    setForm({ ...EMPTY });
    setEditCod(null);
  };

  // Abre modal para registrar barbero.
  const abrirCrear = () => {
    setForm({ ...EMPTY });
    setModal('crear');
  };

  const limpiarFormulario = () => {
    setForm({ ...EMPTY });
  };

  // Carga datos del barbero para editar; la contrasena queda opcional.
  const abrirEditar = (b) => {
    setForm({
      codigo: b.codigo,
      nombre: b.nombre,
      apellido: b.apellido,
      telefono: b.telefono,
      correo: b.correo,
      password: '',
      especialidad: b.especialidad || '',
    });
    setEditCod(b.codigo);
    setModal('editar');
  };

  const abrirVer = (b) => {
    setForm(b);
    setModal('ver');
  };

  // CREATE/UPDATE: POST al crear, PUT al editar por codigo.
  const guardar = async () => {
    setLoading(true);
    try {
      if (modal === 'crear') {
        await api.post('seguridad/barberos/', form);
        showToast('Barbero registrado correctamente');
      } else {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await api.put(`seguridad/barberos/${editCod}/`, payload);
        showToast('Barbero actualizado correctamente');
      }
      cerrar();
      cargar();
    } catch (e) {
      showToast(formatApiError(e.response?.data), 'error');
    } finally {
      setLoading(false);
    }
  };

  // DELETE: elimina o inactiva barbero segun comportamiento del backend.
  const eliminar = async (codigo) => {
    if (!confirm('Eliminar este barbero?')) return;

    try {
      await api.delete(`seguridad/barberos/${codigo}/`);
      showToast('Barbero eliminado');
      cargar();
    } catch (e) {
      showToast(e.response?.data?.error || 'Error al eliminar', 'error');
    }
  };

  const filtrados = barberos.filter(b =>
    [b.nombre, b.apellido, b.codigo, b.telefono, b.especialidad].some(v => v?.toLowerCase().includes(buscar.toLowerCase()))
  );

  return (
    <div>
      <div className="card">
        <div className="barberos-header">
          <div>
            <h3 className="barberos-title">Gestion de barberos</h3>
            <p className="barberos-subtitle">Administra datos, especialidades y estado del personal.</p>
          </div>
          <button className="btn-gold" onClick={abrirCrear}>+ Nuevo barbero</button>
        </div>

        <div className="search-box barberos-search">
          <span className="icon">Buscar</span>
          <input placeholder="Buscar por nombre, CI, telefono o especialidad..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>

        <table className="tabla">
          <thead>
            <tr><th>Nombre</th><th>Telefono</th><th>Especialidad</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={5} className="barberos-empty">No se encontraron barberos.</td></tr>
            ) : filtrados.map((b, i) => (
              <tr key={b.codigo}>
                <td className="barberos-name">{b.nombre} {b.apellido}</td>
                <td>{b.telefono}</td>
                <td className="barberos-muted">{b.especialidad || 'Sin especialidad'}</td>
                <td><span className={`badge ${i === 2 ? 'badge-red' : 'badge-green'}`}>{i === 2 ? 'Inactivo' : 'Activo'}</span></td>
                <td className="barberos-actions">
                  <button className="btn-outline" onClick={() => abrirVer(b)}>Ver</button>
                  <button className="btn-outline" onClick={() => abrirEditar(b)}>Editar</button>
                  <button className="btn-outline barberos-delete" onClick={() => eliminar(b.codigo)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crear' ? 'Registrar barbero' : 'Editar barbero'}</h3>
            <p>El rol Barbero se asigna automaticamente.</p>
            <div className="form-row">
              <div className="form-group">
                <label>Codigo</label>
                <input className="input-field" placeholder="Ej: BARB001" value={form.codigo}
                  autoComplete="off"
                  onChange={e => setForm({ ...form, codigo: e.target.value })} disabled={modal === 'editar'} />
              </div>
              <div className="form-group">
                <label>Telefono</label>
                <input className="input-field" placeholder="75000000" value={form.telefono}
                  autoComplete="off"
                  onChange={e => setForm({ ...form, telefono: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Nombre</label>
                <input className="input-field" placeholder="Nombre" value={form.nombre}
                  autoComplete="off"
                  onChange={e => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Apellido</label>
                <input className="input-field" placeholder="Apellido" value={form.apellido}
                  autoComplete="off"
                  onChange={e => setForm({ ...form, apellido: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Correo</label>
              <input className="input-field" type="email" placeholder="barbero@gmail.com" value={form.correo}
                autoComplete="new-email"
                  onChange={e => setForm({ ...form, correo: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Especialidad</label>
              <input className="input-field" placeholder="Ej: Corte clasico, fade, barba..." value={form.especialidad}
                autoComplete="off"
                onChange={e => setForm({ ...form, especialidad: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{modal === 'editar' ? 'Nueva contrasena (opcional)' : 'Contrasena'}</label>
              <input className="input-field" type="password" placeholder="******" value={form.password}
                autoComplete="new-password"
                onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="barberos-modal-actions">
              <button className="btn-outline barberos-modal-button" onClick={cerrar}>Cancelar</button>
              {modal === 'crear' && (
                <button className="btn-outline barberos-modal-button" onClick={limpiarFormulario}>Limpiar</button>
              )}
              <button className="btn-gold barberos-modal-button" onClick={guardar} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'ver' && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Detalle del barbero</h3>
            <p>Informacion del barbero seleccionado.</p>
            <div className="barberos-detail-grid">
              {[['Codigo', form.codigo], ['Nombre', form.nombre], ['Apellido', form.apellido], ['Telefono', form.telefono], ['Correo', form.correo], ['Especialidad', form.especialidad || 'Sin especialidad']].map(([l, v]) => (
                <div key={l} className="barberos-detail-row">
                  <span className="barberos-detail-label">{l}</span>
                  <span className="barberos-detail-value">{v}</span>
                </div>
              ))}
            </div>
            <button className="btn-gold barberos-close-button" onClick={cerrar}>Cerrar</button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
