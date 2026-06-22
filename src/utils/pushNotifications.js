import api from '../api/axiosConfig';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function uint8ArrayToUrlBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function mismaClaveVapid(subscription, publicKey) {
  const actual = subscription?.options?.applicationServerKey;
  if (!actual) return true;
  return uint8ArrayToUrlBase64(actual) === publicKey;
}

function navegadorNombre() {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
  return 'Navegador';
}

export function pushSoportado() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function obtenerSuscripcionActual() {
  if (!pushSoportado()) return null;
  const registration = await navigator.serviceWorker.getRegistration('/push-sw.js');
  if (!registration) return null;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return null;

  try {
    const keyResponse = await api.get('notificaciones/vapid-public-key/');
    const publicKey = keyResponse.data?.vapid_public_key;
    if (publicKey && !mismaClaveVapid(subscription, publicKey)) {
      await api.delete('notificaciones/suscripciones/', {
        data: { endpoint: subscription.endpoint },
      }).catch(() => {});
      await subscription.unsubscribe();
      return null;
    }
  } catch {
    return subscription;
  }

  return subscription;
}

export async function activarNotificacionesPush() {
  if (!pushSoportado()) {
    throw new Error('Este navegador no soporta notificaciones push.');
  }

  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') {
    throw new Error('Permiso de notificaciones denegado.');
  }

  const keyResponse = await api.get('notificaciones/vapid-public-key/');
  const publicKey = keyResponse.data?.vapid_public_key;
  if (!publicKey) throw new Error('El backend no devolvio la clave publica VAPID.');

  const registration = await navigator.serviceWorker.register('/push-sw.js');
  let existente = await registration.pushManager.getSubscription();
  if (existente && !mismaClaveVapid(existente, publicKey)) {
    await api.delete('notificaciones/suscripciones/', {
      data: { endpoint: existente.endpoint },
    }).catch(() => {});
    await existente.unsubscribe();
    existente = null;
  }

  const subscription = existente || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await api.post('notificaciones/suscripciones/', {
    ...subscription.toJSON(),
    navegador: navegadorNombre(),
  });

  return subscription;
}

export async function desactivarNotificacionesPush() {
  const subscription = await obtenerSuscripcionActual();
  if (!subscription) return;

  await api.delete('notificaciones/suscripciones/', {
    data: { endpoint: subscription.endpoint },
  });
  await subscription.unsubscribe();
}
