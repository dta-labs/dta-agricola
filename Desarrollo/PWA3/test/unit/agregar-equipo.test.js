"use strict";

/** REQ-161 - "Agregar equipo": los tipos de equipo en una rejilla de 2 columnas (3 en pantallas anchas). */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), "utf8").replace(/\r\n/g, "\n");

test("REQ-161 tipos de equipo en rejilla de 2 columnas (sin .input-field ni margin-left auto)", () => {
  const html = leer("index.html");
  assert.match(html, /<div class="col s12 nuevo-equipo-tipos" ng-show="steep == 0">/);
  assert.doesNotMatch(html, /<div class="input-field col s12 row" ng-show="steep == 0">/);
  const css = leer("assets", "css", "style.css");
  assert.match(css, /#modalNuevoEquipo \.nuevo-equipo-tipos,\n#modalNuevoSensor \.nuevo-equipo-tipos \{\n    display: grid;\n    grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(css, /#modalNuevoEquipo \.nuevo-equipo-tipos > \.col,\n#modalNuevoSensor \.nuevo-equipo-tipos > \.col \{[^}]*margin: 0;/);
  assert.match(css, /@media \(min-width: 600px\) \{\n    #modalNuevoEquipo \.nuevo-equipo-tipos, #modalNuevoSensor \.nuevo-equipo-tipos \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\); \}/);
});
