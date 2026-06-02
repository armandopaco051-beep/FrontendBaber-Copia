import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

const ESTADOS = ['ACTIVO', 'INACTIVO'];
const EMPTY = {
  nombre: '',
  descripcion: '',
  id_categoria: '',
  unidad_medida: '',
  cantidad_disponible: 0,
  stock_minimo: 0,
  estado: 'ACTIVO',
};

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return <div className={`toast ${type}`}>{type === 'success' ? 'OK' : 'Error'} {msg}</div>;
}

function normalizarLista(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.[key])) return data[key];
  return [];
}

function idInsumo(item) {
  return item?.id_insumo || item?.id || '';
}

function idCategoria(item) {
  return item?.id_categoria || item?.id || '';
}

function badgeEstado(estado) {
  return estado === 'ACTIVO' ? 'badge-green' : 'badge-red';
}

export default function Insumos() {
  const [insumos, setInsumos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [stockMinimo, setStockMinimo] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [quickModal, setQuickModal] = useState(false);
  const [quickNombre, setQuickNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const cargarCategorias = async () => {
    const response = await api.get('inventario/categorias/', { params: { estado: 'ACTIVO' } });
    const lista = normalizarLista(response.data, 'categorias');
    setCategorias(lista);
    return lista;
  };

  const cargar = async () => {
    const [insumosRes, categoriasRes, stockRes] = await Promise.allSettled([
      api.get('inventario/insumos/'),
      cargarCategorias(),
      api.get('inventario/insumos/stock-minimo/'),
    ]);

    if (insumosRes.status === 'fulfilled') setInsumos(normalizarLista(insumosRes.value.data, 'insumos'));
    if (stockRes.status === 'fulfilled') setStockMinimo(normalizarLista(stockRes.value.data, 'insumos'));
    if ([insumosRes, categoriasRes, stockRes].some(item => item.status === 'rejected')) {
      showToast('No se pudieron cargar todos los datos de insumos.', 'error');
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const cerrar = () => {
    setModal(null);
    setEditId(null);
    setForm({ ...EMPTY });
  };

  const cerrarQuickModal = () => {
    setQuickModal(false);
    setQuickNombre('');
  };

  const abrirCrear = () => {
    setEditId(null);
    setForm({ ...EMPTY });
    setModal('crear');
  };

  const abrirEditar = (insumo) => {
    setEditId(idInsumo(insumo));
    setForm({
      nombre: insumo?.nombre || '',
      descripcion: insumo?.descripcion || '',
      id_categoria: insumo?.id_categoria || '',
      unidad_medida: insumo?.unidad_medida || '',
      cantidad_disponible: insumo?.cantidad_disponible ?? 0,
      stock_minimo: insumo?.stock_minimo ?? 0,
      estado: insumo?.estado || 'ACTIVO',
    });
    setModal('editar');
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return showToast('El nombre del insumo es obligatorio.', 'error');
    if (!form.id_categoria) return showToast('Selecciona una categoria activa.', 'error');
    if (!form.unidad_medida.trim()) return showToast('La unidad de medida es obligatoria.', 'error');
    setLoading(true);

    try {
      if (modal === 'crear') {
        await api.post('inventario/insumos/', form);
        showToast('Insumo registrado correctamente.');
      } else {
        await api.put(`inventario/insumos/${editId}/`, form);
        showToast('Insumo actualizado correctamente.');
      }
      cerrar();
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo guardar el insumo.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const crearCategoriaRapida = async () => {
    const nombre = quickNombre.trim();
    if (!nombre) {
      showToast('El nombre de la categoria es obligatorio.', 'error');
      return;
    }

    setQuickLoading(true);
    try {
      const response = await api.post('inventario/categorias/', { nombre, estado: 'ACTIVO' });
      const nuevaCategoria = response.data?.categoria;
      await cargarCategorias();
      if (nuevaCategoria) {
        setForm(actual => ({ ...actual, id_categoria: String(idCategoria(nuevaCategoria)) }));
      }
      showToast('Categoria registrada correctamente.');
      cerrarQuickModal();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo registrar la categoria.'), 'error');
    } finally {
      setQuickLoading(false);
    }
  };

  const desactivar = async (insumo) => {
    if (!confirm(`Desactivar el insumo "${insumo.nombre}"?`)) return;
    try {
      await api.delete(`inventario/insumos/${idInsumo(insumo)}/`);
      showToast('Insumo desactivado correctamente.');
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo desactivar el insumo.'), 'error');
    }
  };

  const activar = async (insumo) => {
    try {
      await api.put(`inventario/insumos/${idInsumo(insumo)}/`, { estado: 'ACTIVO' });
      showToast('Insumo activado correctamente.');
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo activar el insumo.'), 'error');
    }
  };

  const insumosFiltrados = useMemo(() => {
    const q = buscar.toLowerCase();
    return insumos.filter(insumo => [
      insumo?.nombre,
      insumo?.descripcion,
      insumo?.categoria_nombre,
      insumo?.unidad_medida,
      insumo?.estado,
    ].some(valor => String(valor || '').toLowerCase().includes(q)));
  }, [buscar, insumos]);

  return (
    <div>
      <div className="inventario-stats">
        <div className="stat-card">
          <div className="label">Insumos</div>
          <div className="value">{insumos.length}</div>
          <div className="sub">Registrados</div>
        </div>
        <div className="stat-card">
          <div className="label">Stock minimo</div>
          <div className="value gold">{stockMinimo.length}</div>
          <div className="sub">Requieren reposicion</div>
        </div>
      </div>

      <div className="card">
        <div className="inventario-header">
          <div>
            <h3 className="inventario-title">Gestion de insumos</h3>
            <p className="inventario-subtitle">Gestiona insumos usados en servicios de barberia.</p>
          </div>
          <button className="btn-gold" onClick={abrirCrear}>Registrar insumo</button>
        </div>

        {categorias.length === 0 && <div className="inventario-alert">No hay categorias activas. Primero registra categorias desde el backend o un siguiente ciclo.</div>}

        <div className="search-box inventario-search">
          <span className="icon">Buscar</span>
          <input placeholder="Buscar por insumo, categoria, unidad o estado..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>

        <table className="tabla">
          <thead>
            <tr><th>Insumo</th><th>Categoria</th><th>Unidad</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {insumosFiltrados.length === 0 ? (
              <tr><td colSpan={6} className="inventario-empty">No se encontraron insumos.</td></tr>
            ) : insumosFiltrados.map(insumo => (
              <tr key={idInsumo(insumo)}>
                <td>
                  <div className="inventario-name">{insumo.nombre}</div>
                  <div className="inventario-muted">{insumo.descripcion || 'Sin descripcion'}</div>
                </td>
                <td>{insumo.categoria_nombre || '-'}</td>
                <td>{insumo.unidad_medida}</td>
                <td>
                  <div>{insumo.cantidad_disponible} / min {insumo.stock_minimo}</div>
                  {insumo.stock_bajo && <span className="badge badge-yellow">Stock minimo</span>}
                </td>
                <td><span className={`badge ${badgeEstado(insumo.estado)}`}>{insumo.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span></td>
                <td className="inventario-row-actions">
                  <button className="btn-outline" onClick={() => abrirEditar(insumo)}>Editar</button>
                  {insumo.estado === 'ACTIVO'
                    ? <button className="btn-outline inventario-delete" onClick={() => desactivar(insumo)}>Desactivar</button>
                    : <button className="btn-outline" onClick={() => activar(insumo)}>Activar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box inventario-modal" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crear' ? 'Registrar insumo' : 'Editar insumo'}</h3>
            <p>Configura categoria, unidad de medida y control minimo del insumo.</p>
            <div className="form-group">
              <label>Nombre</label>
              <input className="input-field" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Talco" />
            </div>
            <div className="form-group">
              <label>Descripcion</label>
              <textarea className="input-field inventario-textarea" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Detalle del insumo" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Categoria</label>
                <div className="inventario-row-actions" style={{ marginBottom: '0.5rem' }}>
                  <button type="button" className="btn-outline" onClick={() => setQuickModal(true)}>Nueva categoria</button>
                </div>
                <select className="input-field" value={form.id_categoria} onChange={e => setForm({ ...form, id_categoria: e.target.value })}>
                  <option value="">Seleccionar categoria</option>
                  {categorias.map(categoria => <option key={idCategoria(categoria)} value={idCategoria(categoria)}>{categoria.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Unidad de medida</label>
                <input className="input-field" value={form.unidad_medida} onChange={e => setForm({ ...form, unidad_medida: e.target.value })} placeholder="Ej: botella, ml, caja" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Cantidad disponible</label>
                <input className="input-field" type="number" min="0" value={form.cantidad_disponible} onChange={e => setForm({ ...form, cantidad_disponible: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Stock minimo</label>
                <input className="input-field" type="number" min="0" value={form.stock_minimo} onChange={e => setForm({ ...form, stock_minimo: e.target.value })} />
              </div>
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

      {quickModal && (
        <div className="modal-overlay" onClick={cerrarQuickModal}>
          <div className="modal-box inventario-modal" onClick={e => e.stopPropagation()}>
            <h3>Nueva categoria</h3>
            <p>Registro rapido para seguir creando el insumo.</p>
            <div className="form-group">
              <label>Nombre</label>
              <input
                className="input-field"
                value={quickNombre}
                onChange={e => setQuickNombre(e.target.value)}
                placeholder="Ej: Desechables"
              />
            </div>
            <div className="inventario-modal-actions">
              <button className="btn-outline inventario-modal-button" onClick={cerrarQuickModal}>Cancelar</button>
              <button className="btn-gold inventario-modal-button" onClick={crearCategoriaRapida} disabled={quickLoading}>
                {quickLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
