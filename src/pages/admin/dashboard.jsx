import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

function normalizarLista(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.[key])) return data[key];
  return [];
}

function fechaHoy() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function fechaItem(item) {
  return String(item?.fecha || item?.fecha_venta || item?.fecha_creacion || item?.created_at || item?.fecha_registro || '').slice(0, 10);
}

function horaItem(cita) {
  return String(cita?.hora_inicio || cita?.hora || cita?.inicio || '').slice(0, 5) || '--:--';
}

function nombrePersona(persona) {
  if (!persona) return '-';
  if (typeof persona === 'string') return persona;
  return [persona.nombre, persona.apellido].filter(Boolean).join(' ') || persona.nombre_completo || persona.cliente_nombre || persona.barbero_nombre || '-';
}

function clienteCita(cita) {
  return cita?.cliente_nombre || cita?.cliente || nombrePersona(cita?.codigo_cliente || cita?.id_cliente);
}

function barberoCita(cita) {
  return cita?.barbero_nombre || cita?.barbero || nombrePersona(cita?.codigo_barbero || cita?.id_barbero);
}

function servicioCita(cita) {
  const detalles = cita?.servicios_detalle || cita?.detalles_servicio || cita?.servicios;
  if (Array.isArray(detalles) && detalles.length > 0) {
    return detalles.map(item => item.servicio || item.nombre || item.servicio_nombre || `Servicio ${item.id_servicio || ''}`).join(', ');
  }
  return cita?.servicio_nombre || cita?.nombre_servicio || '-';
}

function estadoCita(cita) {
  return String(cita?.estado || cita?.estado_cita || cita?.id_estadoc?.nombre || 'Pendiente');
}

function estadoClase(estado) {
  const value = String(estado || '').toLowerCase();
  if (value.includes('confirm')) return 'dashboard-status-confirmada';
  if (value.includes('atencion') || value.includes('final')) return 'dashboard-status-atencion';
  if (value.includes('cancel') || value.includes('anul') || value.includes('no asist')) return 'dashboard-status-cancelada';
  return 'dashboard-status-pendiente';
}

function dinero(valor) {
  const numero = Number(valor || 0);
  if (Number.isNaN(numero)) return 'Bs. 0.00';
  return `Bs. ${numero.toFixed(2)}`;
}

function esCliente(usuario) {
  const rol = String(usuario?.rol || usuario?.nombre_rol || usuario?.id_rol?.nombre || '').toLowerCase();
  return rol.includes('cliente');
}

function activo(item) {
  return item?.estado === 'ACTIVO' || item?.activo === true || (!item?.estado && item?.activo !== false);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const hoy = fechaHoy();
  const [data, setData] = useState({
    citas: [],
    ventas: [],
    barberos: [],
    usuarios: [],
    stockBajo: [],
    caja: null,
  });
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');

  const cargarDashboard = async () => {
    setLoading(true);
    setMensaje('');

    const [citasRes, ventasRes, barberosRes, usuariosRes, stockRes, cajaRes] = await Promise.allSettled([
      api.get('citas/citas/'),
      api.get('ventas-caja/ventas/'),
      api.get('seguridad/barberos/'),
      api.get('seguridad/usuarios/'),
      api.get('inventario/productos/stock-bajo/'),
      api.get('ventas-caja/caja/estado/'),
    ]);

    setData({
      citas: citasRes.status === 'fulfilled' ? normalizarLista(citasRes.value.data, 'citas') : [],
      ventas: ventasRes.status === 'fulfilled' ? normalizarLista(ventasRes.value.data, 'ventas') : [],
      barberos: barberosRes.status === 'fulfilled' ? normalizarLista(barberosRes.value.data, 'barberos') : [],
      usuarios: usuariosRes.status === 'fulfilled' ? normalizarLista(usuariosRes.value.data, 'usuarios') : [],
      stockBajo: stockRes.status === 'fulfilled' ? normalizarLista(stockRes.value.data, 'productos') : [],
      caja: cajaRes.status === 'fulfilled' ? cajaRes.value.data : null,
    });

    const errores = [citasRes, ventasRes, barberosRes, usuariosRes, stockRes, cajaRes].filter(item => item.status === 'rejected');
    if (errores.length > 0) {
      setMensaje(formatApiError(errores[0].reason?.response?.data, 'Algunos datos del dashboard no se pudieron cargar.'));
    }
    setLoading(false);
  };

  useEffect(() => { cargarDashboard(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const resumen = useMemo(() => {
    const citasHoy = data.citas.filter(cita => fechaItem(cita) === hoy);
    const confirmadas = citasHoy.filter(cita => estadoCita(cita).toLowerCase().includes('confirm')).length;
    const pendientes = citasHoy.filter(cita => estadoCita(cita).toLowerCase().includes('pend')).length;
    const ventasHoy = data.ventas.filter(venta => fechaItem(venta) === hoy && venta.estado === 'PAGADA');
    const ingresosHoy = ventasHoy.reduce((acc, venta) => acc + Number(venta.total || 0), 0);
    const barberosActivos = data.barberos.filter(activo).length;
    const clientes = data.usuarios.filter(esCliente).length;

    return { citasHoy, confirmadas, pendientes, ingresosHoy, barberosActivos, clientes };
  }, [data, hoy]);

  const agenda = useMemo(() => {
    return resumen.citasHoy
      .slice()
      .sort((a, b) => horaItem(a).localeCompare(horaItem(b)))
      .slice(0, 8);
  }, [resumen.citasHoy]);

  const serviciosTop = useMemo(() => {
    const conteo = new Map();
    data.ventas
      .filter(venta => venta.estado === 'PAGADA')
      .flatMap(venta => venta.detalles || [])
      .filter(detalle => detalle.tipo_item === 'SERVICIO' || detalle.id_servicio || detalle.servicio_nombre)
      .forEach(detalle => {
        const nombre = detalle.servicio_nombre || detalle.servicio || `Servicio ${detalle.id_servicio || ''}`;
        conteo.set(nombre, (conteo.get(nombre) || 0) + Number(detalle.cantidad || 1));
      });

    const total = [...conteo.values()].reduce((acc, valor) => acc + valor, 0) || 1;
    return [...conteo.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([nombre, cantidad]) => ({ nombre, pct: Math.round((cantidad / total) * 100), cantidad }));
  }, [data.ventas]);

  const caja = data.caja?.caja || data.caja?.ultima_caja || null;
  const cajaEstado = data.caja?.estado || caja?.estado || 'SIN_CAJA_ABIERTA';

  const stats = [
    { label: 'Citas de hoy', value: resumen.citasHoy.length, sub: `${resumen.confirmadas} confirmadas`, gold: false },
    { label: 'Ingresos hoy', value: dinero(resumen.ingresosHoy), sub: cajaEstado === 'ABIERTA' ? 'Caja abierta' : 'Caja no abierta', gold: true },
    { label: 'Barberos activos', value: resumen.barberosActivos, sub: `${data.barberos.length} registrados`, gold: false },
    { label: 'Clientes', value: resumen.clientes, sub: 'Registrados en el sistema', gold: false },
  ];

  const operativo = [
    { label: `${resumen.barberosActivos} barberos activos`, className: resumen.barberosActivos > 0 ? 'dashboard-alert-ok' : 'dashboard-alert-warning' },
    { label: `${resumen.confirmadas} citas confirmadas hoy`, className: resumen.confirmadas > 0 ? 'dashboard-alert-ok' : 'dashboard-alert-warning' },
    { label: `${resumen.pendientes} citas pendientes hoy`, className: resumen.pendientes > 0 ? 'dashboard-alert-warning' : 'dashboard-alert-ok' },
    { label: `${data.stockBajo.length} productos con bajo stock`, className: data.stockBajo.length > 0 ? 'dashboard-alert-danger' : 'dashboard-alert-ok' },
    { label: cajaEstado === 'ABIERTA' ? `Caja abierta: ${dinero(caja?.saldo_actual)}` : 'No existe una caja abierta', className: cajaEstado === 'ABIERTA' ? 'dashboard-alert-ok' : 'dashboard-alert-warning' },
  ];

  return (
    <div>
      {mensaje && <div className="dashboard-error">{mensaje}</div>}

      <div className="stats-grid">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="label">{s.label}</div>
            <div className={`value${s.gold ? ' gold' : ''}`}>{loading ? '...' : s.value}</div>
            <div className="sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="dashboard-card-header">
            <div>
              <h3 className="dashboard-card-title">Agenda de hoy</h3>
              <p className="dashboard-card-subtitle">Reservas reales registradas para {hoy}</p>
            </div>
            <button className="btn-gold" onClick={() => navigate('/admin/citas')}>+ Nueva cita</button>
          </div>

          <table className="tabla">
            <thead>
              <tr>
                <th>Hora</th><th>Cliente</th><th>Servicio</th><th>Barbero</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="dashboard-empty">Cargando agenda...</td></tr>
              ) : agenda.length === 0 ? (
                <tr><td colSpan={5} className="dashboard-empty">No hay citas registradas para hoy.</td></tr>
              ) : agenda.map(cita => {
                const estado = estadoCita(cita);
                return (
                  <tr key={cita.id_cita || cita.id}>
                    <td className="dashboard-time">{horaItem(cita)}</td>
                    <td>{clienteCita(cita)}</td>
                    <td>{servicioCita(cita)}</td>
                    <td>{barberoCita(cita)}</td>
                    <td>
                      <span className={`dashboard-status ${estadoClase(estado)}`}>{estado}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="dashboard-side">
          <div className="card">
            <div className="dashboard-card-header compact">
              <h3 className="dashboard-section-title">Estado operativo</h3>
              <button className="btn-outline" onClick={cargarDashboard} disabled={loading}>{loading ? 'Cargando...' : 'Actualizar'}</button>
            </div>
            <div className="dashboard-alert-list">
              {operativo.map(i => (
                <div key={i.label} className={`dashboard-alert ${i.className}`}>
                  {loading ? 'Actualizando datos...' : i.label}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="dashboard-section-title">Servicios top</h3>
            {serviciosTop.length === 0 ? (
              <p className="dashboard-empty">Aun no hay ventas pagadas con servicios.</p>
            ) : serviciosTop.map(s => (
              <div key={s.nombre} className="dashboard-service">
                <div className="dashboard-service-row">
                  <span>{s.nombre}</span><span className="dashboard-service-percent">{s.pct}%</span>
                </div>
                <div className="dashboard-progress">
                  <div className="dashboard-progress-fill" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
