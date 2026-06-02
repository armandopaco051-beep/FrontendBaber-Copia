import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

const TIPOS_PRODUCTO = ['VENTA', 'USO_INTERNO', 'AMBOS'];
const ESTADOS = ['ACTIVO', 'INACTIVO'];
const EMPTY = {
  nombre: '',
  descripcion: '',
  id_categoria: '',
  id_marca: '',
  precio_venta: '',
  cantidad_disponible: 0,
  stock_minimo: 0,
  tipo_producto: 'VENTA',
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

function idProducto(item) {
  return item?.id_producto || item?.id || '';
}

function idCategoria(item) {
  return item?.id_categoria || item?.id || '';
}

function idMarca(item) {
  return item?.id_marca || item?.id || '';
}

function badgeEstado(estado) {
  return estado === 'ACTIVO' ? 'badge-green' : 'badge-red';
}

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [stockBajo, setStockBajo] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [quickModal, setQuickModal] = useState(null);
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

  const cargarMarcas = async () => {
    const response = await api.get('inventario/marcas/', { params: { estado: 'ACTIVO' } });
    const lista = normalizarLista(response.data, 'marcas');
    setMarcas(lista);
    return lista;
  };

  const cargar = async () => {
    const [productosRes, categoriasRes, marcasRes, stockRes] = await Promise.allSettled([
      api.get('inventario/productos/'),
      cargarCategorias(),
      cargarMarcas(),
      api.get('inventario/productos/stock-bajo/'),
    ]);

    if (productosRes.status === 'fulfilled') setProductos(normalizarLista(productosRes.value.data, 'productos'));
    if (stockRes.status === 'fulfilled') setStockBajo(normalizarLista(stockRes.value.data, 'productos'));
    if ([productosRes, categoriasRes, marcasRes, stockRes].some(item => item.status === 'rejected')) {
      showToast('No se pudieron cargar todos los datos de productos.', 'error');
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const cerrar = () => {
    setModal(null);
    setEditId(null);
    setForm({ ...EMPTY });
  };

  const cerrarQuickModal = () => {
    setQuickModal(null);
    setQuickNombre('');
  };

  const abrirCrear = () => {
    setEditId(null);
    setForm({ ...EMPTY });
    setModal('crear');
  };

  const abrirEditar = (producto) => {
    setEditId(idProducto(producto));
    setForm({
      nombre: producto?.nombre || '',
      descripcion: producto?.descripcion || '',
      id_categoria: producto?.id_categoria || '',
      id_marca: producto?.id_marca || '',
      precio_venta: producto?.precio_venta ?? '',
      cantidad_disponible: producto?.cantidad_disponible ?? 0,
      stock_minimo: producto?.stock_minimo ?? 0,
      tipo_producto: producto?.tipo_producto || 'VENTA',
      estado: producto?.estado || 'ACTIVO',
    });
    setModal('editar');
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return showToast('El nombre del producto es obligatorio.', 'error');
    if (!form.id_categoria) return showToast('Selecciona una categoria activa.', 'error');
    setLoading(true);

    const payload = {
      ...form,
      id_marca: form.id_marca || null,
    };

    try {
      if (modal === 'crear') {
        await api.post('inventario/productos/', payload);
        showToast('Producto registrado correctamente.');
      } else {
        await api.put(`inventario/productos/${editId}/`, payload);
        showToast('Producto actualizado correctamente.');
      }
      cerrar();
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo guardar el producto.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const crearRapido = async () => {
    const nombre = quickNombre.trim();
    if (!nombre) {
      showToast(`El nombre de la ${quickModal === 'marca' ? 'marca' : 'categoria'} es obligatorio.`, 'error');
      return;
    }

    setQuickLoading(true);
    try {
      if (quickModal === 'marca') {
        const response = await api.post('inventario/marcas/', { nombre, estado: 'ACTIVO' });
        const nuevaMarca = response.data?.marca;
        await cargarMarcas();
        if (nuevaMarca) {
          setForm(actual => ({ ...actual, id_marca: String(idMarca(nuevaMarca)) }));
        }
        showToast('Marca registrada correctamente.');
      } else {
        const response = await api.post('inventario/categorias/', { nombre, estado: 'ACTIVO' });
        const nuevaCategoria = response.data?.categoria;
        await cargarCategorias();
        if (nuevaCategoria) {
          setForm(actual => ({ ...actual, id_categoria: String(idCategoria(nuevaCategoria)) }));
        }
        showToast('Categoria registrada correctamente.');
      }
      cerrarQuickModal();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo registrar el catalogo.'), 'error');
    } finally {
      setQuickLoading(false);
    }
  };

  const desactivar = async (producto) => {
    if (!confirm(`Desactivar el producto "${producto.nombre}"?`)) return;
    try {
      await api.delete(`inventario/productos/${idProducto(producto)}/`);
      showToast('Producto desactivado correctamente.');
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo desactivar el producto.'), 'error');
    }
  };

  const activar = async (producto) => {
    try {
      await api.put(`inventario/productos/${idProducto(producto)}/`, { estado: 'ACTIVO' });
      showToast('Producto activado correctamente.');
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo activar el producto.'), 'error');
    }
  };

  const productosFiltrados = useMemo(() => {
    const q = buscar.toLowerCase();
    return productos.filter(producto => [
      producto?.nombre,
      producto?.descripcion,
      producto?.categoria_nombre,
      producto?.marca_nombre,
      producto?.tipo_producto,
      producto?.estado,
    ].some(valor => String(valor || '').toLowerCase().includes(q)));
  }, [buscar, productos]);

  return (
    <div>
      <div className="inventario-stats">
        <div className="stat-card">
          <div className="label">Productos</div>
          <div className="value">{productos.length}</div>
          <div className="sub">Registrados</div>
        </div>
        <div className="stat-card">
          <div className="label">Stock bajo</div>
          <div className="value gold">{stockBajo.length}</div>
          <div className="sub">Requieren reposicion</div>
        </div>
      </div>

      <div className="card">
        <div className="inventario-header">
          <div>
            <h3 className="inventario-title">Gestion de productos</h3>
            <p className="inventario-subtitle">Controla productos disponibles para venta o uso interno.</p>
          </div>
          <button className="btn-gold" onClick={abrirCrear}>Registrar producto</button>
        </div>

        {categorias.length === 0 && <div className="inventario-alert">No hay categorias activas. Primero registra categorias desde el backend o un siguiente ciclo.</div>}

        <div className="search-box inventario-search">
          <span className="icon">Buscar</span>
          <input placeholder="Buscar por producto, categoria, marca o estado..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>

        <table className="tabla">
          <thead>
            <tr><th>Producto</th><th>Categoria</th><th>Marca</th><th>Precio</th><th>Stock</th><th>Tipo</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {productosFiltrados.length === 0 ? (
              <tr><td colSpan={8} className="inventario-empty">No se encontraron productos.</td></tr>
            ) : productosFiltrados.map(producto => (
              <tr key={idProducto(producto)}>
                <td>
                  <div className="inventario-name">{producto.nombre}</div>
                  <div className="inventario-muted">{producto.descripcion || 'Sin descripcion'}</div>
                </td>
                <td>{producto.categoria_nombre || '-'}</td>
                <td>{producto.marca_nombre || 'Sin marca'}</td>
                <td>Bs. {producto.precio_venta}</td>
                <td>
                  <div>{producto.cantidad_disponible} / min {producto.stock_minimo}</div>
                  {producto.stock_bajo && <span className="badge badge-yellow">Stock bajo</span>}
                </td>
                <td>{producto.tipo_producto}</td>
                <td><span className={`badge ${badgeEstado(producto.estado)}`}>{producto.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span></td>
                <td className="inventario-row-actions">
                  <button className="btn-outline" onClick={() => abrirEditar(producto)}>Editar</button>
                  {producto.estado === 'ACTIVO'
                    ? <button className="btn-outline inventario-delete" onClick={() => desactivar(producto)}>Desactivar</button>
                    : <button className="btn-outline" onClick={() => activar(producto)}>Activar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box inventario-modal" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crear' ? 'Registrar producto' : 'Editar producto'}</h3>
            <p>Configura categoria, marca, stock y tipo de uso del producto.</p>
            <div className="form-group">
              <label>Nombre</label>
              <input className="input-field" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Cera matte" />
            </div>
            <div className="form-group">
              <label>Descripcion</label>
              <textarea className="input-field inventario-textarea" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Detalle del producto" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Categoria</label>
                <div className="inventario-row-actions" style={{ marginBottom: '0.5rem' }}>
                  <button type="button" className="btn-outline" onClick={() => setQuickModal('categoria')}>Nueva categoria</button>
                </div>
                <select className="input-field" value={form.id_categoria} onChange={e => setForm({ ...form, id_categoria: e.target.value })}>
                  <option value="">Seleccionar categoria</option>
                  {categorias.map(categoria => <option key={idCategoria(categoria)} value={idCategoria(categoria)}>{categoria.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Marca</label>
                <div className="inventario-row-actions" style={{ marginBottom: '0.5rem' }}>
                  <button type="button" className="btn-outline" onClick={() => setQuickModal('marca')}>Nueva marca</button>
                </div>
                <select className="input-field" value={form.id_marca} onChange={e => setForm({ ...form, id_marca: e.target.value })}>
                  <option value="">Sin marca</option>
                  {marcas.map(marca => <option key={idMarca(marca)} value={idMarca(marca)}>{marca.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Precio de venta</label>
                <input className="input-field" type="number" min="0" step="0.01" value={form.precio_venta} onChange={e => setForm({ ...form, precio_venta: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Tipo de producto</label>
                <select className="input-field" value={form.tipo_producto} onChange={e => setForm({ ...form, tipo_producto: e.target.value })}>
                  {TIPOS_PRODUCTO.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
                </select>
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
            <h3>{quickModal === 'marca' ? 'Nueva marca' : 'Nueva categoria'}</h3>
            <p>Registro rapido para continuar la prueba manual sin salir del formulario.</p>
            <div className="form-group">
              <label>Nombre</label>
              <input
                className="input-field"
                value={quickNombre}
                onChange={e => setQuickNombre(e.target.value)}
                placeholder={quickModal === 'marca' ? 'Ej: Wahl' : 'Ej: Pomadas'}
              />
            </div>
            <div className="inventario-modal-actions">
              <button className="btn-outline inventario-modal-button" onClick={cerrarQuickModal}>Cancelar</button>
              <button className="btn-gold inventario-modal-button" onClick={crearRapido} disabled={quickLoading}>
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
