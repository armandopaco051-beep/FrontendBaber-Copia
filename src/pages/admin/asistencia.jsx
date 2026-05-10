import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';

const ESTADOS = ['Presente', 'Tarde', 'Ausente', 'Permiso', 'Inhabilitado'];

function fechaHoy() {
  const fecha = new Date();
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
  return fecha.toISOString().slice(0, 10);
}

const EMPTY = {
  codigo_barbero: '',
  fecha: fechaHoy(),
  estado: 'Presente',
  hora_entrada: '',
  hora_salida: '',
  observacion: '',
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
  if (Array.isArray(data?.asistencias)) return data.asistencias;
  if (Array.isArray(data?.barberos)) return data.barberos;
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

function asistenciaId(asistencia) {
  return asistencia?.id_asistencia || asistencia?.id;
}

function codigoBarbero(item) {
  return item?.codigo_barbero || item?.barbero_codigo || item?.codigo || item?.barbero?.codigo || item?.usuario?.codigo || '';
}

function fechaAsistencia(asistencia) {
  const valor = asistencia?.fecha || asistencia?.fecha_asistencia || asistencia?.created_at || '';
  return String(valor).slice(0, 10);
}

function estadoAsistencia(asistencia) {
  return asistencia?.estado || asistencia?.estado_asistencia || 'Pendiente';
}

function horaEntrada(asistencia) {
  return asistencia?.hora_entrada || asistencia?.entrada || '-';
}

function horaSalida(asistencia) {
  return asistencia?.hora_salida || asistencia?.salida || '-';
}

function observacion(asistencia) {
  return asistencia?.observacion || asistencia?.observaciones || asistencia?.descripcion || '-';
}

function estadoClase(estado) {
  const limpio = String(estado || '').toLowerCase();
  if (limpio === 'presente') return 'badge-green';
  if (limpio === 'tarde') return 'badge-yellow';
  if (limpio === 'ausente' || limpio === 'inhabilitado') return 'badge-red';
  if (limpio === 'permiso') return 'badge-blue';
  return 'badge-gray';
}

function nombreBarbero(barbero) {
  return `${barbero.nombre || ''} ${barbero.apellido || ''}`.trim() || barbero.codigo || '-';
}

// CU9: Gestionar asistencia.
// Lista barberos, muestra su asistencia por fecha y permite registrar estado,
// hora de entrada/salida y observacion. Esto afecta la disponibilidad de citas.
export default function Asistencia() {
  const [barberos, setBarberos] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [fecha, setFecha] = useState(fechaHoy());
  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // READ: carga barberos y asistencias para la fecha seleccionada.
  const cargar = async () => {
    const [barberosRes, asistenciasRes] = await Promise.allSettled([
      api.get('seguridad/barberos/'),
      api.get('seguridad/asistencias/'),
    ]);

    if (barberosRes.status === 'fulfilled') setBarberos(normalizarLista(barberosRes.value.data));
    if (asistenciasRes.status === 'fulfilled') setAsistencias(normalizarLista(asistenciasRes.value.data));

    if (barberosRes.status === 'rejected' || asistenciasRes.status === 'rejected') {
      showToast('No se pudieron cargar todos los datos de asistencia', 'error');
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const asistenciasDelDia = useMemo(
    () => asistencias.filter(asistencia => fechaAsistencia(asistencia) === fecha),
    [asistencias, fecha]
  );

  const filas = useMemo(() => {
    const q = buscar.toLowerCase();

    return barberos
      .map(barbero => ({
        barbero,
        asistencia: asistenciasDelDia.find(item => codigoBarbero(item) === barbero.codigo),
      }))
      .filter(({ barbero, asistencia }) => [
        barbero.codigo,
        nombreBarbero(barbero),
        barbero.telefono,
        barbero.especialidad,
        estadoAsistencia(asistencia),
      ].some(valor => String(valor ?? '').toLowerCase().includes(q)));
  }, [asistenciasDelDia, barberos, buscar]);

  const resumen = useMemo(() => ({
    total: barberos.length,
    registrados: asistenciasDelDia.length,
    pendientes: Math.max(barberos.length - asistenciasDelDia.length, 0),
    ausentes: asistenciasDelDia.filter(a => ['ausente', 'inhabilitado'].includes(String(estadoAsistencia(a)).toLowerCase())).length,
  }), [asistenciasDelDia, barberos.length]);

  const cerrar = () => {
    setModal(null);
    setEditId(null);
    setForm({ ...EMPTY, fecha });
  };

  // Abre el formulario para crear o editar la asistencia de un barbero.
  const abrirRegistro = (barbero, asistencia = null) => {
    if (asistencia) {
      setEditId(asistenciaId(asistencia));
      setForm({
        codigo_barbero: codigoBarbero(asistencia) || barbero.codigo,
        fecha: fechaAsistencia(asistencia) || fecha,
        estado: estadoAsistencia(asistencia),
        hora_entrada: asistencia.hora_entrada || asistencia.entrada || '',
        hora_salida: asistencia.hora_salida || asistencia.salida || '',
        observacion: asistencia.observacion || asistencia.observaciones || asistencia.descripcion || '',
      });
      setModal('editar');
      return;
    }

    setEditId(null);
    setForm({ ...EMPTY, codigo_barbero: barbero.codigo, fecha });
    setModal('crear');
  };

  // CREATE/UPDATE: guarda asistencia con POST o PUT segun exista registro.
  const guardar = async () => {
    if (!form.codigo_barbero) return showToast('Selecciona un barbero', 'error');
    if (!form.fecha) return showToast('Selecciona una fecha', 'error');
    if (!form.estado) return showToast('Selecciona un estado de asistencia', 'error');

    setLoading(true);

    const payload = {
      codigo_barbero: form.codigo_barbero,
      fecha: form.fecha,
      estado: form.estado,
      hora_entrada: form.hora_entrada || null,
      hora_salida: form.hora_salida || null,
      observacion: form.observacion || '',
    };

    try {
      if (modal === 'crear') {
        await api.post('seguridad/asistencias/', payload);
      } else {
        await api.put(`seguridad/asistencias/${editId}/`, payload);
      }

      showToast('Asistencia registrada correctamente');
      cerrar();
      cargar();
    } catch (e) {
      showToast(formatApiError(e.response?.data), 'error');
    } finally {
      setLoading(false);
    }
  };

  // DELETE: elimina un registro de asistencia.
  const eliminar = async (id) => {
    if (!confirm('Eliminar este registro de asistencia?')) return;

    try {
      await api.delete(`seguridad/asistencias/${id}/`);
      showToast('Asistencia eliminada');
      cargar();
    } catch (e) {
      showToast(formatApiError(e.response?.data), 'error');
    }
  };

  return (
    <div>
      <div className="asistencia-stats">
        <div className="stat-card">
          <div className="label">Barberos</div>
          <div className="value">{resumen.total}</div>
          <div className="sub">Registrados</div>
        </div>
        <div className="stat-card">
          <div className="label">Asistencias</div>
          <div className="value gold">{resumen.registrados}</div>
          <div className="sub">En la fecha seleccionada</div>
        </div>
        <div className="stat-card">
          <div className="label">Pendientes</div>
          <div className="value">{resumen.pendientes}</div>
          <div className="sub">Sin registro</div>
        </div>
        <div className="stat-card">
          <div className="label">No disponibles</div>
          <div className="value">{resumen.ausentes}</div>
          <div className="sub">Ausente o inhabilitado</div>
        </div>
      </div>

      <div className="card">
        <div className="asistencia-header">
          <div>
            <h3 className="asistencia-title">Gestion de asistencia</h3>
            <p className="asistencia-subtitle">Registra asistencia diaria y disponibilidad de barberos para citas.</p>
          </div>
          <button className="btn-outline" onClick={cargar}>Actualizar</button>
        </div>

        <div className="asistencia-toolbar">
          <div className="form-group asistencia-date">
            <label>Fecha</label>
            <input className="input-field" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
          <div className="search-box asistencia-search">
            <span className="icon">Buscar</span>
            <input placeholder="Buscar por barbero, estado o especialidad..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
        </div>

        <table className="tabla">
          <thead>
            <tr><th>Barbero</th><th>Especialidad</th><th>Estado</th><th>Entrada</th><th>Salida</th><th>Observacion</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr><td colSpan={7} className="asistencia-empty">No se encontraron barberos para registrar asistencia.</td></tr>
            ) : filas.map(({ barbero, asistencia }) => (
              <tr key={barbero.codigo}>
                <td>
                  <div className="asistencia-name">{nombreBarbero(barbero)}</div>
                  <div className="asistencia-code">{barbero.codigo}</div>
                </td>
                <td>{barbero.especialidad || 'Sin especialidad'}</td>
                <td><span className={`badge ${estadoClase(estadoAsistencia(asistencia))}`}>{estadoAsistencia(asistencia)}</span></td>
                <td>{horaEntrada(asistencia)}</td>
                <td>{horaSalida(asistencia)}</td>
                <td className="asistencia-muted">{observacion(asistencia)}</td>
                <td className="asistencia-actions">
                  <button className="btn-outline" onClick={() => abrirRegistro(barbero, asistencia)}>
                    {asistencia ? 'Editar' : 'Registrar'}
                  </button>
                  {asistencia && (
                    <button className="btn-outline asistencia-delete" onClick={() => eliminar(asistenciaId(asistencia))}>Eliminar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crear' ? 'Registrar asistencia' : 'Editar asistencia'}</h3>
            <p>Selecciona estado, horas y observacion si corresponde.</p>

            <div className="form-row">
              <div className="form-group">
                <label>Barbero</label>
                <select className="input-field" value={form.codigo_barbero} onChange={e => setForm({ ...form, codigo_barbero: e.target.value })}>
                  <option value="">Seleccionar barbero</option>
                  {barberos.map(b => <option key={b.codigo} value={b.codigo}>{nombreBarbero(b)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Fecha</label>
                <input className="input-field" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label>Estado de asistencia</label>
              <select className="input-field" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                {ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Hora entrada</label>
                <input className="input-field" type="time" value={form.hora_entrada} onChange={e => setForm({ ...form, hora_entrada: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Hora salida</label>
                <input className="input-field" type="time" value={form.hora_salida} onChange={e => setForm({ ...form, hora_salida: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label>Observacion</label>
              <textarea className="input-field asistencia-textarea" placeholder="Ej: Llego 15 minutos tarde..." value={form.observacion} onChange={e => setForm({ ...form, observacion: e.target.value })} />
            </div>

            <div className="asistencia-modal-actions">
              <button className="btn-outline asistencia-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-outline asistencia-modal-button" onClick={() => setForm({ ...EMPTY, fecha })}>Limpiar</button>
              <button className="btn-gold asistencia-modal-button" onClick={guardar} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
