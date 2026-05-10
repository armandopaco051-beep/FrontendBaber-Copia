import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';

const EMPTY_CATEGORIA = { nombre: '', descripcion: '' };
const EMPTY_SERVICIO = { nombre: '', descripcion: '', precio: '', duracion_minutos: '', id_categoria: '' };

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
  if (Array.isArray(data?.servicios)) return data.servicios;
  return [];
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

function categoriaId(categoria) {
  return categoria?.id_categoria || categoria?.id;
}

function servicioId(servicio) {
  return servicio?.id_servicio || servicio?.id;
}

function categoriaServicio(servicio) {
  return servicio?.id_categoria || servicio?.categoria_id || servicio?.categoria?.id_categoria || servicio?.categoria?.id || '';
}

function nombreCategoria(id, categorias) {
  const categoria = categorias.find(item => String(categoriaId(item)) === String(id));
  return categoria?.nombre || categoria?.categoria || '-';
}

function precioServicio(servicio) {
  const valor = servicio?.precio ?? servicio?.costo ?? servicio?.monto;
  if (valor === null || valor === undefined || valor === '') return '-';
  return `Bs. ${valor}`;
}

function duracionServicio(servicio) {
  const valor = servicio?.duracion_minutos ?? servicio?.duracion ?? servicio?.tiempo;
  if (valor === null || valor === undefined || valor === '') return '-';
  return `${valor} min`;
}

// CU10: Gestion de servicios.
// Administra dos CRUD relacionados: categorias y servicios. Un servicio
// pertenece a una categoria y guarda precio/duracion usados por citas.
export default function Servicios() {
  const [tab, setTab] = useState('servicios');
  const [categorias, setCategorias] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [categoriaForm, setCategoriaForm] = useState({ ...EMPTY_CATEGORIA });
  const [servicioForm, setServicioForm] = useState({ ...EMPTY_SERVICIO });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // READ: trae categorias y servicios desde /api/servicios/.
  const cargar = async () => {
    const [categoriasRes, serviciosRes] = await Promise.allSettled([
      api.get('servicios/categorias/'),
      api.get('servicios/servicios/'),
    ]);

    if (categoriasRes.status === 'fulfilled') setCategorias(normalizarLista(categoriasRes.value.data));
    if (serviciosRes.status === 'fulfilled') setServicios(normalizarLista(serviciosRes.value.data));

    if (categoriasRes.status === 'rejected' || serviciosRes.status === 'rejected') {
      showToast('No se pudieron cargar todos los datos de servicios', 'error');
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const cerrar = () => {
    setModal(null);
    setEditId(null);
    setCategoriaForm({ ...EMPTY_CATEGORIA });
    setServicioForm({ ...EMPTY_SERVICIO });
  };

  // Abre modal para crear o editar categoria.
  const abrirCategoria = (categoria = null) => {
    if (categoria) {
      setCategoriaForm({
        nombre: categoria.nombre || '',
        descripcion: categoria.descripcion || '',
      });
      setEditId(categoriaId(categoria));
      setModal('editarCategoria');
      return;
    }

    setCategoriaForm({ ...EMPTY_CATEGORIA });
    setModal('crearCategoria');
  };

  // Abre modal para crear o editar servicio.
  const abrirServicio = (servicio = null) => {
    if (servicio) {
      setServicioForm({
        nombre: servicio.nombre || '',
        descripcion: servicio.descripcion || '',
        precio: servicio.precio ?? servicio.costo ?? '',
        duracion_minutos: servicio.duracion_minutos ?? servicio.duracion ?? '',
        id_categoria: categoriaServicio(servicio),
      });
      setEditId(servicioId(servicio));
      setModal('editarServicio');
      return;
    }

    setServicioForm({ ...EMPTY_SERVICIO });
    setModal('crearServicio');
  };

  // CREATE/UPDATE categoria: POST o PUT segun el modal.
  const guardarCategoria = async () => {
    if (!categoriaForm.nombre.trim()) return showToast('El nombre de la categoria es requerido', 'error');
    setLoading(true);

    try {
      if (modal === 'crearCategoria') {
        await api.post('servicios/categorias/', categoriaForm);
        showToast('Categoria registrada correctamente');
      } else {
        await api.put(`servicios/categorias/${editId}/`, categoriaForm);
        showToast('Categoria actualizada correctamente');
      }
      cerrar();
      cargar();
    } catch (e) {
      showToast(formatApiError(e.response?.data), 'error');
    } finally {
      setLoading(false);
    }
  };

  // CREATE/UPDATE servicio: valida categoria y duracion antes de enviar.
  const guardarServicio = async () => {
    if (!servicioForm.nombre.trim()) return showToast('El nombre del servicio es requerido', 'error');
    if (!servicioForm.id_categoria) return showToast('Selecciona una categoria', 'error');
    if (!servicioForm.duracion_minutos) return showToast('La duracion en minutos es requerida', 'error');
    setLoading(true);

    const payload = {
      nombre: servicioForm.nombre,
      descripcion: servicioForm.descripcion,
      precio: servicioForm.precio,
      duracion_minutos: servicioForm.duracion_minutos,
      id_categoria: servicioForm.id_categoria,
    };

    try {
      if (modal === 'crearServicio') {
        await api.post('servicios/servicios/', payload);
        showToast('Servicio registrado correctamente');
      } else {
        await api.put(`servicios/servicios/${editId}/`, payload);
        showToast('Servicio actualizado correctamente');
      }
      cerrar();
      cargar();
    } catch (e) {
      showToast(formatApiError(e.response?.data), 'error');
    } finally {
      setLoading(false);
    }
  };

  // DELETE categoria por id_categoria/id.
  const eliminarCategoria = async (id) => {
    if (!confirm('Eliminar esta categoria?')) return;

    try {
      await api.delete(`servicios/categorias/${id}/`);
      showToast('Categoria eliminada');
      cargar();
    } catch (e) {
      showToast(formatApiError(e.response?.data), 'error');
    }
  };

  // DELETE servicio por id_servicio/id.
  const eliminarServicio = async (id) => {
    if (!confirm('Eliminar este servicio?')) return;

    try {
      await api.delete(`servicios/servicios/${id}/`);
      showToast('Servicio eliminado');
      cargar();
    } catch (e) {
      showToast(formatApiError(e.response?.data), 'error');
    }
  };

  const categoriasFiltradas = useMemo(() => {
    const q = buscar.toLowerCase();
    return categorias.filter(categoria => [
      categoria.nombre,
      categoria.descripcion,
      categoriaId(categoria),
    ].some(valor => String(valor ?? '').toLowerCase().includes(q)));
  }, [buscar, categorias]);

  const serviciosFiltrados = useMemo(() => {
    const q = buscar.toLowerCase();
    return servicios.filter(servicio => [
      servicio.nombre,
      servicio.descripcion,
      precioServicio(servicio),
      duracionServicio(servicio),
      nombreCategoria(categoriaServicio(servicio), categorias),
    ].some(valor => String(valor ?? '').toLowerCase().includes(q)));
  }, [buscar, categorias, servicios]);

  return (
    <div>
      <div className="servicios-stats">
        <div className="stat-card">
          <div className="label">Servicios</div>
          <div className="value">{servicios.length}</div>
          <div className="sub">Registrados</div>
        </div>
        <div className="stat-card">
          <div className="label">Categorias</div>
          <div className="value gold">{categorias.length}</div>
          <div className="sub">Disponibles</div>
        </div>
      </div>

      <div className="card">
        <div className="servicios-header">
          <div>
            <h3 className="servicios-title">Gestion de servicios</h3>
            <p className="servicios-subtitle">Administra categorias, precios, duracion y servicios ofrecidos.</p>
          </div>
          <div className="servicios-actions">
            <button className="btn-outline" onClick={() => abrirCategoria()}>+ Categoria</button>
            <button className="btn-gold" onClick={() => abrirServicio()}>+ Servicio</button>
          </div>
        </div>

        <div className="servicios-tabs">
          <button className={tab === 'servicios' ? 'active' : ''} onClick={() => setTab('servicios')}>Servicios</button>
          <button className={tab === 'categorias' ? 'active' : ''} onClick={() => setTab('categorias')}>Categorias</button>
        </div>

        <div className="search-box servicios-search">
          <span className="icon">Buscar</span>
          <input placeholder="Buscar por servicio, categoria o descripcion..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>

        {tab === 'servicios' ? (
          <table className="tabla">
            <thead>
              <tr><th>Servicio</th><th>Categoria</th><th>Precio</th><th>Duracion</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {serviciosFiltrados.length === 0 ? (
                <tr><td colSpan={6} className="servicios-empty">No se encontraron servicios.</td></tr>
              ) : serviciosFiltrados.map(servicio => (
                <tr key={servicioId(servicio)}>
                  <td>
                    <div className="servicios-name">{servicio.nombre}</div>
                    <div className="servicios-muted">{servicio.descripcion || 'Sin descripcion'}</div>
                  </td>
                  <td>{nombreCategoria(categoriaServicio(servicio), categorias)}</td>
                  <td>{precioServicio(servicio)}</td>
                  <td>{duracionServicio(servicio)}</td>
                  <td><span className={`badge ${servicio.activo === false ? 'badge-red' : 'badge-green'}`}>{servicio.activo === false ? 'Inactivo' : 'Activo'}</span></td>
                  <td className="servicios-row-actions">
                    <button className="btn-outline" onClick={() => abrirServicio(servicio)}>Editar</button>
                    <button className="btn-outline servicios-delete" onClick={() => eliminarServicio(servicioId(servicio))}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="tabla">
            <thead>
              <tr><th>Categoria</th><th>Descripcion</th><th>Servicios</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {categoriasFiltradas.length === 0 ? (
                <tr><td colSpan={5} className="servicios-empty">No se encontraron categorias.</td></tr>
              ) : categoriasFiltradas.map(categoria => {
                const id = categoriaId(categoria);
                const total = servicios.filter(servicio => String(categoriaServicio(servicio)) === String(id)).length;

                return (
                  <tr key={id}>
                    <td className="servicios-name">{categoria.nombre}</td>
                    <td className="servicios-muted">{categoria.descripcion || 'Sin descripcion'}</td>
                    <td>{total}</td>
                    <td><span className={`badge ${categoria.activo === false ? 'badge-red' : 'badge-green'}`}>{categoria.activo === false ? 'Inactivo' : 'Activo'}</span></td>
                    <td className="servicios-row-actions">
                      <button className="btn-outline" onClick={() => abrirCategoria(categoria)}>Editar</button>
                      <button className="btn-outline servicios-delete" onClick={() => eliminarCategoria(id)}>Eliminar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {(modal === 'crearCategoria' || modal === 'editarCategoria') && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crearCategoria' ? 'Nueva categoria' : 'Editar categoria'}</h3>
            <p>Define el grupo al que perteneceran los servicios.</p>
            <div className="form-group">
              <label>Nombre</label>
              <input className="input-field" placeholder="Ej: Cortes" value={categoriaForm.nombre} autoComplete="off" onChange={e => setCategoriaForm({ ...categoriaForm, nombre: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Descripcion</label>
              <textarea className="input-field servicios-textarea" placeholder="Descripcion de la categoria" value={categoriaForm.descripcion} onChange={e => setCategoriaForm({ ...categoriaForm, descripcion: e.target.value })} />
            </div>
            <div className="servicios-modal-actions">
              <button className="btn-outline servicios-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-outline servicios-modal-button" onClick={() => setCategoriaForm({ ...EMPTY_CATEGORIA })}>Limpiar</button>
              <button className="btn-gold servicios-modal-button" onClick={guardarCategoria} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {(modal === 'crearServicio' || modal === 'editarServicio') && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crearServicio' ? 'Nuevo servicio' : 'Editar servicio'}</h3>
            <p>Configura el servicio, precio, duracion y categoria.</p>
            <div className="form-group">
              <label>Categoria</label>
              <select className="input-field" value={servicioForm.id_categoria} onChange={e => setServicioForm({ ...servicioForm, id_categoria: e.target.value })}>
                <option value="">Seleccionar categoria</option>
                {categorias.map(categoria => (
                  <option key={categoriaId(categoria)} value={categoriaId(categoria)}>{categoria.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Nombre</label>
              <input className="input-field" placeholder="Ej: Corte clasico" value={servicioForm.nombre} autoComplete="off" onChange={e => setServicioForm({ ...servicioForm, nombre: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Precio</label>
                <input className="input-field" type="number" min="0" step="0.01" placeholder="50.00" value={servicioForm.precio} onChange={e => setServicioForm({ ...servicioForm, precio: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Duracion</label>
                <input className="input-field" type="number" min="0" placeholder="30" value={servicioForm.duracion_minutos} onChange={e => setServicioForm({ ...servicioForm, duracion_minutos: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Descripcion</label>
              <textarea className="input-field servicios-textarea" placeholder="Detalle del servicio" value={servicioForm.descripcion} onChange={e => setServicioForm({ ...servicioForm, descripcion: e.target.value })} />
            </div>
            <div className="servicios-modal-actions">
              <button className="btn-outline servicios-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-outline servicios-modal-button" onClick={() => setServicioForm({ ...EMPTY_SERVICIO })}>Limpiar</button>
              <button className="btn-gold servicios-modal-button" onClick={guardarServicio} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
