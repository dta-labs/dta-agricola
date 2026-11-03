"use strict";

/**
 * REQ-029 - El boton "Salir" del menu de usuario debe hacer lo mismo que el del menu lateral.
 *
 * El menu lateral usa `ng-click="showLogin()"`; el menu del avatar usaba `salirDesdeMenu()`,
 * que internamente llamaba a `logout()`. Dos caminos distintos para la misma accion.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
// Normaliza el salto de linea para que el test no dependa del sistema de ficheros.
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");

/** ng-click del boton Salir del menu desplegable del avatar. */
function clickDelMenuDeUsuario() {
  // El enlace "Salir" es el que lleva el icono `logout` y el texto Salir.
  const coincidencia = HTML.match(/<a[^>]*ng-click="([^"]*)"[^>]*>\s*<i[^>]*>logout<\/i>\s*Salir/);

  return coincidencia ? coincidencia[1] : null;
}

/** ng-click del boton Salir del menu lateral. */
function clickDelMenuLateral() {
  const coincidencia = HTML.match(/id="signoutBtn2"[^>]*ng-click="([^"]*)"/);

  return coincidencia ? coincidencia[1] : null;
}

test("el boton Salir del menu lateral usa showLogin()", () => {
  assert.equal(clickDelMenuLateral(), "showLogin()");
});

test("el boton Salir del menu de usuario existe y usa showLogin()", () => {
  const click = clickDelMenuDeUsuario();

  assert.notEqual(click, null, "no se encontro el enlace Salir del menu de usuario");
  assert.match(click, /showLogin\(\)/);
});

test("los dos botones Salir llaman a la misma funcion", () => {
  const lateral = clickDelMenuLateral();
  const usuario = clickDelMenuDeUsuario();

  assert.ok(lateral.indexOf("showLogin()") >= 0);
  assert.ok(usuario.indexOf("showLogin()") >= 0);
});

test("el menu de usuario ya no depende de salirDesdeMenu", () => {
  assert.equal(clickDelMenuDeUsuario().indexOf("salirDesdeMenu"), -1);
});

test("core.js ya no define una segunda ruta de salida", () => {
  assert.equal(CORE.indexOf("$scope.salirDesdeMenu"), -1);
});
