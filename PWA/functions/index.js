const { onValueWritten } = require("firebase-functions/v2/database");
const admin = require("firebase-admin");

admin.initializeApp();

const VALID_SYSTEM_ROLES = new Set(["propietario", "trabajador"]);
const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-argument",
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);
const PWA_URL = "https://dta-agricola.web.app/";
const PWA_LAUNCH_URL = "./index.html";
const NOTIFICATION_ICON_URL = `${PWA_URL}assets/images/DTA-Agricola.png`;
const NOTIFICATION_SOUND_FILE = "./assets/sounds/alarma-de-evacuacion.mp3";

// #region COMUN

function isLikelyFcmToken(token) {
  return typeof token === "string" &&
    token.length > 100 &&
    !token.trim().startsWith("{") &&
    !token.startsWith("http") &&
    token.includes(":");
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim().toUpperCase() === "NAN") return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function collectUserTokens(userKey, user, systemId) {
  if (!user || !user.systems || !VALID_SYSTEM_ROLES.has(user.systems[systemId])) {
    return [];
  }

  const tokens = [];

  if (user.fcmTokens) {
    Object.entries(user.fcmTokens).forEach(([tokenKey, tokenValue]) => {
      const token = typeof tokenValue === "string" ? tokenValue : tokenValue && tokenValue.token;
      if (isLikelyFcmToken(token)) tokens.push({ userKey, tokenKey, token });
    });
  }

  return tokens;
}

async function removeInvalidTokens(tokenRefs, responses) {
  const removals = [];

  responses.forEach((response, index) => {
    if (response.success) return;

    const code = response.error && response.error.code;
    const tokenRef = tokenRefs[index];
    console.error("Error enviando token FCM:", code, tokenRef && tokenRef.userKey);

    if (INVALID_TOKEN_CODES.has(code) && tokenRef) {
      removals.push(
        admin.database()
          .ref(`/users/${tokenRef.userKey}/fcmTokens/${tokenRef.tokenKey}`)
          .remove()
      );
    }
  });

  await Promise.all(removals);
}

async function getTokenRefsForSystem(systemId) {
  const usersSnapshot = await admin.database().ref("/users").once("value");
  const users = usersSnapshot.val() || {};

  return Object.entries(users).flatMap(([userKey, user]) =>
    collectUserTokens(userKey, user, systemId)
  );
}

async function sendMulticastToTokenRefs(systemId, tokenRefs, message) {
  if (tokenRefs.length === 0) {
    console.log(`Sin tokens FCM para el sistema ${systemId}`);
    return null;
  }

  const response = await admin.messaging().sendEachForMulticast({
    ...message,
    tokens: tokenRefs.map(({ token }) => token),
  });

  await removeInvalidTokens(tokenRefs, response.responses);

  console.log(
    `Notificaciones FCM enviadas. Exitosas: ${response.successCount}, fallidas: ${response.failureCount}`
  );

  return response;
}

async function sendMulticastToSystemUsers(systemId, message) {
  const tokenRefs = await getTokenRefsForSystem(systemId);
  return sendMulticastToTokenRefs(systemId, tokenRefs, message);
}

// #endregion COMUN

// #region PIVOTE

const NOTIFIABLE_SYSTEM_TYPES = new Set(["PC", "PL"]);

function getAlertType(log) {
  if (!log || log.state !== "ON") return "";
  if (log.voltage === "false" || log.voltage === false) return "electricidad";
  if (log.safety === "false" || log.safety === false) return "seguridad";
  return "";
}

exports.sendPivotNotifications = onValueWritten({
  ref: "/systems/{systemId}/logs/{logId}",
  instance: "dta-agricola",
  region: "us-central1",
}, async (event) => {
    const change = event.data;
    if (!change.after.exists()) return null;

    const currentLog = change.after.val();
    const previousLog = change.before.exists() ? change.before.val() : null;
    const alertType = getAlertType(currentLog);

    if (!alertType || alertType === getAlertType(previousLog)) return null;

    const { systemId } = event.params;
    const [systemNameSnapshot, systemTypeSnapshot] = await Promise.all([
      admin.database().ref(`/systems/${systemId}/settings/name`).once("value"),
      admin.database().ref(`/systems/${systemId}/settings/type`).once("value"),
    ]);

    const systemType = systemTypeSnapshot.val();
    if (!NOTIFIABLE_SYSTEM_TYPES.has(systemType)) {
      console.log(`Sistema ${systemId} sin notificacion por tipo: ${systemType || "sin tipo"}`);
      return null;
    }

    const message = {
      notification: {
        title: "DTA-Agricola alerta!",
        body: `Falla de ${alertType} en ${systemNameSnapshot.val() || systemId}`,
      },
      data: {
        click_action: PWA_LAUNCH_URL,
        icon: NOTIFICATION_ICON_URL,
        sound: NOTIFICATION_SOUND_FILE,
        systemId,
        alertType,
      },
      webpush: {
        headers: {
          Urgency: "high",
          TTL: "86400",
        },
        notification: {
          icon: NOTIFICATION_ICON_URL,
          requireInteraction: true,
          silent: false,
          data: {
            url: PWA_LAUNCH_URL,
            sound: NOTIFICATION_SOUND_FILE,
          },
          tag: `dta-alert-${systemId}-${alertType}`,
        },
        fcmOptions: {
          link: `${PWA_URL}index.html`,
        },
      },
    };

    await sendMulticastToSystemUsers(systemId, message);
    return null;
  });

// #endregion PIVOTE

// #region SENSORES

const SENSOR_SYSTEM_TYPE = "Sensor";
const SENSOR_DATA_FIELDS = ["Ms", "Hr", "Tmin", "Tmax", "Tmed", "Hf", "ETc", "Vcc"];
const SENSOR_COUNT = 10;

function parseSensorDataRaw(dataRaw) {
  if (Array.isArray(dataRaw)) return dataRaw;
  if (typeof dataRaw !== "string") return [];

  try {
    const parsed = JSON.parse(dataRaw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("No se pudo parsear dataRaw:", error);
    return [];
  }
}

function getSensorConfig(sensors, index) {
  if (!sensors) return null;
  return sensors[`S${index}`] || sensors[`S${index + 1}`] || null;
}

function getThresholdAlert(value, minValue, maxValue) {
  const min = toNumber(minValue);
  const max = toNumber(maxValue);

  if (min !== null && value < min) {
    return { direction: "baja", threshold: min };
  }

  if (max !== null && value > max) {
    return { direction: "alta", threshold: max };
  }

  return null;
}

function getSensorReadings(log, sensors) {
  const data = parseSensorDataRaw(log && log.dataRaw);
  const readings = [];
  const sensorNumber = Math.min(toNumber(sensors && sensors.sensorNumber) || SENSOR_COUNT, SENSOR_COUNT);

  for (let index = 0; index < sensorNumber; index += 1) {
    const sensor = getSensorConfig(sensors, index);
    if (!sensor) continue;

    const sensorLabel = sensor.alias || sensor.id || `S${index + 1}`;
    const offset = index * SENSOR_DATA_FIELDS.length;

    readings.push({
      index,
      sensor,
      sensorName: `S${index + 1}`,
      sensorKey: sensor.id ? `S${index}` : `S${index + 1}`,
      sensorLabel,
      values: {
        Ms: toNumber(data[offset]),
        Hr: toNumber(data[offset + 1]),
        Tmin: toNumber(data[offset + 2]),
        Tmax: toNumber(data[offset + 3]),
        Tmed: toNumber(data[offset + 4]),
        Hf: toNumber(data[offset + 5]),
        ETc: toNumber(data[offset + 6]),
        Vcc: toNumber(data[offset + 7]),
      },
    });
  }

  return readings;
}

function getSensorAlertSignature(alerts) {
  return alerts
    .map((alert) => `${alert.sensor}:${alert.metricKey}:${alert.direction}`)
    .sort()
    .join("|");
}

function buildSensorAlertBody(systemName, alerts) {
  const firstAlert = alerts[0];
  const suffix = alerts.length > 1 ? ` y ${alerts.length - 1} alerta(s) adicional(es)` : "";
  const alertText = firstAlert.message || `${firstAlert.metric} ${firstAlert.direction}`;

  return `${alertText} en ${systemName} - ${firstAlert.sensorLabel}: ${firstAlert.value}${firstAlert.unit}${suffix}`;
}

function buildSensorThresholdMessage(systemId, logId, systemName, alerts, config) {
  return {
    notification: {
      title: config.title,
      body: buildSensorAlertBody(systemName, alerts),
    },
    data: {
      click_action: PWA_LAUNCH_URL,
      icon: NOTIFICATION_ICON_URL,
      sound: NOTIFICATION_SOUND_FILE,
      systemId,
      logId,
      alertType: config.alertType,
      metricKey: config.metricKey,
      alerts: JSON.stringify(alerts),
    },
    webpush: {
      headers: {
        Urgency: "high",
        TTL: "86400",
      },
      notification: {
        icon: NOTIFICATION_ICON_URL,
        requireInteraction: true,
        silent: false,
        data: {
          url: PWA_LAUNCH_URL,
          sound: NOTIFICATION_SOUND_FILE,
        },
        tag: `${config.tag}-${systemId}`,
      },
      fcmOptions: {
        link: `${PWA_URL}index.html`,
      },
    },
  };
}

async function getSensorNotificationContext(event) {
  const change = event.data;
  if (!change.after.exists()) return null;

  const { systemId, logId } = event.params;
  const settingsSnapshot = await admin.database()
    .ref(`/systems/${systemId}/settings`)
    .once("value");
  const settings = settingsSnapshot.val() || {};

  if (settings.type !== SENSOR_SYSTEM_TYPE) {
    console.log(`Sistema ${systemId} sin notificacion de sensores por tipo: ${settings.type || "sin tipo"}`);
    return null;
  }

  return {
    systemId,
    logId,
    currentLog: change.after.val(),
    previousLog: change.before.exists() ? change.before.val() : null,
    settings,
    systemName: settings.name || systemId,
  };
}

async function sendSensorMetricNotification(event, config) {
  const notificationContext = await getSensorNotificationContext(event);
  if (!notificationContext) return null;

  const {
    systemId,
    logId,
    currentLog,
    previousLog,
    settings,
    systemName,
  } = notificationContext;

  const currentAlerts = config.collectAlerts(currentLog, settings.sensors);
  if (currentAlerts.length === 0) return null;

  const previousAlerts = config.collectAlerts(previousLog, settings.sensors);
  if (getSensorAlertSignature(currentAlerts) === getSensorAlertSignature(previousAlerts)) {
    return null;
  }

  const message = buildSensorThresholdMessage(
    systemId,
    logId,
    systemName,
    currentAlerts,
    config
  );

  await sendMulticastToSystemUsers(systemId, message);
  return null;
}

// --- Humedad del suelo ---

function getSoilMoistureAlert(value, sensor) {
  const sensorType = String(sensor.type || "");
  if (value === null || !sensor.h || !sensor.h.notify || sensor.h.notify === false) return null;

  if (sensorType === "WM") {
    if (value <= 10) {
      return {
        direction: "saturado",
        threshold: 10,
        message: "Suelo saturado, No regar",
      };
    }

    if (value >= 100) {
      return {
        direction: "seco",
        threshold: 100,
        message: "Suelo seco, Regar urgente",
      };
    }

    return null;
  }

  if (sensorType.includes("SHT")) {
    const min = toNumber(sensor.h && sensor.h.minValue);
    const max = toNumber(sensor.h && sensor.h.maxValue);

    if (min !== null && value <= min) {
      return {
        direction: "seco",
        threshold: min,
        message: "Suelo seco, Regar urgente",
      };
    }

    if (max !== null && value >= max) {
      return {
        direction: "saturado",
        threshold: max,
        message: "Suelo saturado, No regar",
      };
    }
  }

  return null;
}

function buildSoilMoistureAlert(reading) {
  const value = reading.values.Ms;
  if (value === null || !reading.sensor) return null;

  const alert = getSoilMoistureAlert(value, reading.sensor);
  if (!alert) return null;

  return {
    sensor: reading.sensorName,
    sensorKey: reading.sensorKey,
    sensorLabel: reading.sensorLabel,
    metric: reading.sensor.type === "WM" ? "Agua disponible" : "Humedad del suelo",
    metricKey: "Ms",
    value,
    unit: reading.sensor.type === "WM" ? "cb" : "%",
    direction: alert.direction,
    threshold: alert.threshold,
    message: alert.message,
  };
}

function collectSoilMoistureAlerts(log, sensors) {
  return getSensorReadings(log, sensors)
    .map(buildSoilMoistureAlert)
    .filter(Boolean);
}

exports.sendSoilMoistureNotifications = onValueWritten({
  ref: "/systems/{systemId}/dayLogs/{logId}",
  instance: "dta-agricola",
  region: "us-central1",
}, async (event) => {
    return sendSensorMetricNotification(event, {
      metricKey: "Ms",
      title: "DTA-Agricola humedad de suelo!",
      alertType: "soil-moisture-threshold",
      tag: "dta-soil-moisture-alert",
      collectAlerts: collectSoilMoistureAlerts,
    });
  });

// --- Temperatura ---

function buildTemperatureAlert(reading) {
  const value = reading.values.Tmed;
  if (value === null || !reading.sensor.t || !reading.sensor.t.notify || reading.sensor.t.notify === false) return null;

  const alert = getThresholdAlert(value, reading.sensor.t.minValue, reading.sensor.t.maxValue);
  if (!alert) return null;

  return {
    sensor: reading.sensorName,
    sensorKey: reading.sensorKey,
    sensorLabel: reading.sensorLabel,
    metric: "Temperatura",
    metricKey: "Tmed",
    value,
    unit: " C",
    direction: alert.direction,
    threshold: alert.threshold,
  };
}

function collectTemperatureAlerts(log, sensors) {
  return getSensorReadings(log, sensors)
    .map(buildTemperatureAlert)
    .filter(Boolean);
}

exports.sendTemperatureNotifications = onValueWritten({
  ref: "/systems/{systemId}/dayLogs/{logId}",
  instance: "dta-agricola",
  region: "us-central1",
}, async (event) => {
    return sendSensorMetricNotification(event, {
      metricKey: "Tmed",
      title: "DTA-Agricola temperatura!",
      alertType: "temperature-threshold",
      tag: "dta-temperature-alert",
      collectAlerts: collectTemperatureAlerts,
    });
  });

// #endregion SENSORES
