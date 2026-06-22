import { getMessaging, onMessage } from "firebase/messaging";

// ... (tu código de inicialización de firebase aquí) ...

const messaging = getMessaging();

// Escuchar mensajes cuando la PWA está en PRIMER PLANO (Abierta)
onMessage(messaging, (payload) => {
  console.log('Mensaje recibido en primer plano:', payload);

  // 1. Mostrar notificación visual en la UI de tu app (opcional)
  // mostrarAlertaEnPantalla(payload.notification.title, payload.notification.body);

  // 2. REPRODUCIR EL SONIDO PERSONALIZADO
  const soundFile = payload.data?.sound || './assets/sounds/alarma-de-evacuacion.mp3';
  
  try {
    const audio = new Audio(soundFile);
    // Los navegadores permiten reproducir audio en primer plano si hubo interacción previa del usuario
    audio.play().catch(error => {
      console.warn("⚠️ El navegador bloqueó la reproducción automática del sonido. El usuario debe interactuar primero con la página.", error);
    });
  } catch (e) {
    console.error("Error al intentar reproducir el sonido:", e);
  }
});

// Escuchar mensajes enviados desde el Service Worker al hacer clic
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.action === 'playCustomSound') {
      try {
        const audio = new Audio(event.data.file);
        audio.play().catch(err => console.warn("Error reproduciendo sonido desde SW:", err));
      } catch (e) {
        console.error("Error creando audio desde mensaje SW:", e);
      }
    }
  });
}