// public/sw.js
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const titulo = data.title || 'Supermercado Hazon';
  const opcoes = {
    body: data.body || 'Nova notificação do sistema.',
    icon: '/logo-hazonerp.svg',
    badge: '/logo-hazonerp.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});