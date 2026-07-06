import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError, normalizarLista } from './clienteUtils';

function fecha(valor) { if (!valor) return '-'; const f = new Date(valor); return Number.isNaN(f.getTime()) ? String(valor) : f.toLocaleDateString('es-BO'); }
function productos(recomendacion) { return Array.isArray(recomendacion?.productos_detalle) ? recomendacion.productos_detalle : []; }

// Caso de uso: Consultar recomendaciones recibidas.
// El cliente autenticado consulta recomendaciones activas registradas por sus barberos.
export default function ClienteRecomendaciones() {
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [filtros, setFiltros] = useState({ fecha_desde: '', fecha_hasta: '', id_servicio: '' });
  const [buscar, setBuscar] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    setMensaje('');
    try {
      const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
      const response = await api.get('cliente/recomendaciones/', { params });
      setRecomendaciones(normalizarLista(response.data, ['recomendaciones']));
      if (response.data?.mensaje) setMensaje(response.data.mensaje);
    } catch (e) {
      setMensaje(formatApiError(e.response?.data, 'No se pudieron cargar tus recomendaciones.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [filtros.fecha_desde, filtros.fecha_hasta, filtros.id_servicio]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  const filtradas = useMemo(() => {
    const q = buscar.toLowerCase();
    return recomendaciones.filter(r => [r.barbero, r.servicio_principal, r.contenido, r.frecuencia_corte, r.cuidados_cabello, r.fecha_atencion, ...productos(r).map(p => p.producto)].some(v => String(v || '').toLowerCase().includes(q)));
  }, [buscar, recomendaciones]);

  return <div className="cliente-page"><div className="card"><div className="cliente-section-header"><div><h3>Recomendaciones recibidas</h3><p>Consulta las indicaciones de cuidado que te dejaron despues de una atencion.</p></div><button className="btn-outline" onClick={cargar}>Actualizar</button></div>
    <div className="cliente-grid-tools"><input className="input-field" placeholder="Buscar por barbero, servicio o producto" value={buscar} onChange={e => setBuscar(e.target.value)} /><input className="input-field" type="date" value={filtros.fecha_desde} onChange={e => setFiltros({ ...filtros, fecha_desde: e.target.value })} /><input className="input-field" type="date" value={filtros.fecha_hasta} onChange={e => setFiltros({ ...filtros, fecha_hasta: e.target.value })} /><input className="input-field" placeholder="Id servicio" value={filtros.id_servicio} onChange={e => setFiltros({ ...filtros, id_servicio: e.target.value })} /></div>
    {mensaje && <div className={`cliente-alert ${mensaje.includes('No se') ? 'error' : 'success'}`}>{mensaje}</div>}
    {loading ? <p className="cliente-muted">Cargando recomendaciones...</p> : <div className="cliente-list-cards">{filtradas.length === 0 ? <p className="cliente-empty">No tienes recomendaciones registradas.</p> : filtradas.map(r => <article key={r.id_recomendacion} className="cliente-info-card"><header><strong>{r.servicio_principal || 'Servicio'}</strong><span>{fecha(r.fecha_atencion)}</span></header><p>{r.contenido}</p><span>Barbero: {r.barbero || '-'}</span><span>Frecuencia: {r.frecuencia_corte || '-'}</span><span>Cuidados: {r.cuidados_cabello || '-'}</span><div className="cliente-chip-list">{productos(r).map(p => <em key={p.id_detalle || p.id_producto}>{p.producto}</em>)}</div></article>)}</div>}
  </div></div>;
}
