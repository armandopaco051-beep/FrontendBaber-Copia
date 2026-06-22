import { useEffect, useMemo, useState } from 'react';
import api from '../api/axiosConfig';
import { formatApiError } from '../utils/apiError';
import { activarNotificacionesPush, desactivarNotificacionesPush, obtenerSuscripcionActual, pushSoportado } from '../utils/pushNotifications';

function normalizarLista(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.notificaciones)) return data.notificaciones;
  return [];
}

function fechaCorta(valor) {
  if (!valor) return '';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleString('es-BO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [filtro, setFiltro] = useState('false');
  const [pushActivo, setPushActivo] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    try {
      const params = {};
      if (filtro !== '') params.leida = filtro;
      const response = await api.get('notificaciones/mis-notificaciones/', { params });
      setNotificaciones(normalizarLista(response.data));
    } catch (error) {
      setMensaje(formatApiError(error.response?.data, 'No se pudieron cargar notificaciones.'));
    }
  };

  useEffect(() => { cargar(); }, [filtro]); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => {
    obtenerSuscripcionActual().then(Boolean).then(setPushActivo).catch(() => setPushActivo(false));
  }, []);

  const noLeidas = useMemo(() => notificaciones.filter(item => !item.leida).length, [notificaciones]);

  const marcarLeida = async (item) => {
    try {
      await api.post(`notificaciones/mis-notificaciones/${item.id_notificacion_usuario}/leer/`);
      setNotificaciones(prev => prev.map(n => (
        n.id_notificacion_usuario === item.id_notificacion_usuario ? { ...n, leida: true } : n
      )));
    } catch (error) {
      setMensaje(formatApiError(error.response?.data, 'No se pudo marcar como leida.'));
    }
  };

  const togglePush = async () => {
    setLoading(true);
    setMensaje('');
    try {
      if (pushActivo) {
        await desactivarNotificacionesPush();
        setPushActivo(false);
      } else {
        await activarNotificacionesPush();
        setPushActivo(true);
      }
    } catch (error) {
      setMensaje(error.message || 'No se pudo actualizar la suscripcion push.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notification-bell">
      <button className="notification-button" type="button" onClick={() => setOpen(prev => !prev)} title="Notificaciones">
        <span>NT</span>
        {noLeidas > 0 && <strong>{noLeidas}</strong>}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-head">
            <div>
              <h3>Notificaciones</h3>
              <p>Alertas y mensajes del sistema.</p>
            </div>
            <button className="btn-outline" type="button" onClick={cargar}>Actualizar</button>
          </div>

          <div className="notification-actions">
            <select className="input-field" value={filtro} onChange={e => setFiltro(e.target.value)}>
              <option value="false">No leidas</option>
              <option value="true">Leidas</option>
              <option value="">Todas</option>
            </select>
            <button className="btn-outline" type="button" onClick={togglePush} disabled={loading || !pushSoportado()}>
              {pushActivo ? 'Desactivar push' : 'Activar push'}
            </button>
          </div>

          {mensaje && <div className="notification-message">{mensaje}</div>}

          <div className="notification-list">
            {notificaciones.length === 0 ? (
              <div className="notification-empty">No hay notificaciones.</div>
            ) : notificaciones.map(item => {
              const n = item.notificacion || {};
              return (
                <div key={item.id_notificacion_usuario} className={`notification-item ${item.leida ? '' : 'unread'}`}>
                  <div>
                    <strong>{n.titulo || 'Notificacion'}</strong>
                    <p>{n.mensaje || ''}</p>
                    <span>{n.tipo || '-'} · {fechaCorta(n.fecha_registro || item.fecha_registro)}</span>
                  </div>
                  {!item.leida && <button className="btn-outline" type="button" onClick={() => marcarLeida(item)}>Leer</button>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
