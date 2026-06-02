import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

const ESTADOS = ['ACTIVO', 'INACTIVO'];
const EMPTY = {
  nombre: '',
  descripcion: '',
  requiere_referencia: false,
  estado: 'ACTIVO',
};

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return <div className={`toast ${type}`}>{type === 'success' ? 'OK' : 'Error'} {msg}</div>;
}

function normalizarLista(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.metodos_pago)) return data.metodos_pago;
  return [];
}

function idMetodo(item) {
  return item?.id_metodo_pago || item?.id || '';
}

function estadoClase(estado) {
  return estado === 'ACTIVO' ? 'badge-green' : 'badge-red';
}

export default function MetodosPago() {
  const [metodos, setMetodos] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const cargar = async () => {
    try {
      const response = await api.get('ventas-caja/metodos-pago/');
      setMetodos(normalizarLista(response.data));
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudieron cargar los metodos de pago.'), 'error');
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const cerrar = () => {
    setModal(null);
    setEditId(null);
    setForm({ ...EMPTY });
  };

  const abrirCrear = () => {
    setForm({ ...EMPTY });
    setEditId(null);
    setModal('crear');
  };

  const abrirEditar = (metodo) => {
    setEditId(idMetodo(metodo));
    setForm({
      nombre: metodo?.nombre || '',
      descripcion: metodo?.descripcion || '',
      requiere_referencia: Boolean(metodo?.requiere_referencia),
      estado: metodo?.estado || 'ACTIVO',
    });
    setModal('editar');
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return showToast('El nombre del metodo de pago es obligatorio.', 'error');
    setLoading(true);

    try {
      if (modal === 'crear') {
        await api.post('ventas-caja/metodos-pago/', form);
        showToast('Metodo de pago registrado correctamente.');
      } else {
        await api.put(`ventas-caja/metodos-pago/${editId}/`, form);
        showToast(form.estado === 'ACTIVO' ? 'Metodo de pago actualizado/activado correctamente.' : 'Metodo de pago actualizado correctamente.');
      }
      cerrar();
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo guardar el metodo de pago.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const desactivar = async (metodo) => {
    if (!confirm(`Desactivar el metodo "${metodo.nombre}"?`)) return;
    try {
      await api.delete(`ventas-caja/metodos-pago/${idMetodo(metodo)}/`);
      showToast('Metodo de pago desactivado correctamente.');
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo desactivar el metodo de pago.'), 'error');
    }
  };

  const activar = async (metodo) => {
    try {
      await api.put(`ventas-caja/metodos-pago/${idMetodo(metodo)}/`, { estado: 'ACTIVO' });
      showToast('Metodo de pago activado correctamente.');
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo activar el metodo de pago.'), 'error');
    }
  };

  const metodosFiltrados = useMemo(() => {
    const q = buscar.toLowerCase();
    return metodos.filter(metodo => [
      metodo?.nombre,
      metodo?.descripcion,
      metodo?.estado,
      metodo?.requiere_referencia ? 'si' : 'no',
    ].some(valor => String(valor || '').toLowerCase().includes(q)));
  }, [buscar, metodos]);

  return (
    <div>
      <div className="ventas-caja-stats">
        <div className="stat-card">
          <div className="label">Metodos</div>
          <div className="value">{metodos.length}</div>
          <div className="sub">Registrados</div>
        </div>
        <div className="stat-card">
          <div className="label">Activos</div>
          <div className="value gold">{metodos.filter(item => item.estado === 'ACTIVO').length}</div>
          <div className="sub">Aceptados</div>
        </div>
      </div>

      <div className="card">
        <div className="ventas-caja-header">
          <div>
            <h3 className="ventas-caja-title">Gestion de metodos de pago</h3>
            <p className="ventas-caja-subtitle">Configura las formas de pago aceptadas por la barberia.</p>
          </div>
          <button className="btn-gold" onClick={abrirCrear}>Registrar metodo de pago</button>
        </div>

        <div className="search-box ventas-caja-search">
          <span className="icon">Buscar</span>
          <input placeholder="Buscar por nombre, estado o referencia..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>

        <table className="tabla">
          <thead>
            <tr><th>Metodo</th><th>Descripcion</th><th>Referencia</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {metodosFiltrados.length === 0 ? (
              <tr><td colSpan={5} className="ventas-caja-empty">No se encontraron metodos de pago.</td></tr>
            ) : metodosFiltrados.map(metodo => (
              <tr key={idMetodo(metodo)}>
                <td className="ventas-caja-name">{metodo.nombre}</td>
                <td className="ventas-caja-muted">{metodo.descripcion || 'Sin descripcion'}</td>
                <td>{metodo.requiere_referencia ? 'Requiere referencia' : 'No requiere referencia'}</td>
                <td><span className={`badge ${estadoClase(metodo.estado)}`}>{metodo.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span></td>
                <td className="ventas-caja-row-actions">
                  <button className="btn-outline" onClick={() => abrirEditar(metodo)}>Editar</button>
                  {metodo.estado === 'ACTIVO' ? (
                    <button className="btn-outline ventas-caja-delete" onClick={() => desactivar(metodo)}>Desactivar</button>
                  ) : (
                    <button className="btn-outline" onClick={() => activar(metodo)}>Activar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crear' ? 'Registrar metodo de pago' : 'Editar metodo de pago'}</h3>
            <p>Define el nombre, la descripcion y si requiere referencia futura.</p>
            <div className="form-group">
              <label>Nombre</label>
              <input className="input-field" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Efectivo" />
            </div>
            <div className="form-group">
              <label>Descripcion</label>
              <textarea className="input-field ventas-caja-textarea" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Detalle del metodo de pago" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Estado</label>
                <select className="input-field" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                  {ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Referencia</label>
                <label className="ventas-caja-checkbox">
                  <input type="checkbox" checked={form.requiere_referencia} onChange={e => setForm({ ...form, requiere_referencia: e.target.checked })} />
                  <span>Este metodo requiere referencia o comprobante.</span>
                </label>
              </div>
            </div>
            <div className="ventas-caja-modal-actions">
              <button className="btn-outline ventas-caja-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-outline ventas-caja-modal-button" onClick={() => setForm({ ...EMPTY })}>Limpiar</button>
              <button className="btn-gold ventas-caja-modal-button" onClick={guardar} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
