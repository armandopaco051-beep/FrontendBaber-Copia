import { useEffect, useState } from 'react';
import api from '../../api/axiosConfig';
import { codigoBarbero, formatApiError, idServicio, nombrePersona, normalizarLista } from '../cliente/clienteUtils';

const EMPTY = {
  id_servicio: '',
  codigo_barbero: 'TODOS',
  fecha: fechaHoy(),
};

function fechaHoy() {
  const fecha = new Date();
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
  return fecha.toISOString().slice(0, 10);
}

function normalizarSlots(data) {
  const lista = Array.isArray(data) ? data : data?.disponibles || [];
  return lista.map(item => (typeof item === 'string' ? item : item?.hora_inicio || item?.hora)).filter(Boolean);
}

function normalizarGrupos(data) {
  const grupos = Array.isArray(data?.barberos) ? data.barberos : [];
  return grupos.map(grupo => ({
    codigo_barbero: grupo?.codigo_barbero || '',
    barbero: grupo?.barbero || '-',
    disponibles: normalizarSlots(grupo),
  })).filter(grupo => grupo.disponibles.length > 0);
}

export default function DisponibilidadAdmin() {
  const [servicios, setServicios] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [horarios, setHorarios] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [consultado, setConsultado] = useState(false);

  const cargarBase = async () => {
    const [serviciosRes, barberosRes] = await Promise.allSettled([
      api.get('servicios/servicios/', { params: { estado: 'ACTIVO' } }),
      api.get('usuario/barberos/'),
    ]);

    if (serviciosRes.status === 'fulfilled') setServicios(normalizarLista(serviciosRes.value.data, ['servicios']));
    if (barberosRes.status === 'fulfilled') setBarberos(normalizarLista(barberosRes.value.data, ['barberos']));
    if (serviciosRes.status === 'rejected' || barberosRes.status === 'rejected') {
      setMensaje('No se pudieron cargar servicios o barberos.');
    }
  };

  useEffect(() => { cargarBase(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const actualizar = (patch) => {
    setForm(prev => ({ ...prev, ...patch }));
    setConsultado(false);
    setMensaje('');
    setHorarios([]);
    setGrupos([]);
  };

  const consultar = async () => {
    if (!form.id_servicio || !form.fecha) {
      setMensaje('Selecciona servicio y fecha para consultar.');
      setHorarios([]);
      setGrupos([]);
      return;
    }

    setLoading(true);
    setConsultado(true);
    setMensaje('');
    setHorarios([]);
    setGrupos([]);

    try {
      const esTodos = !form.codigo_barbero || form.codigo_barbero === 'TODOS';
      const response = await api.get('citas/disponibilidad/', {
        params: {
          id_servicio: form.id_servicio,
          fecha: form.fecha,
          codigo_barbero: esTodos ? 'TODOS' : form.codigo_barbero,
        },
      });

      if (esTodos) {
        const gruposDisponibles = normalizarGrupos(response.data);
        setGrupos(gruposDisponibles);
        setMensaje(gruposDisponibles.length ? '' : response.data?.mensaje || 'No hay horarios disponibles.');
      } else {
        const slots = normalizarSlots(response.data);
        setHorarios(slots);
        setMensaje(slots.length ? '' : response.data?.mensaje || 'No hay horarios disponibles.');
      }
    } catch (error) {
      setMensaje(formatApiError(error.response?.data, 'No se pudo consultar disponibilidad.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cliente-page">
      <div className="card cliente-form-card">
        <h3>Consultar disponibilidad</h3>
        <p className="cliente-muted">Vista administrativa rapida para validar horarios libres por servicio, fecha y barbero.</p>

        {mensaje && <div className={`cliente-alert ${horarios.length || grupos.length ? 'success' : 'error'}`}>{mensaje}</div>}

        <div className="form-row">
          <div className="form-group">
            <label>Servicio</label>
            <select className="input-field" value={form.id_servicio} onChange={e => actualizar({ id_servicio: e.target.value })}>
              <option value="">Seleccionar servicio</option>
              {servicios.map(servicio => (
                <option key={idServicio(servicio)} value={idServicio(servicio)}>
                  {servicio.nombre} - {servicio.duracion_minutos || 0} min
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Barbero</label>
            <select className="input-field" value={form.codigo_barbero} onChange={e => actualizar({ codigo_barbero: e.target.value })}>
              <option value="TODOS">Cualquier barbero disponible</option>
              {barberos.map(barbero => (
                <option key={codigoBarbero(barbero)} value={codigoBarbero(barbero)}>
                  {nombrePersona(barbero)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Fecha</label>
            <input className="input-field" type="date" value={form.fecha} onChange={e => actualizar({ fecha: e.target.value })} />
          </div>
          <div className="form-group disponibilidad-admin-actions">
            <button className="btn-gold" type="button" onClick={consultar} disabled={loading}>
              {loading ? 'Consultando...' : 'Consultar disponibilidad'}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Resultado</label>
          {loading ? (
            <span className="cliente-muted">Consultando disponibilidad...</span>
          ) : !consultado ? (
            <span className="cliente-muted">Selecciona los filtros y consulta para ver horarios libres.</span>
          ) : form.codigo_barbero === 'TODOS' ? (
            grupos.length > 0 ? (
              <div className="disponibilidad-admin-groups">
                {grupos.map(grupo => (
                  <div key={grupo.codigo_barbero} className="disponibilidad-admin-group">
                    <strong>{grupo.barbero}</strong>
                    <div className="disponibilidad-admin-slots">
                      {grupo.disponibles.map(hora => <span key={`${grupo.codigo_barbero}-${hora}`} className="cliente-slot active">{String(hora).slice(0, 5)}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="cliente-muted">Consulta para ver horarios agrupados por barbero.</span>
            )
          ) : horarios.length > 0 ? (
            <div className="cliente-slots">
              {horarios.map(hora => <span key={hora} className="cliente-slot active">{String(hora).slice(0, 5)}</span>)}
            </div>
          ) : (
            <span className="cliente-muted">Consulta para ver horarios libres del barbero seleccionado.</span>
          )}
        </div>
      </div>
    </div>
  );
}
