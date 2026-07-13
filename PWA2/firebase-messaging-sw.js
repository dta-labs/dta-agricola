importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js");
importScripts("./assets/js/firebaseConfig.js");

firebase.initializeApp(config);

const messaging = firebase.messaging();
const CACHE_NAME = "DTA_Irrigation_Control_v1.4";
const CACHE_PREFIX = "DTA_Irrigation_Control_";
const PWA_LAUNCH_URL = "./index.html";
const NOTIFICATION_SOUND_FILE = "./assets/sounds/alarma-de-evacuacion.mp3";
const urlsToCache = [
  "./assets/css/responsive.css",
  "./assets/css/style.css",
  "./assets/images/icons/res/mipmap-mdpi/DTA_Agricola.png",
  "./assets/images/icons/res/mipmap-hdpi/DTA_Agricola.png",
  "./assets/images/icons/res/mipmap-xhdpi/DTA_Agricola.png",
  "./assets/images/icons/res/mipmap-xxhdpi/DTA_Agricola.png",
  "./assets/images/icons/res/mipmap-xxxhdpi/DTA_Agricola.png",
  "./assets/images/DTA-Agricola lineal.png",
  "./assets/images/DTA-Agricola.png",
  "./assets/images/fondo-cel.png",
  "./assets/images/fondo-web.png",
  "./assets/images/intro.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  let hadPreviousAppCache = false;

  event.waitUntil(
    caches.keys()
      .then((names) => {
        hadPreviousAppCache = names.some((name) => (
          name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME
        ));

        return Promise.all(
          names.map((name) => (name !== CACHE_NAME ? caches.delete(name) : null))
        );
      })
      .then(() => self.clients.claim())
      .then(() => {
        if (!hadPreviousAppCache) return null;

        return clients.matchAll({ type: "window", includeUncontrolled: true })
          .then((clientList) => Promise.all(
            clientList.map((client) => client.postMessage({
              action: "appUpdated",
              version: CACHE_NAME,
            }))
          ));
      })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === "navigate";
  const isScript = url.pathname.endsWith(".js");
  const isStyle = url.pathname.endsWith(".css");

  if (isNavigation || isScript || isStyle || url.pathname.endsWith(".html")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

function getScopedUrl(url) {
  const launchUrl = new URL(PWA_LAUNCH_URL, self.registration.scope);

  if (!url) return launchUrl.href;

  try {
    const targetUrl = new URL(url, self.registration.scope);
    const scopeUrl = new URL(self.registration.scope);
    const isInScope = targetUrl.origin === scopeUrl.origin
      && targetUrl.pathname.startsWith(scopeUrl.pathname);

    return isInScope ? targetUrl.href : launchUrl.href;
  } catch (error) {
    return launchUrl.href;
  }
}

messaging.setBackgroundMessageHandler((payload) => {
  const data = payload.data || {};
  const notification = payload.notification || {};
  const title = notification.title || "DTA-Agricola";
  const notificationData = notification.data || {};
  const options = {
    body: notification.body || "Nueva alerta",
    icon: data.icon || notification.icon || "./assets/images/DTA-Agricola.png",
    data: {
      url: notificationData.url || data.click_action || PWA_LAUNCH_URL,
      sound: notificationData.sound || data.sound || NOTIFICATION_SOUND_FILE,
    },
    requireInteraction: true,
    silent: false,
    tag: notification.tag || "dta-alert",
  };

  return self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notificationUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : PWA_LAUNCH_URL;
  const targetUrl = getScopedUrl(notificationUrl);
  const soundFile = event.notification.data && event.notification.data.sound
    ? event.notification.data.sound
    : NOTIFICATION_SOUND_FILE;

  const playNotificationSound = (client) => {
    if (!client || !soundFile) return client;

    client.postMessage({
      action: "playSound",
      file: soundFile,
    });

    return client;
  };

  event.waitUntil(
    clients.openWindow(targetUrl)
      .then(playNotificationSound)
  );
});
