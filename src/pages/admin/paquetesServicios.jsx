import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

const PAQUETES_ENDPOINT = 'servicios/paquetes/';
const SERVICIOS_ENDPOINT = 'servicios/servicios/';
const ESTADOS = ['ACTIVO', 'INACTIVO'];
const EMPTY = {
  nombre: '',
  descripcion: '',
  precio_total: '',
  duracion_minutos: '',
  estado: 'ACTIVO',
  servicios: [],
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

function idPaquete(paquete) {
  return paquete?.id_paquete || paquete?.id || '';
}

function idServicio(servicio) {
  return servicio?.id_servicio || servicio?.id || '';
}

function idsServiciosPaquete(paquete) {
  if (Array.isArray(paquete?.servicios)) return paquete.servicios.map(item => String(typeof item === 'object' ? idServicio(item) : item));
  if (Array.isArray(paquete?.servicios_detalle)) return paquete.servicios_detalle.map(item => String(item.id_servicio));
  return [];
}

function serviciosDetalle(paquete) {
  return Array.isArray(paquete?.servicios_detalle) ? paquete.servicios_detalle : [];
}

function formatoMoneda(valor) {
  const numero = Number(valor || 0);
  return `Bs. ${numero.toFixed(2)}`;
}

function estadoClase(estado) {
  return estado === 'ACTIVO' ? 'badge-green' : 'badge-red';
}

function formatoFecha(valor) {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
}

// CU28: Gestionar paquetes de servicios.
// Esta pantalla conecta con servicios/paquetes/ para administrar ofertas compuestas
// por varios servicios activos, incluyendo activacion e inactivacion logica.
export default function PaquetesServicios() {
  const [paquetes, setPaquetes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // READ: carga paquetes y servicios activos para construir el selector multiple.
  const cargar = async () => {
    const [paquetesRes, serviciosRes] = await Promise.allSettled([
      api.get(PAQUETES_ENDPOINT, { params: filtroEstado ? { estado: filtroEstado } : {} }),
      api.get(SERVICIOS_ENDPOINT, { params: { estado: 'ACTIVO' } }),
    ]);

    if (paquetesRes.status === 'fulfilled') setPaquetes(normalizarLista(paquetesRes.value.data, 'paquetes'));
    if (serviciosRes.status === 'fulfilled') setServicios(normalizarLista(serviciosRes.value.data, 'servicios'));

    if (paquetesRes.status === 'rejected') {
      showToast(formatApiError(paquetesRes.reason?.response?.data, 'No se pudieron cargar los paquetes.'), 'error');
    }
    if (serviciosRes.status === 'rejected') {
      showToast(formatApiError(serviciosRes.reason?.response?.data, 'No se pudieron cargar los servicios activos.'), 'error');
    }
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

  const abrirEditar = (paquete) => {
    setEditId(idPaquete(paquete));
    setForm({
      nombre: paquete?.nombre || '',
      descripcion: paquete?.descripcion || '',
      precio_total: paquete?.precio_total ?? '',
      duracion_minutos: paquete?.duracion_minutos ?? '',
      estado: paquete?.estado || 'ACTIVO',
      servicios: idsServiciosPaquete(paquete),
    });
    setModal('editar');
  };

  const abrirDetalle = (paquete) => {
    setDetalle(paquete);
    setModal('detalle');
  };

  const toggleServicio = (servicioId) => {
    const id = String(servicioId);
    setForm(actual => ({
      ...actual,
      servicios: actual.servicios.includes(id)
        ? actual.servicios.filter(item => item !== id)
        : [...actual.servicios, id],
    }));
  };

  // CREATE/UPDATE: envia al backend los campos validados por PaqueteServicioSerializer.
  const guardar = async () => {
    if (!form.nombre.trim()) return showToast('El nombre del paquete es obligatorio.', 'error');
    if (!form.precio_total || Number(form.precio_total) <= 0) return showToast('El precio total debe ser mayor a 0.', 'error');
    if (!form.duracion_minutos || Number(form.duracion_minutos) <= 0) return showToast('La duracion debe ser mayor a 0 minutos.', 'error');
    if (form.servicios.length === 0) return showToast('Selecciona al menos un servicio activo.', 'error');

    setLoading(true);
    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      precio_total: form.precio_total,
      duracion_minutos: Number(form.duracion_minutos),
      estado: form.estado,
      servicios: form.servicios.map(Number),
    };

    try {
      if (modal === 'crear') {
        await api.post(PAQUETES_ENDPOINT, payload);
        showToast('Paquete de servicios registrado correctamente.');
      } else {
        await api.put(`${PAQUETES_ENDPOINT}${editId}/`, payload);
        showToast('Paquete de servicios actualizado correctamente.');
      }
      cerrar();
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo guardar el paquete.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // DELETE logico: conserva el paquete y lo marca como INACTIVO.
  const inactivar = async (paquete) => {
    if (!confirm(`Inactivar el paquete "${paquete.nombre}"?`)) return;
    try {
      await api.delete(`${PAQUETES_ENDPOINT}${idPaquete(paquete)}/`);
      showToast('Paquete de servicios inactivado correctamente.');
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo inactivar el paquete.'), 'error');
    }
  };

  // ACTIVATE: vuelve a publicar un paquete inactivo usando el endpoint especifico.
  const activar = async (paquete) => {
    try {
      await api.post(`${PAQUETES_ENDPOINT}${idPaquete(paquete)}/activar/`);
      showToast('Paquete de servicios activado correctamente.');
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo activar el paquete.'), 'error');
    }
  };

  const paquetesFiltrados = useMemo(() => {
    const q = buscar.toLowerCase();
    return paquetes.filter(paquete => [
      idPaquete(paquete),
      paquete?.nombre,
      paquete?.descripcion,
      paquete?.precio_total,
      paquete?.duracion_minutos,
      paquete?.estado,
      ...serviciosDetalle(paquete).map(item => item.servicio),
    ].some(valor => String(valor ?? '').toLowerCase().includes(q)));
  }, [buscar, paquetes]);

  const activos = paquetes.filter(paquete => paquete.estado === 'ACTIVO').length;
  const inactivos = paquetes.filter(paquete => paquete.estado === 'INACTIVO').length;

  return (
    <div>
      <div className="paquetes-stats">
        <div className="stat-card">
          <div className="label">Paquetes</div>
          <div className="value">{paquetes.length}</div>
          <div className="sub">Registrados</div>
        </div>
        <div className="stat-card">
          <div className="label">Activos</div>
          <div className="value gold">{activos}</div>
          <div className="sub">Disponibles para venta</div>
        </div>
        <div className="stat-card">
          <div className="label">Inactivos</div>
          <div className="value">{inactivos}</div>
          <div className="sub">Ocultos temporalmente</div>
        </div>
      </div>

      <div className="card">
        <div className="paquetes-header">
          <div>
            <h3 className="paquetes-title">Gestion de paquetes de servicios</h3>
            <p className="paquetes-subtitle">Agrupa servicios activos en ofertas con precio y duracion total.</p>
          </div>
          <div className="paquetes-actions">
            <button className="btn-outline" onClick={cargar}>Actualizar</button>
            <button className="btn-gold" onClick={abrirCrear}>Nuevo paquete</button>
          </div>
        </div>

        <div className="paquetes-toolbar">
          <div className="search-box paquetes-search">
            <span className="icon">Buscar</span>
            <input placeholder="Buscar por paquete, servicio o estado..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          <div className="form-group paquetes-filter">
            <label>Estado</label>
            <select className="input-field" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              {ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
            </select>
          </div>
        </div>

        <table className="tabla">
          <thead>
            <tr><th>Paquete</th><th>Servicios incluidos</th><th>Precio total</th><th>Duracion</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {paquetesFiltrados.length === 0 ? (
              <tr><td colSpan={6} className="paquetes-empty">No se encontraron paquetes de servicios.</td></tr>
            ) : paquetesFiltrados.map(paquete => (
              <tr key={idPaquete(paquete)}>
                <td>
                  <div className="paquetes-name">{paquete.nombre}</div>
                  <div className="paquetes-muted">{paquete.descripcion || 'Sin descripcion'}</div>
                </td>
                <td>
                  <div className="paquetes-services-list">
                    {serviciosDetalle(paquete).length === 0 ? 'Sin servicios' : serviciosDetalle(paquete).map(item => (
                      <span key={item.id_detalle || item.id_servicio} className="paquetes-service-chip">{item.servicio}</span>
                    ))}
                  </div>
                </td>
                <td>{formatoMoneda(paquete.precio_total)}</td>
                <td>{paquete.duracion_minutos} min</td>
                <td><span className={`badge ${estadoClase(paquete.estado)}`}>{paquete.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span></td>
                <td className="paquetes-row-actions">
                  <button className="btn-outline" onClick={() => abrirDetalle(paquete)}>Ver</button>
                  <button className="btn-outline" onClick={() => abrirEditar(paquete)}>Editar</button>
                  {paquete.estado === 'ACTIVO' ? (
                    <button className="btn-outline paquetes-delete" onClick={() => inactivar(paquete)}>Inactivar</button>
                  ) : (
                    <button className="btn-gold" onClick={() => activar(paquete)}>Activar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box paquetes-modal" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crear' ? 'Nuevo paquete de servicios' : 'Editar paquete de servicios'}</h3>
            <p>Define los datos comerciales y selecciona los servicios activos que componen el paquete.</p>
            <div className="form-group">
              <label>Nombre</label>
              <input className="input-field" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Corte con barba" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Precio total</label>
                <input className="input-field" type="number" min="0" step="0.01" value={form.precio_total} onChange={e => setForm({ ...form, precio_total: e.target.value })} placeholder="70.00" />
              </div>
              <div className="form-group">
                <label>Duracion total</label>
                <input className="input-field" type="number" min="1" value={form.duracion_minutos} onChange={e => setForm({ ...form, duracion_minutos: e.target.value })} placeholder="75" />
              </div>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select className="input-field" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                {ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Servicios incluidos</label>
              <div className="paquetes-services-grid">
                {servicios.length === 0 ? (
                  <span className="paquetes-muted">No hay servicios activos disponibles.</span>
                ) : servicios.map(servicio => {
                  const id = String(idServicio(servicio));
                  return (
                    <label key={id} className={`paquetes-service-option ${form.servicios.includes(id) ? 'active' : ''}`}>
                      <input type="checkbox" checked={form.servicios.includes(id)} onChange={() => toggleServicio(id)} />
                      <span>
                        <strong>{servicio.nombre}</strong>
                        <em>{formatoMoneda(servicio.precio)} · {servicio.duracion_minutos} min</em>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="form-group">
              <label>Descripcion</label>
              <textarea className="input-field paquetes-textarea" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Detalle del paquete" />
            </div>
            <div className="paquetes-modal-actions">
              <button className="btn-outline paquetes-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-outline paquetes-modal-button" onClick={() => setForm({ ...EMPTY })}>Limpiar</button>
              <button className="btn-gold paquetes-modal-button" onClick={guardar} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'detalle' && detalle && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box paquetes-modal" onClick={e => e.stopPropagation()}>
            <h3>Detalle de paquete</h3>
            <p>Resumen de servicios incluidos, precio y duracion configurada.</p>
            <div className="paquetes-detail-grid">
              {[
                ['Codigo', `#${idPaquete(detalle)}`],
                ['Nombre', detalle.nombre],
                ['Precio total', formatoMoneda(detalle.precio_total)],
                ['Duracion', `${detalle.duracion_minutos} min`],
                ['Estado', detalle.estado],
                ['Registro', formatoFecha(detalle.fecha_registro)],
                ['Actualizacion', formatoFecha(detalle.fecha_actualizacion)],
                ['Descripcion', detalle.descripcion || 'Sin descripcion'],
              ].map(([label, value]) => (
                <div key={label} className="paquetes-detail-row">
                  <span>{label}</span>
                  <strong>{value || '-'}</strong>
                </div>
              ))}
            </div>
            <div className="paquetes-detail-services">
              <h4>Servicios incluidos</h4>
              {serviciosDetalle(detalle).length === 0 ? (
                <p className="paquetes-muted">Sin servicios registrados.</p>
              ) : serviciosDetalle(detalle).map(item => (
                <div key={item.id_detalle || item.id_servicio} className="paquetes-detail-service">
                  <strong>{item.servicio}</strong>
                  <span>{formatoMoneda(item.precio)} · {item.duracion_minutos} min · {item.estado_servicio}</span>
                </div>
              ))}
            </div>
            <button className="btn-gold paquetes-modal-button" onClick={cerrar}>Cerrar</button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
