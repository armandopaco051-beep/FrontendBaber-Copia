import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { useAuth } from '../../auth/authContext';
import { formatApiError } from '../../utils/apiError';

const EMPTY_SERVICIO = {
  id_servicio: '',
  cantidad: 1,
  observacion: '',
};

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

function idCita(cita) {
  return cita?.id_cita || cita?.id || cita?.cita || '';
}

function idAtencion(atencion) {
  return atencion?.id_atencion || atencion?.id || '';
}

function idServicio(servicio) {
  return servicio?.id_servicio || servicio?.id || '';
}

function nombrePersona(valor) {
  if (!valor) return '-';
  if (typeof valor === 'string') return valor;
  return [valor.nombre, valor.apellido].filter(Boolean).join(' ') || valor.nombre_completo || valor.codigo || '-';
}

function dinero(valor) {
  const numero = Number(valor || 0);
  if (Number.isNaN(numero)) return 'Bs. 0.00';
  return `Bs. ${numero.toFixed(2)}`;
}

function fechaHora(valor) {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleString('es-BO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function estadoClase(estado) {
  if (estado === 'FINALIZADA') return 'badge-green';
  if (estado === 'EN_ATENCION') return 'badge-blue';
  if (estado === 'CANCELADA' || estado === 'NO_ASISTIO') return 'badge-red';
  return 'badge-yellow';
}

function citaCliente(cita) {
  return cita?.cliente_nombre || nombrePersona(cita?.codigo_cliente || cita?.cliente);
}

function citaHora(cita) {
  return `${String(cita?.fecha || '').slice(0, 10)} ${String(cita?.hora_inicio || '').slice(0, 5)}`.trim();
}

function detallesAtencion(atencion) {
  if (Array.isArray(atencion?.detalles)) return atencion.detalles;
  if (Array.isArray(atencion?.servicios_detalle)) return atencion.servicios_detalle;
  return [];
}

export default function AtencionServicios() {
  const { puede } = useAuth();
  const [pendientes, setPendientes] = useState([]);
  const [atenciones, setAtenciones] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [filtros, setFiltros] = useState({ estado: '', listo_para_cobro: '' });
  const [buscar, setBuscar] = useState('');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [servicioForm, setServicioForm] = useState({ ...EMPTY_SERVICIO });
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const cargarPendientes = async () => {
    try {
      const response = await api.get('citas/atenciones/pendientes/');
      setPendientes(normalizarLista(response.data, 'citas'));
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudieron cargar citas pendientes.'), 'error');
    }
  };

  const cargarAtenciones = async () => {
    try {
      const params = {};
      if (filtros.estado) params.estado = filtros.estado;
      if (filtros.listo_para_cobro) params.listo_para_cobro = filtros.listo_para_cobro;
      const response = await api.get('citas/atenciones/', { params });
      setAtenciones(normalizarLista(response.data, 'atenciones'));
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudieron cargar atenciones.'), 'error');
    }
  };

  const cargarServicios = async () => {
    try {
      const response = await api.get('servicios/servicios/', { params: { estado: 'ACTIVO' } });
      setServicios(normalizarLista(response.data, 'servicios'));
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudieron cargar servicios.'), 'error');
    }
  };

  useEffect(() => { cargarPendientes(); cargarServicios(); }, []); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { cargarAtenciones(); }, [filtros.estado, filtros.listo_para_cobro]); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const refrescar = () => {
    cargarPendientes();
    cargarAtenciones();
  };

  const iniciarAtencion = async (cita) => {
    if (!puede('atenciones.iniciar')) return showToast('No tienes permiso para iniciar atenciones.', 'error');
    setLoading(true);
    try {
      const response = await api.post('citas/atenciones/iniciar/', { id_cita: idCita(cita) });
      const atencion = response.data?.atencion || response.data;
      setSelected(atencion);
      showToast(response.data?.mensaje || 'Atencion iniciada correctamente.');
      refrescar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo iniciar la atencion.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const abrirAgregarServicio = (atencion) => {
    setSelected(atencion);
    setServicioForm({ ...EMPTY_SERVICIO });
    setModal('servicio');
  };

  const guardarServicio = async () => {
    if (!selected) return;
    if (!servicioForm.id_servicio) return showToast('Selecciona un servicio.', 'error');
    if (!servicioForm.cantidad || Number(servicioForm.cantidad) <= 0) return showToast('Ingresa una cantidad valida.', 'error');

    setLoading(true);
    try {
      const response = await api.post(`citas/atenciones/${idAtencion(selected)}/servicios/`, {
        servicios: [{
          id_servicio: Number(servicioForm.id_servicio),
          cantidad: Number(servicioForm.cantidad),
          observacion: servicioForm.observacion,
        }],
      });
      const atencion = response.data?.atencion || response.data;
      setSelected(atencion);
      setModal(null);
      showToast(response.data?.mensaje || 'Servicio agregado correctamente.');
      refrescar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo agregar el servicio.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const abrirObservacion = (tipo, atencion) => {
    setSelected(atencion);
    setObservaciones('');
    setModal(tipo);
  };

  const ejecutarAccion = async () => {
    if (!selected) return;

    const endpointByModal = {
      finalizar: 'finalizar',
      cancelar: 'cancelar',
      noAsistio: 'no-asistio',
    };
    const permisoByModal = {
      finalizar: 'atenciones.finalizar',
      cancelar: 'atenciones.cancelar',
      noAsistio: 'atenciones.no_asistio',
    };

    if (!puede(permisoByModal[modal])) return showToast('No tienes permiso para esta accion.', 'error');

    setLoading(true);
    try {
      const response = await api.post(`citas/atenciones/${idAtencion(selected)}/${endpointByModal[modal]}/`, {
        observaciones,
      });
      const atencion = response.data?.atencion || response.data;
      setSelected(atencion);
      setModal(null);
      showToast(response.data?.mensaje || 'Accion procesada correctamente.');
      refrescar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo procesar la accion.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const atencionesFiltradas = useMemo(() => {
    const q = buscar.toLowerCase();
    return atenciones.filter(atencion => [
      idAtencion(atencion),
      atencion?.id_cita,
      atencion?.cliente_nombre,
      atencion?.barbero_nombre,
      atencion?.estado,
      atencion?.observaciones,
    ].some(valor => String(valor || '').toLowerCase().includes(q)));
  }, [buscar, atenciones]);

  return (
    <div>
      <div className="atencion-stats">
        <div className="stat-card">
          <div className="label">Pendientes</div>
          <div className="value">{pendientes.length}</div>
          <div className="sub">Asignadas al barbero</div>
        </div>
        <div className="stat-card">
          <div className="label">En atencion</div>
          <div className="value gold">{atenciones.filter(item => item.estado === 'EN_ATENCION').length}</div>
          <div className="sub">Servicios activos</div>
        </div>
        <div className="stat-card">
          <div className="label">Listas para cobro</div>
          <div className="value">{atenciones.filter(item => item.listo_para_cobro).length}</div>
          <div className="sub">Se cobran en ventas/caja</div>
        </div>
      </div>

      <div className="card atencion-card">
        <div className="atencion-header">
          <div>
            <h3 className="atencion-title">Servicios pendientes</h3>
            <p className="atencion-subtitle">Citas asignadas listas para iniciar atencion.</p>
          </div>
          <button className="btn-outline" onClick={refrescar}>Actualizar</button>
        </div>

        <div className="atencion-pending-grid">
          {pendientes.length === 0 ? (
            <div className="atencion-empty">No hay citas pendientes asignadas.</div>
          ) : pendientes.map(cita => (
            <div className="atencion-pending-card" key={idCita(cita)}>
              <div>
                <strong>{citaCliente(cita)}</strong>
                <span>Cita #{idCita(cita)} - {citaHora(cita)}</span>
                <small>{cita.servicios_resumen || cita.servicio_nombre || 'Servicios reservados'}</small>
              </div>
              {puede('atenciones.iniciar') && (
                <button className="btn-gold" onClick={() => iniciarAtencion(cita)} disabled={loading}>Iniciar atencion</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="atencion-header">
          <div>
            <h3 className="atencion-title">Atenciones</h3>
            <p className="atencion-subtitle">Gestiona servicios en curso, finalizados o listos para cobro.</p>
          </div>
        </div>

        <div className="atencion-filter-grid">
          <div className="search-box atencion-search">
            <span className="icon">Buscar</span>
            <input placeholder="Buscar por cliente, cita o estado..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          <select className="input-field" value={filtros.estado} onChange={e => setFiltros({ ...filtros, estado: e.target.value })}>
            <option value="">Todos los estados</option>
            <option value="EN_ATENCION">En atencion</option>
            <option value="FINALIZADA">Finalizada</option>
            <option value="CANCELADA">Cancelada</option>
            <option value="NO_ASISTIO">No asistio</option>
          </select>
          <select className="input-field" value={filtros.listo_para_cobro} onChange={e => setFiltros({ ...filtros, listo_para_cobro: e.target.value })}>
            <option value="">Cobro: todos</option>
            <option value="true">Listo para cobro</option>
            <option value="false">No listo</option>
          </select>
        </div>

        <table className="tabla">
          <thead>
            <tr><th>Atencion</th><th>Cita</th><th>Total</th><th>Estado</th><th>Servicios</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {atencionesFiltradas.length === 0 ? (
              <tr><td colSpan={6} className="atencion-empty">No se encontraron atenciones.</td></tr>
            ) : atencionesFiltradas.map(atencion => (
              <tr key={idAtencion(atencion)}>
                <td className="atencion-name">#{idAtencion(atencion)}</td>
                <td>
                  <div>Cita #{atencion.id_cita}</div>
                  <div className="atencion-muted">Inicio: {fechaHora(atencion.hora_inicio)}</div>
                </td>
                <td>{dinero(atencion.total_servicios)}</td>
                <td>
                  <span className={`badge ${estadoClase(atencion.estado)}`}>{atencion.estado}</span>
                  {atencion.listo_para_cobro && <div className="badge badge-green atencion-ready">Lista para cobro</div>}
                </td>
                <td>
                  <div className="atencion-detail-list">
                    {detallesAtencion(atencion).length === 0 ? (
                      <span>Sin servicios adicionales</span>
                    ) : detallesAtencion(atencion).slice(0, 3).map((detalle, index) => (
                      <span key={detalle.id_detalle || detalle.id_servicio || index}>{detalle.servicio || detalle.servicio_nombre || `Servicio ${detalle.id_servicio || ''}`} x {detalle.cantidad || 1}</span>
                    ))}
                  </div>
                </td>
                <td className="atencion-row-actions">
                  {atencion.estado === 'EN_ATENCION' && puede('atenciones.agregar_servicios') && (
                    <button className="btn-outline" onClick={() => abrirAgregarServicio(atencion)}>Agregar servicio</button>
                  )}
                  {atencion.estado === 'EN_ATENCION' && puede('atenciones.finalizar') && (
                    <button className="btn-outline" onClick={() => abrirObservacion('finalizar', atencion)}>Finalizar</button>
                  )}
                  {atencion.estado === 'EN_ATENCION' && puede('atenciones.no_asistio') && (
                    <button className="btn-outline" onClick={() => abrirObservacion('noAsistio', atencion)}>No asistio</button>
                  )}
                  {atencion.estado === 'EN_ATENCION' && puede('atenciones.cancelar') && (
                    <button className="btn-outline atencion-danger" onClick={() => abrirObservacion('cancelar', atencion)}>Cancelar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === 'servicio' && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box atencion-modal" onClick={e => e.stopPropagation()}>
            <h3>Agregar servicio</h3>
            <p>Se agregara a la atencion #{idAtencion(selected)} y el backend recalculara el total.</p>
            <div className="form-group">
              <label>Servicio</label>
              <select className="input-field" value={servicioForm.id_servicio} onChange={e => setServicioForm({ ...servicioForm, id_servicio: e.target.value })}>
                <option value="">Seleccionar servicio</option>
                {servicios.map(servicio => <option key={idServicio(servicio)} value={idServicio(servicio)}>{servicio.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Cantidad</label>
              <input className="input-field" type="number" min="1" value={servicioForm.cantidad} onChange={e => setServicioForm({ ...servicioForm, cantidad: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Observacion</label>
              <textarea className="input-field atencion-textarea" value={servicioForm.observacion} onChange={e => setServicioForm({ ...servicioForm, observacion: e.target.value })} placeholder="Perfilado solicitado durante la atencion" />
            </div>
            <div className="atencion-modal-actions">
              <button className="btn-outline atencion-modal-button" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-gold atencion-modal-button" onClick={guardarServicio} disabled={loading}>{loading ? 'Guardando...' : 'Guardar servicio'}</button>
            </div>
          </div>
        </div>
      )}

      {['finalizar', 'cancelar', 'noAsistio'].includes(modal) && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'finalizar' ? 'Finalizar atencion' : modal === 'cancelar' ? 'Cancelar atencion' : 'Marcar no asistio'}</h3>
            <p>Registra una observacion para dejar trazabilidad.</p>
            <div className="form-group">
              <label>Observaciones</label>
              <textarea className="input-field atencion-textarea" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Detalle de la atencion" />
            </div>
            <div className="atencion-modal-actions">
              <button className="btn-outline atencion-modal-button" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-gold atencion-modal-button" onClick={ejecutarAccion} disabled={loading}>{loading ? 'Procesando...' : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
