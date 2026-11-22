"use strict";

/** REQ-143 - Invernadero: usa el panel, sensores y logs de la nevera. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const nevera = require("../../assets/js/logic/nevera.js");
const equipos = require("../../assets/js/logic/equipos.js");
const panel = require("../../assets/js/logic/panel.js");

const RAIZ = path.join(__dirname, "..", "..");
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), "utf8").replace(/\r\n/g, "\n");

test("REQ-143 esTipoNevera: Nevera e Invernadero", () => {
  assert.equal(nevera.esTipoNevera("Nevera"), true);
  assert.equal(nevera.esTipoNevera("Invernadero"), true);
  assert.equal(nevera.esTipoNevera("Sensor"), false);
  assert.equal(nevera.esTipoNevera(undefined), false);
});

test("REQ-143 el invernadero lee logs como la nevera", () => {
  for (const op of ["DIA", "SEMANA", "MES"]) assert.equal(equipos.carpetaDeHistorico("Invernadero", op), "logs");
  assert.equal(equipos.carpetaDeLogs("Invernadero"), "logs");
  assert.equal(equipos.registrosIniciales("Invernadero", 20), 300);
});

test("REQ-143 estado del invernadero en el panel", () => {
  const e = panel.estadoDeEquipo({ type: "Invernadero" });
  assert.equal(e.texto, "Invernadero");
  assert.equal(e.color, panel.estadoDeEquipo({ type: "Nevera" }).color);
});

test("REQ-143 vistas y core.js usan esTipoNevera (sin comparaciones sueltas con 'Nevera')", () => {
  const html = leer("index.html");
  assert.match(html, /<dta-panel-nevera ng-if="esTipoNevera\(actualSystem\.type\)"/);
  assert.doesNotMatch(html, /actualSystem\.type [!=]= 'Nevera'/);
  assert.match(html, /newDevice\.type='Invernadero'/);
  const core = leer("assets", "js", "core.js");
  assert.match(core, /\$scope\.esTipoNevera = esTipoNevera/);
  assert.doesNotMatch(core, /\.type ?[!=]==? ?["']Nevera["']/);
});
