import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';
import StripePaymentPortal from '../../components/StripePaymentPortal';

const EMPTY_FORM = {
  codigo_cliente: '',
  id_cita: '',
  descuento: '0.00',
  observacion: '',
  detalles: [],
};

const EMPTY_DETALLE = {
  tipo_item: 'SERVICIO',
  id_servicio: '',
  id_producto: '',
  codigo_barbero: '',
  cantidad: 1,
  descuento: '0.00',
};

const EMPTY_PAGO = { id_metodo_pago: '', monto: '', referencia: '' };

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

function idProducto(producto) {
  return producto?.id_producto || producto?.id || '';
}

function idServicio(servicio) {
  return servicio?.id_servicio || servicio?.id || '';
}

function idMetodo(metodo) {
  return metodo?.id_metodo_pago || metodo?.id || '';
}

function nombrePersona(persona) {
  return [persona?.nombre, persona?.apellido].filter(Boolean).join(' ') || persona?.cliente_nombre || persona?.barbero_nombre || '';
}

function dinero(valor) {
  const numero = Number(valor || 0);
  if (Number.isNaN(numero)) return 'Bs. 0.00';
  return `Bs. ${numero.toFixed(2)}`;
}

function estadoClase(estado) {
  if (estado === 'PAGADA') return 'badge-green';
  if (estado === 'ANULADA') return 'badge-red';
  return 'badge-yellow';
}

function detalleNombre(detalle) {
  return detalle?.tipo_item === 'PRODUCTO'
    ? detalle?.producto_nombre || `Producto ${detalle?.id_producto || ''}`
    : detalle?.servicio_nombre || `Servicio ${detalle?.id_servicio || ''}`;
}

function citaServiciosDetalle(cita) {
  if (Array.isArray(cita?.servicios_detalle)) return cita.servicios_detalle;
  if (Array.isArray(cita?.detalles_servicio)) return cita.detalles_servicio;
  if (Array.isArray(cita?.servicios)) return cita.servicios;
  return [];
}

export default function Ventas() {
  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [filtros, setFiltros] = useState({ estado: '', cliente: '', fecha: '' });
  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState(null);
  const [ventaActual, setVentaActual] = useState(null);
  const [citaVenta, setCitaVenta] = useState(null);
  const [loadingCita, setLoadingCita] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM, detalles: [{ ...EMPTY_DETALLE }] });
  const [pagos, setPagos] = useState([{ ...EMPTY_PAGO }]);
  const [pagoModo, setPagoModo] = useState('manual');
  const [stripeIntent, setStripeIntent] = useState(null);
  const [stripeEstado, setStripeEstado] = useState('');
  const [verificandoStripe, setVerificandoStripe] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const cargarVentas = async () => {
    try {
      const params = {};
      if (filtros.estado) params.estado = filtros.estado;
      if (filtros.cliente) params.cliente = filtros.cliente;
      if (filtros.fecha) params.fecha = filtros.fecha;
      const response = await api.get('ventas-caja/ventas/', { params });
      setVentas(normalizarLista(response.data, 'ventas'));
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudieron cargar las ventas.'), 'error');
    }
  };

  const cargarCatalogos = async () => {
    const [clientesRes, barberosRes, serviciosRes, productosRes, metodosRes] = await Promise.allSettled([
      api.get('seguridad/usuarios/'),
      api.get('seguridad/barberos/'),
      api.get('servicios/servicios/'),
      api.get('inventario/productos/'),
      api.get('ventas-caja/metodos-pago/'),
    ]);

    if (clientesRes.status === 'fulfilled') {
      setClientes(normalizarLista(clientesRes.value.data).filter(u => u.rol === 'Cliente' || u.rol?.toLowerCase() === 'cliente'));
    }
    if (barberosRes.status === 'fulfilled') setBarberos(normalizarLista(barberosRes.value.data, 'barberos'));
    if (serviciosRes.status === 'fulfilled') setServicios(normalizarLista(serviciosRes.value.data, 'servicios'));
    if (productosRes.status === 'fulfilled') setProductos(normalizarLista(productosRes.value.data, 'productos'));
    if (metodosRes.status === 'fulfilled') setMetodosPago(normalizarLista(metodosRes.value.data, 'metodos_pago'));

    if ([clientesRes, barberosRes, serviciosRes, productosRes, metodosRes].some(item => item.status === 'rejected')) {
      showToast('No se pudieron cargar todos los catalogos para ventas.', 'error');
    }
  };

  useEffect(() => { cargarCatalogos(); }, []); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { cargarVentas(); }, [filtros.estado, filtros.cliente, filtros.fecha]); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const cerrar = () => {
    setModal(null);
    setVentaActual(null);
    setMotivo('');
    setCitaVenta(null);
    setPagos([{ ...EMPTY_PAGO }]);
    setPagoModo('manual');
    setStripeIntent(null);
    setStripeEstado('');
    setVerificandoStripe(false);
    setForm({ ...EMPTY_FORM, detalles: [{ ...EMPTY_DETALLE }] });
  };

  const abrirCrear = () => {
    setForm({ ...EMPTY_FORM, detalles: [{ ...EMPTY_DETALLE }] });
    setCitaVenta(null);
    setModal('crear');
  };

  const consultarCitaVenta = async (id = form.id_cita) => {
    if (!id) {
      setCitaVenta(null);
      return;
    }

    setLoadingCita(true);
    try {
      const response = await api.get(`citas/citas/${id}/`);
      setCitaVenta(response.data?.cita || response.data);
    } catch (error) {
      setCitaVenta(null);
      showToast(formatApiError(error.response?.data, 'No se pudo consultar la cita.'), 'error');
    } finally {
      setLoadingCita(false);
    }
  };

  const abrirConfirmar = (venta) => {
    setVentaActual(venta);
    setPagos([{ ...EMPTY_PAGO, monto: venta?.total || '' }]);
    setPagoModo('manual');
    setStripeIntent(null);
    setStripeEstado('');
    setVerificandoStripe(false);
    setModal('confirmar');
  };

  const abrirAnular = (venta) => {
    setVentaActual(venta);
    setMotivo('');
    setModal('anular');
  };

  const actualizarDetalle = (index, cambios) => {
    setForm(actual => ({
      ...actual,
      detalles: actual.detalles.map((detalle, i) => i === index ? { ...detalle, ...cambios } : detalle),
    }));
  };

  const agregarDetalle = () => {
    setForm(actual => ({
      ...actual,
      detalles: [...actual.detalles, actual.id_cita ? { ...EMPTY_DETALLE, tipo_item: 'PRODUCTO' } : { ...EMPTY_DETALLE }],
    }));
  };

  const quitarDetalle = (index) => {
    setForm(actual => ({ ...actual, detalles: actual.detalles.filter((_, i) => i !== index) }));
  };

  const actualizarPago = (index, cambios) => {
    setPagos(actual => actual.map((pago, i) => i === index ? { ...pago, ...cambios } : pago));
  };

  const agregarPago = () => setPagos(actual => [...actual, { ...EMPTY_PAGO }]);
  const quitarPago = (index) => setPagos(actual => actual.filter((_, i) => i !== index));

  const crearVenta = async () => {
    if (!form.codigo_cliente && !form.id_cita) return showToast('Selecciona un cliente o una cita.', 'error');
    if (!form.id_cita && form.detalles.length === 0) return showToast('Agrega al menos un detalle.', 'error');

    const detalles = form.detalles.map(detalle => {
      const base = {
        tipo_item: detalle.tipo_item,
        cantidad: Number(detalle.cantidad || 1),
        descuento: detalle.descuento || '0.00',
      };

      if (detalle.tipo_item === 'PRODUCTO') {
        return { ...base, id_producto: Number(detalle.id_producto) };
      }

      return {
        ...base,
        id_servicio: Number(detalle.id_servicio),
        codigo_barbero: detalle.codigo_barbero,
      };
    });

    if (detalles.some(detalle => detalle.tipo_item === 'PRODUCTO' && !detalle.id_producto)) {
      return showToast('Selecciona producto en todos los detalles de tipo PRODUCTO.', 'error');
    }
    if (!form.id_cita && detalles.some(detalle => detalle.tipo_item === 'SERVICIO' && (!detalle.id_servicio || !detalle.codigo_barbero))) {
      return showToast('Selecciona servicio y barbero en todos los detalles de tipo SERVICIO.', 'error');
    }

    const payload = {
      descuento: form.descuento || '0.00',
      observacion: form.observacion,
    };
    if (form.codigo_cliente) payload.codigo_cliente = form.codigo_cliente;
    if (form.id_cita) payload.id_cita = Number(form.id_cita);
    if (detalles.length > 0) payload.detalles = detalles;

    setLoading(true);
    try {
      const response = await api.post('ventas-caja/ventas/', payload);
      const venta = response.data?.venta;
      showToast(response.data?.mensaje || 'Venta creada en borrador correctamente.');
      cerrar();
      await cargarVentas();
      if (venta) abrirConfirmar(venta);
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo crear la venta.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const confirmarVenta = async () => {
    const totalVenta = Number(ventaActual?.total || 0);
    const totalPagos = pagos.reduce((acc, pago) => acc + Number(pago.monto || 0), 0);

    if (pagos.some(pago => !pago.id_metodo_pago || !pago.monto)) return showToast('Completa metodo y monto de cada pago.', 'error');
    if (Math.round(totalPagos * 100) !== Math.round(totalVenta * 100)) {
      return showToast(`La suma de pagos debe ser exactamente ${dinero(totalVenta)}.`, 'error');
    }

    setLoading(true);
    try {
      const payload = {
        pagos: pagos.map(pago => ({
          id_metodo_pago: Number(pago.id_metodo_pago),
          monto: pago.monto,
          referencia: pago.referencia,
        })),
      };
      const response = await api.post(`ventas-caja/ventas/${idVenta(ventaActual)}/confirmar/`, payload);
      showToast(response.data?.mensaje || 'Venta confirmada correctamente.');
      cerrar();
      cargarVentas();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo confirmar la venta.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const mensajeErrorStripe = (error) => {
    const texto = formatApiError(error.response?.data, 'No se pudo iniciar el pago con Stripe.');
    if (texto.includes('STRIPE_SECRET_KEY')) return 'Stripe no esta configurado en el backend.';
    if (texto.toLowerCase().includes('caja abierta')) return 'Primero debe abrir caja.';
    return texto;
  };

  const crearIntentStripe = async () => {
    const ventaId = idVenta(ventaActual);
    const totalVenta = Number(ventaActual?.total || 0);

    if (!ventaId) return showToast('No existe una venta para pagar.', 'error');
    if (totalVenta <= 0) return showToast('No se puede pagar una venta con total cero.', 'error');

    setLoading(true);
    setStripeEstado('');
    try {
      const response = await api.post(`ventas-caja/ventas/${ventaId}/stripe/payment-intent/`, {});
      const data = response.data || {};

      if (!data.client_secret) {
        throw new Error('No se pudo iniciar el pago con Stripe.');
      }
      if (data.venta?.estado !== 'PENDIENTE_PAGO') {
        throw new Error('La venta no quedo pendiente de pago.');
      }

      setStripeIntent(data);
      setVentaActual(actual => ({ ...actual, ...data.venta }));
      setStripeEstado('Formulario de pago listo. Ingresa la tarjeta para continuar.');
      showToast(data.mensaje || 'Intento de pago Stripe creado correctamente.');
      await cargarVentas();
    } catch (error) {
      const mensaje = error.response ? mensajeErrorStripe(error) : error.message;
      setStripeEstado(mensaje);
      showToast(mensaje, 'error');
    } finally {
      setLoading(false);
    }
  };

  const verificarVentaStripe = async () => {
    const ventaId = idVenta(ventaActual);
    if (!ventaId) return;

    setVerificandoStripe(true);
    try {
      const response = await api.get(`ventas-caja/ventas/${ventaId}/`);
      const venta = response.data?.venta || response.data;
      setVentaActual(venta);
      await cargarVentas();

      if (venta?.estado === 'PAGADA') {
        setStripeEstado('Pago confirmado por el servidor. Venta pagada.');
        showToast('Pago Stripe confirmado correctamente.');
        return;
      }

      setStripeEstado('Pago recibido, esperando confirmacion del servidor.');
      showToast('Pago recibido, esperando confirmacion del servidor.');
    } catch (error) {
      const mensaje = formatApiError(error.response?.data, 'No se pudo verificar el estado de la venta.');
      setStripeEstado(mensaje);
      showToast(mensaje, 'error');
    } finally {
      setVerificandoStripe(false);
    }
  };

  const anularVenta = async () => {
    if (!motivo.trim()) return showToast('Escribe el motivo de anulacion.', 'error');

    setLoading(true);
    try {
      const response = await api.post(`ventas-caja/ventas/${idVenta(ventaActual)}/anular/`, { motivo });
      showToast(response.data?.mensaje || 'Venta anulada correctamente.');
      cerrar();
      cargarVentas();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo anular la venta.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const ventasFiltradas = useMemo(() => {
    const q = buscar.toLowerCase();
    return ventas.filter(venta => [
      idVenta(venta),
      venta?.cliente_nombre,
      venta?.codigo_cliente,
      venta?.cajero_nombre,
      venta?.estado,
      venta?.observacion,
    ].some(valor => String(valor || '').toLowerCase().includes(q)));
  }, [buscar, ventas]);

  const totalPagos = pagos.reduce((acc, pago) => acc + Number(pago.monto || 0), 0);
  const totalPagadas = ventas.filter(venta => venta.estado === 'PAGADA').reduce((acc, venta) => acc + Number(venta.total || 0), 0);

  return (
    <div>
      <div className="ventas-caja-stats ventas-dashboard-stats">
        <div className="stat-card">
          <div className="label">Ventas</div>
          <div className="value">{ventas.length}</div>
          <div className="sub">Segun filtros activos</div>
        </div>
        <div className="stat-card">
          <div className="label">Pagadas</div>
          <div className="value gold">{ventas.filter(venta => venta.estado === 'PAGADA').length}</div>
          <div className="sub">{dinero(totalPagadas)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Borradores</div>
          <div className="value">{ventas.filter(venta => venta.estado === 'BORRADOR').length}</div>
          <div className="sub">Pendientes de pago</div>
        </div>
      </div>

      <div className="card">
        <div className="ventas-caja-header">
          <div>
            <h3 className="ventas-caja-title">Gestion de ventas</h3>
            <p className="ventas-caja-subtitle">Crea borradores, confirma pagos y anula ventas cuando corresponda.</p>
          </div>
          <button className="btn-gold" onClick={abrirCrear}>Nueva venta</button>
        </div>

        <div className="ventas-filter-grid">
          <div className="search-box ventas-caja-search">
            <span className="icon">Buscar</span>
            <input placeholder="Buscar por cliente, cajero, estado u observacion..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          <select className="input-field" value={filtros.estado} onChange={e => setFiltros({ ...filtros, estado: e.target.value })}>
            <option value="">Todos los estados</option>
            <option value="BORRADOR">Borrador</option>
            <option value="PAGADA">Pagada</option>
            <option value="ANULADA">Anulada</option>
          </select>
          <input className="input-field" placeholder="Cliente" value={filtros.cliente} onChange={e => setFiltros({ ...filtros, cliente: e.target.value })} />
          <input className="input-field" type="date" value={filtros.fecha} onChange={e => setFiltros({ ...filtros, fecha: e.target.value })} />
        </div>

        <table className="tabla">
          <thead>
            <tr><th>Venta</th><th>Cliente</th><th>Cajero</th><th>Total</th><th>Estado</th><th>Detalle</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {ventasFiltradas.length === 0 ? (
              <tr><td colSpan={7} className="ventas-caja-empty">No se encontraron ventas.</td></tr>
            ) : ventasFiltradas.map(venta => (
              <tr key={idVenta(venta)}>
                <td className="ventas-caja-name">#{idVenta(venta)}</td>
                <td>
                  <div>{venta.cliente_nombre || venta.codigo_cliente || '-'}</div>
                  {venta.id_cita && <div className="ventas-caja-muted">Cita #{venta.id_cita}</div>}
                </td>
                <td>{venta.cajero_nombre || venta.codigo_cajero || '-'}</td>
                <td>{dinero(venta.total)}</td>
                <td><span className={`badge ${estadoClase(venta.estado)}`}>{venta.estado}</span></td>
                <td>
                  <div className="ventas-detail-list">
                    {(venta.detalles || []).slice(0, 2).map(detalle => (
                      <span key={detalle.id_detalle || `${detalle.tipo_item}-${detalleNombre(detalle)}`}>{detalle.cantidad} x {detalleNombre(detalle)}</span>
                    ))}
                    {(venta.detalles || []).length > 2 && <span>+ {(venta.detalles || []).length - 2} mas</span>}
                  </div>
                </td>
                <td className="ventas-caja-row-actions">
                  {['BORRADOR', 'PENDIENTE_PAGO'].includes(venta.estado) && <button className="btn-outline" onClick={() => abrirConfirmar(venta)}>Confirmar</button>}
                  {venta.estado !== 'ANULADA' && <button className="btn-outline ventas-caja-delete" onClick={() => abrirAnular(venta)}>Anular</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === 'crear' && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box ventas-modal-xl" onClick={e => e.stopPropagation()}>
            <h3>Nueva venta</h3>
            <p>El backend calcula precios, subtotales, total, stock y comisiones.</p>

            <div className="form-row">
              <div className="form-group">
                <label>Cliente</label>
                <select className="input-field" value={form.codigo_cliente} onChange={e => setForm({ ...form, codigo_cliente: e.target.value })}>
                  <option value="">Seleccionar cliente</option>
                  {clientes.map(cliente => <option key={cliente.codigo} value={cliente.codigo}>{cliente.codigo} - {nombrePersona(cliente)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>ID cita (opcional)</label>
                <input
                  className="input-field"
                  type="number"
                  min="1"
                  value={form.id_cita}
                  onChange={e => {
                    setCitaVenta(null);
                    setForm({ ...form, id_cita: e.target.value, detalles: e.target.value ? [] : [{ ...EMPTY_DETALLE }] });
                  }}
                  onBlur={e => consultarCitaVenta(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Descuento general</label>
                <input className="input-field" type="number" min="0" step="0.01" value={form.descuento} onChange={e => setForm({ ...form, descuento: e.target.value })} />
              </div>
            </div>

            {form.id_cita && (
              <div className="ventas-cita-preview">
                <div className="ventas-section-head">
                  <h4>Servicios de la cita</h4>
                  <button className="btn-outline" type="button" onClick={() => consultarCitaVenta()} disabled={loadingCita}>
                    {loadingCita ? 'Consultando...' : 'Consultar cita'}
                  </button>
                </div>
                {!citaVenta ? (
                  <div className="ventas-caja-empty">Consulta la cita para ver sus servicios antes de cobrar.</div>
                ) : (
                  <>
                    <div className="ventas-payment-summary">
                      <span>Subtotal servicios: <strong>{dinero(citaVenta.subtotal_servicios)}</strong></span>
                      <span>Total estimado: <strong>{dinero(citaVenta.total_estimado)}</strong></span>
                    </div>
                    <div className="ventas-cita-services">
                      {citaServiciosDetalle(citaVenta).map(detalle => (
                        <div key={detalle.id_servicio || detalle.servicio}>
                          <strong>{detalle.servicio || detalle.nombre || detalle.servicio_nombre || `Servicio ${detalle.id_servicio || ''}`}</strong>
                          <span>Precio: {dinero(detalle.precio_unitario)} · Duracion: {detalle.duracion_minutos || '-'} min · Subtotal: {dinero(detalle.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="form-group">
              <label>Observacion</label>
              <textarea className="input-field ventas-caja-textarea" value={form.observacion} onChange={e => setForm({ ...form, observacion: e.target.value })} placeholder="Venta directa en mostrador" />
            </div>

            <div className="ventas-section-head">
              <div>
                <h4>{form.id_cita ? 'Productos extra' : 'Detalles'}</h4>
                {form.id_cita && <p className="ventas-caja-muted">Los servicios de la cita los agrega automaticamente el backend.</p>}
              </div>
              <button className="btn-outline" type="button" onClick={agregarDetalle}>{form.id_cita ? 'Agregar producto extra' : 'Agregar item'}</button>
            </div>

            <div className="ventas-detalles-editor">
              {form.detalles.map((detalle, index) => (
                <div className="ventas-detalle-card" key={`${detalle.tipo_item}-${index}`}>
                  <div className="ventas-detalle-title">Item {index + 1}</div>
                  <div className="ventas-detail-grid">
                    {!form.id_cita && (
                      <div className="form-group">
                        <label>Tipo</label>
                        <select
                          className="input-field"
                          value={detalle.tipo_item}
                          onChange={e => actualizarDetalle(index, {
                            tipo_item: e.target.value,
                            id_servicio: '',
                            id_producto: '',
                            codigo_barbero: '',
                          })}
                        >
                          <option value="SERVICIO">Servicio</option>
                          <option value="PRODUCTO">Producto</option>
                        </select>
                      </div>
                    )}

                    {!form.id_cita && detalle.tipo_item === 'SERVICIO' ? (
                      <>
                        <div className="form-group">
                          <label>Servicio</label>
                          <select className="input-field" value={detalle.id_servicio} onChange={e => actualizarDetalle(index, { id_servicio: e.target.value })}>
                            <option value="">Seleccionar servicio</option>
                            {servicios.map(servicio => <option key={idServicio(servicio)} value={idServicio(servicio)}>{servicio.nombre}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Barbero</label>
                          <select className="input-field" value={detalle.codigo_barbero} onChange={e => actualizarDetalle(index, { codigo_barbero: e.target.value })}>
                            <option value="">Seleccionar barbero</option>
                            {barberos.map(barbero => <option key={barbero.codigo} value={barbero.codigo}>{barbero.codigo} - {nombrePersona(barbero)}</option>)}
                          </select>
                        </div>
                      </>
                    ) : (
                      <div className="form-group ventas-product-field">
                        <label>Producto</label>
                        <select className="input-field" value={detalle.id_producto} onChange={e => actualizarDetalle(index, { id_producto: e.target.value })}>
                          <option value="">Seleccionar producto</option>
                          {productos.map(producto => <option key={idProducto(producto)} value={idProducto(producto)}>{producto.nombre}</option>)}
                        </select>
                      </div>
                    )}

                    <div className="form-group">
                      <label>Cantidad</label>
                      <input className="input-field" type="number" min="1" value={detalle.cantidad} onChange={e => actualizarDetalle(index, { cantidad: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Descuento item</label>
                      <input className="input-field" type="number" min="0" step="0.01" value={detalle.descuento} onChange={e => actualizarDetalle(index, { descuento: e.target.value })} />
                    </div>
                  </div>
                  {form.detalles.length > 1 && <button className="btn-outline ventas-caja-delete" type="button" onClick={() => quitarDetalle(index)}>Quitar item</button>}
                </div>
              ))}
            </div>

            <div className="ventas-caja-modal-actions">
              <button className="btn-outline ventas-caja-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-gold ventas-caja-modal-button" onClick={crearVenta} disabled={loading}>{loading ? 'Creando...' : 'Crear borrador'}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'confirmar' && ventaActual && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box ventas-caja-plan-modal ventas-pago-modal" onClick={e => e.stopPropagation()}>
            <h3>Confirmar venta #{idVenta(ventaActual)}</h3>
            <p>Total a pagar: {dinero(ventaActual.total)}. Selecciona cobro manual o pasarela de pago.</p>

            <div className="ventas-payment-summary">
              <span>Total venta: <strong>{dinero(ventaActual.total)}</strong></span>
              <span>Estado: <strong>{ventaActual.estado || 'BORRADOR'}</strong></span>
            </div>

            <div className="ventas-pay-mode">
              <button
                className={pagoModo === 'manual' ? 'active' : ''}
                type="button"
                onClick={() => setPagoModo('manual')}
                disabled={Boolean(stripeIntent)}
              >
                Efectivo / QR
              </button>
              <button
                className={pagoModo === 'stripe' ? 'active' : ''}
                type="button"
                onClick={() => setPagoModo('stripe')}
              >
                Stripe
              </button>
            </div>

            {pagoModo === 'manual' && (
              <>
                <div className="ventas-payment-summary">
                  <span>Total pagos: <strong>{dinero(totalPagos)}</strong></span>
                  <span>Diferencia: <strong>{dinero(Number(ventaActual.total || 0) - totalPagos)}</strong></span>
                </div>

                <div className="ventas-section-head">
                  <h4>Pagos manuales</h4>
                  <button className="btn-outline" type="button" onClick={agregarPago}>Agregar pago</button>
                </div>

                {pagos.map((pago, index) => (
                  <div className="ventas-pago-row" key={index}>
                    <div className="form-group">
                      <label>Metodo</label>
                      <select className="input-field" value={pago.id_metodo_pago} onChange={e => actualizarPago(index, { id_metodo_pago: e.target.value })}>
                        <option value="">Seleccionar metodo</option>
                        {metodosPago.map(metodo => <option key={idMetodo(metodo)} value={idMetodo(metodo)}>{metodo.nombre}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Monto</label>
                      <input className="input-field" type="number" min="0" step="0.01" value={pago.monto} onChange={e => actualizarPago(index, { monto: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Referencia</label>
                      <input className="input-field" value={pago.referencia} onChange={e => actualizarPago(index, { referencia: e.target.value })} placeholder="QR-839201" />
                    </div>
                    {pagos.length > 1 && <button className="btn-outline ventas-caja-delete ventas-remove-payment" onClick={() => quitarPago(index)}>Quitar</button>}
                  </div>
                ))}

                <div className="ventas-caja-modal-actions">
                  <button className="btn-outline ventas-caja-modal-button" onClick={cerrar}>Cancelar</button>
                  <button className="btn-gold ventas-caja-modal-button" onClick={confirmarVenta} disabled={loading}>{loading ? 'Confirmando...' : 'Confirmar pago'}</button>
                </div>
              </>
            )}

            {pagoModo === 'stripe' && (
              <div className="ventas-stripe-flow">
                {!stripeIntent && (
                  <div className="ventas-stripe-start">
                    <h4>Pasarela de pago</h4>
                    <p>Se creara un intento de pago en Stripe por {dinero(ventaActual.total)}. Despues no llames confirmar manualmente; el backend terminara la venta con el webhook.</p>
                    <button className="btn-gold" type="button" onClick={crearIntentStripe} disabled={loading}>
                      {loading ? 'Iniciando...' : 'Iniciar pago Stripe'}
                    </button>
                  </div>
                )}

                {stripeIntent && (
                  <StripePaymentPortal
                    clientSecret={stripeIntent.client_secret}
                    venta={ventaActual}
                    totalTexto={`${dinero(ventaActual.total)} BOB`}
                    onPagoProcesado={verificarVentaStripe}
                    verificando={verificandoStripe}
                  />
                )}

                {stripeEstado && <div className="ventas-stripe-status">{stripeEstado}</div>}

                <div className="ventas-caja-modal-actions">
                  <button className="btn-outline ventas-caja-modal-button" onClick={cerrar}>Cerrar</button>
                  {stripeIntent && (
                    <button className="btn-outline ventas-caja-modal-button" onClick={verificarVentaStripe} disabled={verificandoStripe}>
                      {verificandoStripe ? 'Consultando...' : 'Reconsultar estado'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {modal === 'anular' && ventaActual && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Anular venta #{idVenta(ventaActual)}</h3>
            <p>Al anular, el backend devolvera stock si corresponde.</p>
            <div className="form-group">
              <label>Motivo</label>
              <textarea className="input-field ventas-caja-textarea" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Cliente solicito anulacion por error en el producto." />
            </div>
            <div className="ventas-caja-modal-actions">
              <button className="btn-outline ventas-caja-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-gold ventas-caja-modal-button" onClick={anularVenta} disabled={loading}>{loading ? 'Anulando...' : 'Anular venta'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
