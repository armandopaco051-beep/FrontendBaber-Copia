const PROMOCIONES = [
  { titulo: 'Corte + barba', detalle: 'Paquete recomendado para clientes frecuentes.', etiqueta: 'Popular' },
  { titulo: 'Perfilado incluido', detalle: 'Consulta promociones vigentes al confirmar tu reserva.', etiqueta: 'Oferta' },
  { titulo: 'Reserva anticipada', detalle: 'Organiza tu horario con tiempo y evita esperas.', etiqueta: 'Consejo' },
];

// Promociones del cliente.
// Vista informativa; cuando exista endpoint de promociones se reemplaza esta lista.
export default function ClientePromociones() {
  return (
    <div className="cliente-page">
      <div className="cliente-offers">
        {PROMOCIONES.map(item => (
          <div key={item.titulo} className="card cliente-offer-card">
            <span className="badge badge-yellow">{item.etiqueta}</span>
            <h3>{item.titulo}</h3>
            <p>{item.detalle}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
