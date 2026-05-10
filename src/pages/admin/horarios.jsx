import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';

const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
const HORARIOS_LABORALES_ENDPOINT = 'citas/horarios-laborales/';
const EMPTY_HORARIO = { codigo_barbero: '', dia_semana: 'Lunes', hora_inicio: '08:00', hora_fin: '18:00', estado: 'ACTIVO', observacion: '' };
const EMPTY_BLOQUEO = { codigo_barbero: '', fecha: '', hora_inicio: '08:00', hora_fin: '09:00', motivo: '' };

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
  if (Array.isArray(data?.horarios)) return data.horarios;
  if (Array.isArray(data?.bloqueos)) return data.bloqueos;
  return [];
}

function formatApiError(data) {
  if (!data) return 'Error al guardar';
  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;

  return Object.entries(data)
    .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join(' | ');
}

function valorCodigo(valor) {
  if (valor === undefined || valor === null) return '';
  if (typeof valor !== 'object') return valor;
  return valor.codigo || valor.codigo_usuario || valor.codigo_barbero || valor.id_usuario || valor.id || '';
}

function codigoBarbero(item) {
  return valorCodigo(item.codigo_barbero)
    || valorCodigo(item.barbero_codigo)
    || valorCodigo(item.codigo_usuario)
    || valorCodigo(item.codigo)
    || valorCodigo(item.barbero)
    || valorCodigo(item.usuario)
    || '';
}

function nombreBarbero(item, barberos) {
  const codigo = codigoBarbero(item);
  const barbero = barberos.find(b => codigoBarbero(b) === codigo);
  if (barbero) return `${barbero.nombre} ${barbero.apellido}`;
  return item.barbero_nombre || item.nombre_barbero || item.barbero?.nombre || codigo || '-';
}

function horarioId(item) {
  return item.id_horario || item.id;
}

function bloqueoId(item) {
  return item.id_bloqueo || item.id;
}

function horarioEstaActivo(horario) {
  const estado = String(horario?.estado || '').toUpperCase();
  if (estado) return estado === 'ACTIVO';

  return horario?.activo === true || horario?.activo === 'true' || horario?.activo === 1 || horario?.activo === undefined || horario?.activo === null;
}

function estadoHorario(horario) {
  return horarioEstaActivo(horario) ? 'ACTIVO' : 'INACTIVO';
}

// CU8: Gestionar horarios laborales.
// Define cuando trabaja cada barbero y registra bloqueos de agenda.
// Citas usa estos horarios desde el backend para calcular disponibilidad.
export default function Horarios() {
  const [tab, setTab] = useState('horarios');
  const [horarios, setHorarios] = useState([]);
  const [bloqueos, setBloqueos] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [filtroBarbero, setFiltroBarbero] = useState('');
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [horarioForm, setHorarioForm] = useState({ ...EMPTY_HORARIO });
  const [bloqueoForm, setBloqueoForm] = useState({ ...EMPTY_BLOQUEO });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // READ: carga horarios, bloqueos y barberos.
  const cargar = async () => {
    const [horariosRes, bloqueosRes, barberosRes] = await Promise.allSettled([
      api.get(HORARIOS_LABORALES_ENDPOINT),
      api.get('seguridad/bloqueos-horario/'),
      api.get('seguridad/barberos/'),
    ]);

    if (horariosRes.status === 'fulfilled') setHorarios(normalizarLista(horariosRes.value.data));
    if (bloqueosRes.status === 'fulfilled') setBloqueos(normalizarLista(bloqueosRes.value.data));
    if (barberosRes.status === 'fulfilled') setBarberos(normalizarLista(barberosRes.value.data));

    if ([horariosRes, bloqueosRes, barberosRes].some(res => res.status === 'rejected')) {
      showToast('No se pudieron cargar todos los datos de horarios', 'error');
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  // READ filtrado: trae horarios de un barbero especifico o todos.
  const cargarHorariosBarbero = async (codigo) => {
    setFiltroBarbero(codigo);

    try {
      if (!codigo) {
        const response = await api.get(HORARIOS_LABORALES_ENDPOINT);
        setHorarios(normalizarLista(response.data));
        return;
      }

      const response = await api.get(`seguridad/barberos/${codigo}/horarios/`);
      setHorarios(normalizarLista(response.data));
    } catch (e) {
      showToast(formatApiError(e.response?.data), 'error');
    }
  };

  const cerrar = () => {
    setModal(null);
    setEditId(null);
    setHorarioForm({ ...EMPTY_HORARIO });
    setBloqueoForm({ ...EMPTY_BLOQUEO });
  };

  // Abre modal para crear o editar un horario laboral.
  const abrirHorario = (horario = null) => {
    if (horario) {
      setHorarioForm({
        codigo_barbero: codigoBarbero(horario),
        dia_semana: horario.dia_semana || horario.dia || 'Lunes',
        hora_inicio: horario.hora_inicio || horario.inicio || '08:00',
        hora_fin: horario.hora_fin || horario.fin || '18:00',
        estado: estadoHorario(horario),
        observacion: horario.observacion || '',
      });
      setEditId(horarioId(horario));
      setModal('editarHorario');
      return;
    }

    setHorarioForm({ ...EMPTY_HORARIO });
    setModal('crearHorario');
  };

  // Abre modal para crear o editar un bloqueo de agenda.
  const abrirBloqueo = (bloqueo = null) => {
    if (bloqueo) {
      setBloqueoForm({
        codigo_barbero: codigoBarbero(bloqueo),
        fecha: bloqueo.fecha || '',
        hora_inicio: bloqueo.hora_inicio || bloqueo.inicio || '08:00',
        hora_fin: bloqueo.hora_fin || bloqueo.fin || '09:00',
        motivo: bloqueo.motivo || bloqueo.descripcion || '',
      });
      setEditId(bloqueoId(bloqueo));
      setModal('editarBloqueo');
      return;
    }

    setBloqueoForm({ ...EMPTY_BLOQUEO });
    setModal('crearBloqueo');
  };

  // CREATE/UPDATE horario: envia estado ACTIVO/INACTIVO como espera backend.
  const guardarHorario = async () => {
    setLoading(true);

    const payload = {
      codigo_barbero: horarioForm.codigo_barbero,
      dia_semana: horarioForm.dia_semana,
      hora_inicio: horarioForm.hora_inicio,
      hora_fin: horarioForm.hora_fin,
      estado: horarioForm.estado,
      observacion: horarioForm.observacion || '',
    };

    try {
      if (modal === 'crearHorario') {
        await api.post(HORARIOS_LABORALES_ENDPOINT, payload);
        showToast('Horario laboral registrado');
      } else {
        await api.put(`${HORARIOS_LABORALES_ENDPOINT}${editId}/`, payload);
        showToast('Horario laboral actualizado');
      }
      cerrar();
      cargarHorariosBarbero(filtroBarbero);
    } catch (e) {
      showToast(formatApiError(e.response?.data), 'error');
    } finally {
      setLoading(false);
    }
  };

  // CREATE/UPDATE bloqueo: registra rangos donde el barbero no atiende.
  const guardarBloqueo = async () => {
    setLoading(true);

    try {
      if (modal === 'crearBloqueo') {
        await api.post('seguridad/bloqueos-horario/', bloqueoForm);
        showToast('Bloqueo registrado');
      } else {
        await api.put(`seguridad/bloqueos-horario/${editId}/`, bloqueoForm);
        showToast('Bloqueo actualizado');
      }
      cerrar();
      cargar();
    } catch (e) {
      showToast(formatApiError(e.response?.data), 'error');
    } finally {
      setLoading(false);
    }
  };

  // DELETE horario: si backend hace baja logica, el frontend oculta INACTIVOS.
  const eliminarHorario = async (id) => {
    if (!confirm('Eliminar este horario laboral?')) return;

    try {
      await api.delete(`${HORARIOS_LABORALES_ENDPOINT}${id}/`);
      setHorarios(prev => prev.filter(h => horarioId(h) !== id));
      showToast('Horario eliminado');
      cargarHorariosBarbero(filtroBarbero);
    } catch (e) {
      showToast(formatApiError(e.response?.data), 'error');
    }
  };

  // DELETE bloqueo de horario.
  const eliminarBloqueo = async (id) => {
    if (!confirm('Eliminar este bloqueo de horario?')) return;

    try {
      await api.delete(`seguridad/bloqueos-horario/${id}/`);
      showToast('Bloqueo eliminado');
      cargar();
    } catch (e) {
      showToast(formatApiError(e.response?.data), 'error');
    }
  };

  const horariosFiltrados = useMemo(() => {
    const q = buscar.toLowerCase();
    return horarios
      .filter(horarioEstaActivo)
      .filter(h => [
        nombreBarbero(h, barberos),
        codigoBarbero(h),
        h.dia_semana,
        h.dia,
        h.hora_inicio,
        h.hora_fin,
        h.estado,
      ].some(v => String(v ?? '').toLowerCase().includes(q)));
  }, [barberos, buscar, horarios]);

  const bloqueosFiltrados = useMemo(() => {
    const q = buscar.toLowerCase();
    return bloqueos.filter(b => [
      nombreBarbero(b, barberos),
      codigoBarbero(b),
      b.fecha,
      b.motivo,
      b.descripcion,
      b.hora_inicio,
      b.hora_fin,
    ].some(v => String(v ?? '').toLowerCase().includes(q)));
  }, [barberos, bloqueos, buscar]);

  const totalHorariosActivos = useMemo(() => horarios.filter(horarioEstaActivo).length, [horarios]);

  return (
    <div>
      <div className="horarios-stats">
        <div className="stat-card">
          <div className="label">Horarios</div>
          <div className="value">{totalHorariosActivos}</div>
          <div className="sub">Turnos laborales</div>
        </div>
        <div className="stat-card">
          <div className="label">Bloqueos</div>
          <div className="value gold">{bloqueos.length}</div>
          <div className="sub">Ausencias o pausas</div>
        </div>
      </div>

      <div className="card">
        <div className="horarios-header">
          <div>
            <h3 className="horarios-title">Gestion de horarios laborales</h3>
            <p className="horarios-subtitle">Administra disponibilidad de barberos y bloqueos de agenda.</p>
          </div>
          <div className="horarios-actions">
            <button className="btn-outline" onClick={() => abrirBloqueo()}>+ Bloqueo</button>
            <button className="btn-gold" onClick={() => abrirHorario()}>+ Horario</button>
          </div>
        </div>

        <div className="horarios-tabs">
          <button className={tab === 'horarios' ? 'active' : ''} onClick={() => setTab('horarios')}>Horarios laborales</button>
          <button className={tab === 'bloqueos' ? 'active' : ''} onClick={() => setTab('bloqueos')}>Bloqueos</button>
        </div>

        <div className="horarios-toolbar">
          <div className="search-box horarios-search">
            <span className="icon">Buscar</span>
            <input placeholder="Buscar por barbero, dia o motivo..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          {tab === 'horarios' && (
            <select className="input-field horarios-filter" value={filtroBarbero} onChange={e => cargarHorariosBarbero(e.target.value)}>
              <option value="">Todos los barberos</option>
              {barberos.map(b => (
                <option key={codigoBarbero(b)} value={codigoBarbero(b)}>{b.nombre} {b.apellido}</option>
              ))}
            </select>
          )}
        </div>

        {tab === 'horarios' ? (
          <table className="tabla">
            <thead>
              <tr><th>Barbero</th><th>Dia</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {horariosFiltrados.length === 0 ? (
                <tr><td colSpan={6} className="horarios-empty">No se encontraron horarios.</td></tr>
              ) : horariosFiltrados.map(h => (
                <tr key={horarioId(h)}>
                  <td className="horarios-name">{nombreBarbero(h, barberos)}</td>
                  <td>{h.dia_semana || h.dia || '-'}</td>
                  <td>{h.hora_inicio || h.inicio || '-'}</td>
                  <td>{h.hora_fin || h.fin || '-'}</td>
                  <td><span className={`badge ${horarioEstaActivo(h) ? 'badge-green' : 'badge-red'}`}>{horarioEstaActivo(h) ? 'Activo' : 'Inactivo'}</span></td>
                  <td className="horarios-row-actions">
                    <button className="btn-outline" onClick={() => abrirHorario(h)}>Editar</button>
                    <button className="btn-outline horarios-delete" onClick={() => eliminarHorario(horarioId(h))}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="tabla">
            <thead>
              <tr><th>Barbero</th><th>Fecha</th><th>Inicio</th><th>Fin</th><th>Motivo</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {bloqueosFiltrados.length === 0 ? (
                <tr><td colSpan={6} className="horarios-empty">No se encontraron bloqueos.</td></tr>
              ) : bloqueosFiltrados.map(b => (
                <tr key={bloqueoId(b)}>
                  <td className="horarios-name">{nombreBarbero(b, barberos)}</td>
                  <td>{b.fecha || '-'}</td>
                  <td>{b.hora_inicio || b.inicio || '-'}</td>
                  <td>{b.hora_fin || b.fin || '-'}</td>
                  <td>{b.motivo || b.descripcion || '-'}</td>
                  <td className="horarios-row-actions">
                    <button className="btn-outline" onClick={() => abrirBloqueo(b)}>Editar</button>
                    <button className="btn-outline horarios-delete" onClick={() => eliminarBloqueo(bloqueoId(b))}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(modal === 'crearHorario' || modal === 'editarHorario') && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crearHorario' ? 'Nuevo horario laboral' : 'Editar horario laboral'}</h3>
            <p>Define el dia y rango de atencion del barbero.</p>

            <div className="form-group">
              <label>Barbero</label>
              <select className="input-field" value={horarioForm.codigo_barbero} onChange={e => setHorarioForm({ ...horarioForm, codigo_barbero: e.target.value })}>
                <option value="">Seleccionar barbero</option>
                {barberos.map(b => <option key={codigoBarbero(b)} value={codigoBarbero(b)}>{b.nombre} {b.apellido}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Dia laboral</label>
              <select className="input-field" value={horarioForm.dia_semana} onChange={e => setHorarioForm({ ...horarioForm, dia_semana: e.target.value })}>
                {DIAS.map(dia => <option key={dia} value={dia}>{dia}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select className="input-field" value={horarioForm.estado} onChange={e => setHorarioForm({ ...horarioForm, estado: e.target.value })}>
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Hora inicio</label>
                <input className="input-field" type="time" value={horarioForm.hora_inicio} onChange={e => setHorarioForm({ ...horarioForm, hora_inicio: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Hora fin</label>
                <input className="input-field" type="time" value={horarioForm.hora_fin} onChange={e => setHorarioForm({ ...horarioForm, hora_fin: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Observacion</label>
              <input className="input-field" placeholder="Opcional" value={horarioForm.observacion} onChange={e => setHorarioForm({ ...horarioForm, observacion: e.target.value })} />
            </div>
            <div className="horarios-modal-actions">
              <button className="btn-outline horarios-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-outline horarios-modal-button" onClick={() => setHorarioForm({ ...EMPTY_HORARIO })}>Limpiar</button>
              <button className="btn-gold horarios-modal-button" onClick={guardarHorario} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {(modal === 'crearBloqueo' || modal === 'editarBloqueo') && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crearBloqueo' ? 'Nuevo bloqueo de horario' : 'Editar bloqueo de horario'}</h3>
            <p>Bloquea un rango donde el barbero no estara disponible.</p>

            <div className="form-group">
              <label>Barbero</label>
              <select className="input-field" value={bloqueoForm.codigo_barbero} onChange={e => setBloqueoForm({ ...bloqueoForm, codigo_barbero: e.target.value })}>
                <option value="">Seleccionar barbero</option>
                {barberos.map(b => <option key={codigoBarbero(b)} value={codigoBarbero(b)}>{b.nombre} {b.apellido}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Fecha</label>
              <input className="input-field" type="date" value={bloqueoForm.fecha} onChange={e => setBloqueoForm({ ...bloqueoForm, fecha: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Hora inicio</label>
                <input className="input-field" type="time" value={bloqueoForm.hora_inicio} onChange={e => setBloqueoForm({ ...bloqueoForm, hora_inicio: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Hora fin</label>
                <input className="input-field" type="time" value={bloqueoForm.hora_fin} onChange={e => setBloqueoForm({ ...bloqueoForm, hora_fin: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Motivo</label>
              <input className="input-field" placeholder="Ej: Permiso, descanso, capacitacion..." value={bloqueoForm.motivo} onChange={e => setBloqueoForm({ ...bloqueoForm, motivo: e.target.value })} />
            </div>
            <div className="horarios-modal-actions">
              <button className="btn-outline horarios-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-outline horarios-modal-button" onClick={() => setBloqueoForm({ ...EMPTY_BLOQUEO })}>Limpiar</button>
              <button className="btn-gold horarios-modal-button" onClick={guardarBloqueo} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
