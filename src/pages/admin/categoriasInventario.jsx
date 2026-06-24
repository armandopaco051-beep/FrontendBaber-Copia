import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

const ESTADOS = ['ACTIVO', 'INACTIVO'];
const EMPTY = { nombre: '', estado: 'ACTIVO' };

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
  if (Array.isArray(data?.categorias)) return data.categorias;
  return [];
}

function idCategoria(categoria) {
  return categoria?.id_categoria || categoria?.id || '';
}

function badgeEstado(estado) {
  return estado === 'ACTIVO' ? 'badge-green' : 'badge-red';
}

function fecha(valor) {
  if (!valor) return '-';
  const date = new Date(valor);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CategoriasInventario() {
  const [categorias, setCategorias] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const cargar = async () => {
    try {
      const params = estadoFiltro ? { estado: estadoFiltro } : {};
      const response = await api.get('inventario/categorias/', { params });
      setCategorias(normalizarLista(response.data));
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudieron cargar las categorias.'), 'error');
    }
  };

  useEffect(() => { cargar(); }, [estadoFiltro]); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const cerrar = () => {
    setModal(null);
    setEditId(null);
    setForm({ ...EMPTY });
  };

  const abrirCrear = () => {
    setEditId(null);
    setForm({ ...EMPTY });
    setModal('crear');
  };

  const abrirEditar = async (categoria) => {
    const id = idCategoria(categoria);
    setEditId(id);

    try {
      const response = await api.get(`inventario/categorias/${id}/`);
      const detalle = response.data?.categoria || response.data;
      setForm({
        nombre: detalle?.nombre || '',
        estado: detalle?.estado || 'ACTIVO',
      });
      setModal('editar');
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo consultar la categoria.'), 'error');
    }
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return showToast('El nombre de la categoria es obligatorio.', 'error');

    const payload = {
      nombre: form.nombre.trim(),
      estado: form.estado || 'ACTIVO',
    };

    setLoading(true);
    try {
      const response = modal === 'crear'
        ? await api.post('inventario/categorias/', payload)
        : await api.put(`inventario/categorias/${editId}/`, payload);

      showToast(response.data?.mensaje || (modal === 'crear' ? 'Categoria registrada correctamente.' : 'Categoria actualizada correctamente.'));
      cerrar();
      await cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo guardar la categoria.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const desactivar = async (categoria) => {
    if (!confirm(`Desactivar la categoria "${categoria.nombre}"?`)) return;

    setLoading(true);
    try {
      const response = await api.delete(`inventario/categorias/${idCategoria(categoria)}/`);
      showToast(response.data?.mensaje || 'Categoria desactivada correctamente.');
      await cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo desactivar la categoria.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const activar = async (categoria) => {
    setLoading(true);
    try {
      const response = await api.put(`inventario/categorias/${idCategoria(categoria)}/`, {
        nombre: categoria.nombre,
        estado: 'ACTIVO',
      });
      showToast(response.data?.mensaje || 'Categoria activada correctamente.');
      await cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo activar la categoria.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const categoriasFiltradas = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    if (!q) return categorias;
    return categorias.filter(categoria => [
      categoria.nombre,
      categoria.estado,
      idCategoria(categoria),
    ].some(valor => String(valor || '').toLowerCase().includes(q)));
  }, [buscar, categorias]);

  const activas = categorias.filter(categoria => categoria.estado === 'ACTIVO').length;
  const inactivas = categorias.filter(categoria => categoria.estado === 'INACTIVO').length;

  return (
    <div>
      <div className="inventario-stats inventario-categorias-stats">
        <div className="stat-card">
          <div className="label">Categorias</div>
          <div className="value">{categorias.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Activas</div>
          <div className="value gold">{activas}</div>
        </div>
        <div className="stat-card">
          <div className="label">Inactivas</div>
          <div className="value">{inactivas}</div>
        </div>
      </div>

      <div className="card">
        <div className="inventario-header">
          <div>
            <h3 className="inventario-title">Gestion de categorias de productos</h3>
            <p className="inventario-subtitle">Administra las categorias usadas por productos e insumos de inventario.</p>
          </div>
          <button className="btn-gold" onClick={abrirCrear}>Nueva categoria</button>
        </div>

        <div className="inventario-filter-grid">
          <div className="search-box inventario-search">
            <span className="icon">B</span>
            <input placeholder="Buscar por nombre, estado o codigo..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          <select className="input-field" value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
          </select>
        </div>

        <div className="inventario-table-wrap">
          <table className="data-table inventario-categorias-table">
            <thead>
              <tr><th>ID</th><th>Categoria</th><th>Estado</th><th>Registro</th><th>Actualizacion</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {categoriasFiltradas.length === 0 ? (
                <tr><td colSpan={6} className="inventario-empty">No se encontraron categorias.</td></tr>
              ) : categoriasFiltradas.map(categoria => (
                <tr key={idCategoria(categoria)}>
                  <td>#{idCategoria(categoria)}</td>
                  <td className="inventario-name">{categoria.nombre}</td>
                  <td><span className={`badge ${badgeEstado(categoria.estado)}`}>{categoria.estado}</span></td>
                  <td className="inventario-muted inventario-date">{fecha(categoria.fecha_registro)}</td>
                  <td className="inventario-muted inventario-date">{fecha(categoria.fecha_actualizacion)}</td>
                  <td className="inventario-row-actions">
                    <button className="btn-outline" onClick={() => abrirEditar(categoria)}>Editar</button>
                    {categoria.estado === 'ACTIVO'
                      ? <button className="btn-outline inventario-delete" onClick={() => desactivar(categoria)} disabled={loading}>Desactivar</button>
                      : <button className="btn-outline" onClick={() => activar(categoria)} disabled={loading}>Activar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box inventario-modal" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crear' ? 'Nueva categoria' : 'Editar categoria'}</h3>
            <p>{modal === 'crear' ? 'Registra una categoria para clasificar productos.' : 'Actualiza el nombre o estado de la categoria.'}</p>

            <div className="form-group">
              <label>Nombre</label>
              <input className="input-field" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Productos para cabello" autoComplete="off" />
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select className="input-field" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                {ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
              </select>
            </div>

            <div className="inventario-modal-actions">
              <button className="btn-outline inventario-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-outline inventario-modal-button" onClick={() => setForm({ ...EMPTY })}>Limpiar</button>
              <button className="btn-gold inventario-modal-button" onClick={guardar} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
