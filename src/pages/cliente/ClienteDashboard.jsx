import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { barberoCita, estadoCita, fechaCita, formatApiError, horaCita, normalizarLista, servicioCita } from './clienteUtils';

// Dashboard del cliente.
// Consume cliente/dashboard/ para mostrar resumen personal y cliente/citas/ como respaldo.
export default function ClienteDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [citas, setCitas] = useState([]);
  const [error, setError] = useState('');

  const cargar = async () => {
    setError('');
    try {
      const [dashboardRes, citasRes] = await Promise.allSettled([
        api.get('cliente/dashboard/'),
        api.get('cliente/citas/'),
      ]);

      if (dashboardRes.status === 'fulfilled') setDashboard(dashboardRes.value.data);
      if (citasRes.status === 'fulfilled') setCitas(normalizarLista(citasRes.value.data, ['citas']));
      if (dashboardRes.status === 'rejected' && citasRes.status === 'rejected') {
        setError(formatApiError(citasRes.reason?.response?.data, 'No se pudo cargar tu inicio.'));
      }
    } catch (e) {
      setError(formatApiError(e.response?.data, 'No se pudo cargar tu inicio.'));
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const proximaCita = useMemo(() => {
    const lista = normalizarLista(dashboard?.proximas_citas || dashboard?.proximas || [], ['citas']);
    return lista[0] || citas.find(cita => new Date(`${fechaCita(cita)}T${horaCita(cita) || '00:00'}`) >= new Date());
  }, [citas, dashboard]);

  const ultimaCita = dashboard?.ultima_cita || dashboard?.ultima || citas[citas.length - 1];

  return (
    <div className="cliente-page">
      <div className="cliente-stats">
        <div className="stat-card">
          <div className="label">Proximas citas</div>
          <div className="value">{dashboard?.proximas_citas?.length ?? citas.filter(c => new Date(fechaCita(c)) >= new Date()).length}</div>
          <div className="sub">Reservas pendientes</div>
        </div>
        <div className="stat-card">
          <div className="label">Historial</div>
          <div className="value gold">{dashboard?.total_servicios ?? citas.length}</div>
          <div className="sub">Servicios registrados</div>
        </div>
        <div className="stat-card">
          <div className="label">Estado</div>
          <div className="value">{proximaCita ? estadoCita(proximaCita) : 'Libre'}</div>
          <div className="sub">Proxima atencion</div>
        </div>
      </div>

      {error && <div className="cliente-alert error">{error}</div>}

      <div className="cliente-grid">
        <div className="card cliente-feature">
          <h3>Proxima cita</h3>
          {proximaCita ? (
            <div className="cliente-appointment">
              <strong>{servicioCita(proximaCita)}</strong>
              <span>{barberoCita(proximaCita)}</span>
              <span>{fechaCita(proximaCita)} - {horaCita(proximaCita)}</span>
              <em className={`badge ${estadoCita(proximaCita).toLowerCase().includes('confirm') ? 'badge-green' : 'badge-yellow'}`}>{estadoCita(proximaCita)}</em>
            </div>
          ) : (
            <p className="cliente-muted">No tienes citas proximas. Puedes reservar una nueva atencion.</p>
          )}
        </div>

        <div className="card cliente-feature">
          <h3>Ultimo servicio</h3>
          {ultimaCita ? (
            <div className="cliente-appointment compact">
              <strong>{servicioCita(ultimaCita)}</strong>
              <span>{barberoCita(ultimaCita)} - {fechaCita(ultimaCita)}</span>
            </div>
          ) : (
            <p className="cliente-muted">Aun no hay historial de servicios.</p>
          )}
        </div>
      </div>

      <div className="card cliente-feature">
        <h3>Avisos</h3>
        <div className="cliente-offer-row">
          <span>Reserva con anticipacion para asegurar tu horario favorito.</span>
          <span className="badge badge-blue">Cliente</span>
        </div>
      </div>
    </div>
  );
}
