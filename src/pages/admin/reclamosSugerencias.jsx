import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

const ENDPOINT = 'cliente/reclamos-sugerencias/';
const TIPOS = ['RECLAMO', 'SUGERENCIA'];
const ESTADOS = ['PENDIENTE', 'EN_REVISION', 'REVISADO', 'RESUELTO', 'CERRADO', 'INACTIVO'];
const EMPTY = { tipo_solicitud: 'RECLAMO', detalle: '', id_cita: '', id_servicio: '', estado: 'PENDIENTE', respuesta_admin: '' };

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return <div className={`toast ${type}`}>{type === 'success' ? 'OK' : 'Error'} {msg}</div>;
}

function normalizarLista(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.[key])) return data[key];
  return [];
}

function idSolicitud(item) { return item?.id_solicitud || item?.id || ''; }
function fecha(valor) {
  if (!valor) return '-';
  const f = new Date(valor);
  return Number.isNaN(f.getTime()) ? String(valor) : f.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
}
function estadoClase(estado) {
  if (estado === 'RESUELTO' || estado === 'CERRADO') return 'badge-green';
  if (estado === 'INACTIVO') return 'badge-red';
  return 'badge-yellow';
}
function estadoTexto(estado) { return String(estado || '').replace(/_/g, ' ') || '-'; }

// CU31: Gestionar reclamos y sugerencias.
// Esta pantalla consulta, filtra, actualiza seguimiento e inactiva solicitudes registradas por clientes.
export default function ReclamosSugerencias() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [filtros, setFiltros] = useState({ tipo_solicitud: '', estado: '', codigo_cliente: '' });
  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // READ: lista reclamos/sugerencias usando los filtros permitidos por el backend.
  const cargar = async () => {
    try {
      const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
      const response = await api.get(ENDPOINT, { params });
      setSolicitudes(normalizarLista(response.data, 'solicitudes'));
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudieron cargar los reclamos y sugerencias.'), 'error');
    }
  };

  const cargarServicios = async () => {
    try {
      const response = await api.get('servicios/servicios/', { params: { estado: 'ACTIVO' } });
      setServicios(normalizarLista(response.data, 'servicios'));
    } catch {
      setServicios([]);
    }
  };

  useEffect(() => { cargarServicios(); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { cargar(); }, [filtros.tipo_solicitud, filtros.estado, filtros.codigo_cliente]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  const cerrar = () => { setModal(null); setSelected(null); setForm({ ...EMPTY }); };

  const abrirDetalle = (solicitud) => { setSelected(solicitud); setModal('detalle'); };
  const abrirEditar = (solicitud) => {
    setSelected(solicitud);
    setForm({
      tipo_solicitud: solicitud.tipo_solicitud || 'RECLAMO',
      detalle: solicitud.detalle || '',
      id_cita: solicitud.id_cita || '',
      id_servicio: solicitud.id_servicio || '',
      estado: solicitud.estado || 'PENDIENTE',
      respuesta_admin: solicitud.respuesta_admin || '',
    });
    setModal('editar');
  };

  // UPDATE: permite al administrador ajustar seguimiento del reclamo/sugerencia.
  const guardar = async () => {
    if (!form.detalle.trim()) return showToast('El detalle no puede estar vacio.', 'error');
    setLoading(true);
    const payload = {
      tipo_solicitud: form.tipo_solicitud,
      detalle: form.detalle.trim(),
      estado: form.estado,
      respuesta_admin: form.respuesta_admin.trim(),
    };
    if (form.id_cita) payload.id_cita = Number(form.id_cita);
    if (form.id_servicio) payload.id_servicio = Number(form.id_servicio);
    try {
      await api.put(`${ENDPOINT}${idSolicitud(selected)}/`, payload);
      showToast('Solicitud actualizada correctamente.');
      cerrar();
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo actualizar la solicitud.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // DELETE logico: el backend cambia el estado a INACTIVO sin borrar el registro.
  const inactivar = async (solicitud) => {
    if (!confirm(`Inactivar solicitud #${idSolicitud(solicitud)}?`)) return;
    try {
      await api.delete(`${ENDPOINT}${idSolicitud(solicitud)}/`);
      showToast('Solicitud inactivada correctamente.');
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo inactivar la solicitud.'), 'error');
    }
  };

  const filtradas = useMemo(() => {
    const q = buscar.toLowerCase();
    return solicitudes.filter(item => [idSolicitud(item), item.cliente, item.codigo_cliente, item.tipo_solicitud, item.detalle, item.servicio, item.estado, item.respuesta_admin, item.fecha_registro]
      .some(v => String(v ?? '').toLowerCase().includes(q)));
  }, [buscar, solicitudes]);

  return (
    <div>
      <div className="reclamos-stats">
        <div className="stat-card"><div className="label">Solicitudes</div><div className="value">{solicitudes.length}</div><div className="sub">Segun filtros</div></div>
        <div className="stat-card"><div className="label">Pendientes</div><div className="value gold">{solicitudes.filter(s => s.estado === 'PENDIENTE').length}</div><div className="sub">Sin respuesta</div></div>
        <div className="stat-card"><div className="label">Resueltas</div><div className="value">{solicitudes.filter(s => ['RESUELTO', 'CERRADO'].includes(s.estado)).length}</div><div className="sub">Con cierre</div></div>
      </div>

      <div className="card">
        <div className="reclamos-header">
          <div><h3 className="reclamos-title">Gestion de reclamos y sugerencias</h3><p className="reclamos-subtitle">Consulta y administra solicitudes registradas por clientes.</p></div>
          <button className="btn-outline" onClick={cargar}>Actualizar</button>
        </div>
        <div className="reclamos-toolbar">
          <div className="search-box reclamos-search"><span className="icon">Buscar</span><input placeholder="Buscar por cliente, tipo, estado o detalle" value={buscar} onChange={e => setBuscar(e.target.value)} /></div>
          <select className="input-field" value={filtros.tipo_solicitud} onChange={e => setFiltros({ ...filtros, tipo_solicitud: e.target.value })}><option value="">Todos los tipos</option>{TIPOS.map(t => <option key={t} value={t}>{estadoTexto(t)}</option>)}</select>
          <select className="input-field" value={filtros.estado} onChange={e => setFiltros({ ...filtros, estado: e.target.value })}><option value="">Todos los estados</option>{ESTADOS.map(e => <option key={e} value={e}>{estadoTexto(e)}</option>)}</select>
          <input className="input-field" placeholder="Codigo cliente" value={filtros.codigo_cliente} onChange={e => setFiltros({ ...filtros, codigo_cliente: e.target.value })} />
        </div>
        <div className="reclamos-table-wrap">
          <table className="tabla"><thead><tr><th>Solicitud</th><th>Cliente</th><th>Tipo</th><th>Detalle</th><th>Servicio</th><th>Estado</th><th>Registro</th><th>Acciones</th></tr></thead>
            <tbody>{filtradas.length === 0 ? <tr><td colSpan={8} className="reclamos-empty">No se encontraron solicitudes.</td></tr> : filtradas.map(item => (
              <tr key={idSolicitud(item)}>
                <td className="reclamos-name">#{idSolicitud(item)}</td><td>{item.cliente || item.codigo_cliente || '-'}</td><td>{estadoTexto(item.tipo_solicitud)}</td><td>{item.detalle}</td><td>{item.servicio || item.id_servicio || '-'}</td><td><span className={`badge ${estadoClase(item.estado)}`}>{estadoTexto(item.estado)}</span></td><td>{fecha(item.fecha_registro)}</td>
                <td className="reclamos-row-actions"><button className="btn-outline" onClick={() => abrirDetalle(item)}>Ver</button><button className="btn-outline" onClick={() => abrirEditar(item)}>Editar</button>{item.estado !== 'INACTIVO' && <button className="btn-outline reclamos-delete" onClick={() => inactivar(item)}>Inactivar</button>}</td>
              </tr>))}</tbody></table>
        </div>
      </div>

      {modal === 'editar' && <div className="modal-overlay" onClick={cerrar}><div className="modal-box reclamos-modal" onClick={e => e.stopPropagation()}><h3>Editar solicitud</h3><p>Actualiza el seguimiento administrativo de la solicitud.</p>
        <div className="form-row"><div className="form-group"><label>Tipo</label><select className="input-field" value={form.tipo_solicitud} onChange={e => setForm({ ...form, tipo_solicitud: e.target.value })}>{TIPOS.map(t => <option key={t} value={t}>{estadoTexto(t)}</option>)}</select></div><div className="form-group"><label>Estado</label><select className="input-field" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>{ESTADOS.map(e => <option key={e} value={e}>{estadoTexto(e)}</option>)}</select></div></div>
        <div className="form-row"><div className="form-group"><label>Cita relacionada</label><input className="input-field" value={form.id_cita} onChange={e => setForm({ ...form, id_cita: e.target.value })} placeholder="Opcional" /></div><div className="form-group"><label>Servicio relacionado</label><select className="input-field" value={form.id_servicio} onChange={e => setForm({ ...form, id_servicio: e.target.value })}><option value="">Sin servicio</option>{servicios.map(s => <option key={s.id_servicio || s.id} value={s.id_servicio || s.id}>{s.nombre}</option>)}</select></div></div>
        <div className="form-group"><label>Detalle</label><textarea className="input-field reclamos-textarea" value={form.detalle} onChange={e => setForm({ ...form, detalle: e.target.value })} /></div>
        <div className="form-group"><label>Respuesta administrativa</label><textarea className="input-field reclamos-textarea" value={form.respuesta_admin} onChange={e => setForm({ ...form, respuesta_admin: e.target.value })} /></div>
        <div className="reclamos-modal-actions"><button className="btn-outline reclamos-modal-button" onClick={cerrar}>Cancelar</button><button className="btn-gold reclamos-modal-button" onClick={guardar} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button></div>
      </div></div>}

      {modal === 'detalle' && selected && <div className="modal-overlay" onClick={cerrar}><div className="modal-box reclamos-modal" onClick={e => e.stopPropagation()}><h3>Detalle de solicitud</h3><p>Informacion completa del reclamo o sugerencia.</p>
        <div className="reclamos-detail-grid">{[['Codigo', `#${idSolicitud(selected)}`], ['Cliente', selected.cliente || selected.codigo_cliente], ['Tipo', estadoTexto(selected.tipo_solicitud)], ['Estado', estadoTexto(selected.estado)], ['Cita', selected.id_cita || '-'], ['Servicio', selected.servicio || selected.id_servicio || '-'], ['Registro', fecha(selected.fecha_registro)], ['Actualizacion', fecha(selected.fecha_actualizacion)]].map(([l,v]) => <div key={l} className="reclamos-detail-row"><span>{l}</span><strong>{v || '-'}</strong></div>)}</div>
        <div className="reclamos-detail-block"><span>Detalle</span><strong>{selected.detalle}</strong></div><div className="reclamos-detail-block"><span>Respuesta administrativa</span><strong>{selected.respuesta_admin || 'Sin respuesta'}</strong></div><button className="btn-gold reclamos-modal-button" onClick={cerrar}>Cerrar</button>
      </div></div>}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
