const CACHE_NAME = 'DTA_Irrigation_Control_v1.1';
const PWA_LAUNCH_URL = './index.html';
const NOTIFICATION_SOUND_FILE = './assets/sounds/alarma-de-evacuacion.mp3';
const urlsToCache = [
  './assets/css/responsive.css',
  './assets/css/style.css',
  './assets/images/icons/res/mipmap-mdpi/DTA_Agricola.png',
  './assets/images/icons/res/mipmap-hdpi/DTA_Agricola.png',
  './assets/images/icons/res/mipmap-xhdpi/DTA_Agricola.png',
  './assets/images/icons/res/mipmap-xxhdpi/DTA_Agricola.png',
  './assets/images/icons/res/mipmap-xxxhdpi/DTA_Agricola.png',
  './assets/images/icons/web_hi_res_512.png',
  './assets/images/DTA-Agricola lineal.png',
  './assets/images/DTA-Agricola.png',
  './assets/images/fondo-cel.png',
  './assets/images/fondo-web.png',
  './assets/images/intro.webp'
];

// Instalar y cachear recursos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Activar y limpiar cachés viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.map(name => {
        if (name !== CACHE_NAME) return caches.delete(name);
      }))
    )
  );
});

// Interceptar peticiones y servir desde caché
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate';
  const isScript = url.pathname.endsWith('.js');

  if (isNavigation || isScript || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});

self.addEventListener('push', event => {
  if (!event.data) return;
  const payload = event.data.json();
  const data = payload.data || {};
  const notification = payload.notification || {};

  const title = notification.title || 'DTA-Agricola';
  const options = {
    body: notification.body || 'Nueva alerta',
    icon: data.icon || notification.icon || '/assets/images/DTA-Agricola.png',
    data: {
      url: data.click_action || PWA_LAUNCH_URL,
      sound: data.sound || NOTIFICATION_SOUND_FILE
    },
    requireInteraction: true,
    silent: false,
    tag: 'dta-alert'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : PWA_LAUNCH_URL;
  const soundFile = event.notification.data && event.notification.data.sound
    ? event.notification.data.sound
    : NOTIFICATION_SOUND_FILE;

  const playNotificationSound = client => {
    if (!client || !soundFile) return client;

    client.postMessage({
      action: 'playSound',
      file: soundFile
    });

    return client;
  };

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (
            client.url.includes('dta-agricola.web.app') ||
            client.url.includes('dtaamerica.com')
          ) {
            return client.focus().then(playNotificationSound);
          }
        }

        return clients.openWindow(targetUrl || PWA_LAUNCH_URL)
          .then(playNotificationSound);
      })
  );
});
