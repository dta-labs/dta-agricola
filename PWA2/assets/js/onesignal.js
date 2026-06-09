window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
        appId: "13e33e2b-473b-4a76-ab36-5379466b63e9",
        safari_web_id: "web.onesignal.auto.613528e9-2930-4b07-a098-5a9518822d98",
        serviceWorkerPath: "./OneSignalSDKWorker.js",
        serviceWorkerParam: { scope: "./" },
        notifyButton: {
            enable: true,
            position: 'bottom-right', // cambia la esquina: top-right, top-left, bottom-right, bottom-left
            text: {
                'tip.state.unsubscribed': 'Recibir notificaciones',
                'tip.state.subscribed': 'Ya estás suscrito',
                'tip.state.blocked': 'Notificaciones bloqueadas',
                'message.prenotify': 'Haz clic para activar notificaciones',
                'message.action.subscribed': 'Gracias por suscribirte!',
                'message.action.resubscribed': 'Has vuelto a activar notificaciones',
                'message.action.unsubscribed': 'Has desactivado notificaciones'
            }
        },
        allowLocalhostAsSecureOrigin: true
    });

    console.log("OneSignal inicializado");

    // Solicitar permiso de notificación
    OneSignal.Notifications.requestPermission().then(permission => {
        console.log("Permiso de notificación:", permission);
    });

    const user = await OneSignal.User.get();
    console.log("User:", user);

    // Verificar suscripción
    OneSignal.User.pushSubscription.getAsync().then(subscription => {
        console.log("Suscripción:", subscription);
        console.log("Subscribed:", subscription.optedIn);
        console.log("Subscription ID:", subscription.id);
    });

    // Escuchar eventos
    OneSignal.Notifications.addEventListener('click', (event) => {
        console.log('Notificación clickeada:', event);
    });

    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
        console.log('Notificación en foreground:', event);
    });
});
