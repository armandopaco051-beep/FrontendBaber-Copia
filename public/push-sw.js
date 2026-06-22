self.addEventListener('push', (event) => {
  let data;

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Notificacion', body: event.data?.text() || '' };
  }

  const title = data.title || data.titulo || 'Blessed Barber';
  const options = {
    body: data.body || data.mensaje || '',
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const origin = self.location.origin;
      const absoluteUrl = new URL(targetUrl, origin).href;

      for (const client of clientList) {
        if (client.url === absoluteUrl && 'focus' in client) return client.focus();
      }

      if (self.clients.openWindow) return self.clients.openWindow(absoluteUrl);
      return undefined;
    })
  );
});
