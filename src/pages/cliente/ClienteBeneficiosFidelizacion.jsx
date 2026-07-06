import { useEffect, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from './clienteUtils';

function dinero(valor) { const n = Number(valor || 0); return `Bs. ${Number.isNaN(n) ? '0.00' : n.toFixed(2)}`; }
function fecha(valor) { if (!valor) return '-'; const f = new Date(valor); return Number.isNaN(f.getTime()) ? String(valor) : f.toLocaleDateString('es-BO'); }

// Caso de uso: Consultar beneficios de fidelizacion.
// Calcula el avance del cliente autenticado contra campanias activas del backend.
export default function ClienteBeneficiosFidelizacion() {
  const [data, setData] = useState({ metricas: {}, beneficios: [] });
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    setMensaje('');
    try {
      const response = await api.get('cliente/beneficios-fidelizacion/');
      setData({ metricas: response.data?.metricas || {}, beneficios: response.data?.beneficios || [] });
      setMensaje(response.data?.mensaje || 'Beneficios consultados correctamente.');
    } catch (e) {
      setMensaje(formatApiError(e.response?.data, 'No se pudieron cargar tus beneficios.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  return <div className="cliente-page"><div className="cliente-metrics"><div className="stat-card"><div className="label">Visitas</div><div className="value">{data.metricas.visitas || 0}</div></div><div className="stat-card"><div className="label">Servicios</div><div className="value gold">{data.metricas.servicios || 0}</div></div><div className="stat-card"><div className="label">Monto</div><div className="value">{dinero(data.metricas.monto)}</div></div></div><div className="card"><div className="cliente-section-header"><div><h3>Beneficios de fidelizacion</h3><p>Revisa tus avances y beneficios disponibles.</p></div><button className="btn-outline" onClick={cargar}>Actualizar</button></div>{mensaje && <div className={`cliente-alert ${mensaje.includes('No se') ? 'error' : 'success'}`}>{mensaje}</div>}{loading ? <p className="cliente-muted">Cargando beneficios...</p> : <div className="cliente-list-cards">{data.beneficios.length === 0 ? <p className="cliente-empty">No tienes beneficios activos por ahora.</p> : data.beneficios.map(b => <article key={b.id_campania} className="cliente-info-card"><header><strong>{b.nombre}</strong><span>{b.beneficio_disponible ? 'Disponible' : 'En progreso'}</span></header><p>{b.descripcion || b.beneficio}</p><span>Condicion: {b.tipo_condicion} {b.acumulado_cliente}/{b.valor_condicion}</span><span>Faltante: {b.faltante}</span><span>Beneficio: {b.beneficio} {b.valor_beneficio ? `(${b.valor_beneficio})` : ''}</span><span>Vigencia: {fecha(b.fecha_inicio)} - {fecha(b.fecha_fin)}</span></article>)}</div>}</div></div>;
}
