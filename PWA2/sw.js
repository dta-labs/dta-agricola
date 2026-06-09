const CACHE_NAME = 'DTA_Irrigation_Control_v1.0';
const urlsToCache = [
  './',
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
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});

self.addEventListener('push', event => {
  if (!event.data) return;
  const payload = event.data.json();

  const title = payload.notification?.title || 'DTA-Agrícola desde SW.JS';
  const options = {
    body: payload.notification?.body || 'Nueva alerta desde SW.JS',
    icon: payload.notification?.icon || '/assets/images/DTA-Agricola.png',
    data: {
      url: payload.notification?.click_action || './',
      sound: payload.data?.sound || '/assets/sounds/alarma-de-evacuacion.mp3'
    },
    requireInteraction: true,
    tag: 'dta-alert'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
