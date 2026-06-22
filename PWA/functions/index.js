const { onValueWritten, onValueCreated } = require("firebase-functions/v2/database");
const admin = require('firebase-admin');

// Inicialización moderna (sin parámetros)
admin.initializeApp();

// ==========================================
// 1. FUNCIÓN: Alertas Críticas (Fallas en /logs)
// ==========================================
exports.sendNotifications = onValueWritten("/systems/{systemId}/logs/{logId}", async (event) => {
    const NOTIFICATION_SNAPSHOT = event.data.after.val();
    
    if (!NOTIFICATION_SNAPSHOT) return null;

    let msg = NOTIFICATION_SNAPSHOT.state === "ON" 
        ? (NOTIFICATION_SNAPSHOT.voltage === "false" ? "electricidad" : (NOTIFICATION_SNAPSHOT.safety === "false" ? "seguridad" : "")) 
        : "";

    if (msg !== "") {
        const systemId = event.params.systemId;

        const nameSnapshot = await admin.database().ref('/systems/' + systemId + '/settings/name').once('value');
        const systemName = nameSnapshot.val() || 'Sistema';

        const payload = {
            notification: {
                title: `¡ALERTA CRÍTICA!`,
                body: `Falla de ${msg} en ${systemName}`,
                icon: `https://dta-agricola.web.app/assets/images/DTA-Agricola.png`,
                sound: `default`, // OBLIGATORIO para que iOS/Android despierten y suenen
                click_action: `https://dta-agricola.web.app/`
            },
            data: {
                // Guardamos el sonido personalizado para reproducirlo si la app está ABIERTA
                customSound: `https://dta-agricola.web.app/assets/sounds/alarma-de-evacuacion.mp3`
            }
        };

        const options = {
            priority: "high",
            timeToLive: 60 * 60 * 24
        };

        const data = await admin.database().ref('/users').once('value');
        const snapshot = data.val();
        if (!snapshot) return null;

        const tokens = [];
        for (let key in snapshot) {
            if (snapshot[key].token && snapshot[key].systems && snapshot[key].systems[systemId] &&
                (snapshot[key].systems[systemId] === "propietario" || snapshot[key].systems[systemId] === "trabajador")) {
                tokens.push(snapshot[key].token);
            }
        }

        if (tokens.length === 0) {
            console.log(`No hay tokens válidos para el sistema ${systemId}`);
            return null;
        }

        try {
            const response = await admin.messaging().sendToDevice(tokens, payload, options);
            console.log("Mensaje correctamente enviado:", response);
        } catch (error) {
            console.log("Error sending message:", error);
        }
    }
});

// ==========================================
// 2. FUNCIÓN: Reportes Diarios (dayLogs)
// ==========================================
exports.sendDayLogNotifications = onValueCreated("/systems/{systemId}/dayLogs/{logId}", async (event) => {
    const systemId = event.params.systemId;
    const logId = event.params.logId;
    
    const nameSnapshot = await admin.database().ref('/systems/' + systemId + '/settings/name').once('value');
    const systemName = nameSnapshot.val() || 'Sistema';

    const payload = {
        notification: {
            title: `Reporte Diario: ${systemName}`,
            body: `El resumen diario de operaciones y riego está disponible.`,
            icon: `https://dta-agricola.web.app/assets/images/DTA-Agricola.png`,
            sound: `default`,
            click_action: `https://dta-agricola.web.app/`
        },
        data: {
            systemId: systemId,
            logId: logId,
            type: 'dayLog' 
        }
    };

    const options = {
        priority: "normal",
        timeToLive: 60 * 60 * 24
    };

    const data = await admin.database().ref('/users').once('value');
    const snapshot = data.val();
    if (!snapshot) return null;

    const tokens = [];
    for (let key in snapshot) {
        if (snapshot[key].token && snapshot[key].systems && snapshot[key].systems[systemId] &&
            (snapshot[key].systems[systemId] === "propietario" || snapshot[key].systems[systemId] === "trabajador")) {
            tokens.push(snapshot[key].token);
        }
    }

    if (tokens.length === 0) {
        console.log(`No hay usuarios con tokens para el sistema ${systemId}`);
        return null;
    }

    try {
        const response = await admin.messaging().sendToDevice(tokens, payload, options);
        console.log("Reporte diario enviado correctamente:", response);
    } catch (error) {
        console.log("Error enviando reporte diario:", error);
    }
});