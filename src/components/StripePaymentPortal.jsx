import { useState } from 'react';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;
const CARD_OPTIONS = {
  hidePostalCode: true,
  style: {
    base: {
      color: '#0f172a',
      fontFamily: 'DM Sans, sans-serif',
      fontSize: '15px',
      '::placeholder': {
        color: '#64748b',
      },
    },
    invalid: {
      color: '#b91c1c',
      iconColor: '#b91c1c',
    },
  },
};

function StripeCheckoutForm({ clientSecret, venta, totalTexto, onPagoProcesado, verificando }) {
  const stripe = useStripe();
  const elements = useElements();
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [titular, setTitular] = useState('');

  const pagar = async () => {
    if (!stripe || !elements) return;

    const card = elements.getElement(CardElement);
    if (!card) {
      setMensaje('No se pudo cargar el formulario de tarjeta.');
      return;
    }

    setProcesando(true);
    setMensaje('');
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card,
        billing_details: {
          name: titular || undefined,
        },
      },
    });

    if (result.error) {
      setMensaje(result.error.message || 'No se pudo confirmar el pago con Stripe.');
      setProcesando(false);
      return;
    }

    setMensaje('Pago recibido, verificando confirmacion del servidor...');
    await onPagoProcesado();
    setProcesando(false);
  };

  return (
    <div className="stripe-gateway">
      <section className="stripe-summary-panel">
        <div className="stripe-summary-content">
          <span className="stripe-eyebrow">Portal de pagos</span>
          <h2>Pago de venta</h2>
          <p>Complete el pago de la venta para continuar con el cobro. El pago se procesa de forma segura mediante Stripe.</p>

          <div className="stripe-sale-card">
            <div>
              <small>Concepto</small>
              <strong>Venta barberia</strong>
            </div>
            <div>
              <small>ID venta</small>
              <strong>#{venta?.id_venta || venta?.id}</strong>
            </div>
            <div className="stripe-total-row">
              <small>Total a pagar</small>
              <strong>{totalTexto}</strong>
            </div>
          </div>

          <small className="stripe-protected-text">Pago protegido con cifrado SSL y validacion bancaria mediante Stripe.</small>
        </div>
      </section>

      <section className="stripe-form-panel">
        <div className="stripe-form-title">Pago seguro via Stripe</div>
        <div className="stripe-card-holder">
          <label>Titular de la tarjeta</label>
          <input className="input-field" placeholder="Nombre como aparece en la tarjeta" autoComplete="cc-name" value={titular} onChange={e => setTitular(e.target.value)} />
        </div>

        <div className="stripe-secure-line">Proceso de compra seguro y rapido con Link</div>
        <div className="stripe-card-element">
          <CardElement options={CARD_OPTIONS} />
        </div>

        <div className="stripe-test-note">Ingresa los datos de tu tarjeta de prueba.</div>
        {mensaje && <div className={`stripe-message ${mensaje.includes('No se pudo') ? 'error' : 'info'}`}>{mensaje}</div>}

        <button className="stripe-pay-button" type="button" onClick={pagar} disabled={!stripe || procesando || verificando}>
          {!stripe ? 'Cargando formulario...' : procesando || verificando ? 'Procesando pago...' : `Pagar ${totalTexto}`}
        </button>
      </section>
    </div>
  );
}

export default function StripePaymentPortal({ clientSecret, venta, totalTexto, onPagoProcesado, verificando }) {
  if (!stripePublicKey) {
    return <div className="stripe-config-warning">Falta configurar VITE_STRIPE_PUBLIC_KEY en el frontend.</div>;
  }

  if (!clientSecret) return null;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#001f3f',
            colorText: '#0f172a',
            borderRadius: '8px',
            fontFamily: 'DM Sans, sans-serif',
          },
        },
      }}
    >
      <StripeCheckoutForm clientSecret={clientSecret} venta={venta} totalTexto={totalTexto} onPagoProcesado={onPagoProcesado} verificando={verificando} />
    </Elements>
  );
}
