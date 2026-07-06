import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

const ENDPOINT = 'ventas-caja/ventas-cuotas/';
const EMPTY_DETALLE = { tipo_item: 'PRODUCTO', id_producto: '', id_servicio: '', codigo_barbero: '', cantidad: 1, descuento: '0.00' };
const EMPTY_FORM = { codigo_cliente: '', id_cita: '', descuento: '0.00', observacion: 'Venta por cuotas', detalles: [{ ...EMPTY_DETALLE }], monto_inicial: '', cantidad_cuotas: 3, id_metodo_pago_inicial: '', referencia_inicial: '', fecha_primer_vencimiento: '', dias_entre_cuotas: 30 };

function Toast({ msg, type, onClose }) { useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]); return <div className={`toast ${type}`}>{type === 'success' ? 'OK' : 'Error'} {msg}</div>; }
function normalizarLista(data, key) { if (Array.isArray(data)) return data; if (Array.isArray(data?.results)) return data.results; if (Array.isArray(data?.[key])) return data[key]; return []; }
function idPlan(p) { return p?.id_venta_cuotas || p?.id || ''; }
function idProducto(p) { return p?.id_producto || p?.id || ''; }
function idServicio(s) { return s?.id_servicio || s?.id || ''; }
function idMetodo(m) { return m?.id_metodo_pago || m?.id || ''; }
function nombrePersona(p) { return [p?.nombre, p?.apellido].filter(Boolean).join(' ') || p?.cliente_nombre || p?.codigo || ''; }
function dinero(v) { const n = Number(v || 0); return `Bs. ${Number.isNaN(n) ? '0.00' : n.toFixed(2)}`; }
function fecha(v) { if (!v) return '-'; const f = new Date(v); return Number.isNaN(f.getTime()) ? String(v) : f.toLocaleDateString('es-BO'); }
function estadoClase(e) { if (e === 'PAGADA') return 'badge-green'; if (e === 'ANULADA' || e === 'VENCIDA') return 'badge-red'; return 'badge-yellow'; }
function detalleNombre(d) { return d?.tipo_item === 'PRODUCTO' ? d?.producto_nombre || `Producto ${d?.id_producto || ''}` : d?.servicio_nombre || `Servicio ${d?.id_servicio || ''}`; }

// CU33: Gestionar venta por cuotas.
// Crea ventas financiadas con pago inicial y cuotas generadas por el backend.
export default function VentasCuotas() {
  const [planes, setPlanes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [metodos, setMetodos] = useState([]);
  const [filtros, setFiltros] = useState({ estado: '', codigo_cliente: '', id_venta: '' });
  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, detalles: [{ ...EMPTY_DETALLE }] });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // READ: lista planes de ventas por cuotas con filtros soportados por el backend.
  const cargarPlanes = async () => {
    try {
      const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
      const response = await api.get(ENDPOINT, { params });
      setPlanes(normalizarLista(response.data, 'ventas_cuotas'));
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudieron cargar las ventas por cuotas.'), 'error');
    }
  };

  const cargarCatalogos = async () => {
    const [clientesRes, barberosRes, serviciosRes, productosRes, metodosRes] = await Promise.allSettled([
      api.get('seguridad/usuarios/'), api.get('seguridad/barberos/'), api.get('servicios/servicios/'), api.get('inventario/productos/'), api.get('ventas-caja/metodos-pago/'),
    ]);
    if (clientesRes.status === 'fulfilled') setClientes(normalizarLista(clientesRes.value.data).filter(u => u.rol === 'Cliente' || u.rol?.toLowerCase() === 'cliente'));
    if (barberosRes.status === 'fulfilled') setBarberos(normalizarLista(barberosRes.value.data, 'barberos'));
    if (serviciosRes.status === 'fulfilled') setServicios(normalizarLista(serviciosRes.value.data, 'servicios'));
    if (productosRes.status === 'fulfilled') setProductos(normalizarLista(productosRes.value.data, 'productos'));
    if (metodosRes.status === 'fulfilled') setMetodos(normalizarLista(metodosRes.value.data, 'metodos_pago'));
  };

  useEffect(() => { cargarCatalogos(); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { cargarPlanes(); }, [filtros.estado, filtros.codigo_cliente, filtros.id_venta]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  const cerrar = () => { setModal(null); setDetalle(null); setForm({ ...EMPTY_FORM, detalles: [{ ...EMPTY_DETALLE }] }); };
  const abrirCrear = () => setModal('crear');
  const abrirDetalle = async (plan) => {
    try {
      const response = await api.get(`${ENDPOINT}${idPlan(plan)}/`);
      setDetalle(response.data?.venta_cuotas || response.data);
      setModal('detalle');
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo consultar el detalle.'), 'error');
    }
  };

  const actualizarDetalle = (index, cambios) => setForm(actual => ({ ...actual, detalles: actual.detalles.map((d, i) => i === index ? { ...d, ...cambios } : d) }));
  const agregarDetalle = () => setForm(actual => ({ ...actual, detalles: [...actual.detalles, { ...EMPTY_DETALLE }] }));
  const quitarDetalle = (index) => setForm(actual => ({ ...actual, detalles: actual.detalles.filter((_, i) => i !== index) }));

  // CREATE: envia VentaCuotasCrearSerializer, incluyendo venta base, pago inicial y calendario.
  const registrar = async () => {
    if (!form.codigo_cliente && !form.id_cita) return showToast('Selecciona un cliente o una cita.', 'error');
    if (!form.monto_inicial || Number(form.monto_inicial) <= 0) return showToast('El monto inicial debe ser mayor a 0.', 'error');
    if (!form.id_metodo_pago_inicial) return showToast('Selecciona metodo de pago inicial.', 'error');
    if (!form.fecha_primer_vencimiento) return showToast('Selecciona la fecha del primer vencimiento.', 'error');

    const detalles = form.detalles.map(d => {
      const base = { tipo_item: d.tipo_item, cantidad: Number(d.cantidad || 1), descuento: d.descuento || '0.00' };
      return d.tipo_item === 'PRODUCTO' ? { ...base, id_producto: Number(d.id_producto) } : { ...base, id_servicio: Number(d.id_servicio), codigo_barbero: d.codigo_barbero };
    });
    if (!form.id_cita && detalles.some(d => d.tipo_item === 'PRODUCTO' && !d.id_producto)) return showToast('Selecciona producto en cada detalle PRODUCTO.', 'error');
    if (!form.id_cita && detalles.some(d => d.tipo_item === 'SERVICIO' && (!d.id_servicio || !d.codigo_barbero))) return showToast('Selecciona servicio y barbero en cada detalle SERVICIO.', 'error');

    const payload = { descuento: form.descuento || '0.00', observacion: form.observacion, monto_inicial: form.monto_inicial, cantidad_cuotas: Number(form.cantidad_cuotas), id_metodo_pago_inicial: Number(form.id_metodo_pago_inicial), referencia_inicial: form.referencia_inicial, fecha_primer_vencimiento: form.fecha_primer_vencimiento, dias_entre_cuotas: Number(form.dias_entre_cuotas || 30) };
    if (form.codigo_cliente) payload.codigo_cliente = form.codigo_cliente;
    if (form.id_cita) payload.id_cita = Number(form.id_cita);
    if (detalles.length) payload.detalles = detalles;

    setLoading(true);
    try {
      await api.post(ENDPOINT, payload);
      showToast('Venta por cuotas registrada correctamente.');
      cerrar();
      cargarPlanes();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo registrar la venta por cuotas.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtrados = useMemo(() => {
    const q = buscar.toLowerCase();
    return planes.filter(p => [idPlan(p), p.id_venta, p.venta?.cliente_nombre, p.venta?.codigo_cliente, p.estado, p.monto_inicial, p.saldo_pendiente]
      .some(v => String(v ?? '').toLowerCase().includes(q)));
  }, [buscar, planes]);

  return <div>
    <div className="ventas-caja-stats ventas-dashboard-stats"><div className="stat-card"><div className="label">Planes</div><div className="value">{planes.length}</div><div className="sub">Segun filtros</div></div><div className="stat-card"><div className="label">Pendientes</div><div className="value gold">{planes.filter(p => p.estado === 'PENDIENTE').length}</div><div className="sub">Con saldo</div></div><div className="stat-card"><div className="label">Saldo pendiente</div><div className="value">{dinero(planes.reduce((a,p)=>a+Number(p.saldo_pendiente||0),0))}</div><div className="sub">Total listado</div></div></div>
    <div className="card"><div className="ventas-caja-header"><div><h3 className="ventas-caja-title">Gestion de venta por cuotas</h3><p className="ventas-caja-subtitle">Registra ventas con pago inicial y calendario de cuotas.</p></div><button className="btn-gold" onClick={abrirCrear}>Nueva venta por cuotas</button></div>
      <div className="ventas-filter-grid"><div className="search-box ventas-caja-search"><span className="icon">Buscar</span><input placeholder="Buscar por cliente, venta o estado" value={buscar} onChange={e => setBuscar(e.target.value)} /></div><select className="input-field" value={filtros.estado} onChange={e=>setFiltros({...filtros,estado:e.target.value})}><option value="">Todos</option><option value="PENDIENTE">Pendiente</option><option value="PAGADA">Pagada</option><option value="ANULADA">Anulada</option></select><input className="input-field" placeholder="Codigo cliente" value={filtros.codigo_cliente} onChange={e=>setFiltros({...filtros,codigo_cliente:e.target.value})}/><input className="input-field" placeholder="Id venta" value={filtros.id_venta} onChange={e=>setFiltros({...filtros,id_venta:e.target.value})}/></div>
      <div className="ventas-cuotas-table"><table className="tabla"><thead><tr><th>Plan</th><th>Venta</th><th>Cliente</th><th>Inicial</th><th>Saldo</th><th>Cuotas</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{filtrados.length===0?<tr><td colSpan={8} className="ventas-caja-empty">No se encontraron ventas por cuotas.</td></tr>:filtrados.map(p=><tr key={idPlan(p)}><td className="ventas-caja-name">#{idPlan(p)}</td><td>#{p.id_venta}</td><td>{p.venta?.cliente_nombre || p.venta?.codigo_cliente || '-'}</td><td>{dinero(p.monto_inicial)}</td><td>{dinero(p.saldo_pendiente)}</td><td>{p.cantidad_cuotas}</td><td><span className={`badge ${estadoClase(p.estado)}`}>{p.estado}</span></td><td><button className="btn-outline" onClick={()=>abrirDetalle(p)}>Ver detalle</button></td></tr>)}</tbody></table></div>
    </div>

    {modal==='crear'&&<div className="modal-overlay" onClick={cerrar}><div className="modal-box ventas-modal-xl" onClick={e=>e.stopPropagation()}><h3>Nueva venta por cuotas</h3><p>Completa la venta base, pago inicial y condiciones de cuotas.</p><div className="form-row"><div className="form-group"><label>Cliente</label><select className="input-field" value={form.codigo_cliente} onChange={e=>setForm({...form,codigo_cliente:e.target.value})}><option value="">Seleccionar cliente</option>{clientes.map(c=><option key={c.codigo} value={c.codigo}>{nombrePersona(c)} - {c.codigo}</option>)}</select></div><div className="form-group"><label>Cita</label><input className="input-field" value={form.id_cita} onChange={e=>setForm({...form,id_cita:e.target.value})} placeholder="Opcional"/></div></div><div className="form-row"><div className="form-group"><label>Descuento</label><input className="input-field" type="number" step="0.01" value={form.descuento} onChange={e=>setForm({...form,descuento:e.target.value})}/></div><div className="form-group"><label>Observacion</label><input className="input-field" value={form.observacion} onChange={e=>setForm({...form,observacion:e.target.value})}/></div></div>
      <div className="ventas-section-head"><h4>Detalles de venta</h4><button className="btn-outline" onClick={agregarDetalle}>Agregar detalle</button></div><div className="ventas-detalles-editor">{form.detalles.map((d,i)=><div key={i} className="ventas-detalle-card"><div className="ventas-detail-grid"><div className="form-group"><label>Tipo</label><select className="input-field" value={d.tipo_item} onChange={e=>actualizarDetalle(i,{tipo_item:e.target.value})}><option value="PRODUCTO">Producto</option><option value="SERVICIO">Servicio</option></select></div>{d.tipo_item==='PRODUCTO'?<div className="form-group ventas-product-field"><label>Producto</label><select className="input-field" value={d.id_producto} onChange={e=>actualizarDetalle(i,{id_producto:e.target.value})}><option value="">Seleccionar</option>{productos.map(p=><option key={idProducto(p)} value={idProducto(p)}>{p.nombre}</option>)}</select></div>:<><div className="form-group"><label>Servicio</label><select className="input-field" value={d.id_servicio} onChange={e=>actualizarDetalle(i,{id_servicio:e.target.value})}><option value="">Seleccionar</option>{servicios.map(s=><option key={idServicio(s)} value={idServicio(s)}>{s.nombre}</option>)}</select></div><div className="form-group"><label>Barbero</label><select className="input-field" value={d.codigo_barbero} onChange={e=>actualizarDetalle(i,{codigo_barbero:e.target.value})}><option value="">Seleccionar</option>{barberos.map(b=><option key={b.codigo} value={b.codigo}>{nombrePersona(b)}</option>)}</select></div></>}<div className="form-group"><label>Cantidad</label><input className="input-field" type="number" min="1" value={d.cantidad} onChange={e=>actualizarDetalle(i,{cantidad:e.target.value})}/></div><div className="form-group"><label>Desc.</label><input className="input-field" type="number" step="0.01" value={d.descuento} onChange={e=>actualizarDetalle(i,{descuento:e.target.value})}/></div></div>{form.detalles.length>1&&<button className="btn-outline ventas-caja-delete" onClick={()=>quitarDetalle(i)}>Quitar detalle</button>}</div>)}</div>
      <div className="ventas-section-head"><h4>Plan de cuotas</h4></div><div className="form-row"><div className="form-group"><label>Monto inicial</label><input className="input-field" type="number" step="0.01" value={form.monto_inicial} onChange={e=>setForm({...form,monto_inicial:e.target.value})}/></div><div className="form-group"><label>Metodo pago inicial</label><select className="input-field" value={form.id_metodo_pago_inicial} onChange={e=>setForm({...form,id_metodo_pago_inicial:e.target.value})}><option value="">Seleccionar</option>{metodos.map(m=><option key={idMetodo(m)} value={idMetodo(m)}>{m.nombre}</option>)}</select></div></div><div className="form-row"><div className="form-group"><label>Cantidad cuotas</label><input className="input-field" type="number" min="1" value={form.cantidad_cuotas} onChange={e=>setForm({...form,cantidad_cuotas:e.target.value})}/></div><div className="form-group"><label>Primer vencimiento</label><input className="input-field" type="date" value={form.fecha_primer_vencimiento} onChange={e=>setForm({...form,fecha_primer_vencimiento:e.target.value})}/></div><div className="form-group"><label>Dias entre cuotas</label><input className="input-field" type="number" min="1" value={form.dias_entre_cuotas} onChange={e=>setForm({...form,dias_entre_cuotas:e.target.value})}/></div></div><div className="form-group"><label>Referencia pago inicial</label><input className="input-field" value={form.referencia_inicial} onChange={e=>setForm({...form,referencia_inicial:e.target.value})}/></div><div className="ventas-caja-modal-actions"><button className="btn-outline ventas-caja-modal-button" onClick={cerrar}>Cancelar</button><button className="btn-gold ventas-caja-modal-button" onClick={registrar} disabled={loading}>{loading?'Guardando...':'Registrar'}</button></div></div></div>}

    {modal==='detalle'&&detalle&&<div className="modal-overlay" onClick={cerrar}><div className="modal-box ventas-modal-xl" onClick={e=>e.stopPropagation()}><h3>Detalle venta por cuotas #{idPlan(detalle)}</h3><p>Venta #{detalle.id_venta} - {detalle.venta?.cliente_nombre || '-'}</p><div className="ventas-payment-summary"><span><strong>Inicial</strong><br/>{dinero(detalle.monto_inicial)}</span><span><strong>Saldo pendiente</strong><br/>{dinero(detalle.saldo_pendiente)}</span><span><strong>Cuotas</strong><br/>{detalle.cantidad_cuotas}</span><span><strong>Estado</strong><br/>{detalle.estado}</span></div><table className="tabla"><thead><tr><th>Cuota</th><th>Monto</th><th>Vencimiento</th><th>Estado</th><th>Fecha pago</th></tr></thead><tbody>{(detalle.cuotas||[]).map(c=><tr key={c.id_cuota}><td>#{c.numero_cuota}</td><td>{dinero(c.monto)}</td><td>{fecha(c.fecha_vencimiento)}</td><td><span className={`badge ${estadoClase(c.estado)}`}>{c.estado}</span></td><td>{fecha(c.fecha_pago)}</td></tr>)}</tbody></table><div className="ventas-section-head"><h4>Detalle de venta</h4></div><div className="ventas-detail-list">{(detalle.venta?.detalles||[]).map(d=><span key={d.id_detalle}>{d.cantidad} x {detalleNombre(d)} - {dinero(d.subtotal)}</span>)}</div><button className="btn-gold ventas-caja-modal-button" onClick={cerrar}>Cerrar</button></div></div>}
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>} </div>;
}
