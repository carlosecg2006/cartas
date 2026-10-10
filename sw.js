// Service worker: recebe o "toque" de aviso e pergunta ao site o que chegou.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let info = { title: 'Chegou carta nova', body: 'Toque para abrir sua caixa.', url: './index.php' };
    try {
      const res = await fetch('./avisos.php', { credentials: 'include', cache: 'no-store' });
      if (res.ok) info = Object.assign(info, await res.json());
    } catch (e) { /* sem conexão: usa o aviso genérico */ }
    await self.registration.showNotification(info.title, {
      body: info.body,
      icon: './assets/icon-192.png',
      badge: './assets/icon-192.png',
      tag: 'cartas',
      renotify: true,
      data: { url: info.url },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data && event.notification.data.url || './index.php', self.registration.scope).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) {
        await c.navigate(url).catch(() => {});
        return c.focus();
      }
    }
    return self.clients.openWindow(url);
  })());
});
