// Soporte del cliente.
// Vista simple para mostrar canales de contacto sin incluir funciones administrativas.
export default function ClienteSoporte() {
  return (
    <div className="cliente-page">
      <div className="card cliente-feature">
        <h3>Soporte y contacto</h3>
        <p className="cliente-muted">Comunicate con la barberia para cambios, dudas o consultas sobre tus reservas.</p>
        <div className="cliente-support-grid">
          <div>
            <strong>WhatsApp</strong>
            <span>Disponible para consultas rapidas.</span>
          </div>
          <div>
            <strong>Horario de atencion</strong>
            <span>Lunes a sabado segun disponibilidad.</span>
          </div>
          <div>
            <strong>Ubicacion</strong>
            <span>Blessed Barber Club.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
