"use strict";

/**
 * REQ-031 - Acceso con Google: lo simple de Firebase, y nada mas.
 *
 * Historial de esta parte (para no repetirlo):
 *   REQ-019  popup -> redireccion (COOP bloquea window.close)
 *   REQ-027  Google Identity Services: exigia client_id propio -> origin_mismatch. Revertido.
 *   REQ-028  vuelta al popup -> reaparece COOP
 *   REQ-030  redireccion con respaldos y ramas
 *   REQ-031  solo redireccion: `signInWithRedirect` y `getRedirectResult`. Sin ramas.
 *
 * Este test existe para que no se vuelva a anadir complejidad aqui.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const AUTENTICACION = fs
  .readFileSync(path.join(RAIZ, "assets", "js", "autentication.js"), "utf8")
  .replace(/\r\n/g, "\n");

test("usa signInWithRedirect", () => {
  assert.ok(AUTENTICACION.indexOf("auth.signInWithRedirect(proveedorGoogle)") >= 0);
});

test("recoge el resultado con getRedirectResult", () => {
  assert.ok(AUTENTICACION.indexOf("auth.getRedirectResult()") >= 0);
});

test("no abre ventanas emergentes (COOP las bloquea)", () => {
  assert.equal(AUTENTICACION.indexOf("signInWithPopup"), -1);
});

test("no depende de Google Identity Services ni de un client_id propio", () => {
  assert.equal(AUTENTICACION.indexOf("google.accounts"), -1);
  assert.equal(AUTENTICACION.indexOf("client_id"), -1);
  assert.equal(AUTENTICACION.indexOf("gsi/client"), -1);
});
