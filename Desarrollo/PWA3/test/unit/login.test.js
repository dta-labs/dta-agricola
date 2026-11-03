/**
 * REQ-015 - Decisiones del login que se pueden probar sin navegador.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const login = require("../../assets/js/logic/login.js");

test("REQ-015.1 debeReintentarConRedirect: popup bloqueado o no soportado", () => {
    assert.equal(login.debeReintentarConRedirect("auth/popup-blocked"), true);
    assert.equal(login.debeReintentarConRedirect("auth/operation-not-supported-in-this-environment"), true);
    assert.equal(login.debeReintentarConRedirect("auth/unauthorized-domain"), true);
    assert.equal(login.debeReintentarConRedirect("auth/popup-closed-by-user"), false);
    assert.equal(login.debeReintentarConRedirect(null), false);
});

test("REQ-015.2 mensajeDeError traduce los codigos frecuentes", () => {
    assert.match(login.mensajeDeError("auth/wrong-password"), /incorrecta/i);
    assert.match(login.mensajeDeError("auth/user-not-found"), /no encontrado/i);
    assert.match(login.mensajeDeError("auth/invalid-email"), /no v[aá]lido/i);
    assert.match(login.mensajeDeError("auth/email-already-in-use"), /ya (est[aá]|registrado)/i);
    assert.match(login.mensajeDeError("auth/weak-password"), /d[eé]bil/i);
    assert.match(login.mensajeDeError("auth/network-request-failed"), /red/i);
    assert.match(login.mensajeDeError("auth/popup-blocked"), /ventana emergente|bloque/i);
    assert.match(login.mensajeDeError("auth/unauthorized-domain"), /dominio/i);
});

test("REQ-015.3 un codigo desconocido cae en un mensaje generico con el codigo", () => {
    const mensaje = login.mensajeDeError("auth/algo-nuevo");
    assert.match(mensaje, /auth\/algo-nuevo/);
});

test("REQ-015.4 los codigos de v8 y v9 en guiones se tratan igual", () => {
    assert.match(login.mensajeDeError("auth/wrong_password"), /incorrecta/i);
    assert.match(login.mensajeDeError("auth/user_not_found"), /no encontrado/i);
});

test("REQ-015.5 sin error no hay mensaje", () => {
    assert.equal(login.mensajeDeError(null), "");
});
