import { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return <div className={`toast ${type}`}>{type === 'success' ? 'OK' : 'Error'} {msg}</div>;
}

const EMPTY = { codigo: '', nombre: '', apellido: '', telefono: '', correo: '', password: '' };

// Normaliza errores de DRF para mostrarlos en un toast entendible.
function formatApiError(data) {
  if (!data) return 'Error al guardar';
  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;

  return Object.entries(data)
    .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join(' | ');
}

// Modulo Gestion de clientes.
// Lista usuarios con rol Cliente y registra nuevos clientes con el endpoint publico
// seguridad/registro-cliente/, donde el backend asigna el rol Cliente.
export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // READ: obtiene usuarios y filtra solo clientes.
  const cargar = async () => {
    try {
      const r = await api.get('seguridad/usuarios/');
      setClientes(r.data.filter(u => u.rol === 'Cliente' || u.rol?.toLowerCase() === 'cliente'));
    } catch {
      showToast('Error al cargar clientes', 'error');
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const cerrar = () => {
    setModal(null);
    setSelected(null);
    setForm({ ...EMPTY });
  };

  // Abre el formulario de nuevo cliente.
  const abrirCrear = () => {
    setForm({ ...EMPTY });
    setModal('crear');
  };

  const limpiarFormulario = () => {
    setForm({ ...EMPTY });
  };

  // CREATE: registra cliente sin enviar id_rol; el backend asigna Cliente.
  const guardarCliente = async () => {
    setLoading(true);

    try {
      await api.post('seguridad/registro-cliente/', form);
      showToast('Cliente registrado correctamente');
      cerrar();
      cargar();
    } catch (e) {
      showToast(formatApiError(e.response?.data), 'error');
    } finally {
      setLoading(false);
    }
  };

  const TIPO = ['Frecuente', 'Nuevo', 'Inactivo'];
  const TIPO_STYLE = {
    Frecuente: 'badge-blue',
    Nuevo: 'badge-green',
    Inactivo: 'badge-red',
  };

  const filtrados = clientes.filter(c =>
    [c.nombre, c.apellido, c.telefono, c.codigo].some(v => v?.toLowerCase().includes(buscar.toLowerCase()))
  );

  return (
    <div>
      <div className="card">
        <div className="clientes-header">
          <div>
            <h3 className="clientes-title">Gestion de clientes</h3>
            <p className="clientes-subtitle">Consulta clientes, historial y frecuencia de visitas.</p>
          </div>
          <button className="btn-gold" onClick={abrirCrear}>+ Nuevo cliente</button>
        </div>

        <div className="search-box clientes-search">
          <span className="icon">Buscar</span>
          <input placeholder="Buscar por nombre, telefono o CI..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>

        <table className="tabla">
          <thead>
            <tr><th>Cliente</th><th>Telefono</th><th>Tipo</th><th>Ultima visita</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={5} className="clientes-empty">No se encontraron clientes.</td></tr>
            ) : filtrados.map((c, i) => {
              const tipo = TIPO[i % TIPO.length];
              return (
                <tr key={c.codigo}>
                  <td className="clientes-name">{c.nombre} {c.apellido}</td>
                  <td>{c.telefono}</td>
                  <td><span className={`badge ${TIPO_STYLE[tipo]}`}>{tipo}</span></td>
                  <td className="clientes-muted">07/05/2026</td>
                  <td>
                    <button className="btn-outline" onClick={() => { setSelected(c); setModal('historial'); }}>
                      Historial
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal === 'crear' && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Registrar cliente</h3>
            <p>El rol Cliente se asigna automaticamente.</p>

            <div className="form-row">
              <div className="form-group">
                <label>Codigo</label>
                <input className="input-field" placeholder="Ej: CLI001" value={form.codigo}
                  autoComplete="off"
                  onChange={e => setForm({ ...form, codigo: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Telefono</label>
                <input className="input-field" placeholder="70000000" value={form.telefono}
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
              <input className="input-field" type="email" placeholder="cliente@gmail.com" value={form.correo}
                autoComplete="new-email"
                onChange={e => setForm({ ...form, correo: e.target.value })} />
            </div>

            <div className="form-group">
              <label>Contrasena</label>
              <input className="input-field" type="password" placeholder="******" value={form.password}
                autoComplete="new-password"
                onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>

            <div className="clientes-modal-actions">
              <button className="btn-outline clientes-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-outline clientes-modal-button" onClick={limpiarFormulario}>Limpiar</button>
              <button className="btn-gold clientes-modal-button" onClick={guardarCliente} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'historial' && selected && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Historial - {selected.nombre} {selected.apellido}</h3>
            <p>Servicios anteriores del cliente.</p>
            <div className="clientes-history-grid">
              {[
                { fecha: '07/05/2026', servicio: 'Corte de cabello', barbero: 'Sebastian', total: 'Bs. 60' },
                { fecha: '24/04/2026', servicio: 'Corte + barba', barbero: 'Carlos', total: 'Bs. 90' },
                { fecha: '10/04/2026', servicio: 'Perfilado', barbero: 'Renato', total: 'Bs. 30' },
              ].map(h => (
                <div key={h.fecha} className="clientes-history-item">
                  <div>
                    <div className="clientes-history-service">{h.servicio}</div>
                    <div className="clientes-history-meta">{h.fecha} - {h.barbero}</div>
                  </div>
                  <div className="clientes-history-total">{h.total}</div>
                </div>
              ))}
            </div>
            <button className="btn-gold clientes-close-button" onClick={cerrar}>Cerrar</button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
