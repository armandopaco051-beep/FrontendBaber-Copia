import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

const EMPTY_APERTURA = { monto_apertura: '' };
const EMPTY_CIERRE = { monto_cierre: '', justificacion_cierre: '' };

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

function idCaja(caja) {
  return caja?.id_caja || caja?.id || '';
}

function idMovimiento(movimiento) {
  return movimiento?.id_movimiento_caja || movimiento?.id || '';
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

function estadoClase(estado) {
  if (estado === 'ABIERTA') return 'badge-green';
  if (estado === 'CERRADA') return 'badge-blue';
  return 'badge-yellow';
}

function tipoMovimientoClase(tipo) {
  return tipo === 'EGRESO' ? 'badge-red' : 'badge-green';
}

export default function Caja() {
  const [estadoCaja, setEstadoCaja] = useState(null);
  const [cajaActual, setCajaActual] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [filtros, setFiltros] = useState({ estado: '', fecha: '', responsable: '' });
  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState(null);
  const [aperturaForm, setAperturaForm] = useState({ ...EMPTY_APERTURA });
  const [cierreForm, setCierreForm] = useState({ ...EMPTY_CIERRE });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const cargarEstado = async () => {
    try {
      const response = await api.get('ventas-caja/caja/estado/');
      setEstadoCaja(response.data);
      setCajaActual(response.data?.caja || null);
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo consultar el estado de caja.'), 'error');
    }
  };

  const consultarCaja = async () => {
    try {
      const response = await api.get('ventas-caja/caja/consultar/');
      setCajaActual(response.data?.caja || null);
      if (response.data?.caja) setEstadoCaja({ estado: response.data.caja.estado, caja: response.data.caja });
      showToast(response.data?.mensaje || 'Caja consultada correctamente.');
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo consultar la caja abierta.'), 'error');
    }
  };

  const cargarHistorial = async () => {
    try {
      const params = {};
      if (filtros.estado) params.estado = filtros.estado;
      if (filtros.fecha) params.fecha = filtros.fecha;
      if (filtros.responsable) params.responsable = filtros.responsable;
      const response = await api.get('ventas-caja/caja/historial/', { params });
      setHistorial(normalizarLista(response.data, 'cajas'));
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo cargar el historial de cajas.'), 'error');
    }
  };

  useEffect(() => { cargarEstado(); }, []); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { cargarHistorial(); }, [filtros.estado, filtros.fecha, filtros.responsable]); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const cerrarModal = () => {
    setModal(null);
    setAperturaForm({ ...EMPTY_APERTURA });
    setCierreForm({ ...EMPTY_CIERRE });
  };

  const abrirCaja = async () => {
    if (!aperturaForm.monto_apertura) return showToast('Ingresa el monto de apertura.', 'error');

    setLoading(true);
    try {
      const response = await api.post('ventas-caja/caja/abrir/', {
        monto_apertura: aperturaForm.monto_apertura,
      });
      showToast(response.data?.mensaje || 'Caja abierta correctamente.');
      cerrarModal();
      await cargarEstado();
      cargarHistorial();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo abrir la caja.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const cerrarCaja = async () => {
    if (!cierreForm.monto_cierre) return showToast('Ingresa el monto de cierre.', 'error');

    setLoading(true);
    try {
      const response = await api.post('ventas-caja/caja/cerrar/', {
        monto_cierre: cierreForm.monto_cierre,
        justificacion_cierre: cierreForm.justificacion_cierre,
      });
      showToast(response.data?.mensaje || 'Caja cerrada correctamente.');
      cerrarModal();
      await cargarEstado();
      cargarHistorial();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo cerrar la caja.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalCierre = () => {
    setCierreForm({
      monto_cierre: cajaActual?.saldo_actual || cajaActual?.saldo_esperado || '',
      justificacion_cierre: '',
    });
    setModal('cerrar');
  };

  const historialFiltrado = useMemo(() => {
    const q = buscar.toLowerCase();
    return historial.filter(caja => [
      idCaja(caja),
      caja?.usuario_apertura_nombre,
      caja?.usuario_cierre_nombre,
      caja?.codigo_usuario_apertura,
      caja?.codigo_usuario_cierre,
      caja?.estado,
      caja?.justificacion_cierre,
    ].some(valor => String(valor || '').toLowerCase().includes(q)));
  }, [buscar, historial]);

  const movimientos = cajaActual?.movimientos || [];
  const hayCajaAbierta = estadoCaja?.estado === 'ABIERTA' || cajaActual?.estado === 'ABIERTA';

  return (
    <div>
      <div className="ventas-caja-stats caja-dashboard-stats">
        <div className="stat-card">
          <div className="label">Estado</div>
          <div className="value">{hayCajaAbierta ? 'Abierta' : 'Sin caja'}</div>
          <div className="sub">{estadoCaja?.mensaje || (hayCajaAbierta ? `Caja #${idCaja(cajaActual)}` : 'No existe caja abierta')}</div>
        </div>
        <div className="stat-card">
          <div className="label">Saldo actual</div>
          <div className="value gold">{dinero(cajaActual?.saldo_actual)}</div>
          <div className="sub">Esperado: {dinero(cajaActual?.saldo_esperado)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Ingresos / Egresos</div>
          <div className="value">{dinero(cajaActual?.ingresos)}</div>
          <div className="sub">Egresos: {dinero(cajaActual?.egresos)}</div>
        </div>
      </div>

      <div className="card caja-current-card">
        <div className="ventas-caja-header">
          <div>
            <h3 className="ventas-caja-title">Caja actual</h3>
            <p className="ventas-caja-subtitle">Consulta apertura, saldos y movimientos de la caja en curso.</p>
          </div>
          <div className="ventas-caja-row-actions">
            <button className="btn-outline" onClick={consultarCaja}>Consultar caja</button>
            {hayCajaAbierta ? (
              <button className="btn-gold" onClick={abrirModalCierre}>Cerrar caja</button>
            ) : (
              <button className="btn-gold" onClick={() => setModal('abrir')}>Abrir caja</button>
            )}
          </div>
        </div>

        {hayCajaAbierta && cajaActual ? (
          <>
            <div className="caja-info-grid">
              <div><span>Apertura</span><strong>{dinero(cajaActual.monto_apertura)}</strong></div>
              <div><span>Responsable apertura</span><strong>{cajaActual.usuario_apertura_nombre || cajaActual.codigo_usuario_apertura || '-'}</strong></div>
              <div><span>Fecha apertura</span><strong>{fechaHora(cajaActual.fecha_apertura)}</strong></div>
              <div><span>Estado</span><strong><span className={`badge ${estadoClase(cajaActual.estado)}`}>{cajaActual.estado}</span></strong></div>
            </div>

            <div className="ventas-section-head">
              <h4>Movimientos</h4>
              <span className="ventas-caja-muted">{movimientos.length} registrados</span>
            </div>

            <table className="tabla">
              <thead>
                <tr><th>Tipo</th><th>Monto</th><th>Descripcion</th><th>Referencia</th><th>Usuario</th><th>Fecha</th></tr>
              </thead>
              <tbody>
                {movimientos.length === 0 ? (
                  <tr><td colSpan={6} className="ventas-caja-empty">No hay movimientos registrados.</td></tr>
                ) : movimientos.map(movimiento => (
                  <tr key={idMovimiento(movimiento)}>
                    <td><span className={`badge ${tipoMovimientoClase(movimiento.tipo)}`}>{movimiento.tipo}</span></td>
                    <td>{dinero(movimiento.monto)}</td>
                    <td>{movimiento.descripcion || '-'}</td>
                    <td className="ventas-caja-muted">{movimiento.referencia || '-'}</td>
                    <td>{movimiento.usuario_nombre || movimiento.usuario || '-'}</td>
                    <td>{fechaHora(movimiento.fecha)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="caja-empty-state">
            <h4>No existe una caja abierta.</h4>
            <p>Abre caja para iniciar operaciones y registrar ingresos por ventas.</p>
          </div>
        )}
      </div>

      <div className="card caja-history-card">
        <div className="ventas-caja-header">
          <div>
            <h3 className="ventas-caja-title">Historial de cajas</h3>
            <p className="ventas-caja-subtitle">Filtra cierres y aperturas por estado, fecha o responsable.</p>
          </div>
        </div>

        <div className="caja-filter-grid">
          <div className="search-box ventas-caja-search">
            <span className="icon">Buscar</span>
            <input placeholder="Buscar por responsable, codigo o estado..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          <select className="input-field" value={filtros.estado} onChange={e => setFiltros({ ...filtros, estado: e.target.value })}>
            <option value="">Todos los estados</option>
            <option value="ABIERTA">Abierta</option>
            <option value="CERRADA">Cerrada</option>
          </select>
          <input className="input-field" type="date" value={filtros.fecha} onChange={e => setFiltros({ ...filtros, fecha: e.target.value })} />
          <input className="input-field" placeholder="Responsable" value={filtros.responsable} onChange={e => setFiltros({ ...filtros, responsable: e.target.value })} />
        </div>

        <table className="tabla">
          <thead>
            <tr><th>Caja</th><th>Apertura</th><th>Cierre</th><th>Saldo esperado</th><th>Monto cierre</th><th>Diferencia</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {historialFiltrado.length === 0 ? (
              <tr><td colSpan={7} className="ventas-caja-empty">No se encontraron cajas.</td></tr>
            ) : historialFiltrado.map(caja => (
              <tr key={idCaja(caja)}>
                <td className="ventas-caja-name">#{idCaja(caja)}</td>
                <td>
                  <div>{caja.usuario_apertura_nombre || caja.codigo_usuario_apertura || '-'}</div>
                  <div className="ventas-caja-muted">{dinero(caja.monto_apertura)}</div>
                </td>
                <td>
                  <div>{caja.usuario_cierre_nombre || caja.codigo_usuario_cierre || '-'}</div>
                  {caja.justificacion_cierre && <div className="ventas-caja-muted">{caja.justificacion_cierre}</div>}
                </td>
                <td>{dinero(caja.saldo_esperado)}</td>
                <td>{caja.monto_cierre ? dinero(caja.monto_cierre) : '-'}</td>
                <td>{dinero(caja.diferencia)}</td>
                <td><span className={`badge ${estadoClase(caja.estado)}`}>{caja.estado}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === 'abrir' && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Abrir caja</h3>
            <p>Registra el monto inicial disponible para operar.</p>
            <div className="form-group">
              <label>Monto apertura</label>
              <input
                className="input-field"
                type="number"
                min="0"
                step="0.01"
                value={aperturaForm.monto_apertura}
                onChange={e => setAperturaForm({ monto_apertura: e.target.value })}
                placeholder="250.00"
              />
            </div>
            <div className="ventas-caja-modal-actions">
              <button className="btn-outline ventas-caja-modal-button" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-gold ventas-caja-modal-button" onClick={abrirCaja} disabled={loading}>{loading ? 'Abriendo...' : 'Abrir caja'}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'cerrar' && cajaActual && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-box ventas-caja-plan-modal" onClick={e => e.stopPropagation()}>
            <h3>Cerrar caja #{idCaja(cajaActual)}</h3>
            <p>Saldo esperado: {dinero(cajaActual.saldo_esperado)}. Justifica el cierre si existe diferencia.</p>
            <div className="form-row">
              <div className="form-group">
                <label>Monto cierre</label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cierreForm.monto_cierre}
                  onChange={e => setCierreForm({ ...cierreForm, monto_cierre: e.target.value })}
                  placeholder="325.00"
                />
              </div>
              <div className="form-group">
                <label>Diferencia estimada</label>
                <input className="input-field" value={dinero(Number(cierreForm.monto_cierre || 0) - Number(cajaActual.saldo_esperado || 0))} disabled />
              </div>
            </div>
            <div className="form-group">
              <label>Justificacion cierre</label>
              <textarea
                className="input-field ventas-caja-textarea"
                value={cierreForm.justificacion_cierre}
                onChange={e => setCierreForm({ ...cierreForm, justificacion_cierre: e.target.value })}
                placeholder="Faltante de Bs 10 detectado al cierre."
              />
            </div>
            <div className="ventas-caja-modal-actions">
              <button className="btn-outline ventas-caja-modal-button" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-gold ventas-caja-modal-button" onClick={cerrarCaja} disabled={loading}>{loading ? 'Cerrando...' : 'Cerrar caja'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
