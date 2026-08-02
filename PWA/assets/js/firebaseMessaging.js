const DTA_FCM_VAPID_KEY = "BCUVqEwpfFtJi-ikOB0_NU5nxLQDV0uHO0PTVLdTBDvxeqJtDqU20lFF159RI5T1v6aBM_JMc3AmzK5xMoUOg4o";
const DTA_PWA_LAUNCH_URL = "./index.html";
const DTA_NOTIFICATION_SOUND_FILE = "./assets/sounds/alarma-de-evacuacion.mp3";
let foregroundMessagingConfigured = false;
const fcmRegistrationPromises = {};

traceFcm("script-loaded", "firebaseMessaging.js cargado.");

function traceFcm(step, detail) {
  console.log(`[FCM:${step}]`, detail || "");
}

function errorFcm(step, error) {
  console.error(`[FCM:${step}]`, error || "");
}

function warnFcm(step, detail) {
  console.warn(`[FCM:${step}]`, detail || "");
}

function currentUserKey(email) {
  traceFcm("currentUserKey", email);
  return convertDotToDash(email);
}

function fcmTokenKey(token) {
  traceFcm("fcmTokenKey", token ? `${token.slice(0, 12)}...` : "sin token");
  return token.replace(/[.#$/\[\]]/g, "_");
}

function localFcmTokenKey(email) {
  return `dta-current-fcm-token-${currentUserKey(email)}`;
}

function replacePreviousDeviceToken(email, token) {
  const storageKey = localFcmTokenKey(email);
  const previousToken = localStorage.getItem(storageKey);

  if (!previousToken || previousToken === token) return Promise.resolve();

  traceFcm("replacePreviousDeviceToken", "Eliminando el token anterior de este dispositivo.");
  return fcmTokensRef(email).child(fcmTokenKey(previousToken)).remove();
}

function getNotificationPermission() {
  traceFcm("getNotificationPermission", "leyendo permiso");
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function isLikelyFcmRegistrationToken(token) {
  traceFcm("isLikelyFcmRegistrationToken", token ? `${token.slice(0, 12)}...` : "sin token");
  return typeof token === "string" &&
    token.length > 100 &&
    token.indexOf(":") > -1 &&
    token.indexOf("{") !== 0 &&
    token.indexOf("http") !== 0;
}

function userRef(email) {
  traceFcm("userRef", email);
  return firebase.database().ref(`users/${currentUserKey(email)}`);
}

function fcmTokensRef(email) {
  traceFcm("fcmTokensRef", email);
  return userRef(email).child("fcmTokens");
}

function fcmStatusRef(email) {
  traceFcm("fcmStatusRef", email);
  return userRef(email).child("fcmStatus");
}

function legacyTokenRef(email) {
  traceFcm("legacyTokenRef", email);
  return userRef(email).child("token");
}

function saveFcmStatus(email, status) {
  traceFcm("saveFcmStatus", status);
  if (!email) {
    errorFcm("saveFcmStatus", "Sin email; no se guarda estado.");
    return Promise.resolve();
  }

  return fcmStatusRef(email)
    .set(Object.assign({}, status, {
      updatedAt: firebase.database.ServerValue.TIMESTAMP,
    }))
    .catch((error) => {
      errorFcm("saveFcmStatus", error);
    });
}

function readStoredFcmTokensSnapshot(email) {
  traceFcm("readStoredFcmTokensSnapshot", email);
  if (!email) return Promise.resolve(null);
  return fcmTokensRef(email).once("value");
}

function extractValidTokensFromSnapshot(snapshot) {
  traceFcm("extractValidTokensFromSnapshot", snapshot ? "snapshot recibido" : "sin snapshot");
  const tokens = [];
  if (!snapshot) return tokens;

  snapshot.forEach((child) => {
    const value = child.val();
    const token = typeof value === "string" ? value : value && value.token;
    if (isLikelyFcmRegistrationToken(token)) tokens.push(token);
  });

  return tokens;
}

function getStoredFcmTokens(email) {
  traceFcm("getStoredFcmTokens", email);
  return readStoredFcmTokensSnapshot(email)
    .then(extractValidTokensFromSnapshot)
    .catch((error) => {
      errorFcm("getStoredFcmTokens", error);
      return [];
    });
}

function logStoredFcmTokens(email) {
  traceFcm("logStoredFcmTokens", email);
  return getStoredFcmTokens(email).then((tokens) => {
    if (tokens.length === 0) {
      traceFcm("logStoredFcmTokens", "No hay tokens en BD; se intentara generar uno.");
      return tokens;
    }

    tokens.forEach((token) => traceFcm("stored-token", token));
    return tokens;
  });
}

function removeLegacyPushTokens(email) {
  traceFcm("removeLegacyPushTokens", email);
  if (!email) return Promise.resolve();
  return legacyTokenRef(email).remove();
}

function buildInvalidTokenUpdates(snapshot) {
  traceFcm("buildInvalidTokenUpdates", snapshot ? "snapshot recibido" : "sin snapshot");
  const updates = {};
  if (!snapshot) return updates;

  snapshot.forEach((child) => {
    const value = child.val();
    const token = typeof value === "string" ? value : value && value.token;
    if (!isLikelyFcmRegistrationToken(token)) updates[child.key] = null;
  });

  return updates;
}

function applyTokenCleanup(email, updates) {
  traceFcm("applyTokenCleanup", updates);
  if (!email || Object.keys(updates).length === 0) return Promise.resolve();
  return fcmTokensRef(email).update(updates);
}

function cleanStoredFcmTokens(email) {
  traceFcm("cleanStoredFcmTokens", email);
  if (!email) return Promise.resolve();

  return readStoredFcmTokensSnapshot(email)
    .then(buildInvalidTokenUpdates)
    .then((updates) => applyTokenCleanup(email, updates));
}

function buildFcmTokenRecord(token) {
  traceFcm("buildFcmTokenRecord", token ? `${token.slice(0, 12)}...` : "sin token");
  return {
    token,
    origin: window.location.origin,
    path: window.location.pathname,
    scope: navigator.serviceWorker && navigator.serviceWorker.controller
      ? navigator.serviceWorker.controller.scriptURL
      : null,
    permission: getNotificationPermission(),
    platform: navigator.platform || null,
    userAgent: navigator.userAgent,
    updatedAt: firebase.database.ServerValue.TIMESTAMP,
  };
}

function writeFcmToken(email, token) {
  traceFcm("writeFcmToken", token);
  return fcmTokensRef(email)
    .child(fcmTokenKey(token))
    .set(buildFcmTokenRecord(token));
}

function saveFcmToken(email, token) {
  traceFcm("saveFcmToken", { email, token });
  if (!email || !isLikelyFcmRegistrationToken(token)) {
    errorFcm("saveFcmToken", "Token invalido o email ausente.");
    return removeLegacyPushTokens(email).then(() => cleanStoredFcmTokens(email));
  }

  return replacePreviousDeviceToken(email, token)
    .then(() => writeFcmToken(email, token))
    .then(() => localStorage.setItem(localFcmTokenKey(email), token))
    .then(() => removeLegacyPushTokens(email))
    .then(() => cleanStoredFcmTokens(email))
    .then(() => traceFcm("saveFcmToken", `Token guardado en BD: ${token}`))
    .catch((error) => {
      errorFcm("saveFcmToken", error);
      throw error;
    });
}

function buildForegroundNotificationOptions(payload) {
  traceFcm("buildForegroundNotificationOptions", payload);
  const data = payload.data || {};
  const notification = payload.notification || {};

  return {
    title: notification.title || "DTA-Agricola",
    options: {
      body: notification.body || "Nueva alerta",
      icon: data.icon || notification.icon || "./assets/images/DTA-Agricola.png",
      data: {
        url: data.click_action || DTA_PWA_LAUNCH_URL,
        sound: data.sound || DTA_NOTIFICATION_SOUND_FILE,
      },
      requireInteraction: true,
      silent: false,
      tag: notification.tag || data.alertType || "dta-alert",
    },
  };
}

function showForegroundNotification(payload) {
  traceFcm("showForegroundNotification", payload);
  if (!("serviceWorker" in navigator)) {
    errorFcm("showForegroundNotification", "Service Worker no soportado.");
    return;
  }

  const notification = buildForegroundNotificationOptions(payload);
  navigator.serviceWorker.ready
    .then((registration) => registration.showNotification(notification.title, notification.options))
    .catch((error) => errorFcm("showForegroundNotification", error));
}

function setupForegroundMessaging(messaging) {
  traceFcm("setupForegroundMessaging", messaging ? "messaging disponible" : "sin messaging");
  if (foregroundMessagingConfigured || !messaging || !messaging.onMessage) return;

  foregroundMessagingConfigured = true;
  messaging.onMessage(showForegroundNotification);
}

function isFirebaseMessagingSupported() {
  traceFcm("isFirebaseMessagingSupported", "verificando soporte");
  return !!(firebase.messaging && firebase.messaging.isSupported && firebase.messaging.isSupported());
}

function getMessagingInstance() {
  traceFcm("getMessagingInstance", "creando instancia");
  if (!isFirebaseMessagingSupported()) {
    errorFcm("getMessagingInstance", "Firebase Messaging no esta soportado.");
    return null;
  }

  const messaging = firebase.messaging();
  setupForegroundMessaging(messaging);
  return messaging;
}

function getTokenOptions(registration) {
  traceFcm("getTokenOptions", registration ? registration.scope : "sin registration");
  const options = { vapidKey: DTA_FCM_VAPID_KEY };
  if (registration) options.serviceWorkerRegistration = registration;
  return options;
}

function hasServiceWorkerSupport() {
  traceFcm("hasServiceWorkerSupport", "verificando soporte");
  return "serviceWorker" in navigator;
}

function registerMessagingServiceWorker() {
  traceFcm("registerMessagingServiceWorker", "registrando firebase-messaging-sw.js");
  if (!hasServiceWorkerSupport()) {
    errorFcm("registerMessagingServiceWorker", "Service Worker no soportado.");
    return Promise.reject(new Error("Service Worker no soportado."));
  }

  return navigator.serviceWorker
    .register("./firebase-messaging-sw.js", { scope: "./" })
    .then((registration) => {
      traceFcm("registerMessagingServiceWorker", `Registrado: ${registration.scope}`);
      return registration;
    });
}

function shouldAskNotificationPermission(forcePrompt) {
  traceFcm("shouldAskNotificationPermission", { forcePrompt, permission: getNotificationPermission() });
  return forcePrompt && getNotificationPermission() === "default";
}

function notifyPermissionDenied() {
  traceFcm("notifyPermissionDenied", "permiso bloqueado");
  const message = "Las notificaciones estan bloqueadas. Habilitalas en la configuracion del sitio y vuelve a presionar Activar notificaciones.";
  errorFcm("notifyPermissionDenied", message);

  if (typeof swal === "function") {
    return swal({
      title: "Notificaciones bloqueadas",
      text: message,
      icon: "warning",
      buttons: true,
    }).then(() => "denied");
  }

  window.alert(message);
  return Promise.resolve("denied");
}

function askNativeNotificationPermission() {
  traceFcm("askNativeNotificationPermission", "abriendo prompt nativo");
  if (!Notification.requestPermission) return Promise.resolve("default");

  return Notification.requestPermission().then((permission) => {
    traceFcm("askNativeNotificationPermission", `resultado: ${permission}`);
    if (permission !== "granted") errorFcm("askNativeNotificationPermission", `Solicitud cancelada: ${permission}`);
    return permission;
  });
}

function requestNotificationPermission(forcePrompt) {
  traceFcm("requestNotificationPermission", { forcePrompt, permission: getNotificationPermission() });

  const permission = getNotificationPermission();
  if (permission === "unsupported") {
    errorFcm("requestNotificationPermission", "Este navegador no soporta notificaciones.");
    return Promise.resolve("unsupported");
  }

  if (permission === "granted") return Promise.resolve("granted");
  if (permission === "denied") return notifyPermissionDenied();
  if (shouldAskNotificationPermission(forcePrompt)) return askNativeNotificationPermission();

  errorFcm("requestNotificationPermission", "No se solicito permiso; falta accion directa del usuario.");
  return Promise.resolve(permission);
}

function saveTokenStatus(email, step, extra) {
  traceFcm("saveTokenStatus", { step, extra });
  return saveFcmStatus(email, Object.assign({
    step,
    permission: getNotificationPermission(),
  }, extra || {}));
}

function classifyFcmTokenError(error) {
  traceFcm("classifyFcmTokenError", error);
  const message = error && error.message ? error.message : String(error);
  const name = error && error.name ? error.name : null;
  const code = error && error.code ? error.code : null;
  const isPushPermissionDenied = message.indexOf("Registration failed - permission denied") > -1;

  if (isPushPermissionDenied || name === "AbortError") {
    return {
      code: code || name || "push-permission-denied",
      message,
      reason: "El navegador concedio Notification.permission, pero bloqueo Push API. En Chrome/Edge esto ocurre en modo Incognito/InPrivate.",
    };
  }

  return {
    code,
    message,
    reason: "Error al generar token FCM.",
  };
}

function isRecoverablePushTokenError(error) {
  const code = error && error.code ? error.code : "";
  const message = error && error.message ? error.message : String(error || "");
  const reason = error && error.reason ? error.reason : "";

  return code === "PERMISSION_DENIED" ||
    code === "push-permission-denied" ||
    reason.indexOf("bloqueo Push API") > -1 ||
    message.indexOf("Registration failed - permission denied") > -1;
}

function unsubscribeCurrentPushSubscription(registration) {
  traceFcm("unsubscribeCurrentPushSubscription", registration ? registration.scope : "sin registration");
  if (!registration || !registration.pushManager) return Promise.resolve(false);

  return registration.pushManager.getSubscription()
    .then((subscription) => {
      if (!subscription) {
        traceFcm("unsubscribeCurrentPushSubscription", "Sin PushSubscription previa.");
        return false;
      }

      return subscription.unsubscribe()
        .then((result) => {
          traceFcm("unsubscribeCurrentPushSubscription", `PushSubscription eliminada: ${result}`);
          return result;
        });
    })
    .catch((error) => {
      warnFcm("unsubscribeCurrentPushSubscription", error);
      return false;
    });
}

function refreshMessagingRegistration(registration) {
  traceFcm("refreshMessagingRegistration", registration ? registration.scope : "sin registration");
  if (!registration || !registration.update) return Promise.resolve(registration);

  return registration.update()
    .then(() => navigator.serviceWorker.ready)
    .catch((error) => {
      warnFcm("refreshMessagingRegistration", error);
      return registration;
    });
}

function recoverPushSubscription(registration) {
  traceFcm("recoverPushSubscription", registration ? registration.scope : "sin registration");
  return unsubscribeCurrentPushSubscription(registration)
    .then(() => refreshMessagingRegistration(registration));
}

function requestTokenFromFirebase(messaging, registration) {
  traceFcm("requestTokenFromFirebase", registration ? registration.scope : "sin registration");
  traceFcm("requestTokenFromFirebase", "Solicitando token a Firebase antes de guardar en BD.");
  return messaging.getToken(getTokenOptions(registration))
    .then((token) => {
      traceFcm("token-before-save", token || "Firebase no devolvio token.");
      return token;
    })
    .catch((error) => {
      const classifiedError = classifyFcmTokenError(error);
      errorFcm("requestTokenFromFirebase", classifiedError);
      throw classifiedError;
    });
}

function requestTokenWithRecovery(messaging, registration) {
  traceFcm("requestTokenWithRecovery", registration ? registration.scope : "sin registration");
  return requestTokenFromFirebase(messaging, registration)
    .catch((error) => {
      if (!isRecoverablePushTokenError(error)) throw error;

      warnFcm("requestTokenWithRecovery", "Token bloqueado; se reiniciara la suscripcion Push y se reintentara.");
      return recoverPushSubscription(registration)
        .then((updatedRegistration) => requestTokenFromFirebase(messaging, updatedRegistration));
    });
}

function handlePermissionResult(email, permission) {
  traceFcm("handlePermissionResult", permission);
  if (permission === "granted") return Promise.resolve(true);

  errorFcm("handlePermissionResult", `No se genero token; permiso: ${permission}`);
  return saveTokenStatus(email, "permission-not-granted", { permission })
    .then(() => false);
}

function persistGeneratedToken(email, token) {
  traceFcm("persistGeneratedToken", token);
  if (!token) {
    errorFcm("persistGeneratedToken", "Firebase no devolvio token.");
    return saveTokenStatus(email, "empty-token").then(() => null);
  }

  traceFcm("generated-token", token);
  return saveFcmToken(email, token)
    .then(() => saveTokenStatus(email, "token-saved", {
      tokenPreview: `${token.slice(0, 12)}...${token.slice(-8)}`,
      origin: window.location.origin,
    }))
    .then(() => token);
}

function getAndSaveFcmToken(email, forcePrompt, registration) {
  traceFcm("getAndSaveFcmToken", { email, forcePrompt, registration: registration && registration.scope });

  const messaging = getMessagingInstance();
  if (!messaging) {
    return saveTokenStatus(email, "unsupported", {
      message: "Firebase Messaging no esta soportado.",
    }).then(() => null);
  }

  return saveTokenStatus(email, "requesting-permission", { forcePrompt: !!forcePrompt })
    .then(() => requestNotificationPermission(forcePrompt))
    .then((permission) => handlePermissionResult(email, permission))
    .then((canContinue) => {
      if (!canContinue) {
        traceFcm("getAndSaveFcmToken", "Flujo detenido por permiso no concedido.");
        return null;
      }
      return saveTokenStatus(email, "getting-token")
        .then(() => requestTokenWithRecovery(messaging, registration))
        .then((token) => persistGeneratedToken(email, token));
    })
    .catch((error) => {
      errorFcm("getAndSaveFcmToken", error);
      return saveTokenStatus(email, "error", {
        code: error && error.code ? error.code : null,
        message: error && error.message ? error.message : String(error),
        reason: error && error.reason ? error.reason : null,
      }).then(() => null);
    });
}

function deleteBrowserFcmToken(email, messaging, registration) {
  traceFcm("deleteBrowserFcmToken", { email, registration: registration && registration.scope });

  if (getNotificationPermission() !== "granted") {
    traceFcm("deleteBrowserFcmToken", "Sin permiso concedido; no hay token previo que borrar.");
    return Promise.resolve(registration);
  }

  return requestTokenFromFirebase(messaging, registration)
    .then((token) => {
      if (!token) return registration;

      return messaging.deleteToken(token)
        .then(() => fcmTokensRef(email).child(fcmTokenKey(token)).remove())
        .then(() => registration);
    });
}

function regenerateFcmToken(email) {
  traceFcm("regenerateFcmToken", email);

  const messaging = getMessagingInstance();
  if (!messaging) return Promise.resolve(null);

  return registerMessagingServiceWorker()
    .then((registration) => deleteBrowserFcmToken(email, messaging, registration))
    .catch((error) => {
      warnFcm("regenerateFcmToken", error);
      return registerMessagingServiceWorker();
    })
    .then((registration) => getAndSaveFcmToken(email, true, registration));
}

function registerFirebaseMessaging(email) {
  traceFcm("registerFirebaseMessaging", email);
  if (fcmRegistrationPromises[email]) {
    traceFcm("registerFirebaseMessaging", `registro ya en curso para ${email}`);
    return fcmRegistrationPromises[email];
  }

  fcmRegistrationPromises[email] = logStoredFcmTokens(email)
    .then(registerMessagingServiceWorker)
    .then((registration) => getAndSaveFcmToken(email, true, registration))
    .then((token) => {
      traceFcm("registerFirebaseMessaging", `flujo automatico finalizado. Token: ${token || "sin token"}`);
      return token;
    })
    .catch((error) => {
      errorFcm("registerFirebaseMessaging", error);
      return saveTokenStatus(email, "service-worker-error", {
        code: error && error.code ? error.code : null,
        message: error && error.message ? error.message : String(error),
      }).then(() => null);
    })
    .finally(() => {
      delete fcmRegistrationPromises[email];
    });

  return fcmRegistrationPromises[email];
}

function removeCurrentFcmToken(email) {
  traceFcm("removeCurrentFcmToken", email);

  const messaging = getMessagingInstance();
  if (!messaging) return removeLegacyPushTokens(email).then(() => cleanStoredFcmTokens(email));

  return registerMessagingServiceWorker()
    .then((registration) => requestTokenFromFirebase(messaging, registration))
    .then((token) => {
      if (!token) {
        traceFcm("removeCurrentFcmToken", "sin token actual");
        return null;
      }

      return messaging.deleteToken(token)
        .then(() => fcmTokensRef(email).child(fcmTokenKey(token)).remove())
        .then(() => localStorage.removeItem(localFcmTokenKey(email)))
        .then(() => removeLegacyPushTokens(email))
        .then(() => cleanStoredFcmTokens(email));
    });
}

function unSuscribeToNotifications(email) {
  traceFcm("unSuscribeToNotifications", email);
  return removeCurrentFcmToken(email);
}
