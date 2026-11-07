"use strict";

/**
 * REQ-031 / REQ-035 / REQ-039 - Acceso con Google: lo simple de Firebase, y nada mas.
 *
 * Historial de esta parte (para no repetirlo):
 *   REQ-019  popup -> redireccion (COOP bloquea window.close)
 *   REQ-027  Google Identity Services: exigia client_id propio -> origin_mismatch. Revertido.
 *   REQ-028  vuelta al popup -> reaparece COOP
 *   REQ-030  redireccion con respaldos y ramas
 *   REQ-031  solo redireccion: `signInWithRedirect` y `getRedirectResult`. Sin ramas.
 *   REQ-035  redireccion en hosting (authDomain = mismo dominio); popup solo en local.
 *   REQ-039  el codigo pasa de autentication.js a app/auth.factory.js (dtaAuth).
 *
 * Este test existe para que no se vuelva a anadir complejidad aqui.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const AUTENTICACION = fs
  .readFileSync(path.join(RAIZ, "assets", "js", "app", "auth.factory.js"), "utf8")
  .replace(/\r\n/g, "\n");

test("usa signInWithRedirect", () => {
  assert.ok(AUTENTICACION.indexOf("auth.signInWithRedirect(proveedorGoogle)") >= 0);
});

test("recoge el resultado con getRedirectResult", () => {
  assert.ok(AUTENTICACION.indexOf("auth.getRedirectResult()") >= 0);
});

// REQ-035: el popup vuelve, pero SOLO en local, donde la redireccion no puede funcionar
// (no hay /__/auth/handler en el mismo origen). En hosting sigue siendo redireccion.
test("el popup solo se usa cuando la regla pura decide 'popup' (entorno local)", () => {
  const apariciones = AUTENTICACION.split("signInWithPopup").length - 1;
  assert.equal(apariciones, 1, "signInWithPopup debe aparecer una sola vez");
  assert.match(AUTENTICACION, /if \(metodo === "popup"\) \{\s*return auth\.signInWithPopup\(proveedorGoogle\);/);
  assert.ok(AUTENTICACION.indexOf("reglas.metodoDeAccesoGoogle(ubicacion && ubicacion.host)") >= 0);
});

test("REQ-035 C-2: getRedirectResult no traga los errores", () => {
  assert.doesNotMatch(AUTENTICACION, /getRedirectResult\(\)[\s\S]{0,400}\.catch\(/);
});

test("REQ-035 C-7: hay recuperacion de contrasena", () => {
  assert.ok(AUTENTICACION.indexOf("sendPasswordResetEmail") >= 0);
});

test("no depende de Google Identity Services ni de un client_id propio", () => {
  assert.equal(AUTENTICACION.indexOf("google.accounts"), -1);
  assert.equal(AUTENTICACION.indexOf("client_id"), -1);
  assert.equal(AUTENTICACION.indexOf("gsi/client"), -1);
});

test("REQ-039: autentication.js ya no existe ni se carga", () => {
  assert.equal(fs.existsSync(path.join(RAIZ, "assets", "js", "autentication.js")), false);
  const html = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
  assert.equal(html.indexOf("autentication.js"), -1);
});
