import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

const ENDPOINT = 'citas/estaciones-trabajo/';
const ESTADOS = ['ACTIVO', 'INACTIVO'];
const EMPTY = {
  nombre: '',
  descripcion: '',
  ubicacion_interna: '',
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
  if (Array.isArray(data?.estaciones)) return data.estaciones;
  return [];
}

function idEstacion(estacion) {
  return estacion?.id_estacion || estacion?.id || '';
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

// CU26: Gestionar estaciones de trabajo.
// Consume los endpoints del paquete citas para consultar, registrar,
// actualizar, inactivar y reactivar estaciones fisicas de atencion.
export default function EstacionesTrabajo() {
  const [estaciones, setEstaciones] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // READ: lista estaciones desde GET /api/citas/estaciones-trabajo/.
  const cargar = async () => {
    try {
      const params = filtroEstado ? { estado: filtroEstado } : {};
      const response = await api.get(ENDPOINT, { params });
      setEstaciones(normalizarLista(response.data));
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudieron cargar las estaciones de trabajo.'), 'error');
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

  const abrirEditar = (estacion) => {
    setEditId(idEstacion(estacion));
    setForm({
      nombre: estacion?.nombre || '',
      descripcion: estacion?.descripcion || '',
      ubicacion_interna: estacion?.ubicacion_interna || '',
      estado: estacion?.estado || 'ACTIVO',
    });
    setModal('editar');
  };

  const abrirDetalle = (estacion) => {
    setDetalle(estacion);
    setModal('detalle');
  };

  // CREATE/UPDATE: POST registra una estacion y PUT actualiza una existente.
  const guardar = async () => {
    if (!form.nombre.trim()) return showToast('El nombre de la estacion es obligatorio.', 'error');
    if (!form.ubicacion_interna.trim()) return showToast('La ubicacion interna es obligatoria.', 'error');

    setLoading(true);
    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      ubicacion_interna: form.ubicacion_interna.trim(),
      estado: form.estado,
    };

    try {
      if (modal === 'crear') {
        await api.post(ENDPOINT, payload);
        showToast('Estacion de trabajo registrada correctamente.');
      } else {
        await api.put(`${ENDPOINT}${editId}/`, payload);
        showToast('Estacion de trabajo actualizada correctamente.');
      }
      cerrar();
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo guardar la estacion de trabajo.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // DELETE logico: el backend deja la estacion como INACTIVO, no la borra fisicamente.
  const inactivar = async (estacion) => {
    if (!confirm(`Inactivar la estacion "${estacion.nombre}"?`)) return;
    try {
      await api.delete(`${ENDPOINT}${idEstacion(estacion)}/`);
      showToast('Estacion de trabajo inactivada correctamente.');
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo inactivar la estacion de trabajo.'), 'error');
    }
  };

  // ACTIVATE: endpoint especifico para volver a habilitar estaciones inactivas.
  const activar = async (estacion) => {
    try {
      await api.post(`${ENDPOINT}${idEstacion(estacion)}/activar/`);
      showToast('Estacion de trabajo activada correctamente.');
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo activar la estacion de trabajo.'), 'error');
    }
  };

  const estacionesFiltradas = useMemo(() => {
    const q = buscar.toLowerCase();
    return estaciones.filter(estacion => [
      idEstacion(estacion),
      estacion?.nombre,
      estacion?.descripcion,
      estacion?.ubicacion_interna,
      estacion?.estado,
    ].some(valor => String(valor ?? '').toLowerCase().includes(q)));
  }, [buscar, estaciones]);

  const totalActivas = estaciones.filter(estacion => estacion.estado === 'ACTIVO').length;
  const totalInactivas = estaciones.filter(estacion => estacion.estado === 'INACTIVO').length;

  return (
    <div>
      <div className="estaciones-stats">
        <div className="stat-card">
          <div className="label">Estaciones</div>
          <div className="value">{estaciones.length}</div>
          <div className="sub">Registradas</div>
        </div>
        <div className="stat-card">
          <div className="label">Activas</div>
          <div className="value gold">{totalActivas}</div>
          <div className="sub">Disponibles para asignacion</div>
        </div>
        <div className="stat-card">
          <div className="label">Inactivas</div>
          <div className="value">{totalInactivas}</div>
          <div className="sub">Fuera de uso</div>
        </div>
      </div>

      <div className="card">
        <div className="estaciones-header">
          <div>
            <h3 className="estaciones-title">Gestion de estaciones de trabajo</h3>
            <p className="estaciones-subtitle">Administra espacios fisicos de atencion para la agenda y asignaciones.</p>
          </div>
          <div className="estaciones-actions">
            <button className="btn-outline" onClick={cargar}>Actualizar</button>
            <button className="btn-gold" onClick={abrirCrear}>Nueva estacion</button>
          </div>
        </div>

        <div className="estaciones-toolbar">
          <div className="search-box estaciones-search">
            <span className="icon">Buscar</span>
            <input placeholder="Buscar por nombre, ubicacion o estado..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          <div className="form-group estaciones-filter">
            <label>Estado</label>
            <select className="input-field" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              {ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
            </select>
          </div>
        </div>

        <table className="tabla">
          <thead>
            <tr><th>Estacion</th><th>Ubicacion interna</th><th>Descripcion</th><th>Estado</th><th>Registro</th><th>Actualizacion</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {estacionesFiltradas.length === 0 ? (
              <tr><td colSpan={7} className="estaciones-empty">No se encontraron estaciones de trabajo.</td></tr>
            ) : estacionesFiltradas.map(estacion => (
              <tr key={idEstacion(estacion)}>
                <td>
                  <div className="estaciones-name">{estacion.nombre}</div>
                  <div className="estaciones-code">#{idEstacion(estacion)}</div>
                </td>
                <td>{estacion.ubicacion_interna}</td>
                <td className="estaciones-muted">{estacion.descripcion || 'Sin descripcion'}</td>
                <td><span className={`badge ${estadoClase(estacion.estado)}`}>{estacion.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span></td>
                <td>{formatoFecha(estacion.fecha_registro)}</td>
                <td>{formatoFecha(estacion.fecha_actualizacion)}</td>
                <td className="estaciones-row-actions">
                  <button className="btn-outline" onClick={() => abrirDetalle(estacion)}>Ver</button>
                  <button className="btn-outline" onClick={() => abrirEditar(estacion)}>Editar</button>
                  {estacion.estado === 'ACTIVO' ? (
                    <button className="btn-outline estaciones-delete" onClick={() => inactivar(estacion)}>Inactivar</button>
                  ) : (
                    <button className="btn-gold" onClick={() => activar(estacion)}>Activar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box estaciones-modal" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crear' ? 'Nueva estacion de trabajo' : 'Editar estacion de trabajo'}</h3>
            <p>Define nombre, ubicacion interna y estado operativo de la estacion.</p>
            <div className="form-group">
              <label>Nombre</label>
              <input className="input-field" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Estacion 1" />
            </div>
            <div className="form-group">
              <label>Ubicacion interna</label>
              <input className="input-field" value={form.ubicacion_interna} onChange={e => setForm({ ...form, ubicacion_interna: e.target.value })} placeholder="Ej: Sala principal - lado izquierdo" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Estado</label>
                <select className="input-field" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                  {ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Descripcion</label>
              <textarea className="input-field estaciones-textarea" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Detalle opcional de la estacion" />
            </div>
            <div className="estaciones-modal-actions">
              <button className="btn-outline estaciones-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-outline estaciones-modal-button" onClick={() => setForm({ ...EMPTY })}>Limpiar</button>
              <button className="btn-gold estaciones-modal-button" onClick={guardar} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'detalle' && detalle && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box estaciones-modal" onClick={e => e.stopPropagation()}>
            <h3>Detalle de estacion</h3>
            <p>Informacion registrada para uso operativo y asignacion de barberos.</p>
            <div className="estaciones-detail-grid">
              {[
                ['Codigo', `#${idEstacion(detalle)}`],
                ['Nombre', detalle.nombre],
                ['Ubicacion interna', detalle.ubicacion_interna],
                ['Estado', detalle.estado],
                ['Registro', formatoFecha(detalle.fecha_registro)],
                ['Actualizacion', formatoFecha(detalle.fecha_actualizacion)],
                ['Descripcion', detalle.descripcion || 'Sin descripcion'],
              ].map(([label, value]) => (
                <div key={label} className="estaciones-detail-row">
                  <span>{label}</span>
                  <strong>{value || '-'}</strong>
                </div>
              ))}
            </div>
            <button className="btn-gold estaciones-modal-button" onClick={cerrar}>Cerrar</button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
