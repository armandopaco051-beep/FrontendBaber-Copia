import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

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

function idVenta(venta) {
  return venta?.id_venta || venta?.id || '';
}

function dinero(valor) {
  const numero = Number(valor || 0);
  if (Number.isNaN(numero)) return 'Bs. 0.00';
  return `Bs. ${numero.toFixed(2)}`;
}

function fechaLocal(valor) {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function detalleNombre(detalle) {
  return detalle?.tipo_item === 'PRODUCTO'
    ? detalle?.producto_nombre || `Producto ${detalle?.id_producto || ''}`
    : detalle?.servicio_nombre || `Servicio ${detalle?.id_servicio || ''}`;
}

export default function Comprobantes() {
  const [ventas, setVentas] = useState([]);
  const [filtros, setFiltros] = useState({ cliente: '', fecha: '' });
  const [buscar, setBuscar] = useState('');
  const [descargando, setDescargando] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const cargarVentas = async () => {
    try {
      const params = { estado: 'PAGADA' };
      if (filtros.cliente) params.cliente = filtros.cliente;
      if (filtros.fecha) params.fecha = filtros.fecha;
      const response = await api.get('ventas-caja/ventas/', { params });
      setVentas(normalizarLista(response.data, 'ventas'));
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudieron cargar las ventas pagadas.'), 'error');
    }
  };

  useEffect(() => { cargarVentas(); }, [filtros.cliente, filtros.fecha]); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const ventasFiltradas = useMemo(() => {
    const q = buscar.toLowerCase();
    return ventas.filter(venta => [
      idVenta(venta),
      venta?.cliente_nombre,
      venta?.codigo_cliente,
      venta?.cajero_nombre,
      venta?.observacion,
    ].some(valor => String(valor || '').toLowerCase().includes(q)));
  }, [buscar, ventas]);

  const descargarComprobante = async (venta) => {
    const ventaId = idVenta(venta);
    setDescargando(ventaId);
    try {
      const response = await api.get(`ventas-caja/ventas/${ventaId}/comprobante/`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `comprobante-venta-${ventaId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast(`Comprobante de venta #${ventaId} generado.`);
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo generar el comprobante.'), 'error');
    } finally {
      setDescargando('');
    }
  };

  const totalComprobantes = ventasFiltradas.reduce((acc, venta) => acc + Number(venta.total || 0), 0);

  return (
    <div>
      <div className="ventas-caja-stats ventas-dashboard-stats">
        <div className="stat-card">
          <div className="label">Ventas pagadas</div>
          <div className="value">{ventasFiltradas.length}</div>
          <div className="sub">Disponibles para comprobante</div>
        </div>
        <div className="stat-card">
          <div className="label">Monto comprobable</div>
          <div className="value gold">{dinero(totalComprobantes)}</div>
          <div className="sub">Segun filtros activos</div>
        </div>
        <div className="stat-card">
          <div className="label">Formato</div>
          <div className="value">PDF</div>
          <div className="sub">Descarga directa</div>
        </div>
      </div>

      <div className="card">
        <div className="ventas-caja-header">
          <div>
            <h3 className="ventas-caja-title">Generar comprobantes</h3>
            <p className="ventas-caja-subtitle">Selecciona una venta pagada y descarga su comprobante de pago.</p>
          </div>
          <button className="btn-outline" onClick={cargarVentas}>Actualizar</button>
        </div>

        <div className="ventas-filter-grid">
          <div className="search-box ventas-caja-search">
            <span className="icon">Buscar</span>
            <input placeholder="Buscar por venta, cliente, cajero u observacion..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          <input className="input-field" placeholder="Cliente" value={filtros.cliente} onChange={e => setFiltros({ ...filtros, cliente: e.target.value })} />
          <input className="input-field" type="date" value={filtros.fecha} onChange={e => setFiltros({ ...filtros, fecha: e.target.value })} />
        </div>

        <table className="tabla">
          <thead>
            <tr><th>Venta</th><th>Fecha</th><th>Cliente</th><th>Pago</th><th>Total</th><th>Detalle</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {ventasFiltradas.length === 0 ? (
              <tr><td colSpan={7} className="ventas-caja-empty">No hay ventas pagadas para generar comprobante.</td></tr>
            ) : ventasFiltradas.map(venta => (
              <tr key={idVenta(venta)}>
                <td className="ventas-caja-name">#{idVenta(venta)}</td>
                <td>{fechaLocal(venta.fecha_registro)}</td>
                <td>
                  <div>{venta.cliente_nombre || venta.codigo_cliente || 'Consumidor final'}</div>
                  <div className="ventas-caja-muted">Cajero: {venta.cajero_nombre || venta.codigo_cajero || '-'}</div>
                </td>
                <td>
                  <div className="ventas-detail-list">
                    {(venta.pagos || []).map(pago => (
                      <span key={pago.id_pago || `${pago.metodo_pago_nombre}-${pago.monto}`}>
                        {pago.metodo_pago_nombre}: {dinero(pago.monto)}
                      </span>
                    ))}
                  </div>
                </td>
                <td>{dinero(venta.total)}</td>
                <td>
                  <div className="ventas-detail-list">
                    {(venta.detalles || []).slice(0, 2).map(detalle => (
                      <span key={detalle.id_detalle || `${detalle.tipo_item}-${detalleNombre(detalle)}`}>{detalle.cantidad} x {detalleNombre(detalle)}</span>
                    ))}
                    {(venta.detalles || []).length > 2 && <span>+ {(venta.detalles || []).length - 2} mas</span>}
                  </div>
                </td>
                <td className="ventas-caja-row-actions">
                  <button className="btn-gold" onClick={() => descargarComprobante(venta)} disabled={descargando === idVenta(venta)}>
                    {descargando === idVenta(venta) ? 'Generando...' : 'Descargar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
