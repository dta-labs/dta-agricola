"use strict";

/**
 * REQ-165 - Alta de usuario: sin recortar espacios de la contrasena (para poder validarlos), la app se recarga si entra
 * un usuario distinto al que tenia cargado (no quedan los datos del anterior) y la bienvenida usa el icono de la app.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), "utf8").replace(/\r\n/g, "\n");

test("REQ-165 la contrasena no se recorta (los espacios al inicio o al final se validan)", () => {
  const html = leer("assets", "js", "components", "login", "login.html");
  assert.equal((html.match(/ng-trim="false"/g) || []).length, 2);
});

test("REQ-165 si entra otro usuario se recarga la app y el aviso del alta se muestra al volver", () => {
  const core = leer("assets", "js", "core.js");
  assert.match(core, /if \(correoCargadoEnEstaPagina && correo && correo !== correoCargadoEnEstaPagina\) \{[\s\S]{0,200}location\.reload\(\);\n\s+return;/);
  assert.match(core, /avisoTrasAlta\(\);                      \/\/ REQ-165/);
  const comp = leer("assets", "js", "components", "login", "login.component.js");
  assert.match(comp, /sessionStorage\.setItem\("dta-aviso-tras-alta", texto\)/);
});

test("REQ-165 la bienvenida del resumen usa el icono de la aplicacion", () => {
  const vista = leer("assets", "js", "components", "tablero", "tablero.html");
  assert.match(vista, /<img class="tablero-hero-logo" src="\.\/assets\/images\/icons\/res\/DTA_Agricola_512\.png"/);
  assert.doesNotMatch(vista, />spa<\/i>/);
  assert.ok(fs.existsSync(path.join(RAIZ, "assets", "images", "icons", "res", "DTA_Agricola_512.png")));
});
