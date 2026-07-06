import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

const ASIGNACIONES_ENDPOINT = 'citas/asignaciones-estaciones/';
const BARBEROS_ENDPOINT = 'citas/asignaciones-estaciones/barberos-activos/';
const ESTACIONES_DISPONIBLES_ENDPOINT = 'citas/asignaciones-estaciones/estaciones-disponibles/';
const ESTADOS = ['ACTIVO', 'INACTIVO'];

function fechaHoy() {
  const fecha = new Date();
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
  return fecha.toISOString().slice(0, 10);
}

const EMPTY = {
  codigo_barbero: '',
  id_estacion: '',
  fecha: fechaHoy(),
  hora_inicio: '',
  hora_fin: '',
  estado: 'ACTIVO',
  observacion: '',
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

function idAsignacion(item) {
  return item?.id_asignacion || item?.id || '';
}

function idEstacion(item) {
  return item?.id_estacion || item?.id || '';
}

function codigoBarbero(item) {
  return item?.codigo || item?.codigo_barbero || '';
}

function nombreBarbero(item) {
  return item?.nombre_completo || item?.barbero || `${item?.nombre || ''} ${item?.apellido || ''}`.trim() || codigoBarbero(item) || '-';
}

function horaCorta(valor) {
  return valor ? String(valor).slice(0, 5) : '-';
}

function estadoClase(estado) {
  return estado === 'ACTIVO' ? 'badge-green' : 'badge-red';
}

function formatoFecha(valor) {
  if (!valor) return '-';
  const fecha = new Date(`${valor}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleDateString('es-BO');
}

// CU27: Asignar barbero a estacion.
// Conecta el frontend con los endpoints de apoyo para seleccionar barberos activos,
// estaciones disponibles por turno y el CRUD de asignaciones de estaciones.
export default function AsignacionesEstaciones() {
  const [asignaciones, setAsignaciones] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [estaciones, setEstaciones] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [filtroFecha, setFiltroFecha] = useState(fechaHoy());
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // READ: lista asignaciones con filtros soportados por el backend.
  const cargarAsignaciones = async () => {
    try {
      const params = {
        ...(filtroFecha ? { fecha: filtroFecha } : {}),
        ...(filtroEstado ? { estado: filtroEstado } : {}),
      };
      const response = await api.get(ASIGNACIONES_ENDPOINT, { params });
      setAsignaciones(normalizarLista(response.data, 'asignaciones'));
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudieron cargar las asignaciones.'), 'error');
    }
  };

  // READ apoyo: trae barberos activos para la fecha seleccionada.
  const cargarBarberos = async (fecha = form.fecha) => {
    try {
      const response = await api.get(BARBEROS_ENDPOINT, { params: fecha ? { fecha } : {} });
      setBarberos(normalizarLista(response.data, 'barberos'));
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudieron cargar los barberos activos.'), 'error');
    }
  };

  // READ apoyo: trae estaciones libres para el rango de turno seleccionado.
  const cargarEstacionesDisponibles = async (base = form) => {
    try {
      const params = base.fecha && base.hora_inicio && base.hora_fin
        ? { fecha: base.fecha, hora_inicio: base.hora_inicio, hora_fin: base.hora_fin }
        : {};
      const response = await api.get(ESTACIONES_DISPONIBLES_ENDPOINT, { params });
      setEstaciones(normalizarLista(response.data, 'estaciones'));
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudieron cargar las estaciones disponibles.'), 'error');
    }
  };

  useEffect(() => { cargarAsignaciones(); }, [filtroFecha, filtroEstado]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  const cerrar = () => {
    setModal(null);
    setEditId(null);
    setDetalle(null);
    setForm({ ...EMPTY, fecha: filtroFecha || fechaHoy() });
  };

  const abrirCrear = async () => {
    const base = { ...EMPTY, fecha: filtroFecha || fechaHoy() };
    setEditId(null);
    setForm(base);
    setModal('crear');
    await Promise.all([cargarBarberos(base.fecha), cargarEstacionesDisponibles(base)]);
  };

  const abrirEditar = async (asignacion) => {
    const base = {
      codigo_barbero: typeof asignacion.codigo_barbero === 'object' ? codigoBarbero(asignacion.codigo_barbero) : asignacion.codigo_barbero || '',
      id_estacion: typeof asignacion.id_estacion === 'object' ? idEstacion(asignacion.id_estacion) : asignacion.id_estacion || '',
      fecha: asignacion.fecha || fechaHoy(),
      hora_inicio: horaCorta(asignacion.hora_inicio),
      hora_fin: horaCorta(asignacion.hora_fin),
      estado: asignacion.estado || 'ACTIVO',
      observacion: asignacion.observacion || '',
    };
    setEditId(idAsignacion(asignacion));
    setForm(base);
    setModal('editar');
    await Promise.all([cargarBarberos(base.fecha), cargarEstacionesDisponibles(base)]);
  };

  const abrirDetalle = (asignacion) => {
    setDetalle(asignacion);
    setModal('detalle');
  };

  const actualizarCampo = async (campo, valor) => {
    const next = { ...form, [campo]: valor };
    if (campo === 'hora_inicio' && next.hora_fin && valor >= next.hora_fin) next.hora_fin = '';
    setForm(next);

    if (campo === 'fecha') await cargarBarberos(valor);
    if (['fecha', 'hora_inicio', 'hora_fin'].includes(campo)) await cargarEstacionesDisponibles(next);
  };

  // CREATE/UPDATE: guarda asignaciones y deja que el backend valide cruces de horario.
  const guardar = async () => {
    if (!form.codigo_barbero) return showToast('Selecciona un barbero.', 'error');
    if (!form.id_estacion) return showToast('Selecciona una estacion disponible.', 'error');
    if (!form.fecha) return showToast('Selecciona una fecha.', 'error');
    if (!form.hora_inicio || !form.hora_fin) return showToast('Selecciona hora inicio y fin.', 'error');
    if (form.hora_inicio >= form.hora_fin) return showToast('La hora fin debe ser mayor a la hora inicio.', 'error');

    setLoading(true);
    const payload = {
      codigo_barbero: form.codigo_barbero,
      id_estacion: Number(form.id_estacion),
      fecha: form.fecha,
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      estado: form.estado,
      observacion: form.observacion,
    };

    try {
      if (modal === 'crear') {
        await api.post(ASIGNACIONES_ENDPOINT, payload);
        showToast('Barbero asignado a estacion correctamente.');
      } else {
        await api.put(`${ASIGNACIONES_ENDPOINT}${editId}/`, payload);
        showToast('Asignacion de estacion actualizada correctamente.');
      }
      cerrar();
      cargarAsignaciones();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo guardar la asignacion.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // DELETE logico: libera la estacion inactivando la asignacion sin perder historial.
  const inactivar = async (asignacion) => {
    if (!confirm(`Inactivar la asignacion de ${asignacion.barbero || asignacion.codigo_barbero}?`)) return;
    try {
      await api.delete(`${ASIGNACIONES_ENDPOINT}${idAsignacion(asignacion)}/`);
      showToast('Asignacion inactivada correctamente.');
      cargarAsignaciones();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo inactivar la asignacion.'), 'error');
    }
  };

  // ACTIVATE: revalida en backend que la estacion y el barbero sigan libres.
  const activar = async (asignacion) => {
    try {
      await api.post(`${ASIGNACIONES_ENDPOINT}${idAsignacion(asignacion)}/activar/`);
      showToast('Asignacion activada correctamente.');
      cargarAsignaciones();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo activar la asignacion.'), 'error');
    }
  };

  const asignacionesFiltradas = useMemo(() => {
    const q = buscar.toLowerCase();
    return asignaciones.filter(asignacion => [
      idAsignacion(asignacion),
      asignacion?.codigo_barbero,
      asignacion?.barbero,
      asignacion?.estacion,
      asignacion?.ubicacion_interna,
      asignacion?.fecha,
      asignacion?.estado,
      asignacion?.observacion,
    ].some(valor => String(valor ?? '').toLowerCase().includes(q)));
  }, [asignaciones, buscar]);

  const activas = asignaciones.filter(item => item.estado === 'ACTIVO').length;
  const inactivas = asignaciones.filter(item => item.estado === 'INACTIVO').length;

  return (
    <div>
      <div className="asignaciones-estaciones-stats">
        <div className="stat-card">
          <div className="label">Asignaciones</div>
          <div className="value">{asignaciones.length}</div>
          <div className="sub">En filtros actuales</div>
        </div>
        <div className="stat-card">
          <div className="label">Activas</div>
          <div className="value gold">{activas}</div>
          <div className="sub">Ocupando estacion</div>
        </div>
        <div className="stat-card">
          <div className="label">Inactivas</div>
          <div className="value">{inactivas}</div>
          <div className="sub">Historial liberado</div>
        </div>
      </div>

      <div className="card">
        <div className="asignaciones-estaciones-header">
          <div>
            <h3 className="asignaciones-estaciones-title">Asignar barbero a estacion</h3>
            <p className="asignaciones-estaciones-subtitle">Controla que cada barbero use una estacion libre por fecha y rango horario.</p>
          </div>
          <div className="asignaciones-estaciones-actions">
            <button className="btn-outline" onClick={cargarAsignaciones}>Actualizar</button>
            <button className="btn-gold" onClick={abrirCrear}>Nueva asignacion</button>
          </div>
        </div>

        <div className="asignaciones-estaciones-toolbar">
          <div className="form-group asignaciones-estaciones-filter">
            <label>Fecha</label>
            <input className="input-field" type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} />
          </div>
          <div className="form-group asignaciones-estaciones-filter">
            <label>Estado</label>
            <select className="input-field" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              {ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
            </select>
          </div>
          <div className="search-box asignaciones-estaciones-search">
            <span className="icon">Buscar</span>
            <input placeholder="Buscar por barbero, estacion o ubicacion..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
        </div>

        <table className="tabla">
          <thead>
            <tr><th>Barbero</th><th>Estacion</th><th>Fecha</th><th>Horario</th><th>Estado</th><th>Observacion</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {asignacionesFiltradas.length === 0 ? (
              <tr><td colSpan={7} className="asignaciones-estaciones-empty">No se encontraron asignaciones de estaciones.</td></tr>
            ) : asignacionesFiltradas.map(asignacion => (
              <tr key={idAsignacion(asignacion)}>
                <td>
                  <div className="asignaciones-estaciones-name">{asignacion.barbero || asignacion.codigo_barbero}</div>
                  <div className="asignaciones-estaciones-muted">{asignacion.codigo_barbero}</div>
                </td>
                <td>
                  <div className="asignaciones-estaciones-name">{asignacion.estacion || '-'}</div>
                  <div className="asignaciones-estaciones-muted">{asignacion.ubicacion_interna || 'Sin ubicacion'}</div>
                </td>
                <td>{formatoFecha(asignacion.fecha)}</td>
                <td>{horaCorta(asignacion.hora_inicio)} - {horaCorta(asignacion.hora_fin)}</td>
                <td><span className={`badge ${estadoClase(asignacion.estado)}`}>{asignacion.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span></td>
                <td className="asignaciones-estaciones-muted">{asignacion.observacion || 'Sin observacion'}</td>
                <td className="asignaciones-estaciones-row-actions">
                  <button className="btn-outline" onClick={() => abrirDetalle(asignacion)}>Ver</button>
                  <button className="btn-outline" onClick={() => abrirEditar(asignacion)}>Editar</button>
                  {asignacion.estado === 'ACTIVO' ? (
                    <button className="btn-outline asignaciones-estaciones-delete" onClick={() => inactivar(asignacion)}>Inactivar</button>
                  ) : (
                    <button className="btn-gold" onClick={() => activar(asignacion)}>Activar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box asignaciones-estaciones-modal" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crear' ? 'Nueva asignacion' : 'Editar asignacion'}</h3>
            <p>Selecciona fecha, horario, barbero activo y una estacion disponible.</p>
            <div className="form-row">
              <div className="form-group">
                <label>Fecha</label>
                <input className="input-field" type="date" value={form.fecha} onChange={e => actualizarCampo('fecha', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select className="input-field" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                  {ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Hora inicio</label>
                <input className="input-field" type="time" value={form.hora_inicio} onChange={e => actualizarCampo('hora_inicio', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Hora fin</label>
                <input className="input-field" type="time" value={form.hora_fin} onChange={e => actualizarCampo('hora_fin', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Barbero activo</label>
              <select className="input-field" value={form.codigo_barbero} onChange={e => setForm({ ...form, codigo_barbero: e.target.value })}>
                <option value="">Seleccionar barbero</option>
                {barberos.map(barbero => <option key={codigoBarbero(barbero)} value={codigoBarbero(barbero)}>{nombreBarbero(barbero)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Estacion disponible</label>
              <select className="input-field" value={form.id_estacion} onChange={e => setForm({ ...form, id_estacion: e.target.value })}>
                <option value="">Seleccionar estacion</option>
                {estaciones.map(estacion => <option key={idEstacion(estacion)} value={idEstacion(estacion)}>{estacion.nombre} - {estacion.ubicacion_interna}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Observacion</label>
              <textarea className="input-field asignaciones-estaciones-textarea" value={form.observacion} onChange={e => setForm({ ...form, observacion: e.target.value })} placeholder="Ej: Turno de la manana" />
            </div>
            <div className="asignaciones-estaciones-modal-actions">
              <button className="btn-outline asignaciones-estaciones-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-outline asignaciones-estaciones-modal-button" onClick={() => setForm({ ...EMPTY, fecha: filtroFecha || fechaHoy() })}>Limpiar</button>
              <button className="btn-gold asignaciones-estaciones-modal-button" onClick={guardar} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'detalle' && detalle && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box asignaciones-estaciones-modal" onClick={e => e.stopPropagation()}>
            <h3>Detalle de asignacion</h3>
            <p>Informacion del turno asignado al barbero.</p>
            <div className="asignaciones-estaciones-detail-grid">
              {[
                ['Codigo', `#${idAsignacion(detalle)}`],
                ['Barbero', detalle.barbero || detalle.codigo_barbero],
                ['Estacion', detalle.estacion],
                ['Ubicacion', detalle.ubicacion_interna],
                ['Fecha', formatoFecha(detalle.fecha)],
                ['Horario', `${horaCorta(detalle.hora_inicio)} - ${horaCorta(detalle.hora_fin)}`],
                ['Estado', detalle.estado],
                ['Observacion', detalle.observacion || 'Sin observacion'],
              ].map(([label, value]) => (
                <div key={label} className="asignaciones-estaciones-detail-row">
                  <span>{label}</span>
                  <strong>{value || '-'}</strong>
                </div>
              ))}
            </div>
            <button className="btn-gold asignaciones-estaciones-modal-button" onClick={cerrar}>Cerrar</button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
