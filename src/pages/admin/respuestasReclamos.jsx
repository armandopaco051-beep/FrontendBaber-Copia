import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

const ENDPOINT = 'cliente/reclamos-sugerencias/';
const ESTADOS_RESPUESTA = ['EN_REVISION', 'REVISADO', 'RESUELTO', 'CERRADO'];
const ESTADOS_FILTRO = ['PENDIENTE', ...ESTADOS_RESPUESTA, 'INACTIVO'];

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return <div className={`toast ${type}`}>{type === 'success' ? 'OK' : 'Error'} {msg}</div>;
}
function normalizarLista(data, key) { if (Array.isArray(data)) return data; if (Array.isArray(data?.results)) return data.results; if (Array.isArray(data?.[key])) return data[key]; return []; }
function idSolicitud(item) { return item?.id_solicitud || item?.id || ''; }
function textoEstado(estado) { return String(estado || '').replace(/_/g, ' ') || '-'; }
function fecha(valor) { if (!valor) return '-'; const f = new Date(valor); return Number.isNaN(f.getTime()) ? String(valor) : f.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }); }
function estadoClase(estado) { if (estado === 'RESUELTO' || estado === 'CERRADO') return 'badge-green'; if (estado === 'INACTIVO') return 'badge-red'; return 'badge-yellow'; }

// CU32: Gestionar respuesta a reclamos.
// Usa el endpoint dedicado cliente/reclamos-sugerencias/{id}/responder/ para registrar respuesta y estado.
export default function RespuestasReclamos() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [buscar, setBuscar] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ respuesta_admin: '', estado: 'RESUELTO' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // READ: carga solicitudes para que el administrador seleccione cual responder.
  const cargar = async () => {
    try {
      const params = filtroEstado ? { estado: filtroEstado } : {};
      const response = await api.get(ENDPOINT, { params });
      setSolicitudes(normalizarLista(response.data, 'solicitudes'));
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudieron cargar las solicitudes.'), 'error');
    }
  };

  useEffect(() => { cargar(); }, [filtroEstado]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  const abrirResponder = (solicitud) => {
    setSelected(solicitud);
    setForm({ respuesta_admin: solicitud.respuesta_admin || '', estado: solicitud.estado === 'PENDIENTE' ? 'RESUELTO' : (ESTADOS_RESPUESTA.includes(solicitud.estado) ? solicitud.estado : 'RESUELTO') });
  };
  const cerrar = () => { setSelected(null); setForm({ respuesta_admin: '', estado: 'RESUELTO' }); };

  // POST: registra la respuesta administrativa y actualiza el estado de seguimiento.
  const responder = async () => {
    if (!selected) return;
    if (!form.respuesta_admin.trim()) return showToast('La respuesta no puede estar vacia.', 'error');
    setLoading(true);
    try {
      await api.post(`${ENDPOINT}${idSolicitud(selected)}/responder/`, { respuesta_admin: form.respuesta_admin.trim(), estado: form.estado });
      showToast('Respuesta registrada correctamente.');
      cerrar();
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo registrar la respuesta.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtradas = useMemo(() => {
    const q = buscar.toLowerCase();
    return solicitudes.filter(item => [idSolicitud(item), item.cliente, item.codigo_cliente, item.tipo_solicitud, item.detalle, item.estado, item.respuesta_admin]
      .some(v => String(v ?? '').toLowerCase().includes(q)));
  }, [buscar, solicitudes]);

  return (
    <div>
      <div className="reclamos-stats">
        <div className="stat-card"><div className="label">Solicitudes</div><div className="value">{solicitudes.length}</div><div className="sub">Segun filtro</div></div>
        <div className="stat-card"><div className="label">Pendientes</div><div className="value gold">{solicitudes.filter(s => s.estado === 'PENDIENTE').length}</div><div className="sub">Por responder</div></div>
        <div className="stat-card"><div className="label">Respondidas</div><div className="value">{solicitudes.filter(s => s.respuesta_admin).length}</div><div className="sub">Con respuesta admin</div></div>
      </div>
      <div className="card">
        <div className="reclamos-header"><div><h3 className="reclamos-title">Gestion de respuesta a reclamos</h3><p className="reclamos-subtitle">Registra la accion tomada y cambia el estado de seguimiento.</p></div><button className="btn-outline" onClick={cargar}>Actualizar</button></div>
        <div className="reclamos-toolbar respuestas-toolbar"><div className="search-box reclamos-search"><span className="icon">Buscar</span><input placeholder="Buscar por cliente, detalle, tipo o estado" value={buscar} onChange={e => setBuscar(e.target.value)} /></div><select className="input-field" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}><option value="">Todos los estados</option>{ESTADOS_FILTRO.map(e => <option key={e} value={e}>{textoEstado(e)}</option>)}</select></div>
        <div className="reclamos-table-wrap"><table className="tabla"><thead><tr><th>Solicitud</th><th>Cliente</th><th>Tipo</th><th>Detalle</th><th>Respuesta</th><th>Estado</th><th>Registro</th><th>Acciones</th></tr></thead><tbody>{filtradas.length === 0 ? <tr><td colSpan={8} className="reclamos-empty">No se encontraron solicitudes.</td></tr> : filtradas.map(item => <tr key={idSolicitud(item)}><td className="reclamos-name">#{idSolicitud(item)}</td><td>{item.cliente || item.codigo_cliente || '-'}</td><td>{textoEstado(item.tipo_solicitud)}</td><td>{item.detalle}</td><td>{item.respuesta_admin || 'Sin respuesta'}</td><td><span className={`badge ${estadoClase(item.estado)}`}>{textoEstado(item.estado)}</span></td><td>{fecha(item.fecha_registro)}</td><td className="reclamos-row-actions"><button className="btn-gold" onClick={() => abrirResponder(item)}>Responder</button></td></tr>)}</tbody></table></div>
      </div>
      {selected && <div className="modal-overlay" onClick={cerrar}><div className="modal-box reclamos-modal" onClick={e => e.stopPropagation()}><h3>Responder solicitud #{idSolicitud(selected)}</h3><p>{selected.detalle}</p><div className="form-group"><label>Estado</label><select className="input-field" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>{ESTADOS_RESPUESTA.map(e => <option key={e} value={e}>{textoEstado(e)}</option>)}</select></div><div className="form-group"><label>Respuesta administrativa</label><textarea className="input-field reclamos-textarea" value={form.respuesta_admin} onChange={e => setForm({ ...form, respuesta_admin: e.target.value })} placeholder="Detalle la accion tomada para el cliente" /></div><div className="reclamos-modal-actions"><button className="btn-outline reclamos-modal-button" onClick={cerrar}>Cancelar</button><button className="btn-gold reclamos-modal-button" onClick={responder} disabled={loading}>{loading ? 'Guardando...' : 'Registrar respuesta'}</button></div></div></div>}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
