import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { barberoCita, estadoCita, fechaCita, formatApiError, horaCita, idCita, idServicio, normalizarLista, servicioCita } from './clienteUtils';

const EMPTY_FORM = {
  tipo_solicitud: 'RECLAMO',
  detalle: '',
  id_cita: '',
  id_servicio: '',
};

function idSolicitud(solicitud) {
  return solicitud?.id_solicitud || solicitud?.id || '';
}

function fecha(valor) {
  if (!valor) return '-';
  const date = new Date(valor);
  if (Number.isNaN(date.getTime())) return String(valor);
  return date.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
}

function estadoTexto(estado) {
  return String(estado || '-').replace(/_/g, ' ');
}

function estadoBadge(estado) {
  if (['RESUELTO', 'CERRADO', 'REVISADO'].includes(estado)) return 'badge-green';
  if (estado === 'INACTIVO') return 'badge-red';
  return 'badge-yellow';
}

function serviciosDeCita(cita) {
  const detalles = cita?.servicios_detalle || cita?.detalles_servicio || cita?.servicios;
  if (Array.isArray(detalles)) {
    return detalles.map(item => ({
      id: item.id_servicio || item.id || item.servicio_id,
      nombre: item.servicio || item.nombre || item.servicio_nombre || `Servicio ${item.id_servicio || ''}`,
    })).filter(item => item.id);
  }
  const servicio = cita?.id_servicio || cita?.servicio;
  if (servicio && typeof servicio === 'object') return [{ id: idServicio(servicio), nombre: servicio.nombre || servicio.servicio || 'Servicio' }].filter(item => item.id);
  if (cita?.id_servicio) return [{ id: cita.id_servicio, nombre: cita.servicio_nombre || 'Servicio de la cita' }];
  return [];
}

// CU31 cliente: registra y consulta sus propios reclamos o sugerencias.
// Usa cliente/reclamos-sugerencias/ para crear solicitudes y ver el seguimiento administrativo.
export default function ClienteReclamosSugerencias() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [citas, setCitas] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);

  const cargarSolicitudes = async () => {
    setLoading(true);
    setMensaje('');
    try {
      const response = await api.get('cliente/reclamos-sugerencias/');
      setSolicitudes(normalizarLista(response.data, ['solicitudes']));
    } catch (e) {
      setMensaje(formatApiError(e.response?.data, 'No se pudieron cargar tus reclamos y sugerencias.'));
    } finally {
      setLoading(false);
    }
  };

  const cargarDatosApoyo = async () => {
    const [citasRes, serviciosRes] = await Promise.allSettled([
      api.get('cliente/citas/'),
      api.get('servicios/servicios/', { params: { estado: 'ACTIVO' } }),
    ]);

    if (citasRes.status === 'fulfilled') setCitas(normalizarLista(citasRes.value.data, ['citas']));
    if (serviciosRes.status === 'fulfilled') setServicios(normalizarLista(serviciosRes.value.data, ['servicios']));
  };

  useEffect(() => { cargarSolicitudes(); cargarDatosApoyo(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const abrirNuevo = () => {
    setForm({ ...EMPTY_FORM });
    setModal(true);
    setMensaje('');
  };

  const cerrar = () => {
    setModal(false);
    setForm({ ...EMPTY_FORM });
  };

  const citaSeleccionada = citas.find(cita => String(idCita(cita)) === String(form.id_cita));
  const serviciosRelacionados = citaSeleccionada ? serviciosDeCita(citaSeleccionada) : servicios.map(servicio => ({ id: idServicio(servicio), nombre: servicio.nombre }));

  // CREATE: el cliente envia tipo, detalle y referencias opcionales a cita/servicio.
  const registrar = async () => {
    if (!form.detalle.trim()) {
      setMensaje('El detalle no puede estar vacio.');
      return;
    }

    const payload = {
      tipo_solicitud: form.tipo_solicitud,
      detalle: form.detalle.trim(),
    };
    if (form.id_cita) payload.id_cita = Number(form.id_cita);
    if (form.id_servicio) payload.id_servicio = Number(form.id_servicio);

    setLoading(true);
    try {
      await api.post('cliente/reclamos-sugerencias/', payload);
      setMensaje('Solicitud registrada correctamente.');
      cerrar();
      await cargarSolicitudes();
    } catch (e) {
      setMensaje(formatApiError(e.response?.data, 'No se pudo registrar tu solicitud.'));
    } finally {
      setLoading(false);
    }
  };

  const filtradas = useMemo(() => {
    const q = buscar.toLowerCase();
    return solicitudes.filter(solicitud => [
      solicitud.tipo_solicitud,
      solicitud.detalle,
      solicitud.servicio,
      solicitud.estado,
      solicitud.respuesta_admin,
      solicitud.fecha_registro,
    ].some(valor => String(valor || '').toLowerCase().includes(q)));
  }, [buscar, solicitudes]);

  return (
    <div className="cliente-page">
      <div className="card">
        <div className="cliente-section-header">
          <div>
            <h3>Reclamos y sugerencias</h3>
            <p>Registra solicitudes sobre tu atencion recibida y consulta la respuesta de administracion.</p>
          </div>
          <button className="btn-gold" onClick={abrirNuevo}>Nueva solicitud</button>
        </div>

        <div className="cliente-reclamos-tools">
          <input className="input-field cliente-search-input" placeholder="Buscar por tipo, estado o detalle..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          <button className="btn-outline" onClick={cargarSolicitudes}>Actualizar</button>
        </div>

        {mensaje && <div className={`cliente-alert ${mensaje.includes('correctamente') ? 'success' : 'error'}`}>{mensaje}</div>}
        {loading ? <p className="cliente-muted">Cargando solicitudes...</p> : (
          <div className="cliente-table-wrap">
            <table className="tabla">
              <thead>
                <tr><th>Solicitud</th><th>Tipo</th><th>Detalle</th><th>Relacion</th><th>Estado</th><th>Respuesta</th><th>Registro</th></tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr><td colSpan={7} className="cliente-empty">Aun no tienes reclamos o sugerencias registrados.</td></tr>
                ) : filtradas.map(solicitud => (
                  <tr key={idSolicitud(solicitud)}>
                    <td>#{idSolicitud(solicitud)}</td>
                    <td>{estadoTexto(solicitud.tipo_solicitud)}</td>
                    <td>{solicitud.detalle}</td>
                    <td>
                      <div>{solicitud.servicio || solicitud.id_servicio || 'Sin servicio'}</div>
                      {solicitud.id_cita && <span className="cliente-muted">Cita #{solicitud.id_cita}</span>}
                    </td>
                    <td><span className={`badge ${estadoBadge(solicitud.estado)}`}>{estadoTexto(solicitud.estado)}</span></td>
                    <td>{solicitud.respuesta_admin || 'Pendiente de respuesta'}</td>
                    <td>{fecha(solicitud.fecha_registro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box cliente-reclamo-modal" onClick={e => e.stopPropagation()}>
            <h3>Nueva solicitud</h3>
            <p>Relaciona tu reclamo o sugerencia con una cita o servicio cuando corresponda.</p>

            <div className="form-row">
              <div className="form-group">
                <label>Tipo</label>
                <select className="input-field" value={form.tipo_solicitud} onChange={e => setForm({ ...form, tipo_solicitud: e.target.value })}>
                  <option value="RECLAMO">Reclamo</option>
                  <option value="SUGERENCIA">Sugerencia</option>
                </select>
              </div>
              <div className="form-group">
                <label>Cita relacionada</label>
                <select className="input-field" value={form.id_cita} onChange={e => setForm({ ...form, id_cita: e.target.value, id_servicio: '' })}>
                  <option value="">Sin cita especifica</option>
                  {citas.map(cita => (
                    <option key={idCita(cita)} value={idCita(cita)}>
                      #{idCita(cita)} - {fechaCita(cita)} {horaCita(cita)} - {servicioCita(cita)} - {estadoCita(cita)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Servicio relacionado</label>
              <select className="input-field" value={form.id_servicio} onChange={e => setForm({ ...form, id_servicio: e.target.value })}>
                <option value="">Sin servicio especifico</option>
                {serviciosRelacionados.map(servicio => <option key={servicio.id} value={servicio.id}>{servicio.nombre}</option>)}
              </select>
              {citaSeleccionada && <p className="cliente-muted">Atencion: {barberoCita(citaSeleccionada)} - {estadoCita(citaSeleccionada)}</p>}
            </div>

            <div className="form-group">
              <label>Detalle</label>
              <textarea className="input-field cliente-reclamo-textarea" value={form.detalle} onChange={e => setForm({ ...form, detalle: e.target.value })} placeholder="Describe lo ocurrido o la sugerencia que quieres enviar" />
            </div>

            <div className="cliente-reclamo-actions">
              <button className="btn-outline" onClick={cerrar}>Cancelar</button>
              <button className="btn-gold" onClick={registrar} disabled={loading}>{loading ? 'Enviando...' : 'Registrar solicitud'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
