import { useEffect, useRef, useState } from 'react';
import api from '../../api/axiosConfig';
import { codigoBarbero, formatApiError, idServicio, nombrePersona, normalizarLista } from './clienteUtils';

const EMPTY = {
  id_servicio: '',
  codigo_barbero: '',
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
  return lista.map(item => (typeof item === 'string' ? item : item.hora_inicio || item.hora || item.inicio)).filter(Boolean);
}

// Reservar cita del cliente.
// El backend identifica al cliente por el token, por eso aqui no se envia codigo_cliente.
export default function ClienteReservar() {
  const [servicios, setServicios] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [form, setForm] = useState({ ...EMPTY, fecha: fechaHoy() });
  const [horarios, setHorarios] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const disponibilidadReqId = useRef(0);

  const cargarBase = async () => {
    const [serviciosRes, barberosRes] = await Promise.allSettled([
      api.get('servicios/servicios/'),
      api.get('usuario/barberos/'),
    ]);

    if (serviciosRes.status === 'fulfilled') setServicios(normalizarLista(serviciosRes.value.data, ['servicios']));
    if (barberosRes.status === 'fulfilled') setBarberos(normalizarLista(barberosRes.value.data, ['barberos']));
    if (serviciosRes.status === 'rejected' || barberosRes.status === 'rejected') {
      setMensaje('No se pudieron cargar servicios o barberos disponibles.');
    }
  };

  useEffect(() => { cargarBase(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const consultarDisponibilidad = async (nextForm = form) => {
    if (!nextForm.id_servicio || !nextForm.codigo_barbero || !nextForm.fecha) {
      setHorarios([]);
      return;
    }

    const reqId = ++disponibilidadReqId.current;
    setLoadingHorarios(true);
    setMensaje('');
    setHorarios([]);

    try {
      const response = await api.get('cliente/disponibilidad/', {
        params: {
          codigo_barbero: nextForm.codigo_barbero,
          id_servicio: nextForm.id_servicio,
          fecha: nextForm.fecha,
        },
        timeout: 15000,
      });

      if (reqId !== disponibilidadReqId.current) return;

      const slots = normalizarSlots(response.data);
      setHorarios(slots);
      setMensaje(slots.length ? '' : response.data?.mensaje || 'No hay horarios disponibles para esa seleccion.');
    } catch (e) {
      if (reqId !== disponibilidadReqId.current) return;
      setMensaje(formatApiError(e.response?.data, 'No se pudo consultar disponibilidad.'));
    } finally {
      if (reqId === disponibilidadReqId.current) setLoadingHorarios(false);
    }
  };

  const actualizar = (patch) => {
    const next = { ...form, ...patch, hora_inicio: patch.id_servicio || patch.codigo_barbero || patch.fecha ? '' : form.hora_inicio };
    setForm(next);
    consultarDisponibilidad(next);
  };

  const guardar = async () => {
    if (!form.id_servicio) return setMensaje('Selecciona un servicio.');
    if (!form.codigo_barbero) return setMensaje('Selecciona un barbero.');
    if (!form.fecha) return setMensaje('Selecciona una fecha.');
    if (!form.hora_inicio) return setMensaje('Selecciona un horario disponible.');

    setLoading(true);
    setMensaje('');

    try {
      await api.post('cliente/citas/', {
        id_servicio: form.id_servicio,
        codigo_barbero: form.codigo_barbero,
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
        metodo_pago_previsto: form.metodo_pago_previsto,
        observacion: form.observacion,
      });
      setMensaje('Cita reservada correctamente.');
      setForm({ ...EMPTY, fecha: fechaHoy() });
      setHorarios([]);
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
        <p className="cliente-muted">Selecciona servicio, barbero, fecha y un horario disponible.</p>

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
              <option value="">Seleccionar barbero</option>
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

        <div className="form-group">
          <label>Horarios disponibles</label>
          <div className="cliente-slots">
            {loadingHorarios ? (
              <span className="cliente-muted">Consultando disponibilidad...</span>
            ) : horarios.length ? horarios.map(hora => (
              <button key={hora} type="button" className={`cliente-slot ${form.hora_inicio === hora ? 'active' : ''}`} onClick={() => setForm({ ...form, hora_inicio: hora })}>
                {String(hora).slice(0, 5)}
              </button>
            )) : (
              <span className="cliente-muted">Selecciona servicio, barbero y fecha.</span>
            )}
          </div>
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
