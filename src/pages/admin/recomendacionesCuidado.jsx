import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

const RECOMENDACIONES_ENDPOINT = 'servicios/recomendaciones/';
const ATENCIONES_ENDPOINT = 'citas/atenciones/';
const PRODUCTOS_ENDPOINT = 'inventario/productos/';
const ESTADOS = ['ACTIVO', 'INACTIVO'];
const EMPTY = {
  id_atencion: '',
  contenido: '',
  frecuencia_corte: '',
  cuidados_cabello: '',
  productos_sugeridos: [],
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

function idRecomendacion(recomendacion) {
  return recomendacion?.id_recomendacion || recomendacion?.id || '';
}

function idAtencion(atencion) {
  return atencion?.id_atencion || atencion?.id || '';
}

function idProducto(producto) {
  return producto?.id_producto || producto?.id || '';
}

function nombreAtencion(atencion) {
  const id = idAtencion(atencion);
  const cliente = atencion?.cliente_nombre || atencion?.cliente || 'Cliente sin nombre';
  const barbero = atencion?.barbero_nombre || atencion?.barbero || 'Barbero sin nombre';
  const fecha = formatoFecha(atencion?.fecha || atencion?.fecha_atencion);
  return `#${id} - ${cliente} / ${barbero} - ${fecha}`;
}

function productosDetalle(recomendacion) {
  return Array.isArray(recomendacion?.productos_detalle) ? recomendacion.productos_detalle : [];
}

function idsProductosRecomendacion(recomendacion) {
  if (Array.isArray(recomendacion?.productos_sugeridos)) {
    return recomendacion.productos_sugeridos.map(item => String(typeof item === 'object' ? idProducto(item) : item));
  }
  return productosDetalle(recomendacion).map(item => String(item.id_producto));
}

function formatoFecha(valor) {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
}

function estadoClase(estado) {
  return estado === 'ACTIVO' ? 'badge-green' : 'badge-red';
}

function precio(valor) {
  const numero = Number(valor || 0);
  return `Bs. ${Number.isNaN(numero) ? '0.00' : numero.toFixed(2)}`;
}

// CU29: Gestionar recomendaciones de cuidado.
// La pantalla consume servicios/recomendaciones/ y registra recomendaciones
// vinculadas a atenciones finalizadas, usando los campos del serializer del backend.
export default function RecomendacionesCuidado() {
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [atenciones, setAtenciones] = useState([]);
  const [productos, setProductos] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // READ: carga recomendaciones y datos de apoyo para seleccionar atenciones/productos.
  const cargar = async () => {
    const params = filtroEstado ? { estado: filtroEstado } : {};
    const [recRes, atencionesRes, productosRes] = await Promise.allSettled([
      api.get(RECOMENDACIONES_ENDPOINT, { params }),
      api.get(ATENCIONES_ENDPOINT, { params: { estado: 'FINALIZADA' } }),
      api.get(PRODUCTOS_ENDPOINT, { params: { estado: 'ACTIVO' } }),
    ]);

    if (recRes.status === 'fulfilled') setRecomendaciones(normalizarLista(recRes.value.data, 'recomendaciones'));
    if (atencionesRes.status === 'fulfilled') {
      const lista = normalizarLista(atencionesRes.value.data, 'atenciones');
      setAtenciones(lista.filter(item => item?.estado === 'FINALIZADA' || !item?.estado));
    }
    if (productosRes.status === 'fulfilled') setProductos(normalizarLista(productosRes.value.data, 'productos').filter(item => item?.estado !== 'INACTIVO'));

    if (recRes.status === 'rejected') showToast(formatApiError(recRes.reason?.response?.data, 'No se pudieron cargar las recomendaciones.'), 'error');
    if (atencionesRes.status === 'rejected') showToast(formatApiError(atencionesRes.reason?.response?.data, 'No se pudieron cargar las atenciones finalizadas.'), 'error');
    if (productosRes.status === 'rejected') showToast(formatApiError(productosRes.reason?.response?.data, 'No se pudieron cargar los productos activos.'), 'error');
  };

  useEffect(() => { cargar(); }, [filtroEstado]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  const cerrar = () => {
    setModal(null);
    setEditId(null);
    setDetalle(null);
    setForm({ ...EMPTY });
  };

  const abrirCrear = () => {
    setEditId(null);
    setForm({ ...EMPTY });
    setModal('crear');
  };

  const abrirEditar = (recomendacion) => {
    setEditId(idRecomendacion(recomendacion));
    setForm({
      id_atencion: String(recomendacion?.id_atencion || ''),
      contenido: recomendacion?.contenido || '',
      frecuencia_corte: recomendacion?.frecuencia_corte || '',
      cuidados_cabello: recomendacion?.cuidados_cabello || '',
      productos_sugeridos: idsProductosRecomendacion(recomendacion),
      estado: recomendacion?.estado || 'ACTIVO',
    });
    setModal('editar');
  };

  const abrirDetalle = (recomendacion) => {
    setDetalle(recomendacion);
    setModal('detalle');
  };

  const toggleProducto = (productoId) => {
    const id = String(productoId);
    setForm(actual => ({
      ...actual,
      productos_sugeridos: actual.productos_sugeridos.includes(id)
        ? actual.productos_sugeridos.filter(item => item !== id)
        : [...actual.productos_sugeridos, id],
    }));
  };

  // CREATE/UPDATE: envia solo los campos aceptados por RecomendacionCuidadoSerializer.
  const guardar = async () => {
    if (!form.id_atencion) return showToast('Selecciona una atencion finalizada.', 'error');
    if (!form.contenido.trim()) return showToast('La recomendacion de cuidado es obligatoria.', 'error');

    setLoading(true);
    const payload = {
      id_atencion: Number(form.id_atencion),
      contenido: form.contenido.trim(),
      frecuencia_corte: form.frecuencia_corte.trim(),
      cuidados_cabello: form.cuidados_cabello.trim(),
      estado: form.estado,
      productos_sugeridos: form.productos_sugeridos.map(Number),
    };

    try {
      if (modal === 'crear') {
        await api.post(RECOMENDACIONES_ENDPOINT, payload);
        showToast('Recomendacion de cuidado registrada correctamente.');
      } else {
        await api.put(`${RECOMENDACIONES_ENDPOINT}${editId}/`, payload);
        showToast('Recomendacion de cuidado actualizada correctamente.');
      }
      cerrar();
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo guardar la recomendacion.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // DELETE logico: el backend conserva el registro y cambia estado a INACTIVO.
  const inactivar = async (recomendacion) => {
    if (!confirm(`Inactivar la recomendacion #${idRecomendacion(recomendacion)}?`)) return;
    try {
      await api.delete(`${RECOMENDACIONES_ENDPOINT}${idRecomendacion(recomendacion)}/`);
      showToast('Recomendacion de cuidado inactivada correctamente.');
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo inactivar la recomendacion.'), 'error');
    }
  };

  // ACTIVATE: reactiva recomendaciones inactivas mediante el endpoint dedicado.
  const activar = async (recomendacion) => {
    try {
      await api.post(`${RECOMENDACIONES_ENDPOINT}${idRecomendacion(recomendacion)}/activar/`);
      showToast('Recomendacion de cuidado activada correctamente.');
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo activar la recomendacion.'), 'error');
    }
  };

  const recomendacionesFiltradas = useMemo(() => {
    const q = buscar.toLowerCase();
    return recomendaciones.filter(recomendacion => [
      idRecomendacion(recomendacion),
      recomendacion?.cliente,
      recomendacion?.barbero,
      recomendacion?.servicio_principal,
      recomendacion?.contenido,
      recomendacion?.frecuencia_corte,
      recomendacion?.cuidados_cabello,
      recomendacion?.estado,
      recomendacion?.fecha_atencion,
      recomendacion?.fecha_registro,
      ...productosDetalle(recomendacion).map(item => item.producto),
    ].some(valor => String(valor ?? '').toLowerCase().includes(q)));
  }, [buscar, recomendaciones]);

  const activos = recomendaciones.filter(item => item.estado === 'ACTIVO').length;
  const inactivos = recomendaciones.filter(item => item.estado === 'INACTIVO').length;

  return (
    <div>
      <div className="recomendaciones-stats">
        <div className="stat-card">
          <div className="label">Recomendaciones</div>
          <div className="value">{recomendaciones.length}</div>
          <div className="sub">Registradas</div>
        </div>
        <div className="stat-card">
          <div className="label">Activas</div>
          <div className="value gold">{activos}</div>
          <div className="sub">Visibles para consulta</div>
        </div>
        <div className="stat-card">
          <div className="label">Inactivas</div>
          <div className="value">{inactivos}</div>
          <div className="sub">Ocultas temporalmente</div>
        </div>
      </div>

      <div className="card">
        <div className="recomendaciones-header">
          <div>
            <h3 className="recomendaciones-title">Gestion de recomendaciones de cuidado</h3>
            <p className="recomendaciones-subtitle">Registra indicaciones posteriores a una atencion finalizada.</p>
          </div>
          <div className="recomendaciones-actions">
            <button className="btn-outline" onClick={cargar}>Actualizar</button>
            <button className="btn-gold" onClick={abrirCrear}>Nueva recomendacion</button>
          </div>
        </div>

        <div className="recomendaciones-toolbar">
          <div className="search-box recomendaciones-search">
            <span className="icon">Buscar</span>
            <input placeholder="Buscar por cliente, barbero, servicio, producto o estado" value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          <div className="form-group recomendaciones-filter">
            <label>Estado</label>
            <select className="input-field" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              {ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
            </select>
          </div>
        </div>

        <div className="recomendaciones-table-wrap">
          <table className="tabla">
            <thead>
              <tr><th>Recomendacion</th><th>Cliente</th><th>Barbero</th><th>Servicio</th><th>Productos</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {recomendacionesFiltradas.length === 0 ? (
                <tr><td colSpan={7} className="recomendaciones-empty">No se encontraron recomendaciones de cuidado.</td></tr>
              ) : recomendacionesFiltradas.map(recomendacion => (
                <tr key={idRecomendacion(recomendacion)}>
                  <td>
                    <div className="recomendaciones-name">#{idRecomendacion(recomendacion)}</div>
                    <div className="recomendaciones-muted">{recomendacion.contenido}</div>
                    <div className="recomendaciones-muted">Registro: {formatoFecha(recomendacion.fecha_registro)}</div>
                  </td>
                  <td>{recomendacion.cliente || '-'}</td>
                  <td>{recomendacion.barbero || '-'}</td>
                  <td>
                    <div>{recomendacion.servicio_principal || '-'}</div>
                    <div className="recomendaciones-muted">Atencion: {formatoFecha(recomendacion.fecha_atencion)}</div>
                  </td>
                  <td>
                    <div className="recomendaciones-products-list">
                      {productosDetalle(recomendacion).length === 0 ? 'Sin productos' : productosDetalle(recomendacion).map(item => (
                        <span key={item.id_detalle || item.id_producto} className="recomendaciones-product-chip">{item.producto}</span>
                      ))}
                    </div>
                  </td>
                  <td><span className={`badge ${estadoClase(recomendacion.estado)}`}>{recomendacion.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span></td>
                  <td className="recomendaciones-row-actions">
                    <button className="btn-outline" onClick={() => abrirDetalle(recomendacion)}>Ver</button>
                    <button className="btn-outline" onClick={() => abrirEditar(recomendacion)}>Editar</button>
                    {recomendacion.estado === 'ACTIVO' ? (
                      <button className="btn-outline recomendaciones-delete" onClick={() => inactivar(recomendacion)}>Inactivar</button>
                    ) : (
                      <button className="btn-gold" onClick={() => activar(recomendacion)}>Activar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box recomendaciones-modal" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crear' ? 'Nueva recomendacion de cuidado' : 'Editar recomendacion de cuidado'}</h3>
            <p>Selecciona una atencion finalizada y registra las indicaciones posteriores al servicio.</p>
            <div className="form-group">
              <label>Atencion finalizada</label>
              <select className="input-field" value={form.id_atencion} onChange={e => setForm({ ...form, id_atencion: e.target.value })}>
                <option value="">Seleccionar atencion</option>
                {atenciones.map(atencion => <option key={idAtencion(atencion)} value={idAtencion(atencion)}>{nombreAtencion(atencion)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Recomendacion principal</label>
              <textarea className="input-field recomendaciones-textarea" value={form.contenido} onChange={e => setForm({ ...form, contenido: e.target.value })} placeholder="Ej: Evitar calor directo durante 48 horas." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Frecuencia de corte</label>
                <input className="input-field" value={form.frecuencia_corte} onChange={e => setForm({ ...form, frecuencia_corte: e.target.value })} placeholder="Cada 3 semanas" />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select className="input-field" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                  {ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Cuidados del cabello</label>
              <textarea className="input-field recomendaciones-textarea" value={form.cuidados_cabello} onChange={e => setForm({ ...form, cuidados_cabello: e.target.value })} placeholder="Ej: Aplicar cera ligera solo en puntas." />
            </div>
            <div className="form-group">
              <label>Productos sugeridos</label>
              <div className="recomendaciones-products-grid">
                {productos.length === 0 ? (
                  <span className="recomendaciones-muted">No hay productos activos disponibles.</span>
                ) : productos.map(producto => {
                  const id = String(idProducto(producto));
                  return (
                    <label key={id} className={`recomendaciones-product-option ${form.productos_sugeridos.includes(id) ? 'active' : ''}`}>
                      <input type="checkbox" checked={form.productos_sugeridos.includes(id)} onChange={() => toggleProducto(id)} />
                      <span>
                        <strong>{producto.nombre}</strong>
                        <em>{precio(producto.precio_venta)} {producto.tipo_producto ? `- ${producto.tipo_producto}` : ''}</em>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="recomendaciones-modal-actions">
              <button className="btn-outline recomendaciones-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-outline recomendaciones-modal-button" onClick={() => setForm({ ...EMPTY })}>Limpiar</button>
              <button className="btn-gold recomendaciones-modal-button" onClick={guardar} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'detalle' && detalle && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box recomendaciones-modal" onClick={e => e.stopPropagation()}>
            <h3>Detalle de recomendacion</h3>
            <p>Informacion registrada para el cuidado posterior al servicio.</p>
            <div className="recomendaciones-detail-grid">
              {[
                ['Codigo', `#${idRecomendacion(detalle)}`],
                ['Cliente', detalle.cliente],
                ['Barbero', detalle.barbero],
                ['Servicio', detalle.servicio_principal],
                ['Fecha de atencion', formatoFecha(detalle.fecha_atencion)],
                ['Estado', detalle.estado],
                ['Frecuencia de corte', detalle.frecuencia_corte || '-'],
                ['Registro', formatoFecha(detalle.fecha_registro)],
                ['Actualizacion', formatoFecha(detalle.fecha_actualizacion)],
              ].map(([label, value]) => (
                <div key={label} className="recomendaciones-detail-row">
                  <span>{label}</span>
                  <strong>{value || '-'}</strong>
                </div>
              ))}
            </div>
            <div className="recomendaciones-detail-block">
              <span>Recomendacion principal</span>
              <strong>{detalle.contenido || '-'}</strong>
            </div>
            <div className="recomendaciones-detail-block">
              <span>Cuidados del cabello</span>
              <strong>{detalle.cuidados_cabello || '-'}</strong>
            </div>
            <div className="recomendaciones-detail-products">
              <h4>Productos sugeridos</h4>
              {productosDetalle(detalle).length === 0 ? (
                <p className="recomendaciones-muted">Sin productos sugeridos.</p>
              ) : productosDetalle(detalle).map(item => (
                <div key={item.id_detalle || item.id_producto} className="recomendaciones-detail-product">
                  <strong>{item.producto}</strong>
                  <span>{precio(item.precio_venta)} - {item.estado_producto}</span>
                </div>
              ))}
            </div>
            <button className="btn-gold recomendaciones-modal-button" onClick={cerrar}>Cerrar</button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
