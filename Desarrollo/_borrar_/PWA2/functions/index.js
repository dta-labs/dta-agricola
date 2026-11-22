const { onValueCreated, onValueWritten } = require("firebase-functions/v2/database");
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
const NOTIFICATION_TIME_ZONE = "America/Mexico_City";
const SENSOR_ALERT_ICONS = {
  temperature: {
    baja: `${PWA_URL}assets/images/nieve.png`,
    alta: `${PWA_URL}assets/images/termometro.png`,
  },
  soilMoisture: {
    seco: `${PWA_URL}assets/images/suelos.png`,
    saturado: `${PWA_URL}assets/images/agua.png`,
  },
};

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
  if (typeof value === "string") {
    const normalizedValue = value.trim().toUpperCase();
    if (!normalizedValue || normalizedValue === "NAN") return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function parseLogDate(dateValue) {
  if (!dateValue) return null;
  const value = String(dateValue).trim();

  // Formato utilizado por los dispositivos: YYYYMMDD HHMMam/pm.
  const deviceDate = value.match(/^(\d{4})(\d{2})(\d{2})\D*(\d{2})\D*(\d{2})\s*(am|pm)?$/i);
  if (deviceDate) {
    let hour = Number(deviceDate[4]);
    const period = (deviceDate[6] || "").toLowerCase();
    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;

    const parsed = new Date(
      Number(deviceDate[1]),
      Number(deviceDate[2]) - 1,
      Number(deviceDate[3]),
      hour,
      Number(deviceDate[5])
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getNotificationDateTime(log, eventTime) {
  const rawLogDate = log && (log.update || log.date);
  const deviceDate = rawLogDate && String(rawLogDate).trim()
    .match(/^(\d{4})(\d{2})(\d{2})\D*(\d{2})\D*(\d{2})\s*(am|pm)?$/i);
  const date = parseLogDate(rawLogDate) ||
    parseLogDate(eventTime) ||
    new Date();
  // La fecha compacta del dispositivo ya representa hora local; no convertirla
  // nuevamente desde UTC porque desplazaría la lectura varias horas.
  const formatted = deviceDate
    ? `${deviceDate[3]}/${deviceDate[2]}/${deviceDate[1]} ${deviceDate[4]}:${deviceDate[5]} ${(deviceDate[6] || "").toUpperCase()}`.trim()
    : new Intl.DateTimeFormat("es-MX", {
        timeZone: NOTIFICATION_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(date);

  return {
    formatted,
    iso: date.toISOString(),
  };
}

function appendNotificationDateTime(body, dateTime) {
  return `${body}\nFecha: ${dateTime.formatted}`;
}

function getSensorAlertIcon(config, alerts) {
  const direction = alerts[0] && alerts[0].direction;
  const icons = config.icons || {};
  return icons[direction] || NOTIFICATION_ICON_URL;
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

    const dateTime = getNotificationDateTime(currentLog, event.time);

    const message = {
      notification: {
        title: "DTA-Agricola alerta!",
        body: appendNotificationDateTime(
          `Falla de ${alertType} en ${systemNameSnapshot.val() || systemId}`,
          dateTime
        ),
      },
      data: {
        click_action: PWA_LAUNCH_URL,
        icon: NOTIFICATION_ICON_URL,
        sound: NOTIFICATION_SOUND_FILE,
        systemId,
        alertType,
        occurredAt: dateTime.iso,
        occurredAtFormatted: dateTime.formatted,
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
const MIN_NOTIFIABLE_DISEASE_PROBABILITY = 40;

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

function getThresholdAlert(value, minValue, maxValue) {
  const min = toNumber(minValue);
  const max = toNumber(maxValue);

  if (min !== null && value < min) {
    return { direction: "baja", threshold: min, thresholdKind: "lower" };
  }

  if (max !== null && value > max) {
    return { direction: "alta", threshold: max, thresholdKind: "upper" };
  }

  return null;
}

function getSensorReadings(log, sensors) {
  const data = parseSensorDataRaw(log && log.dataRaw);
  const readings = [];
  const sensorNumber = Math.min(toNumber(sensors && sensors.sensorNumber) || SENSOR_COUNT, SENSOR_COUNT);

  for (let index = 0; index < sensorNumber; index += 1) {
    const zeroBasedKey = `S${index}`;
    const oneBasedKey = `S${index + 1}`;
    const sensorKey = sensors && sensors[zeroBasedKey] ? zeroBasedKey : oneBasedKey;
    const sensor = sensors && sensors[sensorKey];
    if (!sensor) continue;

    const sensorLabel = sensor.alias || sensor.id || `S${index + 1}`;
    const offset = index * SENSOR_DATA_FIELDS.length;

    readings.push({
      index,
      sensor,
      sensorName: `S${index + 1}`,
      sensorKey,
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

function buildSensorAlertBody(systemName, alerts) {
  const firstAlert = alerts[0];
  const suffix = alerts.length > 1 ? ` y ${alerts.length - 1} alerta(s) adicional(es)` : "";
  const alertText = firstAlert.message || `${firstAlert.metric} ${firstAlert.direction}`;

  return `${alertText} en ${systemName} - ${firstAlert.sensorLabel}: ${firstAlert.value}${firstAlert.unit}${suffix}`;
}

function buildSensorThresholdMessage(systemId, logId, systemName, alerts, config, dateTime) {
  const alertIcon = getSensorAlertIcon(config, alerts);
  return {
    notification: {
      title: config.title,
      body: appendNotificationDateTime(buildSensorAlertBody(systemName, alerts), dateTime),
    },
    data: {
      click_action: PWA_LAUNCH_URL,
      icon: alertIcon,
      sound: NOTIFICATION_SOUND_FILE,
      systemId,
      logId,
      alertType: config.alertType,
      metricKey: config.metricKey,
      alerts: JSON.stringify(alerts),
      occurredAt: dateTime.iso,
      occurredAtFormatted: dateTime.formatted,
    },
    webpush: {
      headers: {
        Urgency: "high",
        TTL: "86400",
      },
      notification: {
        icon: alertIcon,
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
  const snapshot = event.data && event.data.after ? event.data.after : event.data;
  if (!snapshot || !snapshot.exists()) return null;

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
    currentLog: snapshot.val(),
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
    settings,
    systemName,
  } = notificationContext;

  const currentAlerts = config.collectAlerts(currentLog, settings.sensors);
  if (currentAlerts.length === 0) return null;

  const previousLog = await getPreviousDayLog(systemId, logId);
  const previousAlerts = config.collectAlerts(previousLog, settings.sensors);
  const previousAlertSignatures = new Set(previousAlerts.map(getSensorAlertSignature));
  const dateTime = getNotificationDateTime(currentLog, event.time);
  const isNight = isNightTime(currentLog, event.time);
  const notifiableAlerts = [];

  // Entre 19:00 y 07:00 solamente se muestra temperatura baja y se envia con
  // cada registro que permanezca por debajo del umbral. Todas las demas
  // alertas quedan suspendidas durante la noche.
  if (isNight) {
    if (config.metricKey !== "Tmed") return null;
    notifiableAlerts.push(...currentAlerts.filter((alert) => alert.thresholdKind === "lower"));
  }

  for (const alert of isNight ? [] : currentAlerts) {
    const signature = getSensorAlertSignature(alert);

    // El umbral superior se notifica solamente al momento de cruzarlo.
    if (alert.thresholdKind === "upper") {
      if (!previousAlertSignatures.has(signature) &&
          await claimThreeHourNotification(systemId, config.metricKey, alert)) {
        notifiableAlerts.push(alert);
      }
      continue;
    }

    // El umbral inferior se notifica al cruzarlo, en cada registro nocturno y,
    // durante el dia, como maximo una vez cada tres horas.
    const isFirstBelowThreshold = !previousAlertSignatures.has(signature);
    if (isFirstBelowThreshold || isNightTime(currentLog, event.time)) {
      notifiableAlerts.push(alert);
      continue;
    }

    if (await claimThreeHourNotification(systemId, config.metricKey, alert, dateTime.iso)) {
      notifiableAlerts.push(alert);
    }
  }

  if (notifiableAlerts.length === 0) return null;

  await rememberLowerThresholdNotifications(
    systemId,
    config.metricKey,
    notifiableAlerts,
    dateTime.iso
  );

  const message = buildSensorThresholdMessage(
    systemId,
    logId,
    systemName,
    notifiableAlerts,
    config,
    dateTime
  );

  await sendMulticastToSystemUsers(systemId, message);
  return null;
}

function getSensorAlertSignature(alert) {
  return `${alert.sensorKey || alert.sensor}:${alert.metricKey}:${alert.thresholdKind}`;
}

function getLogLocalHour(log, eventTime) {
  const rawLogDate = log && (log.update || log.date);
  const deviceDate = rawLogDate && String(rawLogDate).trim()
    .match(/^(\d{4})(\d{2})(\d{2})\D*(\d{2})\D*(\d{2})\s*(am|pm)?$/i);

  if (deviceDate) {
    let hour = Number(deviceDate[4]);
    const period = (deviceDate[6] || "").toLowerCase();
    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
    return hour;
  }

  const date = parseLogDate(eventTime) || new Date();
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone: NOTIFICATION_TIME_ZONE,
    hour: "2-digit",
    hour12: false,
  }).format(date));
}

function isNightTime(log, eventTime) {
  const hour = getLogLocalHour(log, eventTime);
  return hour >= 19 || hour < 7;
}

function getLogLocalHour(log, eventTime) {
  const rawLogDate = log && (log.update || log.date);
  const deviceDate = rawLogDate && String(rawLogDate).trim()
    .match(/^(\d{4})(\d{2})(\d{2})\D*(\d{2})\D*(\d{2})\s*(am|pm)?$/i);

  if (deviceDate) {
    let hour = Number(deviceDate[4]);
    const period = (deviceDate[6] || "").toLowerCase();
    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
    return hour;
  }

  const date = parseLogDate(eventTime) || new Date();
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone: NOTIFICATION_TIME_ZONE,
    hour: "2-digit",
    hour12: false,
  }).format(date));
}

function isNightTime(log, eventTime) {
  const hour = getLogLocalHour(log, eventTime);
  return hour >= 19 || hour < 7;
}

function getThresholdNotificationStateRef(systemId, metricKey, alert) {
  const sensorKey = String(alert.sensorKey || alert.sensor || "sensor")
    .replace(/[.#$\[\]/]/g, "_");
  return admin.database().ref(
    `/systems/${systemId}/notificationState/sensorThresholds/${metricKey}/${sensorKey}/${alert.thresholdKind}`
  );
}

async function claimThreeHourNotification(systemId, metricKey, alert, occurredAt) {
  const occurredAtMs = Date.parse(occurredAt);
  if (!Number.isFinite(occurredAtMs)) return false;

  const stateRef = getThresholdNotificationStateRef(systemId, metricKey, alert);
  const result = await stateRef.transaction((lastNotification) => {
    const lastNotificationMs = Date.parse(lastNotification);
    if (Number.isFinite(lastNotificationMs) && occurredAtMs - lastNotificationMs < 3 * 60 * 60 * 1000) {
      return;
    }
    return occurredAt;
  });

  return result.committed;
}

async function rememberLowerThresholdNotifications(systemId, metricKey, alerts, occurredAt) {
  await Promise.all(alerts
    .filter((alert) => alert.thresholdKind === "lower")
    .map((alert) => getThresholdNotificationStateRef(systemId, metricKey, alert).set(occurredAt)));
}

// --- Humedad del suelo ---

function getSoilMoistureAlert(value, sensor) {
  const sensorType = String(sensor.type || "");
  if (value === null || !sensor.h || !sensor.h.notify || sensor.h.notify === false) return null;

  const min = toNumber(sensor.h.minValue);
  const max = toNumber(sensor.h.maxValue);

  if (sensorType === "WM") {
    // En Watermark una lectura baja indica saturación y una alta, suelo seco.
    if (min !== null && value <= min) {
      return {
        direction: "saturado",
        threshold: min,
        thresholdKind: "lower",
        message: "Suelo saturado, No regar",
      };
    }

    if (max !== null && value >= max) {
      return {
        direction: "seco",
        threshold: max,
        thresholdKind: "upper",
        message: "Suelo seco, Regar urgente",
      };
    }

    return null;
  }

  if (sensorType.includes("SHT")) {
    if (min !== null && value <= min) {
      return {
        direction: "seco",
        threshold: min,
        thresholdKind: "lower",
        message: "Suelo seco, Regar urgente",
      };
    }

    if (max !== null && value >= max) {
      return {
        direction: "saturado",
        threshold: max,
        thresholdKind: "upper",
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
    thresholdKind: alert.thresholdKind,
    message: alert.message,
  };
}

function collectSoilMoistureAlerts(log, sensors) {
  return getSensorReadings(log, sensors)
    .map(buildSoilMoistureAlert)
    .filter(Boolean);
}

exports.sendSoilMoistureNotifications = onValueCreated({
  ref: "/systems/{systemId}/dayLogs/{logId}",
  instance: "dta-agricola",
  region: "us-central1",
}, async (event) => {
    return sendSensorMetricNotification(event, {
      metricKey: "Ms",
      title: "DTA-Agricola humedad de suelo!",
      alertType: "soil-moisture-threshold",
      tag: "dta-soil-moisture-alert",
      icons: SENSOR_ALERT_ICONS.soilMoisture,
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
    thresholdKind: alert.thresholdKind,
  };
}

function collectTemperatureAlerts(log, sensors) {
  return getSensorReadings(log, sensors)
    .map(buildTemperatureAlert)
    .filter(Boolean);
}

exports.sendTemperatureNotifications = onValueCreated({
  ref: "/systems/{systemId}/dayLogs/{logId}",
  instance: "dta-agricola",
  region: "us-central1",
}, async (event) => {
    return sendSensorMetricNotification(event, {
      metricKey: "Tmed",
      title: "DTA-Agricola temperatura!",
      alertType: "temperature-threshold",
      tag: "dta-temperature-alert",
      icons: SENSOR_ALERT_ICONS.temperature,
      collectAlerts: collectTemperatureAlerts,
    });
  });

// --- Riesgo de plagas y enfermedades ---

const DISEASE_CONDITION_FIELDS = [
  { valueKey: "Ms", minKey: "Msmin", maxKey: "Msmax" },
  { valueKey: "Hr", minKey: "Rhmin", maxKey: "Rhmax" },
  { valueKey: "Tmed", minKey: "Tmin", maxKey: "Tmax" },
];

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getEnabledDiseaseNames(sensor) {
  if (!sensor || !sensor.alerts || typeof sensor.alerts !== "object") return [];

  return Object.entries(sensor.alerts)
    .filter(([, enabled]) => enabled === true)
    .map(([diseaseName]) => diseaseName);
}

function findCulture(cultures, cultureName) {
  const normalizedCultureName = normalizeSearchText(cultureName);
  if (!normalizedCultureName || !cultures) return null;

  return Object.values(cultures).find((culture) =>
    culture && normalizeSearchText(culture.culture) === normalizedCultureName
  ) || null;
}

function findDisease(culture, diseaseName) {
  if (!culture || !culture.diseases) return null;
  const normalizedDiseaseName = normalizeSearchText(diseaseName);

  return Object.values(culture.diseases).find((disease) =>
    disease && normalizeSearchText(disease.name) === normalizedDiseaseName
  ) || null;
}

function matchesDiseaseConditions(values, disease) {
  let comparedConditions = 0;

  const matches = DISEASE_CONDITION_FIELDS.every(({ valueKey, minKey, maxKey }) => {
    const min = toNumber(disease && disease[minKey]);
    const max = toNumber(disease && disease[maxKey]);
    if (min === null && max === null) return true;

    comparedConditions += 1;
    const value = toNumber(values && values[valueKey]);
    if (value === null) return false;

    return (min === null || value >= min) && (max === null || value <= max);
  });

  return comparedConditions > 0 && matches;
}

function getDiseaseConditionEvidence(values, disease) {
  return DISEASE_CONDITION_FIELDS.flatMap(({ valueKey, minKey, maxKey }) => {
    const min = toNumber(disease && disease[minKey]);
    const max = toNumber(disease && disease[maxKey]);
    if (min === null && max === null) return [];
    const value = toNumber(values && values[valueKey]);
    return [{
      valueKey,
      value,
      min,
      max,
      matches: value !== null && (min === null || value >= min) && (max === null || value <= max),
    }];
  });
}

function getPhenologicalStage(sensor) {
  return String(sensor && (
    sensor.phenologicalStage || sensor.phenology || sensor.cropStage || sensor.stage || sensor.phase
  ) || "").trim();
}

function getSensorLocation(sensor) {
  const latitude = toNumber(sensor && sensor.latitude);
  const longitude = toNumber(sensor && sensor.longitude);
  return {
    latitude,
    longitude,
    isDefined: latitude !== null && longitude !== null && !(latitude === 0 && longitude === 0),
  };
}

function collectDiseaseRisks(log, sensors, cultures) {
  const risks = [];

  getSensorReadings(log, sensors).forEach((reading) => {
    const culture = findCulture(cultures, reading.sensor && reading.sensor.culture);
    if (!culture) return;

    getEnabledDiseaseNames(reading.sensor).forEach((diseaseName) => {
      const disease = findDisease(culture, diseaseName);
      if (!disease || !matchesDiseaseConditions(reading.values, disease)) return;

      risks.push({
        sensor: reading.sensorName,
        sensorKey: reading.sensorKey,
        sensorLabel: reading.sensorLabel,
        culture: culture.culture,
        disease: disease.name,
        photo: disease.photo || "",
        phenologicalStage: getPhenologicalStage(reading.sensor),
        location: getSensorLocation(reading.sensor),
        conditions: getDiseaseConditionEvidence(reading.values, disease),
      });
    });
  });

  return risks;
}

function getDiseaseRiskSignature(risk) {
  return `${risk.sensorKey}:${normalizeSearchText(risk.disease)}`;
}

async function isDiseaseAlertStillEnabled(systemId, risk) {
  const snapshot = await admin.database()
    .ref(`/systems/${systemId}/settings/sensors/${risk.sensorKey}/alerts`)
    .child(risk.disease)
    .once("value");
  const enabled = snapshot.val() === true;

  if (!enabled) {
    console.log(
      `Alerta de plaga omitida: ${systemId}/${risk.sensorKey}/${risk.disease} no esta habilitada`
    );
  }

  return enabled;
}

async function filterEnabledDiseaseRisks(systemId, risks) {
  const enabledChecks = await Promise.all(
    risks.map((risk) => isDiseaseAlertStillEnabled(systemId, risk))
  );
  return risks.filter((risk, index) => enabledChecks[index]);
}

function getLocalDiseaseProbability(risk) {
  const matchedConditions = risk.conditions.filter((condition) => condition.matches).length;
  const conditionCoverage = Math.min(matchedConditions, 3) * 5;
  const phenologyEvidence = risk.phenologicalStage ? 5 : 0;
  const geographicEvidence = risk.location.isDefined ? 5 : 0;
  return Math.min(90, 65 + conditionCoverage + phenologyEvidence + geographicEvidence);
}

function getDiseaseProbabilityLabel(probability) {
  if (probability >= 85) return "urgente";
  if (probability >= 65) return "altamente probable";
  return "probable";
}

function scoreDiseaseRisks(risks) {
  return risks.map((risk) => {
    const probability = getLocalDiseaseProbability(risk);
    return {
      ...risk,
      probability,
      probabilityLabel: getDiseaseProbabilityLabel(probability),
    };
  });
}

async function claimDiseaseNotification(systemId, risk) {
  const sensorKey = String(risk.sensorKey || risk.sensor || "sensor")
    .replace(/[.#$\[\]/]/g, "_");
  const diseaseKey = normalizeSearchText(risk.disease)
    .replace(/[.#$\[\]/]/g, "_");
  const stateRef = admin.database().ref(
    `/systems/${systemId}/notificationState/diseaseRisks/${sensorKey}/${diseaseKey}`
  );
  const nowMs = Date.now();
  const result = await stateRef.transaction((lastNotification) => {
    const lastNotificationMs = typeof lastNotification === "number"
      ? lastNotification
      : Date.parse(lastNotification);
    if (Number.isFinite(lastNotificationMs) &&
        nowMs - lastNotificationMs < SENSOR_NOTIFICATION_COOLDOWN_MS) {
      return;
    }
    return nowMs;
  });
  return result.committed;
}

function getDiseasePhotoPath(photo) {
  const fileName = String(photo || "").trim();
  if (!fileName) return "";

  const withExtension = /\.[a-z0-9]+$/i.test(fileName) ? fileName : `${fileName}.jpg`;
  return `./assets/images/diseases/${withExtension}`;
}

function getAbsoluteAssetUrl(relativePath) {
  if (!relativePath) return NOTIFICATION_ICON_URL;
  return encodeURI(new URL(relativePath, PWA_URL).href);
}

async function getPreviousDayLog(systemId, logId) {
  const snapshot = await admin.database()
    .ref(`/systems/${systemId}/dayLogs`)
    .orderByKey()
    .endAt(logId)
    .limitToLast(2)
    .once("value");
  const logs = [];

  snapshot.forEach((child) => {
    if (child.key !== logId) logs.push(child.val());
  });

  return logs.length > 0 ? logs[logs.length - 1] : null;
}

function buildDiseaseRiskMessage(systemId, logId, systemName, risk, dateTime) {
  const photoPath = getDiseasePhotoPath(risk.photo);
  const imageUrl = getAbsoluteAssetUrl(photoPath);

  return {
    notification: {
      title: "DTA-Agricola alerta de plaga!",
      body: appendNotificationDateTime(
        `${risk.disease}: ${risk.probabilityLabel} (${risk.probability}%) en ${systemName} - ${risk.sensorLabel}`,
        dateTime
      ),
      imageUrl,
    },
    data: {
      click_action: PWA_LAUNCH_URL,
      icon: NOTIFICATION_ICON_URL,
      image: imageUrl,
      diseasePhoto: photoPath,
      sound: NOTIFICATION_SOUND_FILE,
      systemId,
      logId,
      sensorKey: risk.sensorKey,
      disease: risk.disease,
      culture: risk.culture,
      alertType: "disease-risk",
      probability: String(risk.probability),
      probabilityLabel: risk.probabilityLabel,
      phenologicalStage: risk.phenologicalStage || "",
      occurredAt: dateTime.iso,
      occurredAtFormatted: dateTime.formatted,
    },
    webpush: {
      headers: {
        Urgency: "high",
        TTL: "86400",
      },
      notification: {
        icon: NOTIFICATION_ICON_URL,
        image: imageUrl,
        requireInteraction: true,
        silent: false,
        data: {
          url: PWA_LAUNCH_URL,
          sound: NOTIFICATION_SOUND_FILE,
        },
        tag: `dta-disease-${systemId}-${risk.sensorKey}-${normalizeSearchText(risk.disease)}`,
      },
      fcmOptions: {
        link: `${PWA_URL}index.html`,
      },
    },
  };
}

exports.sendDiseaseRiskNotifications = onValueCreated({
  ref: "/systems/{systemId}/dayLogs/{logId}",
  instance: "dta-agricola",
  region: "us-central1",
}, async (event) => {
  const { systemId, logId } = event.params;
  if (isNightTime(event.data.val(), event.time)) return null;

  const [settingsSnapshot, culturesSnapshot, previousLog] = await Promise.all([
    admin.database().ref(`/systems/${systemId}/settings`).once("value"),
    admin.database().ref("/cultivos").once("value"),
    getPreviousDayLog(systemId, logId),
  ]);
  const settings = settingsSnapshot.val() || {};

  if (settings.type !== SENSOR_SYSTEM_TYPE || !previousLog) return null;

  const cultures = culturesSnapshot.val() || {};
  const currentRisks = collectDiseaseRisks(event.data.val(), settings.sensors, cultures);
  if (currentRisks.length === 0) return null;

  const previousRiskSignatures = new Set(
    collectDiseaseRisks(previousLog, settings.sensors, cultures).map(getDiseaseRiskSignature)
  );
  const sustainedRisks = currentRisks.filter((risk) =>
    previousRiskSignatures.has(getDiseaseRiskSignature(risk))
  );
  if (sustainedRisks.length === 0) return null;

  const enabledRisks = await filterEnabledDiseaseRisks(systemId, sustainedRisks);
  if (enabledRisks.length === 0) return null;

  const candidateRisks = scoreDiseaseRisks(enabledRisks)
    .filter((risk) => risk.probability >= MIN_NOTIFIABLE_DISEASE_PROBABILITY);
  const stillEnabledCandidates = await filterEnabledDiseaseRisks(systemId, candidateRisks);
  const scoredRisks = [];
  for (const risk of stillEnabledCandidates) {
    if (await claimDiseaseNotification(systemId, risk)) scoredRisks.push(risk);
  }
  if (scoredRisks.length === 0) return null;

  const tokenRefs = await getTokenRefsForSystem(systemId);
  const dateTime = getNotificationDateTime(event.data.val(), event.time);
  for (const risk of scoredRisks) {
    // La configuracion pudo cambiar durante el procesamiento. Esta lectura es
    // la ultima barrera y ocurre inmediatamente antes de construir y enviar.
    if (!await isDiseaseAlertStillEnabled(systemId, risk)) continue;

    const message = buildDiseaseRiskMessage(
      systemId,
      logId,
      settings.name || systemId,
      risk,
      dateTime
    );
    await sendMulticastToTokenRefs(systemId, tokenRefs, message);
  }

  return null;
});

// #endregion SENSORES
