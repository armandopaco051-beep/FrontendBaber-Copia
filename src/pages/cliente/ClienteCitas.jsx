import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { barberoCita, estadoCita, estadoClase, fechaCita, formatApiError, horaCita, idCita, normalizarLista, servicioCita } from './clienteUtils';

// Mis citas del cliente.
// Consume cliente/citas/ para listar, y DELETE cliente/citas/{id}/ para cancelar.
export default function ClienteCitas() {
  const [citas, setCitas] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    setMensaje('');
    try {
      const response = await api.get('cliente/citas/');
      setCitas(normalizarLista(response.data, ['citas']));
    } catch (e) {
      setMensaje(formatApiError(e.response?.data, 'No se pudieron cargar tus citas.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const cancelar = async (id) => {
    if (!confirm('Cancelar esta cita?')) return;
    try {
      await api.delete(`cliente/citas/${id}/`);
      setCitas(prev => prev.filter(cita => idCita(cita) !== id));
      setMensaje('Cita cancelada correctamente.');
    } catch (e) {
      setMensaje(formatApiError(e.response?.data, 'No se pudo cancelar la cita.'));
    }
  };

  const filtradas = useMemo(() => {
    const q = buscar.toLowerCase();
    return citas.filter(cita => [
      servicioCita(cita),
      barberoCita(cita),
      fechaCita(cita),
      horaCita(cita),
      estadoCita(cita),
    ].some(valor => String(valor || '').toLowerCase().includes(q)));
  }, [buscar, citas]);

  return (
    <div className="cliente-page">
      <div className="card">
        <div className="cliente-section-header">
          <div>
            <h3>Mis citas</h3>
            <p>Consulta tus reservas pasadas y futuras.</p>
          </div>
          <input className="input-field cliente-search-input" placeholder="Buscar cita..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>

        {mensaje && <div className={`cliente-alert ${mensaje.includes('correctamente') ? 'success' : 'error'}`}>{mensaje}</div>}
        {loading ? <p className="cliente-muted">Cargando citas...</p> : (
          <table className="tabla">
            <thead>
              <tr><th>Fecha</th><th>Hora</th><th>Servicio</th><th>Barbero</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr><td colSpan={6} className="cliente-empty">No tienes citas registradas.</td></tr>
              ) : filtradas.map(cita => {
                const estado = estadoCita(cita);
                const id = idCita(cita);
                return (
                  <tr key={id}>
                    <td>{fechaCita(cita)}</td>
                    <td>{horaCita(cita)}</td>
                    <td>{servicioCita(cita)}</td>
                    <td>{barberoCita(cita)}</td>
                    <td><span className={`badge ${estadoClase(estado)}`}>{estado}</span></td>
                    <td>
                      <button className="btn-outline" onClick={() => cancelar(id)}>Cancelar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
