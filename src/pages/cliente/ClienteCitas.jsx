import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import StripePaymentPortal from '../../components/StripePaymentPortal';
import { barberoCita, estadoCita, estadoClase, fechaCita, formatApiError, horaCita, idCita, normalizarLista, servicioCita, totalCita } from './clienteUtils';

// Mis citas del cliente.
// Consume cliente/citas/ para listar, y DELETE cliente/citas/{id}/ para cancelar.
export default function ClienteCitas() {
  const [citas, setCitas] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [pagoModal, setPagoModal] = useState(false);
  const [citaPago, setCitaPago] = useState(null);
  const [ventaPago, setVentaPago] = useState(null);
  const [stripeIntent, setStripeIntent] = useState(null);
  const [pagoEstado, setPagoEstado] = useState('');
  const [loadingPago, setLoadingPago] = useState(false);
  const [verificandoPago, setVerificandoPago] = useState(false);

  const cargar = async () => {
    setLoading(true);
    setMensaje('');
    try {
      const response = await api.get('cliente/citas/');
      setCitas(normalizarLista(response.data, ['citas']));
    } catch (e) {
      setMensaje(formatApiError(e.response?.data, 'No se pudieron cargar tus citas.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const cancelar = async (id) => {
    if (!confirm('Cancelar esta cita?')) return;
    try {
      await api.delete(`cliente/citas/${id}/`);
      setCitas(prev => prev.filter(cita => idCita(cita) !== id));
      setMensaje('Cita cancelada correctamente.');
    } catch (e) {
      setMensaje(formatApiError(e.response?.data, 'No se pudo cancelar la cita.'));
    }
  };

  const cerrarPago = () => {
    setPagoModal(false);
    setCitaPago(null);
    setVentaPago(null);
    setStripeIntent(null);
    setPagoEstado('');
    setLoadingPago(false);
    setVerificandoPago(false);
  };

  const puedePagar = (cita) => {
    const estado = estadoCita(cita).toLowerCase();
    return !estado.includes('cancel') && !estado.includes('anul') && !estado.includes('pagad') && !estado.includes('no asist');
  };

  const dinero = (valor) => {
    const numero = Number(valor || 0);
    if (Number.isNaN(numero)) return 'Bs. 0.00';
    return `Bs. ${numero.toFixed(2)}`;
  };

  const extraerTotal = (venta) => venta?.total || venta?.monto_total || venta?.total_estimado || '0.00';

  const mensajeErrorStripe = (error) => {
    const texto = formatApiError(error.response?.data, 'No se pudo iniciar el pago online.');
    if (texto.includes('STRIPE_SECRET_KEY')) return 'Stripe no esta configurado en el backend.';
    if (texto.toLowerCase().includes('caja abierta')) return 'Primero debe existir una caja abierta. Tambien puedes pagar en tienda fisica.';
    return texto;
  };

  const pagarOnline = async (cita) => {
    const id = idCita(cita);
    if (!id) return;

    setPagoModal(true);
    setCitaPago(cita);
    setVentaPago(null);
    setStripeIntent(null);
    setPagoEstado('Preparando pago online...');
    setLoadingPago(true);

    try {
      const ventaRes = await api.post('ventas-caja/ventas/', {
        id_cita: Number(id),
        descuento: '0.00',
        observacion: 'Pago online generado desde portal cliente',
        detalles: [],
      });
      const venta = ventaRes.data?.venta || ventaRes.data;
      const ventaId = venta?.id_venta || venta?.id;

      if (!ventaId) throw new Error('No se pudo crear la venta para esta cita.');
      if (Number(extraerTotal(venta)) <= 0) throw new Error('No se puede pagar una venta con total cero.');

      setVentaPago(venta);
      setPagoEstado('Venta preparada. Solicitando pasarela de pago...');

      const stripeRes = await api.post(`ventas-caja/ventas/${ventaId}/stripe/payment-intent/`, {});
      const intent = stripeRes.data || {};

      if (!intent.client_secret) throw new Error('No se pudo iniciar el pago con Stripe.');
      setStripeIntent(intent);
      setVentaPago(actual => ({ ...actual, ...intent.venta }));
      setPagoEstado('Formulario listo. Ingresa los datos de tu tarjeta.');
    } catch (error) {
      const texto = error.response ? mensajeErrorStripe(error) : error.message;
      setPagoEstado(texto);
      setMensaje(texto);
    } finally {
      setLoadingPago(false);
    }
  };

  const verificarPago = async () => {
    const ventaId = ventaPago?.id_venta || ventaPago?.id;
    if (!ventaId) return;

    setVerificandoPago(true);
    try {
      const response = await api.get(`ventas-caja/ventas/${ventaId}/`);
      const venta = response.data?.venta || response.data;
      setVentaPago(venta);

      if (venta?.estado === 'PAGADA') {
        setPagoEstado('Pago confirmado por el servidor. Tu cita quedo pagada.');
        setMensaje('Pago confirmado correctamente.');
        await cargar();
        return;
      }

      setPagoEstado('Pago recibido, esperando confirmacion del servidor.');
    } catch (e) {
      setPagoEstado(formatApiError(e.response?.data, 'No se pudo verificar el pago.'));
    } finally {
      setVerificandoPago(false);
    }
  };

  const filtradas = useMemo(() => {
    const q = buscar.toLowerCase();
    return citas.filter(cita => [
      servicioCita(cita),
      barberoCita(cita),
      fechaCita(cita),
      horaCita(cita),
      estadoCita(cita),
    ].some(valor => String(valor || '').toLowerCase().includes(q)));
  }, [buscar, citas]);

  return (
    <div className="cliente-page">
      <div className="card">
        <div className="cliente-section-header">
          <div>
            <h3>Mis citas</h3>
            <p>Consulta tus reservas pasadas y futuras.</p>
          </div>
          <input className="input-field cliente-search-input" placeholder="Buscar cita..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>

        {mensaje && <div className={`cliente-alert ${mensaje.includes('correctamente') ? 'success' : 'error'}`}>{mensaje}</div>}
        {loading ? <p className="cliente-muted">Cargando citas...</p> : (
          <table className="tabla">
            <thead>
              <tr><th>Fecha</th><th>Hora</th><th>Servicios</th><th>Total estimado</th><th>Barbero</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr><td colSpan={7} className="cliente-empty">No tienes citas registradas.</td></tr>
              ) : filtradas.map(cita => {
                const estado = estadoCita(cita);
                const id = idCita(cita);
                return (
                  <tr key={id}>
                    <td>{fechaCita(cita)}</td>
                    <td>{horaCita(cita)}</td>
                    <td>{servicioCita(cita)}</td>
                    <td>{totalCita(cita)}</td>
                    <td>{barberoCita(cita)}</td>
                    <td><span className={`badge ${estadoClase(estado)}`}>{estado}</span></td>
                    <td className="cliente-cita-actions">
                      {puedePagar(cita) && <button className="btn-gold" onClick={() => pagarOnline(cita)}>Pagar online</button>}
                      <button className="btn-outline" onClick={() => cancelar(id)}>Cancelar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {pagoModal && (
        <div className="modal-overlay" onClick={cerrarPago}>
          <div className="modal-box cliente-pago-modal" onClick={e => e.stopPropagation()}>
            <div className="cliente-section-header cliente-pago-head">
              <div>
                <h3>Pago online de cita</h3>
                <p>{citaPago ? `${fechaCita(citaPago)} ${horaCita(citaPago)} - ${servicioCita(citaPago)}` : 'Preparando cita...'}</p>
              </div>
              <button className="btn-outline" onClick={cerrarPago}>Cerrar</button>
            </div>

            {loadingPago && <div className="cliente-alert success">Preparando pasarela de pago...</div>}
            {pagoEstado && <div className={`cliente-alert ${pagoEstado.includes('No se pudo') || pagoEstado.includes('Primero') ? 'error' : 'success'}`}>{pagoEstado}</div>}

            {!stripeIntent && !loadingPago && (
              <div className="cliente-pago-store-note">
                <strong>Pago en tienda fisica</strong>
                <span>Si prefieres pagar en caja, no necesitas hacer nada aqui. El cajero puede cobrar tu cita desde ventas/caja.</span>
              </div>
            )}

            {stripeIntent && ventaPago && (
              <StripePaymentPortal
                clientSecret={stripeIntent.client_secret}
                venta={ventaPago}
                totalTexto={`${dinero(extraerTotal(ventaPago))} BOB`}
                onPagoProcesado={verificarPago}
                verificando={verificandoPago}
              />
            )}

            {stripeIntent && (
              <div className="cliente-pago-actions">
                <button className="btn-outline" onClick={verificarPago} disabled={verificandoPago}>
                  {verificandoPago ? 'Consultando...' : 'Reconsultar pago'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
