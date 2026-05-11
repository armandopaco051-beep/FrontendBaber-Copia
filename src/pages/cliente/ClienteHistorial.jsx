import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { barberoCita, estadoCita, fechaCita, formatApiError, normalizarLista, servicioCita } from './clienteUtils';

// Historial del cliente.
// Usa cliente/citas/ y muestra citas finalizadas o pasadas como historial de servicios.
export default function ClienteHistorial() {
  const [citas, setCitas] = useState([]);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        const response = await api.get('cliente/citas/');
        setCitas(normalizarLista(response.data, ['citas']));
      } catch (e) {
        setMensaje(formatApiError(e.response?.data, 'No se pudo cargar el historial.'));
      }
    };

    cargar();
  }, []);

  const historial = useMemo(() => citas.filter(cita => {
    const estado = estadoCita(cita).toLowerCase();
    return estado.includes('final') || new Date(fechaCita(cita)) < new Date();
  }), [citas]);

  return (
    <div className="cliente-page">
      <div className="card">
        <h3>Historial de servicios</h3>
        <p className="cliente-muted">Servicios pasados, barbero que atendio y observaciones.</p>
        {mensaje && <div className="cliente-alert error">{mensaje}</div>}

        <div className="cliente-history-list">
          {historial.length === 0 ? (
            <p className="cliente-muted">Aun no tienes servicios en historial.</p>
          ) : historial.map(cita => (
            <div key={cita.id_cita || cita.id} className="cliente-history-item">
              <div>
                <strong>{servicioCita(cita)}</strong>
                <span>{fechaCita(cita)} - {barberoCita(cita)}</span>
                <p>{cita.observacion || cita.descripcion || 'Sin observaciones.'}</p>
              </div>
              <span className="badge badge-blue">{estadoCita(cita)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
