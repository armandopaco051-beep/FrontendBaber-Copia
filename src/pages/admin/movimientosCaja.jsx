import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

const TIPOS_MANUALES = [
  { value: 'INGRESO_MANUAL', label: 'Ingreso manual' },
  { value: 'EGRESO', label: 'Egreso' },
  { value: 'RETIRO', label: 'Retiro' },
  { value: 'AJUSTE_POSITIVO', label: 'Ajuste positivo' },
  { value: 'AJUSTE_NEGATIVO', label: 'Ajuste negativo' },
];

const EMPTY_FORM = {
  tipo_movimiento: 'EGRESO',
  id_metodo_pago: '',
  monto: '',
  descripcion: '',
  referencia: '',
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

function idMovimiento(movimiento) {
  return movimiento?.id_movimiento_caja || movimiento?.id || '';
}

function idMetodo(metodo) {
  return metodo?.id_metodo_pago || metodo?.id || '';
}

function dinero(valor) {
  const numero = Number(valor || 0);
  if (Number.isNaN(numero)) return 'Bs. 0.00';
  return `Bs. ${numero.toFixed(2)}`;
}

function fechaHora(valor) {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function badgeTipo(movimiento) {
  const tipo = movimiento?.naturaleza || movimiento?.tipo || movimiento?.tipo_movimiento;
  return tipo === 'EGRESO' ? 'badge-red' : 'badge-green';
}

function badgeEstado(estado) {
  if (estado === 'ACTIVO') return 'badge-green';
  if (estado === 'ANULADO') return 'badge-red';
  return 'badge-yellow';
}

function etiquetaTipo(tipo) {
  return TIPOS_MANUALES.find(item => item.value === tipo)?.label || tipo || '-';
}

export default function MovimientosCaja() {
  const [movimientos, setMovimientos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [metodosPago, setMetodosPago] = useState([]);
  const [filtros, setFiltros] = useState({ tipo_movimiento: '', estado: '', id_metodo_pago: '' });
  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const cargarMovimientos = async () => {
    try {
      const params = {};
      if (filtros.tipo_movimiento) params.tipo_movimiento = filtros.tipo_movimiento;
      if (filtros.estado) params.estado = filtros.estado;
      if (filtros.id_metodo_pago) params.id_metodo_pago = filtros.id_metodo_pago;
      const response = await api.get('ventas-caja/caja/movimientos/', { params });
      setMovimientos(normalizarLista(response.data, 'movimientos'));
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudieron cargar los movimientos de caja.'), 'error');
    }
  };

  const cargarResumen = async () => {
    try {
      const response = await api.get('ventas-caja/caja/resumen/');
      setResumen(response.data?.resumen || null);
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo cargar el resumen de caja.'), 'error');
    }
  };

  const cargarMetodosPago = async () => {
    try {
      const response = await api.get('ventas-caja/metodos-pago/');
      setMetodosPago(normalizarLista(response.data, 'metodos_pago'));
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudieron cargar los metodos de pago.'), 'error');
    }
  };

  useEffect(() => { cargarMetodosPago(); cargarResumen(); }, []); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { cargarMovimientos(); }, [filtros.tipo_movimiento, filtros.estado, filtros.id_metodo_pago]); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const cerrar = () => {
    setModal(null);
    setSelected(null);
    setMotivo('');
    setForm({ ...EMPTY_FORM });
  };

  const abrirCrear = () => {
    setForm({ ...EMPTY_FORM });
    setModal('crear');
  };

  const verDetalle = async (movimiento) => {
    setLoading(true);
    try {
      const response = await api.get(`ventas-caja/caja/movimientos/${idMovimiento(movimiento)}/`);
      setSelected(response.data);
      setModal('detalle');
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo consultar el movimiento.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const abrirAnular = (movimiento) => {
    setSelected(movimiento);
    setMotivo('');
    setModal('anular');
  };

  const registrarMovimiento = async () => {
    if (!form.tipo_movimiento) return showToast('Selecciona el tipo de movimiento.', 'error');
    if (!form.id_metodo_pago) return showToast('Selecciona un metodo de pago.', 'error');
    if (!form.monto) return showToast('Ingresa el monto.', 'error');
    if (!form.descripcion.trim()) return showToast('Ingresa una descripcion.', 'error');

    setLoading(true);
    try {
      const payload = {
        tipo_movimiento: form.tipo_movimiento,
        id_metodo_pago: Number(form.id_metodo_pago),
        monto: form.monto,
        descripcion: form.descripcion,
        referencia: form.referencia,
      };
      const response = await api.post('ventas-caja/caja/movimientos/', payload);
      showToast(response.data?.mensaje || 'Movimiento de caja registrado correctamente.');
      cerrar();
      cargarMovimientos();
      cargarResumen();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo registrar el movimiento.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const anularMovimiento = async () => {
    if (!motivo.trim()) return showToast('Escribe el motivo de anulacion.', 'error');

    setLoading(true);
    try {
      const response = await api.post(`ventas-caja/caja/movimientos/${idMovimiento(selected)}/anular/`, { motivo });
      showToast(response.data?.mensaje || 'Movimiento de caja anulado correctamente.');
      cerrar();
      cargarMovimientos();
      cargarResumen();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo anular el movimiento.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const movimientosFiltrados = useMemo(() => {
    const q = buscar.toLowerCase();
    return movimientos.filter(movimiento => [
      idMovimiento(movimiento),
      movimiento?.tipo,
      movimiento?.tipo_movimiento,
      movimiento?.naturaleza,
      movimiento?.metodo_pago_nombre,
      movimiento?.descripcion,
      movimiento?.referencia,
      movimiento?.estado,
      movimiento?.usuario_nombre,
      movimiento?.usuario,
    ].some(valor => String(valor || '').toLowerCase().includes(q)));
  }, [buscar, movimientos]);

  return (
    <div>
      <div className="ventas-caja-stats movimientos-dashboard-stats">
        <div className="stat-card">
          <div className="label">Caja</div>
          <div className="value">{resumen?.estado || 'Sin resumen'}</div>
          <div className="sub">{resumen?.caja_id ? `Caja #${resumen.caja_id}` : 'Consulta resumen de caja'}</div>
        </div>
        <div className="stat-card">
          <div className="label">Saldo actual</div>
          <div className="value gold">{dinero(resumen?.saldo_actual)}</div>
          <div className="sub">Efectivo: {dinero(resumen?.saldo_efectivo)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Ingresos / Egresos</div>
          <div className="value">{dinero(resumen?.ingresos)}</div>
          <div className="sub">Egresos: {dinero(resumen?.egresos)}</div>
        </div>
      </div>

      <div className="card movimientos-summary-card">
        <div className="ventas-caja-header">
          <div>
            <h3 className="ventas-caja-title">Resumen por metodo de pago</h3>
            <p className="ventas-caja-subtitle">Detalle del saldo agrupado por forma de pago de la caja abierta.</p>
          </div>
          <button className="btn-outline" onClick={cargarResumen}>Actualizar resumen</button>
        </div>

        <div className="movimientos-resumen-grid">
          {(resumen?.resumen_metodos_pago || []).length === 0 ? (
            <div className="caja-empty-state">No hay resumen por metodos de pago.</div>
          ) : resumen.resumen_metodos_pago.map(item => (
            <div className="movimientos-resumen-item" key={item.id_metodo_pago || item.metodo_pago}>
              <span>{item.metodo_pago}</span>
              <strong>{dinero(item.saldo)}</strong>
              <small>Ingresos {dinero(item.ingresos)} | Egresos {dinero(item.egresos)}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="ventas-caja-header">
          <div>
            <h3 className="ventas-caja-title">Movimientos de caja</h3>
            <p className="ventas-caja-subtitle">Registra movimientos manuales. Las ventas se generan automaticamente desde el flujo de ventas.</p>
          </div>
          <button className="btn-gold" onClick={abrirCrear}>Registrar movimiento</button>
        </div>

        <div className="movimientos-filter-grid">
          <div className="search-box ventas-caja-search">
            <span className="icon">Buscar</span>
            <input placeholder="Buscar por descripcion, referencia, usuario o estado..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          <select className="input-field" value={filtros.tipo_movimiento} onChange={e => setFiltros({ ...filtros, tipo_movimiento: e.target.value })}>
            <option value="">Todos los tipos</option>
            {TIPOS_MANUALES.map(tipo => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
          </select>
          <select className="input-field" value={filtros.estado} onChange={e => setFiltros({ ...filtros, estado: e.target.value })}>
            <option value="">Todos los estados</option>
            <option value="ACTIVO">Activo</option>
            <option value="ANULADO">Anulado</option>
          </select>
          <select className="input-field" value={filtros.id_metodo_pago} onChange={e => setFiltros({ ...filtros, id_metodo_pago: e.target.value })}>
            <option value="">Todos los metodos</option>
            {metodosPago.map(metodo => <option key={idMetodo(metodo)} value={idMetodo(metodo)}>{metodo.nombre}</option>)}
          </select>
        </div>

        <table className="tabla">
          <thead>
            <tr><th>Movimiento</th><th>Tipo</th><th>Metodo</th><th>Monto</th><th>Descripcion</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {movimientosFiltrados.length === 0 ? (
              <tr><td colSpan={8} className="ventas-caja-empty">No se encontraron movimientos de caja.</td></tr>
            ) : movimientosFiltrados.map(movimiento => (
              <tr key={idMovimiento(movimiento)}>
                <td className="ventas-caja-name">#{idMovimiento(movimiento)}</td>
                <td><span className={`badge ${badgeTipo(movimiento)}`}>{etiquetaTipo(movimiento.tipo_movimiento || movimiento.tipo)}</span></td>
                <td>{movimiento.metodo_pago_nombre || '-'}</td>
                <td>{dinero(movimiento.monto)}</td>
                <td>
                  <div>{movimiento.descripcion || '-'}</div>
                  <div className="ventas-caja-muted">{movimiento.referencia || 'Sin referencia'}</div>
                </td>
                <td><span className={`badge ${badgeEstado(movimiento.estado)}`}>{movimiento.estado}</span></td>
                <td>{fechaHora(movimiento.fecha)}</td>
                <td className="ventas-caja-row-actions">
                  <button className="btn-outline" onClick={() => verDetalle(movimiento)} disabled={loading}>Ver</button>
                  {movimiento.estado !== 'ANULADO' && !movimiento.id_venta && (
                    <button className="btn-outline ventas-caja-delete" onClick={() => abrirAnular(movimiento)}>Anular</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === 'crear' && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box ventas-caja-plan-modal" onClick={e => e.stopPropagation()}>
            <h3>Registrar movimiento manual</h3>
            <p>No se crean movimientos tipo VENTA desde esta pantalla; el backend los genera al confirmar ventas.</p>
            <div className="form-row">
              <div className="form-group">
                <label>Tipo movimiento</label>
                <select className="input-field" value={form.tipo_movimiento} onChange={e => setForm({ ...form, tipo_movimiento: e.target.value })}>
                  {TIPOS_MANUALES.map(tipo => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Metodo de pago</label>
                <select className="input-field" value={form.id_metodo_pago} onChange={e => setForm({ ...form, id_metodo_pago: e.target.value })}>
                  <option value="">Seleccionar metodo</option>
                  {metodosPago.map(metodo => <option key={idMetodo(metodo)} value={idMetodo(metodo)}>{metodo.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Monto</label>
                <input className="input-field" type="number" min="0" step="0.01" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} placeholder="50.00" />
              </div>
              <div className="form-group">
                <label>Referencia</label>
                <input className="input-field" value={form.referencia} onChange={e => setForm({ ...form, referencia: e.target.value })} placeholder="RECIBO-001" />
              </div>
            </div>
            <div className="form-group">
              <label>Descripcion</label>
              <textarea className="input-field ventas-caja-textarea" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Compra de cuchillas" />
            </div>
            <div className="ventas-caja-modal-actions">
              <button className="btn-outline ventas-caja-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-gold ventas-caja-modal-button" onClick={registrarMovimiento} disabled={loading}>{loading ? 'Registrando...' : 'Registrar'}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'detalle' && selected && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box ventas-caja-plan-modal" onClick={e => e.stopPropagation()}>
            <h3>Movimiento #{idMovimiento(selected)}</h3>
            <div className="movimientos-detail-grid">
              <div><span>Tipo</span><strong>{selected.tipo_movimiento || selected.tipo}</strong></div>
              <div><span>Naturaleza</span><strong>{selected.naturaleza || '-'}</strong></div>
              <div><span>Metodo</span><strong>{selected.metodo_pago_nombre || '-'}</strong></div>
              <div><span>Monto</span><strong>{dinero(selected.monto)}</strong></div>
              <div><span>Estado</span><strong>{selected.estado}</strong></div>
              <div><span>Usuario</span><strong>{selected.usuario_nombre || selected.usuario || '-'}</strong></div>
              <div><span>Referencia</span><strong>{selected.referencia || '-'}</strong></div>
              <div><span>Fecha</span><strong>{fechaHora(selected.fecha)}</strong></div>
            </div>
            <div className="form-group">
              <label>Descripcion</label>
              <textarea className="input-field ventas-caja-textarea" value={selected.descripcion || ''} disabled />
            </div>
            {selected.motivo_anulacion && (
              <div className="form-group">
                <label>Motivo anulacion</label>
                <textarea className="input-field ventas-caja-textarea" value={selected.motivo_anulacion} disabled />
              </div>
            )}
            <button className="btn-gold ventas-caja-modal-button" onClick={cerrar}>Cerrar</button>
          </div>
        </div>
      )}

      {modal === 'anular' && selected && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Anular movimiento #{idMovimiento(selected)}</h3>
            <p>El backend ajustara nuevamente los saldos de caja.</p>
            <div className="form-group">
              <label>Motivo</label>
              <textarea className="input-field ventas-caja-textarea" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Movimiento registrado por error." />
            </div>
            <div className="ventas-caja-modal-actions">
              <button className="btn-outline ventas-caja-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-gold ventas-caja-modal-button" onClick={anularMovimiento} disabled={loading}>{loading ? 'Anulando...' : 'Anular'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
