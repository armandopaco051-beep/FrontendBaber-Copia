import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';
import { activarNotificacionesPush, desactivarNotificacionesPush, obtenerSuscripcionActual, pushSoportado } from '../../utils/pushNotifications';

const TIPOS = ['PROMOCION', 'NUEVO_BARBERO', 'CITA', 'RECORDATORIO_CITA', 'INVENTARIO', 'SISTEMA'];
const ROLES = ['', 'cliente', 'administrador', 'barbero'];

const EMPTY = {
  tipo: 'SISTEMA',
  titulo: '',
  mensaje: '',
  rol_destino: 'cliente',
  usuario_destino: '',
  enviar_push: true,
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
  if (Array.isArray(data?.notificaciones)) return data.notificaciones;
  return [];
}

function idNotificacion(item) {
  return item?.id_notificacion || item?.id || '';
}

function fechaCorta(valor) {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function estadoClase(estado) {
  if (estado === 'ENVIADA') return 'badge-green';
  if (estado === 'FALLIDA') return 'badge-red';
  return 'badge-yellow';
}

export default function Notificaciones() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [filtros, setFiltros] = useState({ tipo: '', estado_envio: '' });
  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [pushActivo, setPushActivo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const cargar = async () => {
    try {
      const params = {};
      if (filtros.tipo) params.tipo = filtros.tipo;
      if (filtros.estado_envio) params.estado_envio = filtros.estado_envio;
      const response = await api.get('notificaciones/notificaciones/', { params });
      setNotificaciones(normalizarLista(response.data));
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudieron cargar las notificaciones.'), 'error');
    }
  };

  useEffect(() => { cargar(); }, [filtros.tipo, filtros.estado_envio]); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => {
    obtenerSuscripcionActual().then(Boolean).then(setPushActivo).catch(() => setPushActivo(false));
  }, []);

  const cerrar = () => {
    setModal(null);
    setForm({ ...EMPTY });
  };

  const guardar = async () => {
    if (!form.titulo.trim()) return showToast('El titulo es obligatorio.', 'error');
    if (!form.mensaje.trim()) return showToast('El mensaje es obligatorio.', 'error');
    if (!form.rol_destino && !form.usuario_destino.trim()) return showToast('Selecciona rol destino o usuario destino.', 'error');

    const payload = {
      tipo: form.tipo,
      titulo: form.titulo,
      mensaje: form.mensaje,
      enviar_push: form.enviar_push,
    };
    if (form.usuario_destino.trim()) payload.usuario_destino = form.usuario_destino.trim();
    else payload.rol_destino = form.rol_destino;

    setLoading(true);
    try {
      const response = await api.post('notificaciones/notificaciones/', payload);
      showToast(response.data?.mensaje || 'Notificacion creada correctamente.');
      cerrar();
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo crear la notificacion.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const reenviar = async (item) => {
    setLoading(true);
    try {
      const response = await api.post(`notificaciones/notificaciones/${idNotificacion(item)}/reenviar/`);
      showToast(response.data?.mensaje || 'Reenvio procesado.');
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo reenviar la notificacion.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const togglePush = async () => {
    setLoading(true);
    try {
      if (pushActivo) {
        await desactivarNotificacionesPush();
        setPushActivo(false);
        showToast('Suscripcion push desactivada.');
      } else {
        await activarNotificacionesPush();
        setPushActivo(true);
        showToast('Suscripcion push activada.');
      }
    } catch (error) {
      showToast(error.message || 'No se pudo actualizar la suscripcion push.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtradas = useMemo(() => {
    const q = buscar.toLowerCase();
    return notificaciones.filter(item => [
      item.tipo,
      item.titulo,
      item.mensaje,
      item.usuario_destino,
      item.usuario_destino_nombre,
      item.rol_destino,
      item.estado_envio,
    ].some(valor => String(valor || '').toLowerCase().includes(q)));
  }, [buscar, notificaciones]);

  return (
    <div>
      <div className="notificaciones-stats">
        <div className="stat-card">
          <div className="label">Notificaciones</div>
          <div className="value">{notificaciones.length}</div>
          <div className="sub">Segun filtros activos</div>
        </div>
        <div className="stat-card">
          <div className="label">Enviadas</div>
          <div className="value gold">{notificaciones.filter(item => item.estado_envio === 'ENVIADA').length}</div>
          <div className="sub">Con push procesado</div>
        </div>
        <div className="stat-card">
          <div className="label">Push navegador</div>
          <div className="value">{pushActivo ? 'Activo' : 'Inactivo'}</div>
          <div className="sub">Suscripcion de este dispositivo</div>
        </div>
      </div>

      <div className="card">
        <div className="notificaciones-header">
          <div>
            <h3 className="notificaciones-title">Gestion de notificaciones</h3>
            <p className="notificaciones-subtitle">Crea alertas manuales, consulta envios y reenvia notificaciones push.</p>
          </div>
          <div className="notificaciones-actions">
            <button className="btn-outline" onClick={togglePush} disabled={loading || !pushSoportado()}>
              {pushActivo ? 'Desactivar push' : 'Activar push'}
            </button>
            <button className="btn-gold" onClick={() => setModal('crear')}>Nueva notificacion</button>
          </div>
        </div>

        <div className="notificaciones-filter-grid">
          <div className="search-box notificaciones-search">
            <span className="icon">Buscar</span>
            <input placeholder="Buscar por titulo, mensaje, tipo o destino..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          <select className="input-field" value={filtros.tipo} onChange={e => setFiltros({ ...filtros, tipo: e.target.value })}>
            <option value="">Todos los tipos</option>
            {TIPOS.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
          </select>
          <select className="input-field" value={filtros.estado_envio} onChange={e => setFiltros({ ...filtros, estado_envio: e.target.value })}>
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="ENVIADA">Enviada</option>
            <option value="PARCIAL">Parcial</option>
            <option value="FALLIDA">Fallida</option>
          </select>
        </div>

        <table className="tabla">
          <thead>
            <tr><th>Notificacion</th><th>Destino</th><th>Estado</th><th>Envios</th><th>Fechas</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr><td colSpan={6} className="notificaciones-empty">No se encontraron notificaciones.</td></tr>
            ) : filtradas.map(item => (
              <tr key={idNotificacion(item)}>
                <td>
                  <div className="notificaciones-name">{item.titulo}</div>
                  <div className="notificaciones-muted">{item.tipo} - {item.mensaje}</div>
                </td>
                <td>{item.usuario_destino_nombre || item.usuario_destino || item.rol_destino || '-'}</td>
                <td><span className={`badge ${estadoClase(item.estado_envio)}`}>{item.estado_envio}</span></td>
                <td>{item.enviados || 0} enviados / {item.fallidos || 0} fallidos</td>
                <td>
                  <div>Registro: {fechaCorta(item.fecha_registro)}</div>
                  <div className="notificaciones-muted">Envio: {fechaCorta(item.fecha_envio)}</div>
                </td>
                <td className="notificaciones-row-actions">
                  <button className="btn-outline" onClick={() => reenviar(item)} disabled={loading}>Reenviar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === 'crear' && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box notificaciones-modal" onClick={e => e.stopPropagation()}>
            <h3>Nueva notificacion</h3>
            <p>Envia una alerta manual a un rol o usuario especifico.</p>

            <div className="form-row">
              <div className="form-group">
                <label>Tipo</label>
                <select className="input-field" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  {TIPOS.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Rol destino</label>
                <select className="input-field" value={form.rol_destino} onChange={e => setForm({ ...form, rol_destino: e.target.value, usuario_destino: '' })}>
                  {ROLES.map(rol => <option key={rol || 'none'} value={rol}>{rol || 'Usuario especifico'}</option>)}
                </select>
              </div>
            </div>

            {!form.rol_destino && (
              <div className="form-group">
                <label>Usuario destino</label>
                <input className="input-field" value={form.usuario_destino} onChange={e => setForm({ ...form, usuario_destino: e.target.value })} placeholder="CLIE001" />
              </div>
            )}

            <div className="form-group">
              <label>Titulo</label>
              <input className="input-field" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Nueva promocion disponible" />
            </div>
            <div className="form-group">
              <label>Mensaje</label>
              <textarea className="input-field notificaciones-textarea" value={form.mensaje} onChange={e => setForm({ ...form, mensaje: e.target.value })} placeholder="Corte + barba con descuento esta semana." />
            </div>
            <label className="notificaciones-checkbox">
              <input type="checkbox" checked={form.enviar_push} onChange={e => setForm({ ...form, enviar_push: e.target.checked })} />
              <span>Enviar push a dispositivos suscritos</span>
            </label>

            <div className="notificaciones-modal-actions">
              <button className="btn-outline notificaciones-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-gold notificaciones-modal-button" onClick={guardar} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
