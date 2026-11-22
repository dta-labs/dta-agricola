importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js");
importScripts("./assets/js/firebaseConfig.js");
// REQ-101: bandeja de notificaciones (las push que llegan con la app cerrada quedan en un buzon para la app).
importScripts("./assets/js/logic/notificaciones.js?v=26.11.20.004");
importScripts("./assets/js/services/buzon-notificaciones.js?v=26.11.20.004");

// Con titulo y texto, el navegador muestra la notificacion por su cuenta y Firebase NO llama al manejador en
// segundo plano: por eso se escucha el evento push directamente (recibe todas).
self.addEventListener("push", (event) => {
  try {
    const payload = event.data ? event.data.json() : null;
    if (!payload || !self.DTALogic || !self.DTAServicios) return;
    const entrada = self.DTALogic.notificaciones.desdePush({ notification: payload.notification, data: payload.data });
    event.waitUntil(self.DTAServicios.buzonNotificaciones.guardar(entrada).catch(() => {}));
  } catch (error) {
    // Una push sin JSON no se guarda en la bandeja; el navegador la sigue mostrando.
  }
});

firebase.initializeApp(config);

const messaging = firebase.messaging();
const CACHE_NAME = "DTA_Irrigation_Control_v1.15";   // v1.15: precache ligero (REQ-033). REQ-153: se conserva (cambiarlo forzaria otra recarga)
const CACHE_PREFIX = "DTA_Irrigation_Control_";
const PWA_LAUNCH_URL = "./index.html";
const NOTIFICATION_SOUND_FILE = "./assets/sounds/alarma-de-evacuacion.mp3";
const urlsToCache = [
  // REQ-033: solo lo imprescindible para arrancar. Las imagenes decorativas se cachean al
  // usarse (estrategia network-first); precargarlas costaba 2,4 MB en el evento install.
  "./assets/css/responsive.css",
  "./assets/css/style.css",
  "./assets/images/icons/res/mipmap-mdpi/DTA_Agricola.png",
  "./assets/images/icons/res/mipmap-hdpi/DTA_Agricola.png",
  "./assets/images/icons/res/mipmap-xhdpi/DTA_Agricola.png",
  "./assets/images/icons/res/mipmap-xxhdpi/DTA_Agricola.png",
  "./assets/images/icons/res/mipmap-xxxhdpi/DTA_Agricola.png",
  "./assets/images/DTA-Agricola lineal.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
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

// REQ-153: arranque rapido en el celular. La pantalla de inicio del sistema (icono sobre fondo blanco) dura hasta que
// llega index.html; antes se pedia SIEMPRE a la red (sin cache) y en datos moviles tardaba varios segundos.
//   - Navegacion (abrir la app): red con tiempo maximo (TIEMPO_RED_MS); si no responde a tiempo, la copia guardada
//     (la red sigue y actualiza la copia; la app detecta la version nueva y recarga UNA vez, ver core.js).
//   - Archivos versionados (?v=...): primero la copia guardada (no cambian sin cambiar la version).
//   - El resto del mismo origen: red primero y copia guardada sin conexion (como antes).
const TIEMPO_RED_MS = 2500;

function guardarCopia(request, response) {
  if (!response || !response.ok || response.type === "opaque") return;
  const copy = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
}

function redConCopia(request) {
  return fetch(request, { cache: "no-store" })
    .then((response) => { guardarCopia(request, response); return response; });
}

function redConTiempoMaximo(request, claveCopia) {
  const red = redConCopia(request);
  const copia = () => caches.match(claveCopia || request, { ignoreSearch: true });
  return new Promise((resolve, reject) => {
    let resuelto = false;
    const responder = (respuesta) => { if (!resuelto && respuesta) { resuelto = true; resolve(respuesta); } };
    const temporizador = setTimeout(() => copia().then(responder), TIEMPO_RED_MS);
    red.then((respuesta) => { clearTimeout(temporizador); responder(respuesta); })
      .catch(() => copia().then((respuesta) => {
        clearTimeout(temporizador);
        if (respuesta) responder(respuesta); else if (!resuelto) reject(new Error("sin red ni copia"));
      }));
  });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const isNavigation = event.request.mode === "navigate";

  if (isNavigation) {
    // index.html?appVersion=... es la misma pagina: la copia se busca sin la consulta. (Las demas peticiones de
    // .html, como la revision de version de core.js, van a la red: deben ver siempre lo publicado.)
    event.respondWith(redConTiempoMaximo(event.request, new URL(PWA_LAUNCH_URL, self.registration.scope).href));
    return;
  }

  if (url.searchParams.has("v")) {
    event.respondWith(
      caches.match(event.request).then((guardada) => guardada || redConCopia(event.request))
    );
    return;
  }

  event.respondWith(redConCopia(event.request).catch(() => caches.match(event.request)));
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
    image: data.image || notification.image || undefined,
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
