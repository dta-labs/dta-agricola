// Configuración de OneSignal
const PRODUCTION_MODE = false; // Cambia a false para desarrollo
const ONESIGNAL_APP_ID = "13e33e2b-473b-4a76-ab36-5379466b63e9";
const ONESIGNAL_SAFARI_WEB_ID = "web.onesignal.auto.613528e9-2930-4b07-a098-5a9518822d98";
const ONESIGNAL_PATH = PRODUCTION_MODE ? "./pushOneSignal/OneSignalSDKWorker.js" : "";
  
// Estado global
let oneSignalReady = false;
let playerId = null;

// Usar el patrón correcto: OneSignalDeferred
window.OneSignalDeferred = window.OneSignalDeferred || [];

// Función para obtener Player ID con reintentos
async function obtenerPlayerIdConReintentos(OneSignal, maxIntentos = 10, delay = 500) {
  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      const id = await OneSignal.User.PushSubscription.id;
      if (id) {
        console.log(`[OneSignal] Player ID obtenido en intento ${intento}:`, id);
        return id;
      }
      console.log(`[OneSignal] Intento ${intento}: Player ID aún no disponible, esperando...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      console.warn(`[OneSignal] Error en intento ${intento}:`, error.message);
    }
  }
  return null;
}

// Push la función de inicialización a OneSignalDeferred
OneSignalDeferred.push(async function(OneSignal) {
  try {
    console.log('[OneSignal] Inicializando...');

    // Inicializar con configuración completa
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      safari_web_id: ONESIGNAL_SAFARI_WEB_ID,
      serviceWorkerPath: ONESIGNAL_PATH,
      notifyButton: {
        enable: true,
        position: 'bottom-right',
        size: 'medium',
        text: {
          'tip.state.unsubscribed': 'Suscribirse a notificaciones',
          'tip.state.subscribed': 'Suscrito a notificaciones',
          'tip.state.blocked': 'Notificaciones bloqueadas'
        }
      },
      allowLocalhostAsSecureOrigin: true,
      // Opcional: configuración adicional
      persistNotification: true
    });

    console.log('[OneSignal] Inicializado correctamente');
    oneSignalReady = true;

    // Mostrar botón de suscripción en iOS
    const supported = await OneSignal.Notifications.isPushSupported();
    const subscribed = await OneSignal.User.PushSubscription.optedIn;

    if (supported && !subscribed) {
      try {
        await OneSignal.Slidedown.promptPush();
      } catch {
        // Si el prompt nativo falla, mostrar botón manual
        // document.getElementById('subscribeBtn').style.display = 'block';
        console.log('El prompt nativo falla');
      }
    }

    // Obtener Player ID con reintentos (el ID puede tardar un poco)
    playerId = await obtenerPlayerIdConReintentos(OneSignal);
    
    if (playerId) {
      console.log('[OneSignal] Player ID obtenido:', playerId);
      localStorage.setItem('onesignal_player_id', playerId);
      guardarPlayerIdEnServidor(playerId);
      // actualizarUI();
    } else {
      console.warn('[OneSignal] No se pudo obtener Player ID después de reintentos');
      mostrarError('No se pudo obtener el Player ID. Intenta suscribirte nuevamente.');
    }

    // Escuchar cambios en la suscripción
    OneSignal.User.PushSubscription.addEventListener('change', async () => {
      console.log('[OneSignal] Cambio detectado en suscripción');
      const nuevoPlayerId = await OneSignal.User.PushSubscription.id;
      if (nuevoPlayerId && nuevoPlayerId !== playerId) {
        playerId = nuevoPlayerId;
        console.log('[OneSignal] Nuevo Player ID asignado:', playerId);
        localStorage.setItem('onesignal_player_id', playerId);
        guardarPlayerIdEnServidor(playerId);
        actualizarUI();
      }
    });

  } catch (error) {
    console.error('[OneSignal] Error durante inicialización:', error);
    mostrarError('Error de inicialización: ' + (error.message || 'Desconocido'));
  }
});

// Actualizar interfaz
function actualizarUI() {
  const statusEl = document.getElementById('status');
  const playerIdEl = document.getElementById('playerId');

  if (playerId) {
    statusEl.innerHTML = '✅ Suscrito';
    statusEl.className = 'status status-success';
    playerIdEl.innerHTML = `<code>${playerId}</code>`;
  } else {
    statusEl.innerHTML = '⏳ No suscrito - Haz clic en el botón de abajo';
    statusEl.className = 'status status-warning';
    playerIdEl.innerHTML = '<code>Cargando...</code>';
  }
}

// Guardar Player ID en el servidor
async function guardarPlayerIdEnServidor(playerIdValue) {
  if (!playerIdValue) return;
  
  try {
    const response = await fetch('save-player-id-in-firebase.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id: playerIdValue,
        user_email: "csantiestebantoca@gmail.com", // Asegúrate de tener una función para obtener el email del usuario
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      })
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('[App] Player ID guardado en servidor:', data.data);
    } else {
      console.warn('[App] Error al guardar Player ID en servidor:', data.message);
    }
  } catch (error) {
    console.warn('[App] No se pudo guardar Player ID en servidor:', error.message);
  }
}

async function guardarPlayerIdEnServidor_old(playerIdValue) {
  if (!playerIdValue) return;
  
  try {
    const response = await fetch('save-player-id.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id: playerIdValue,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      })
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('[App] Player ID guardado en servidor:', data.data);
    } else {
      console.warn('[App] Error al guardar Player ID en servidor:', data.message);
    }
  } catch (error) {
    console.warn('[App] No se pudo guardar Player ID en servidor:', error.message);
  }
}

// Copiar Player ID
function copiarPlayerId() {
  if (!playerId) {
    alert('Player ID no disponible aún');
    return;
  }
  
  navigator.clipboard.writeText(playerId).then(() => {
    alert('✓ Player ID copiado: ' + playerId);
  }).catch(() => {
    alert('No se pudo copiar. ID: ' + playerId);
  });
}

// Enviar notificación de prueba
async function enviarPrueba() {
  if (!playerId) {
    alert('Primero debes suscribirte a notificaciones');
    return;
  }

  const title = document.getElementById('testTitle').value || 'Prueba';
  const message = document.getElementById('testMessage').value || 'Mensaje de prueba';
  const responseEl = document.getElementById('pruebaResponse');

  try {
    responseEl.innerHTML = '⏳ Enviando...';
    responseEl.className = 'response info';

    const response = await fetch('send-to-user.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_type: 'player_id',
        target_ids: [playerId],
        title: title,
        message: message,
        icon: 'DTA.png',
        url: 'https://dtaamerica.com/dta-agricola/'
      })
    });

    const data = await response.json();

    if (data.success) {
      responseEl.innerHTML = `✅ Notificación enviada a ${data.data?.recipients || 1} usuario(s)`;
      responseEl.className = 'response success';
    } else {
      responseEl.innerHTML = `❌ Error: ${data.message}`;
      responseEl.className = 'response error';
    }

  } catch (error) {
    responseEl.innerHTML = `❌ Error de red: ${error.message}`;
    responseEl.className = 'response error';
  }
}

// Mostrar error en UI
function mostrarError(mensaje) {
  const statusEl = document.getElementById('status');
  statusEl.innerHTML = `⚠️ Error: ${mensaje}`;
  statusEl.className = 'status status-error';
}

// Escuchar cambios en la suscripción
window.addEventListener('load', () => {
  console.log('[App] Página cargada');
});