import { useEffect, useRef, useState } from 'react';
import api from '../../api/axiosConfig';
import { codigoBarbero, formatApiError, idServicio, nombrePersona, normalizarLista } from './clienteUtils';

const EMPTY = {
  id_servicio: '',
  codigo_barbero: 'TODOS',
  codigo_barbero_reserva: '',
  fecha: '',
  hora_inicio: '',
  metodo_pago_previsto: 'Pendiente',
  observacion: '',
};

function fechaHoy() {
  const fecha = new Date();
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
  return fecha.toISOString().slice(0, 10);
}

function normalizarSlots(data) {
  const lista = Array.isArray(data) ? data : data?.disponibles || data?.horarios || data?.slots || [];
  return lista.map(item => (typeof item === 'string' ? item : item?.hora_inicio || item?.hora || item?.inicio)).filter(Boolean);
}

function normalizarGrupos(data) {
  const grupos = Array.isArray(data?.barberos) ? data.barberos : [];
  return grupos.map(grupo => ({
    codigo_barbero: grupo?.codigo_barbero || '',
    barbero: grupo?.barbero || '-',
    disponibles: normalizarSlots(grupo),
  })).filter(grupo => grupo.disponibles.length > 0);
}

export default function ClienteReservar() {
  const [servicios, setServicios] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [form, setForm] = useState({ ...EMPTY, fecha: fechaHoy() });
  const [horarios, setHorarios] = useState([]);
  const [horariosPorBarbero, setHorariosPorBarbero] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [consultaRealizada, setConsultaRealizada] = useState(false);
  const disponibilidadReqId = useRef(0);

  const cargarBase = async () => {
    const [serviciosRes, barberosRes] = await Promise.allSettled([
      api.get('servicios/servicios/', { params: { estado: 'ACTIVO' } }),
      api.get('usuario/barberos/'),
    ]);

    if (serviciosRes.status === 'fulfilled') setServicios(normalizarLista(serviciosRes.value.data, ['servicios']));
    if (barberosRes.status === 'fulfilled') setBarberos(normalizarLista(barberosRes.value.data, ['barberos']));
    if (serviciosRes.status === 'rejected' || barberosRes.status === 'rejected') {
      setMensaje('No se pudieron cargar servicios o barberos disponibles.');
    }
  };

  useEffect(() => { cargarBase(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const limpiarDisponibilidad = () => {
    setHorarios([]);
    setHorariosPorBarbero([]);
  };

  const consultarDisponibilidad = async () => {
    if (!form.id_servicio || !form.fecha) {
      limpiarDisponibilidad();
      setMensaje('Selecciona servicio y fecha para consultar disponibilidad.');
      return;
    }

    const reqId = ++disponibilidadReqId.current;
    const esTodos = !form.codigo_barbero || form.codigo_barbero === 'TODOS';

    setLoadingHorarios(true);
    setConsultaRealizada(true);
    setMensaje('');
    limpiarDisponibilidad();

    try {
      const response = await api.get('cliente/disponibilidad/', {
        params: {
          id_servicio: form.id_servicio,
          fecha: form.fecha,
          codigo_barbero: esTodos ? 'TODOS' : form.codigo_barbero,
        },
        timeout: 15000,
      });

      if (reqId !== disponibilidadReqId.current) return;

      if (esTodos) {
        const grupos = normalizarGrupos(response.data);
        setHorariosPorBarbero(grupos);
        setMensaje(grupos.length ? '' : response.data?.mensaje || 'No hay horarios disponibles para la seleccion actual.');
      } else {
        const slots = normalizarSlots(response.data);
        setHorarios(slots);
        setMensaje(slots.length ? '' : response.data?.mensaje || 'No hay horarios disponibles para la seleccion actual.');
      }
    } catch (e) {
      if (reqId !== disponibilidadReqId.current) return;
      setMensaje(formatApiError(e.response?.data, 'No se pudo consultar disponibilidad.'));
    } finally {
      if (reqId === disponibilidadReqId.current) setLoadingHorarios(false);
    }
  };

  const actualizar = (patch) => {
    const cambiaBusqueda = Object.prototype.hasOwnProperty.call(patch, 'id_servicio')
      || Object.prototype.hasOwnProperty.call(patch, 'codigo_barbero')
      || Object.prototype.hasOwnProperty.call(patch, 'fecha');

    setForm(prev => ({
      ...prev,
      ...patch,
      hora_inicio: cambiaBusqueda ? '' : prev.hora_inicio,
      codigo_barbero_reserva: cambiaBusqueda ? '' : prev.codigo_barbero_reserva,
    }));

    if (cambiaBusqueda) {
      disponibilidadReqId.current += 1;
      setConsultaRealizada(false);
      limpiarDisponibilidad();
      setMensaje('');
      setLoadingHorarios(false);
    }
  };

  const seleccionarHorarioAgrupado = (codigo, hora) => {
    setForm(prev => ({
      ...prev,
      codigo_barbero_reserva: codigo,
      hora_inicio: hora,
    }));
  };

  const guardar = async () => {
    const codigoReserva = form.codigo_barbero === 'TODOS' ? form.codigo_barbero_reserva : form.codigo_barbero;

    if (!form.id_servicio) return setMensaje('Selecciona un servicio.');
    if (!form.fecha) return setMensaje('Selecciona una fecha.');
    if (!codigoReserva) return setMensaje('Selecciona un horario disponible.');
    if (!form.hora_inicio) return setMensaje('Selecciona un horario disponible.');

    setLoading(true);
    setMensaje('');

    try {
      await api.post('cliente/citas/', {
        id_servicio: form.id_servicio,
        codigo_barbero: codigoReserva,
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
        metodo_pago_previsto: form.metodo_pago_previsto,
        observacion: form.observacion,
      });
      setMensaje('Cita reservada correctamente.');
      setConsultaRealizada(false);
      setForm({ ...EMPTY, fecha: fechaHoy() });
      limpiarDisponibilidad();
    } catch (e) {
      setMensaje(formatApiError(e.response?.data, 'No se pudo reservar la cita.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cliente-page">
      <div className="card cliente-form-card">
        <h3>Reservar cita</h3>
        <p className="cliente-muted">Selecciona servicio, fecha y un barbero especifico o cualquier barbero disponible.</p>

        {mensaje && <div className={`cliente-alert ${mensaje.includes('correctamente') ? 'success' : 'error'}`}>{mensaje}</div>}

        <div className="form-row">
          <div className="form-group">
            <label>Servicio</label>
            <select className="input-field" value={form.id_servicio} onChange={e => actualizar({ id_servicio: e.target.value })}>
              <option value="">Seleccionar servicio</option>
              {servicios.map(servicio => (
                <option key={idServicio(servicio)} value={idServicio(servicio)}>
                  {servicio.nombre || servicio.servicio} - {servicio.duracion_minutos || servicio.duracion || 30} min
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Barbero</label>
            <select className="input-field" value={form.codigo_barbero} onChange={e => actualizar({ codigo_barbero: e.target.value })}>
              <option value="TODOS">Cualquier barbero disponible</option>
              {barberos.map(barbero => (
                <option key={codigoBarbero(barbero)} value={codigoBarbero(barbero)}>{nombrePersona(barbero)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Fecha</label>
            <input className="input-field" type="date" value={form.fecha} onChange={e => actualizar({ fecha: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Metodo de pago previsto</label>
            <select className="input-field" value={form.metodo_pago_previsto} onChange={e => setForm({ ...form, metodo_pago_previsto: e.target.value })}>
              <option>Pendiente</option>
              <option>QR</option>
              <option>Efectivo</option>
              <option>Tarjeta</option>
            </select>
          </div>
        </div>

        <button className="btn-outline cliente-availability-button" type="button" onClick={consultarDisponibilidad} disabled={loadingHorarios}>
          {loadingHorarios ? 'Consultando disponibilidad...' : 'Consultar disponibilidad'}
        </button>

        <div className="form-group">
          <label>Horarios disponibles</label>

          {loadingHorarios ? (
            <span className="cliente-muted">Consultando disponibilidad...</span>
          ) : !form.id_servicio || !form.fecha ? (
            <span className="cliente-muted">Selecciona servicio y fecha para consultar horarios.</span>
          ) : !consultaRealizada ? (
            <span className="cliente-muted">Haz clic en "Consultar disponibilidad" para ver horarios libres.</span>
          ) : form.codigo_barbero === 'TODOS' ? (
            horariosPorBarbero.length ? (
              <div className="cliente-availability-groups">
                {horariosPorBarbero.map(grupo => (
                  <div key={grupo.codigo_barbero} className="cliente-availability-group">
                    <div className="cliente-availability-heading">
                      <strong>{grupo.barbero}</strong>
                      <span>{grupo.disponibles.length} horarios libres</span>
                    </div>
                    <div className="cliente-slots">
                      {grupo.disponibles.map(hora => (
                        <button
                          key={`${grupo.codigo_barbero}-${hora}`}
                          type="button"
                          className={`cliente-slot ${form.codigo_barbero_reserva === grupo.codigo_barbero && form.hora_inicio === hora ? 'active' : ''}`}
                          onClick={() => seleccionarHorarioAgrupado(grupo.codigo_barbero, hora)}
                        >
                          {String(hora).slice(0, 5)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="cliente-muted">No hay horarios disponibles para la seleccion actual.</span>
            )
          ) : horarios.length ? (
            <div className="cliente-slots">
              {horarios.map(hora => (
                <button key={hora} type="button" className={`cliente-slot ${form.hora_inicio === hora ? 'active' : ''}`} onClick={() => setForm({ ...form, hora_inicio: hora, codigo_barbero_reserva: '' })}>
                  {String(hora).slice(0, 5)}
                </button>
              ))}
            </div>
          ) : (
            <span className="cliente-muted">No hay horarios disponibles para la seleccion actual.</span>
          )}

          {form.codigo_barbero === 'TODOS' && form.codigo_barbero_reserva && form.hora_inicio && (
            <div className="cliente-selection-summary">
              Horario seleccionado: {String(form.hora_inicio).slice(0, 5)} con {nombrePersona(barberos.find(item => codigoBarbero(item) === form.codigo_barbero_reserva))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Observacion</label>
          <textarea className="input-field cliente-textarea" value={form.observacion} onChange={e => setForm({ ...form, observacion: e.target.value })} placeholder="Ej: Corte bajo, barba perfilada..." />
        </div>

        <button className="btn-gold" onClick={guardar} disabled={loading}>{loading ? 'Reservando...' : 'Confirmar reserva'}</button>
      </div>
    </div>
  );
}
