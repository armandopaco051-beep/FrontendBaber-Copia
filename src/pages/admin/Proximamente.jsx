// Pantalla placeholder para modulos planificados.
// Permite dejar rutas creadas aunque el caso de uso aun no este implementado.
export default function Proximamente({ nombre = 'Modulo' }) {
  return (
    <div className="card" style={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 520 }}>
        <div style={{
          width: 58,
          height: 58,
          borderRadius: 18,
          background: '#fef3c7',
          color: '#c9a227',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
          fontSize: 28,
          fontWeight: 800,
        }}>
          +
        </div>
        <h3 style={{ fontSize: 24, marginBottom: 8 }}>{nombre}</h3>
        <p style={{ color: '#64748b', lineHeight: 1.6 }}>
          Esta seccion esta preparada para integrarse en el siguiente ciclo del sistema.
        </p>
      </div>
    </div>
  );
}
