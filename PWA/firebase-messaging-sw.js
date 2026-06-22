importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");
importScripts('assets/js/firebaseConfig.js');

firebase.initializeApp(config);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
    console.log('📩 Mensaje en segundo plano recibido:', payload);
    
    const notificationTitle = payload.notification?.title || 'DTA-Agrícola';
    const notificationOptions = {
        body: payload.notification?.body || 'Nueva alerta',
        icon: payload.notification?.icon || './assets/images/DTA-Agricola.png',
        sound: 'default', // OBLIGATORIO para que iOS/Android suenen en segundo plano
        data: {
            url: payload.notification?.click_action || './',
            customSound: payload.data?.customSound || './assets/sounds/alarma-de-evacuacion.mp3'
        },
        requireInteraction: true,
        tag: 'dta-alert'
    };
    
    return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || './';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes('dtaamerica.com') || client.url.includes('dta-agricola.web.app')) {
                    return client.focus();
                }
            }
            return clients.openWindow(targetUrl);
        })
    );

    if (event.notification.data?.customSound) {
        self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
        .then(clients => {
            clients.forEach(client => {
                client.postMessage({ action: 'playSound', file: event.notification.data.customSound });
            });
        });
    }
});