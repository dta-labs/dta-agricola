"use strict";

/**
 * REQ-030 - El popup queda prohibido como via principal: COOP lo bloquea.
 *
 * `signInWithPopup` abre la ventana de Google en otro origen y, con
 * `Cross-Origin-Opener-Policy: same-origin`, el navegador bloquea `window.close()` desde la
 * aplicacion: la ventana se queda abierta y los intentos se acumulan
 * (`auth/expired-popup-request`). Con redireccion no hay ventana que cerrar.
 *
 * El popup solo se conserva para navegadores que no soportan la redireccion
 * (`auth/operation-not-supported-in-this-environment`, tipico de algunos WebViews).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const AUTENTICACION = fs
  .readFileSync(path.join(RAIZ, "assets", "js", "autentication.js"), "utf8")
  .replace(/\r\n/g, "\n");

function posicion(patron) {
  return AUTENTICACION.indexOf(patron);
}

test("la via principal es signInWithRedirect", () => {
  const redirect = posicion("auth.signInWithRedirect(proveedorGoogle)");
  const popup = posicion("auth.signInWithPopup(proveedorGoogle)");

  assert.ok(redirect >= 0, "no se encontro signInWithRedirect");
  assert.ok(popup >= 0, "el popup debe seguir existiendo como respaldo");
  assert.ok(redirect < popup, "la redireccion debe intentarse antes que el popup");
});

test("el popup solo se usa para entornos sin soporte de redireccion", () => {
  const condicion = AUTENTICACION.indexOf('"auth/operation-not-supported-in-this-environment"');

  assert.ok(
    condicion >= 0,
    "el popup debe quedar detras del codigo auth/operation-not-supported-in-this-environment"
  );
  assert.ok(
    condicion < posicion("auth.signInWithPopup(proveedorGoogle)"),
    "la comprobacion debe estar antes de abrir el popup"
  );
});

test("ya no se decide nada por auth/popup-blocked (no aplica a la redireccion)", () => {
  assert.equal(AUTENTICACION.indexOf('"auth/popup-blocked"'), -1);
});

test("se recoge el resultado de la redireccion al cargar", () => {
  assert.ok(AUTENTICACION.indexOf("auth.getRedirectResult()") >= 0);
});
