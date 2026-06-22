import { useEffect, useRef, useState } from 'react';
import api from '../../api/axiosConfig';
import { codigoBarbero, formatApiError, idServicio, nombrePersona, normalizarLista } from './clienteUtils';

const EMPTY = {
  id_servicios: [],
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

function precioServicio(servicio) {
  return Number(servicio?.precio ?? servicio?.precio_base ?? servicio?.costo ?? 0) || 0;
}

function duracionServicio(servicio) {
  return Number(servicio?.duracion_minutos ?? servicio?.duracion ?? servicio?.tiempo ?? 30) || 30;
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
    if (form.id_servicios.length === 0 || !form.fecha) {
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
      const response = await api.get('citas/disponibilidad/', {
        params: {
          id_servicios: form.id_servicios.join(','),
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
    const cambiaBusqueda = Object.prototype.hasOwnProperty.call(patch, 'id_servicios')
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

  const toggleServicio = (id) => {
    const idStr = String(id);
    const next = form.id_servicios.includes(idStr)
      ? form.id_servicios.filter(item => item !== idStr)
      : [...form.id_servicios, idStr];
    actualizar({ id_servicios: next });
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

    if (form.id_servicios.length === 0) return setMensaje('Selecciona al menos un servicio.');
    if (!form.fecha) return setMensaje('Selecciona una fecha.');
    if (!codigoReserva) return setMensaje('Selecciona un horario disponible.');
    if (!form.hora_inicio) return setMensaje('Selecciona un horario disponible.');

    setLoading(true);
    setMensaje('');

    try {
      await api.post('cliente/citas/', {
        id_servicio: Number(form.id_servicios[0]),
        servicios: form.id_servicios.map(id => ({ id_servicio: Number(id) })),
        codigo_barbero: codigoReserva,
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
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

  const serviciosSeleccionados = servicios.filter(servicio => form.id_servicios.includes(String(idServicio(servicio))));
  const totalEstimado = serviciosSeleccionados.reduce((acc, servicio) => acc + precioServicio(servicio), 0);
  const duracionTotal = serviciosSeleccionados.reduce((acc, servicio) => acc + duracionServicio(servicio), 0);

  return (
    <div className="cliente-page">
      <div className="card cliente-form-card">
        <h3>Reservar cita</h3>
        <p className="cliente-muted">Selecciona servicio, fecha y un barbero especifico o cualquier barbero disponible.</p>

        {mensaje && <div className={`cliente-alert ${mensaje.includes('correctamente') ? 'success' : 'error'}`}>{mensaje}</div>}

        <div className="form-group">
          <label>Servicios</label>
          <div className="cliente-services-grid">
            {servicios.map(servicio => {
              const id = String(idServicio(servicio));
              const activo = form.id_servicios.includes(id);
              return (
                <button key={id} type="button" className={`cliente-service-option ${activo ? 'active' : ''}`} onClick={() => toggleServicio(id)}>
                  <strong>{servicio.nombre || servicio.servicio}</strong>
                  <span>{duracionServicio(servicio)} min · Bs. {precioServicio(servicio).toFixed(2)}</span>
                </button>
              );
            })}
          </div>
          <div className="cliente-selection-summary">
            {form.id_servicios.length} servicio(s) · {duracionTotal} min · Total estimado Bs. {totalEstimado.toFixed(2)}
          </div>
        </div>

        <div className="form-row">
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
          ) : form.id_servicios.length === 0 || !form.fecha ? (
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
