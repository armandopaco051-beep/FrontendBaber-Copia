const AGENDA = [
  { hora: '09:00', cliente: 'Luis Rojas', servicio: 'Corte', barbero: 'Sebastian', estado: 'Confirmada', estadoClass: 'dashboard-status-confirmada' },
  { hora: '10:00', cliente: 'Marco Pena', servicio: 'Corte + barba', barbero: 'Carlos', estado: 'Pendiente', estadoClass: 'dashboard-status-pendiente' },
  { hora: '11:00', cliente: 'Jose Vaca', servicio: 'Perfilado', barbero: 'Renato', estado: 'En atencion', estadoClass: 'dashboard-status-atencion' },
  { hora: '12:00', cliente: 'Diego Soliz', servicio: 'Low fade', barbero: 'Sebastian', estado: 'Confirmada', estadoClass: 'dashboard-status-confirmada' },
];

const STATS = [
  { label: 'Citas de hoy', value: '12', sub: '+4 confirmadas', gold: false },
  { label: 'Ingresos hoy', value: 'Bs. 780', sub: 'QR y efectivo', gold: true },
  { label: 'Barberos activos', value: '3', sub: '1 con retraso', gold: false },
  { label: 'Clientes', value: '145', sub: '8 nuevos este mes', gold: false },
];

const OPERATIVO = [
  { label: '3 barberos disponibles', className: 'dashboard-alert-ok' },
  { label: '8 citas confirmadas', className: 'dashboard-alert-ok' },
  { label: '2 citas pendientes', className: 'dashboard-alert-warning' },
  { label: '1 producto con bajo stock', className: 'dashboard-alert-danger' },
];

const SERVICIOS_TOP = [
  { nombre: 'Corte de cabello', pct: 48, barClass: 'dashboard-progress-48' },
  { nombre: 'Corte + barba', pct: 31, barClass: 'dashboard-progress-31' },
  { nombre: 'Perfilado de cejas', pct: 21, barClass: 'dashboard-progress-21' },
];

// Dashboard muestra un resumen visual del negocio.
// Actualmente usa datos estaticos de ejemplo para defender la maqueta:
// estadisticas, agenda del dia, estado operativo y servicios mas solicitados.
export default function Dashboard() {
  return (
    <div>
      <div className="stats-grid">
        {STATS.map(s => (
          <div key={s.label} className="stat-card">
            <div className="label">{s.label}</div>
            <div className={`value${s.gold ? ' gold' : ''}`}>{s.value}</div>
            <div className="sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="dashboard-card-header">
            <div>
              <h3 className="dashboard-card-title">Agenda de hoy</h3>
              <p className="dashboard-card-subtitle">Reservas organizadas por hora</p>
            </div>
            <button className="btn-gold">+ Nueva cita</button>
          </div>

          <table className="tabla">
            <thead>
              <tr>
                <th>Hora</th><th>Cliente</th><th>Servicio</th><th>Barbero</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {AGENDA.map(a => (
                <tr key={a.hora}>
                  <td className="dashboard-time">{a.hora}</td>
                  <td>{a.cliente}</td>
                  <td>{a.servicio}</td>
                  <td>{a.barbero}</td>
                  <td>
                    <span className={`dashboard-status ${a.estadoClass}`}>{a.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dashboard-side">
          <div className="card">
            <h3 className="dashboard-section-title">Estado operativo</h3>
            <div className="dashboard-alert-list">
              {OPERATIVO.map(i => (
                <div key={i.label} className={`dashboard-alert ${i.className}`}>
                  {i.label}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="dashboard-section-title">Servicios top</h3>
            {SERVICIOS_TOP.map(s => (
              <div key={s.nombre} className="dashboard-service">
                <div className="dashboard-service-row">
                  <span>{s.nombre}</span><span className="dashboard-service-percent">{s.pct}%</span>
                </div>
                <div className="dashboard-progress">
                  <div className={`dashboard-progress-fill ${s.barClass}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
