import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api/axiosConfig';

const ESTADOS = ['Pendiente', 'Confirmada', 'En atencion', 'Finalizada', 'Cancelada', 'Reprogramada', 'No asistio', 'Anulada'];
const METODOS_PAGO = ['Pendiente', 'QR', 'Efectivo', 'Tarjeta'];
const EMPTY = {
  id_cliente: '',
  id_servicio: '',
  id_barbero: '',
  fecha: fechaHoy(),
  hora_inicio: '',
  estado: 'Confirmada',
  metodo_pago_previsto: 'Pendiente',
  observacion: '',
};

function fechaHoy() {
  const fecha = new Date();
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
  return fecha.toISOString().slice(0, 10);
}

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
  if (Array.isArray(data?.usuarios)) return data.usuarios;
  if (Array.isArray(data?.clientes)) return data.clientes;
  if (Array.isArray(data?.barberos)) return data.barberos;
  if (Array.isArray(data?.servicios)) return data.servicios;
  if (Array.isArray(data?.citas)) return data.citas;
  if (Array.isArray(data?.horarios)) return data.horarios;
  return [];
}

function normalizarSlots(data) {
  const lista = Array.isArray(data)
    ? data
    : data?.disponibles || data?.horarios_disponibles || data?.slots || data?.horarios || data?.results || data?.data || [];

  return lista.map(item => {
    if (typeof item === 'string') return { hora_inicio: item, disponible: true };

    return {
      hora_inicio: item.hora_inicio || item.hora || item.inicio || item.start || '',
      hora_fin: item.hora_fin || item.fin || item.end || '',
      disponible: item.disponible !== false && item.ocupado !== true,
      motivo: item.motivo || item.descripcion || '',
    };
  }).filter(item => item.hora_inicio);
}

function formatApiError(data, fallback = 'Error al guardar') {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;
  if (data.mensaje) return data.mensaje;

  return Object.entries(data)
    .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join(' | ');
}

function formatDisponibilidadError(error) {
  if (error.code === 'ECONNABORTED') return 'La consulta de disponibilidad tardó demasiado. Revisa si el backend está respondiendo.';
  if (!error.response) return 'No se pudo consultar disponibilidad. Verifica que el backend esté corriendo.';
  return formatApiError(error.response.data, 'No se pudo consultar disponibilidad.');
}

function entidadId(item, prefijo) {
  return item?.[`id_${prefijo}`] || item?.id_usuario || item?.id || item?.codigo || '';
}

function citaClienteId(cita) {
  return valorCodigo(cita?.codigo_cliente)
    || valorCodigo(cita?.cliente_codigo)
    || valorCodigo(cita?.id_cliente)
    || valorCodigo(cita?.cliente_id)
    || valorCodigo(cita?.cliente)
    || '';
}

function citaBarberoId(cita) {
  return valorCodigo(cita?.codigo_barbero)
    || valorCodigo(cita?.barbero_codigo)
    || valorCodigo(cita?.id_barbero)
    || valorCodigo(cita?.barbero_id)
    || valorCodigo(cita?.barbero)
    || '';
}

function codigoCliente(cliente) {
  return cliente?.codigo_cliente || cliente?.codigo_usuario || cliente?.codigo || cliente?.usuario?.codigo || cliente?.id_cliente || cliente?.id_usuario || cliente?.id || '';
}

// Normaliza codigo/id cuando el backend devuelve relaciones como objeto.
// Evita comparar [object Object] y permite que agenda/disponibilidad coincidan.
function valorCodigo(valor) {
  if (valor === undefined || valor === null) return '';
  if (typeof valor !== 'object') return valor;
  return valor.codigo || valor.codigo_usuario || valor.codigo_barbero || valor.id_usuario || valor.id || '';
}

function codigoBarbero(barbero) {
  return valorCodigo(barbero?.codigo_barbero)
    || valorCodigo(barbero?.barbero_codigo)
    || valorCodigo(barbero?.codigo_usuario)
    || valorCodigo(barbero?.codigo)
    || valorCodigo(barbero?.barbero)
    || valorCodigo(barbero?.usuario)
    || valorCodigo(barbero?.user)
    || valorCodigo(barbero?.id_barbero)
    || valorCodigo(barbero?.id_usuario)
    || valorCodigo(barbero?.id)
    || '';
}

function coincideValor(valor, opciones) {
  return opciones.some(opcion => opcion !== undefined && opcion !== null && String(opcion) === String(valor));
}

function codigoBarberoSeleccionado(valorBarbero, barberos) {
  const barbero = barberoSeleccionado(valorBarbero, barberos);
  return codigoBarbero(barbero) || valorBarbero || '';
}

function citaServicioId(cita) {
  return valorCodigo(cita?.id_servicio)
    || valorCodigo(cita?.servicio_id)
    || valorCodigo(cita?.servicio)
    || '';
}

function nombrePersona(item) {
  return `${item?.nombre || ''} ${item?.apellido || ''}`.trim() || item?.correo || item?.codigo || '-';
}

function nombreCitaPersona(cita, campos, mapa, idFn) {
  const campoLista = Array.isArray(campos) ? campos : [campos];
  const entidad = campoLista.map(campo => cita?.[campo]).find(valor => valor && typeof valor === 'object');
  if (entidad) return nombrePersona(entidad);
  return nombrePersona(mapa.get(String(idFn(cita))));
}

function nombreCitaServicio(cita, mapa) {
  const servicio = cita?.id_servicio || cita?.servicio;
  if (servicio && typeof servicio === 'object') return nombreServicio(servicio);
  return nombreServicio(mapa.get(String(citaServicioId(cita))));
}

function fechaCita(cita) {
  return String(cita?.fecha || cita?.fecha_cita || cita?.fecha_reserva || cita?.inicio || cita?.fecha_inicio || '').slice(0, 10);
}

function horaInicioCita(cita) {
  return String(cita?.hora_inicio || cita?.inicio || cita?.hora || cita?.fecha_inicio || '').slice(0, 5);
}

function estadoCita(cita) {
  return cita?.estado || cita?.id_estadoc?.nombre || cita?.estado_cita || cita?.estado_nombre || 'Pendiente';
}

function normalizarComparable(valor) {
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function coincideBarberoCita(cita, barbero) {
  const codigoCita = String(citaBarberoId(cita));
  const codigoAgenda = String(codigoBarbero(barbero));
  if (codigoCita && codigoAgenda && codigoCita === codigoAgenda) return true;

  const nombreCita = normalizarComparable(nombrePersona(cita?.codigo_barbero || cita?.id_barbero || cita?.barbero));
  const nombreAgenda = normalizarComparable(nombrePersona(barbero));
  return Boolean(nombreCita && nombreAgenda && nombreCita === nombreAgenda);
}

function barberoSeleccionado(valorBarbero, barberos) {
  return barberos.find(item => coincideValor(valorBarbero, [
    codigoBarbero(item),
    entidadId(item, 'barbero'),
    item?.codigo_usuario,
    item?.codigo,
    item?.id_barbero,
    item?.id_usuario,
    item?.id,
  ]));
}

function nombreServicio(servicio) {
  return servicio?.nombre || servicio?.servicio || '-';
}

function duracionServicio(servicio) {
  const valor = servicio?.duracion ?? servicio?.duracion_minutos ?? servicio?.tiempo ?? 30;
  return Number(valor) || 30;
}

function sumarMinutos(hora, minutos) {
  if (!hora) return '';
  const [h, m] = hora.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const total = h * 60 + m + minutos;
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function horaCorta(hora) {
  return String(hora || '').slice(0, 5);
}

function estadoClase(estado) {
  const valor = String(estado || '').toLowerCase();
  if (valor.includes('confirmada') || valor.includes('finalizada')) return 'badge-green';
  if (valor.includes('pendiente') || valor.includes('reprogramada')) return 'badge-yellow';
  if (valor.includes('cancelada') || valor.includes('anulada') || valor.includes('no asistio')) return 'badge-red';
  if (valor.includes('atencion')) return 'badge-blue';
  return 'badge-gray';
}

function horasAgenda(citas, slots) {
  const base = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
  const horas = [
    ...base,
    ...citas.map(cita => horaInicioCita(cita)).filter(Boolean),
    ...slots.map(slot => horaCorta(slot.hora_inicio)).filter(Boolean),
  ];

  return [...new Set(horas)].sort();
}

// CU11: Gestionar citas.
// Une cliente + servicio + barbero + disponibilidad. El frontend consulta
// disponibilidad al backend y luego guarda la cita en /api/citas/citas/.
export default function Citas() {
  const [clientes, setClientes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [citas, setCitas] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState([]);
  const [fecha, setFecha] = useState(fechaHoy());
  const [filtroBarbero, setFiltroBarbero] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [loadingDisponibilidad, setLoadingDisponibilidad] = useState(false);
  const [disponibilidadEstado, setDisponibilidadEstado] = useState('idle');
  const [disponibilidadMsg, setDisponibilidadMsg] = useState('');
  const [disponibilidadDebug, setDisponibilidadDebug] = useState(null);
  const [toast, setToast] = useState(null);
  const disponibilidadReqId = useRef(0);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // READ inicial: carga clientes, servicios, barberos y citas existentes.
  const cargarBase = async () => {
    const [clientesRes, serviciosRes, barberosRes, citasRes] = await Promise.allSettled([
      api.get('usuario/usuarios/'),
      api.get('servicios/servicios/'),
      api.get('seguridad/barberos/'),
      api.get('citas/citas/'),
    ]);

    if (clientesRes.status === 'fulfilled') {
      setClientes(normalizarLista(clientesRes.value.data).filter(usuario => {
        const rol = String(usuario.rol || usuario.nombre_rol || usuario.id_rol?.nombre || '').toLowerCase();
        return !rol || rol.includes('cliente');
      }));
    }
    if (serviciosRes.status === 'fulfilled') setServicios(normalizarLista(serviciosRes.value.data));
    if (barberosRes.status === 'fulfilled') setBarberos(normalizarLista(barberosRes.value.data));
    if (citasRes.status === 'fulfilled') setCitas(normalizarLista(citasRes.value.data));

    if ([clientesRes, serviciosRes, barberosRes, citasRes].some(res => res.status === 'rejected')) {
      showToast('No se pudieron cargar todos los datos para citas', 'error');
    }
  };

  useEffect(() => { cargarBase(); }, []); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  // READ disponibilidad: pregunta al backend que horarios puede tomar el barbero.
  // reqId evita que respuestas antiguas pisen la seleccion actual del formulario.
  const consultarDisponibilidad = async (datos = form) => {
    if (!datos.id_servicio || !datos.id_barbero || !datos.fecha) {
      setDisponibilidad([]);
      setDisponibilidadEstado('idle');
      setDisponibilidadMsg('');
      setDisponibilidadDebug(null);
      return;
    }

    const reqId = ++disponibilidadReqId.current;

    setLoadingDisponibilidad(true);
    setDisponibilidadEstado('loading');
    setDisponibilidadMsg('');
    setDisponibilidadDebug(null);

    try {
      const codigoDelBarbero = codigoBarberoSeleccionado(datos.id_barbero, barberos);
      const response = await api.get('citas/disponibilidad/', {
        params: {
          codigo_barbero: codigoDelBarbero,
          id_servicio: datos.id_servicio,
          fecha: datos.fecha,
        },
        timeout: 15000,
      });

      if (reqId !== disponibilidadReqId.current) return;

      const slots = normalizarSlots(response.data);
      setDisponibilidad(slots);
      setDisponibilidadEstado('loaded');
      setDisponibilidadDebug({
        enviado: {
          codigo_barbero: codigoDelBarbero,
          id_servicio: datos.id_servicio,
          fecha: datos.fecha,
        },
        backend: response.data?.debug || null,
      });
      setDisponibilidadMsg(
        slots.length > 0
          ? ''
          : response.data?.mensaje || response.data?.detail || 'No hay horarios disponibles para ese barbero, servicio y fecha.'
      );
    } catch (e) {
      if (reqId !== disponibilidadReqId.current) return;

      const mensaje = formatDisponibilidadError(e);
      setDisponibilidad([]);
      setDisponibilidadEstado('error');
      setDisponibilidadDebug(e.response?.data?.debug || null);
      setDisponibilidadMsg(mensaje);
      showToast(mensaje, 'error');
    } finally {
      if (reqId === disponibilidadReqId.current) {
        setLoadingDisponibilidad(false);
      }
    }
  };

  // Actualiza campos del formulario y reconsulta disponibilidad si ya hay datos base.
  const actualizarForm = (patch) => {
    const next = { ...form, ...patch, hora_inicio: patch.id_servicio || patch.id_barbero || patch.fecha ? '' : form.hora_inicio };
    setForm(next);

    if (next.id_servicio && next.id_barbero && next.fecha) {
      consultarDisponibilidad(next);
    } else {
      setDisponibilidadDebug(null);
    }
  };

  // Abre modal de nueva cita y cancela consultas viejas.
  const abrirCrear = () => {
    disponibilidadReqId.current += 1;
    const next = { ...EMPTY, fecha };
    setForm(next);
    setDisponibilidad([]);
    setDisponibilidadEstado('idle');
    setDisponibilidadMsg('');
    setDisponibilidadDebug(null);
    setModal('crear');
  };

  const cerrar = () => {
    disponibilidadReqId.current += 1;
    setModal(null);
    setForm({ ...EMPTY, fecha });
    setDisponibilidad([]);
    setDisponibilidadEstado('idle');
    setDisponibilidadMsg('');
    setDisponibilidadDebug(null);
  };

  // Limpia formulario y estado de disponibilidad.
  const limpiarFormulario = () => {
    disponibilidadReqId.current += 1;
    setForm({ ...EMPTY, fecha });
    setDisponibilidad([]);
    setDisponibilidadEstado('idle');
    setDisponibilidadMsg('');
    setDisponibilidadDebug(null);
    setLoadingDisponibilidad(false);
  };

  const servicioSeleccionado = servicios.find(servicio => String(entidadId(servicio, 'servicio')) === String(form.id_servicio));
  const horaFin = form.hora_inicio ? sumarMinutos(form.hora_inicio, duracionServicio(servicioSeleccionado)) : '';

  // CREATE cita: envia codigo_cliente, codigo_barbero, id_servicio, fecha y hora_inicio.
  const guardar = async () => {
    if (!form.id_cliente) return showToast('Selecciona un cliente', 'error');
    if (!form.id_servicio) return showToast('Selecciona un servicio', 'error');
    if (!form.id_barbero) return showToast('Selecciona un barbero', 'error');
    if (!form.fecha) return showToast('Selecciona una fecha', 'error');
    if (!form.hora_inicio) {
      return showToast('Selecciona un horario disponible. Si no aparece ninguno, revisa la disponibilidad del backend.', 'error');
    }

    setLoading(true);
    const codigoDelBarbero = codigoBarberoSeleccionado(form.id_barbero, barberos);

    const payload = {
      codigo_cliente: form.id_cliente,
      id_servicio: form.id_servicio,
      codigo_barbero: codigoDelBarbero,
      fecha: form.fecha,
      hora_inicio: form.hora_inicio,
      estado: form.estado,
      metodo_pago_previsto: form.metodo_pago_previsto,
      observacion: form.observacion,
    };

    try {
      const response = await api.post('citas/citas/', payload);
      const nuevaCita = response.data?.cita || response.data;
      if (nuevaCita && typeof nuevaCita === 'object') setCitas(prev => [...prev, nuevaCita]);
      showToast('Cita registrada correctamente');
      cerrar();
      cargarBase();
    } catch (e) {
      showToast(formatApiError(e.response?.data), 'error');
    } finally {
      setLoading(false);
    }
  };

  const clientesMap = useMemo(() => new Map(clientes.flatMap(cliente => [
    [String(codigoCliente(cliente)), cliente],
    [String(entidadId(cliente, 'cliente')), cliente],
  ])), [clientes]);
  const serviciosMap = useMemo(() => new Map(servicios.flatMap(servicio => [
    [String(entidadId(servicio, 'servicio')), servicio],
    [String(servicio?.id_servicio || ''), servicio],
    [String(servicio?.id || ''), servicio],
  ])), [servicios]);
  const citasFiltradas = useMemo(() => citas.filter(cita => {
    const barberoFiltro = filtroBarbero ? barberos.find(b => String(codigoBarbero(b)) === String(filtroBarbero)) : null;
    const coincideFecha = fechaCita(cita) === fecha;
    const coincideBarbero = !filtroBarbero || coincideBarberoCita(cita, barberoFiltro);
    const coincideEstado = !filtroEstado || estadoCita(cita).toLowerCase() === filtroEstado.toLowerCase();
    return coincideFecha && coincideBarbero && coincideEstado;
  }), [barberos, citas, fecha, filtroBarbero, filtroEstado]);

  const barberosAgenda = useMemo(
    () => filtroBarbero ? barberos.filter(b => String(codigoBarbero(b)) === String(filtroBarbero)) : barberos,
    [barberos, filtroBarbero]
  );

  const horas = useMemo(() => horasAgenda(citasFiltradas, disponibilidad), [citasFiltradas, disponibilidad]);

  return (
    <div>
      <div className="citas-stats">
        <div className="stat-card">
          <div className="label">Citas del dia</div>
          <div className="value">{citasFiltradas.length}</div>
          <div className="sub">Segun filtros</div>
        </div>
        <div className="stat-card">
          <div className="label">Clientes</div>
          <div className="value gold">{clientes.length}</div>
          <div className="sub">Disponibles</div>
        </div>
        <div className="stat-card">
          <div className="label">Servicios</div>
          <div className="value">{servicios.length}</div>
          <div className="sub">Para reservar</div>
        </div>
        <div className="stat-card">
          <div className="label">Barberos</div>
          <div className="value">{barberos.length}</div>
          <div className="sub">Asignables</div>
        </div>
      </div>

      <div className="card">
        <div className="citas-header">
          <div>
            <h3 className="citas-title">Gestion de citas / Agenda</h3>
            <p className="citas-subtitle">Controla reservas, horarios disponibles y atencion diaria.</p>
          </div>
          <button className="btn-gold" onClick={abrirCrear}>+ Nueva cita</button>
        </div>

        <div className="citas-toolbar">
          <div className="form-group citas-filter">
            <label>Fecha</label>
            <input className="input-field" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
          <div className="form-group citas-filter">
            <label>Barbero</label>
            <select className="input-field" value={filtroBarbero} onChange={e => setFiltroBarbero(e.target.value)}>
              <option value="">Todos</option>
              {barberos.map(barbero => <option key={codigoBarbero(barbero)} value={codigoBarbero(barbero)}>{nombrePersona(barbero)}</option>)}
            </select>
          </div>
          <div className="form-group citas-filter">
            <label>Estado</label>
            <select className="input-field" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              {ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
            </select>
          </div>
        </div>

        <div className="citas-agenda-wrap">
          <table className="tabla citas-agenda">
            <thead>
              <tr>
                <th>Hora</th>
                {barberosAgenda.map(barbero => <th key={codigoBarbero(barbero)}>{nombrePersona(barbero)}</th>)}
              </tr>
            </thead>
            <tbody>
              {horas.map(hora => (
                <tr key={hora}>
                  <td className="citas-hour">{hora}</td>
                  {barberosAgenda.map(barbero => {
                    const cita = citasFiltradas.find(item =>
                      coincideBarberoCita(item, barbero) &&
                      horaInicioCita(item) === hora
                    );
                    const clienteNombre = cita ? nombreCitaPersona(cita, ['codigo_cliente', 'id_cliente', 'cliente'], clientesMap, citaClienteId) : '-';
                    const servicioNombre = cita ? nombreCitaServicio(cita, serviciosMap) : '-';
                    const estado = cita ? estadoCita(cita) : '';

                    return (
                      <td key={`${codigoBarbero(barbero)}-${hora}`}>
                        {cita ? (
                          <div className="citas-cell busy">
                            <strong>{clienteNombre}</strong>
                            <span>{servicioNombre}</span>
                            <em className={`badge ${estadoClase(estado)}`}>{estado}</em>
                          </div>
                        ) : (
                          <div className="citas-cell free">Libre</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'crear' && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box citas-modal" onClick={e => e.stopPropagation()}>
            <h3>Nueva cita</h3>
            <p>Selecciona cliente, servicio, barbero y un horario disponible.</p>

            <div className="form-row">
              <div className="form-group">
                <label>Cliente</label>
                <select className="input-field" value={form.id_cliente} onChange={e => actualizarForm({ id_cliente: e.target.value })}>
                  <option value="">Seleccionar cliente</option>
                  {clientes.map(cliente => <option key={codigoCliente(cliente)} value={codigoCliente(cliente)}>{nombrePersona(cliente)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Servicio</label>
                <select className="input-field" value={form.id_servicio} onChange={e => actualizarForm({ id_servicio: e.target.value })}>
                  <option value="">Seleccionar servicio</option>
                  {servicios.map(servicio => <option key={entidadId(servicio, 'servicio')} value={entidadId(servicio, 'servicio')}>{nombreServicio(servicio)} - {duracionServicio(servicio)} min</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Barbero</label>
                <select className="input-field" value={form.id_barbero} onChange={e => actualizarForm({ id_barbero: e.target.value })}>
                  <option value="">Seleccionar barbero</option>
                  {barberos.map(barbero => <option key={codigoBarbero(barbero)} value={codigoBarbero(barbero)}>{nombrePersona(barbero)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Fecha</label>
                <input className="input-field" type="date" value={form.fecha} onChange={e => actualizarForm({ fecha: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label>Horarios disponibles</label>
              <div className="citas-slots">
                {loadingDisponibilidad ? (
                  <span className="citas-slot-info">Consultando disponibilidad...</span>
                ) : !form.id_servicio || !form.id_barbero || !form.fecha ? (
                  <span className="citas-slot-info">Selecciona servicio, barbero y fecha para consultar disponibilidad.</span>
                ) : disponibilidad.length === 0 ? (
                  <>
                    <span className={`citas-slot-info ${disponibilidadEstado === 'error' ? 'error' : ''}`}>
                      {disponibilidadMsg || 'No hay horarios disponibles para la seleccion actual.'}
                    </span>
                    {disponibilidadDebug && (
                      <div className="citas-debug">
                        {disponibilidadDebug.enviado && (
                          <span>Enviado: barbero {disponibilidadDebug.enviado.codigo_barbero || '-'}, servicio {disponibilidadDebug.enviado.id_servicio || '-'}, fecha {disponibilidadDebug.enviado.fecha || '-'}</span>
                        )}
                        {disponibilidadDebug.backend?.dia_semana_calculado && (
                          <span>Dia calculado: {disponibilidadDebug.backend.dia_semana_calculado}</span>
                        )}
                        {Array.isArray(disponibilidadDebug.backend?.horarios_registrados) && (
                          <span>
                            Horarios registrados: {disponibilidadDebug.backend.horarios_registrados.length > 0
                              ? disponibilidadDebug.backend.horarios_registrados.map(h => `${h.dia_semana} ${h.hora_inicio}-${h.hora_fin} ${h.estado}`).join(' | ')
                              : 'ninguno para ese barbero'}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                ) : disponibilidad.map(slot => (
                  <button
                    key={slot.hora_inicio}
                    className={`citas-slot ${form.hora_inicio === slot.hora_inicio ? 'active' : ''}`}
                    type="button"
                    disabled={!slot.disponible}
                    onClick={() => setForm({ ...form, hora_inicio: slot.hora_inicio })}
                    title={slot.motivo}
                  >
                    {horaCorta(slot.hora_inicio)}
                  </button>
                ))}
              </div>
              {form.id_servicio && form.id_barbero && form.fecha && (
                <button className="btn-outline citas-refresh" type="button" onClick={() => consultarDisponibilidad()}>
                  Reconsultar disponibilidad
                </button>
              )}
              {form.hora_inicio && <div className="citas-time-summary">Hora fin calculada: {horaFin}</div>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Metodo de pago previsto</label>
                <select className="input-field" value={form.metodo_pago_previsto} onChange={e => setForm({ ...form, metodo_pago_previsto: e.target.value })}>
                  {METODOS_PAGO.map(metodo => <option key={metodo} value={metodo}>{metodo}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select className="input-field" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                  {ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Observacion</label>
              <textarea className="input-field citas-textarea" placeholder="Ej: Cliente pidio mid fade con barba perfilada" value={form.observacion} onChange={e => setForm({ ...form, observacion: e.target.value })} />
            </div>

            <div className="citas-modal-actions">
              <button className="btn-outline citas-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-outline citas-modal-button" onClick={limpiarFormulario}>Limpiar</button>
              <button className="btn-gold citas-modal-button" onClick={guardar} disabled={loading}>{loading ? 'Guardando...' : 'Guardar cita'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
