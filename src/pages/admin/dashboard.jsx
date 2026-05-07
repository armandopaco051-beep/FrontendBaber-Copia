const AGENDA = [
  { hora: '09:00', cliente: 'Luis Rojas',   servicio: 'Corte',       barbero: 'Sebastián', estado: 'Confirmada',  color: '#dcfce7', txt: '#15803d' },
  { hora: '10:00', cliente: 'Marco Peña',   servicio: 'Corte + barba', barbero: 'Carlos',  estado: 'Pendiente',   color: '#fef9c3', txt: '#a16207' },
  { hora: '11:00', cliente: 'José Vaca',    servicio: 'Perfilado',   barbero: 'Renato',    estado: 'En atención', color: '#dbeafe', txt: '#1d4ed8' },
  { hora: '12:00', cliente: 'Diego Soliz',  servicio: 'Low fade',    barbero: 'Sebastián', estado: 'Confirmada',  color: '#dcfce7', txt: '#15803d' },
];

const STATS = [
  { label: 'Citas de hoy',    value: '12',       sub: '+4 confirmadas',   gold: false },
  { label: 'Ingresos hoy',    value: 'Bs. 780',  sub: 'QR y efectivo',    gold: true  },
  { label: 'Barberos activos',value: '3',         sub: '1 con retraso',    gold: false },
  { label: 'Clientes',        value: '145',       sub: '8 nuevos este mes',gold: false },
];

export default function Dashboard() {
  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        {STATS.map(s => (
          <div key={s.label} className="stat-card">
            <div className="label">{s.label}</div>
            <div className={`value${s.gold ? ' gold' : ''}`}>{s.value}</div>
            <div className="sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Bottom grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        {/* Agenda */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 18 }}>Agenda de hoy</h3>
              <p style={{ color: '#64748b', fontSize: 13 }}>Reservas organizadas por hora</p>
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
                  <td style={{ fontWeight: 700 }}>{a.hora}</td>
                  <td>{a.cliente}</td>
                  <td>{a.servicio}</td>
                  <td>{a.barbero}</td>
                  <td>
                    <span style={{ background: a.color, color: a.txt, padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                      {a.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Estado operativo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, marginBottom: 14 }}>Estado operativo</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                { label: '✅ 3 barberos disponibles',  bg: '#dcfce7', color: '#15803d' },
                { label: '✅ 8 citas confirmadas',      bg: '#dcfce7', color: '#15803d' },
                { label: '⚠ 2 citas pendientes',      bg: '#fef9c3', color: '#a16207' },
                { label: '⚠ 1 producto con bajo stock',bg: '#fee2e2', color: '#b91c1c' },
              ].map(i => (
                <div key={i.label} style={{ background: i.bg, color: i.color, padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
                  {i.label}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, marginBottom: 14 }}>Servicios top</h3>
            {[
              { nombre: 'Corte de cabello',    pct: 48 },
              { nombre: 'Corte + barba',       pct: 31 },
              { nombre: 'Perfilado de cejas',  pct: 21 },
            ].map(s => (
              <div key={s.nombre} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                  <span>{s.nombre}</span><span style={{ fontWeight: 700 }}>{s.pct}%</span>
                </div>
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99 }}>
                  <div style={{ height: 6, width: `${s.pct}%`, background: '#d4af37', borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}