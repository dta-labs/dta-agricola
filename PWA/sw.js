;
const CACHE_NAME = 'DTA_Irrigation_Control_v0.2b';
urlsToCache = [
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
]

// Almacenar en cachpe los archivos estáticos
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache)
                    .then(() => self.skipWaiting())
            })
            .catch(err => console.log('Falló el registro de caché', err))
    )
});

// Una vez que se instala el SW, se activa y busca 
// los recursos para hacer que funcione sin conexción
self.addEventListener('activate', e => {
    const cacheWhiteList = [ CACHE_NAME ]
    e.waitUntil(
        caches.keys()
            .then(cachesNames => {
                cachesNames.map(cacheName => {
                    if (cacheWhiteList.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName)
                    }
                })
            })
            .then(() => self.clients.claim())
    )
});

// Cuando el navefador recupera una URL
// self.addEventListener('fetch', e => {
//     // REsponder ya sea con el objeto en caché o con el URL real
//     caches.match(e.request)
//         .then(res => {
//             if (res) {
//                 return res
//             }
//             // Recuperar la pertición de la URL
//             // return fetch(e.request)

//             // IMPORTANT: Clone the request. A request is a stream and can only be consumed once
//             const fetchRequest = e.request.clone();

//             return fetch(fetchRequest).then((response) => {
//                 // Check if we received a valid response
//                 if (!response || response.status !== 200 || response.type !== 'basic') {
//                     return response;
//                 }
                
//                 // IMPORTANT: Clone the response. A response is a stream and can only be consumed once
//                 const responseToCache = response.clone();
                
//                 caches.open(CACHE_NAME)
//                     .then((cache) => {
//                         cache.put(e.request, responseToCache);
//                     });
                
//                 return response;
//             });
//         })
// });

// Firebase Cloud Messaging Push Notification Handling

// self.addEventListener('push', event => {
//     const notification = event.data.json();
//     event.waitUntil(
//         self.registration.showNotification(notification.title, {
//             body: notification.body,
//             icon: './assets/images/DTA-Agricola.png',
//             data: { 
//                 notifURL: notification.url,
//                 sound: './assets/sounds/alarma-de-evacuacion.mp3'
//             }
//         })
//     );
//     // const audio = new Audio('./assets/sounds/alarma-de-evacuacion.mp3');
//     // audio.play();
// });

// self.addEventListener('push', function(event) {
//   const data = event.data.json();
  
//   const options = {
//     body: data.body,
//     icon: data.icon,
//     data: { url: data.url }
//   };
  
//   event.waitUntil(
//     self.registration.showNotification(data.title, options)
//   );

//   // Reproducir sonido
//   if (data.sound) {
//     playSound(data.sound);
//   }
// });

self.addEventListener('push', event => {
  console.log('🔔 Push event recibido:', event);
  
  try {
    const data = event.data.json();
    console.log('📦 Datos del push:', data);

    const options = {
      body: data.body,
      icon: data.icon || './assets/images/DTA-Agricola.png',
      data: { url: data.url || './' },
      requireInteraction: true,
      silent: false,
      tag: 'dta-alert'
    };

    // Mostrar notificación
    event.waitUntil(
      self.registration.showNotification(data.title, options).then(() => {
        console.log('✅ Notificación mostrada correctamente');
        
        // Intentar reproducir sonido directamente
        if (data.sound) {
          console.log('🎵 Intentando reproducir sonido:', data.sound);
          playNotificationSound(data.sound);
        }
      })
    );
  } catch (error) {
    console.error('❌ Error procesando push:', error);
  }
});

function playNotificationSound(soundUrl) {
  try {
    // Usar URL absoluta
    const baseUrl = self.location.origin;
    const fullSoundUrl = soundUrl.startsWith('http') ? soundUrl : baseUrl + '/' + soundUrl.replace('./', '');
    
    console.log('🎵 URL del sonido:', fullSoundUrl);
    
    const audio = new Audio(fullSoundUrl);
    audio.volume = 1.0;
    
    audio.play().then(() => {
      console.log('✅ Sonido reproducido exitosamente');
    }).catch(err => {
      console.log('❌ Error reproduciendo sonido MP3:', err);
      console.log('🔄 Intentando fallback con Web Audio API...');
      playSystemBeep();
    });
  } catch (e) {
    console.log('❌ Error creando audio:', e);
    playSystemBeep();
  }
}

function playSystemBeep() {
  try {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
    
    console.log('✅ Beep del sistema reproducido');
  } catch (err) {
    console.log('❌ Fallback falló:', err);
  }
}

function playSound(file) {
  // Nota: Los Service Workers no pueden reproducir audio directamente.
  // Necesitas comunicarte con la página cliente.
  self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
    .then(clients => {
      clients.forEach(client => {
        client.postMessage({ action: 'playSound', file: file });
      });
    });
}
  
// Handle notification click
self.addEventListener('notificationclick', event => {
    console.log('🖱️ Notificación clickeada - reproduciendo sonido');
    event.notification.close();
    
    // Reproducir sonido al hacer clic (siempre funciona por interacción del usuario)
    playNotificationSound('./assets/sounds/alarma-de-evacuacion.mp3');
    
    // Abrir la aplicación
    event.waitUntil(
        clients.openWindow(event.notification.data.url || './')
    );
});

