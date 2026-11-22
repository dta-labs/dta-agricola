"use strict";

/**
 * REQ-144 - Invernadero: varios cultivos por sensor (sensor.cultures; el primero tambien en culture/phenologicalStage).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cultivos = require("../../assets/js/logic/cultivos.js");
const nevera = require("../../assets/js/logic/nevera.js");
const tablero = require("../../assets/js/logic/tablero.js");

const RAIZ = path.join(__dirname, "..", "..");
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), "utf8").replace(/\r\n/g, "\n");

test("REQ-144 cultivos de un sensor: lista, objeto de Firebase o el cultivo unico de siempre", () => {
  assert.deepEqual(cultivos.cultivosDeSensor({ culture: "Tomate", phenologicalStage: "Floración" }), [{ culture: "Tomate", phenologicalStage: "Floración" }]);
  assert.deepEqual(cultivos.cultivosDeSensor({}), []);
  assert.deepEqual(cultivos.cultivosDeSensor({ cultures: { 0: { culture: "Pepino" }, 1: { culture: "Chile", phenologicalStage: "x" } } }),
    [{ culture: "Pepino", phenologicalStage: "" }, { culture: "Chile", phenologicalStage: "x" }]);
});

test("REQ-144 al guardar: sin vacios ni repetidos; el primero es el principal (culture / fase)", () => {
  const s = { cultures: [{ culture: " Pepino ", phenologicalStage: "Desarrollo" }, { culture: "" }, { culture: "pepino" }, { culture: "Chile" }] };
  cultivos.normalizarCultivosDeSensor(s);
  assert.deepEqual(s.cultures, [{ culture: "Pepino", phenologicalStage: "Desarrollo" }, { culture: "Chile", phenologicalStage: "" }]);
  assert.deepEqual([s.culture, s.phenologicalStage], ["Pepino", "Desarrollo"]);
  const vacio = cultivos.normalizarCultivosDeSensor({ cultures: [{ culture: "" }] });
  assert.deepEqual([vacio.cultures, vacio.culture], [[], ""]);
});

test("REQ-144 los cultivos se ven en la tarjeta del sensor y en 'Mis cultivos' del resumen", () => {
  const sensor = { id: "a", type: "SHT2", cultures: [{ culture: "Tomate" }, { culture: "Pepino" }] };
  assert.equal(nevera.tarjeta(sensor, ["80", "22", "3"], 0, "C").cultivos, "Tomate · Pepino");
  assert.equal(nevera.tarjeta({ id: "b", culture: "Fresa" }, [], 0, "C").cultivos, "Fresa");
  assert.equal(nevera.tarjeta({ id: "c" }, [], 0, "C").cultivos, "");
  const deps = { resumen: require("../../assets/js/logic/resumen.js"), panel: require("../../assets/js/logic/panel.js"), humedad: require("../../assets/js/logic/humedad.js"),
    medidor: require("../../assets/js/logic/medidor.js"), geo: require("../../assets/js/logic/geo.js"), frio: require("../../assets/js/logic/frio.js") };
  const s = { i: { key: "i", name: "Invernadero 1", type: "Invernadero", log: { dataRaw: "[]" }, sensors: { sensorNumber: 2, S0: sensor, S1: { id: "b", culture: "Tomate" } } } };
  const r = tablero.tablero(s, deps, {});
  assert.deepEqual(r.cultivos.map(c => [c.nombre, c.equipo.nombre]), [["Pepino", "Invernadero 1"], ["Tomate", "Invernadero 1"]]);
});

test("REQ-144 formulario: bloque de cultivos solo en invernaderos (nuevo y editar sensor) y normalizacion al guardar", () => {
  const html = leer("index.html");
  assert.equal((html.match(/<div class="col s12" ng-if="actualSystem\.type == 'Invernadero'">/g) || []).length, 2);
  assert.match(html, /ng-repeat="c in cultivosEditables\(actualSensor\) track by \$index"/);
  assert.match(html, /ng-repeat="c in cultivosEditables\(newSensor\) track by \$index"/);
  assert.match(html, /ng-click="agregarCultivo\(actualSensor\)"/);
  assert.match(html, /ng-click="quitarCultivo\(newSensor, \$index\)"/);
  const core = leer("assets", "js", "core.js");
  assert.match(core, /normalizarCultivosSiInvernadero\(\$scope\.newSensor\);   \/\/ REQ-144\n\s*\$scope\.actualSystem\.sensors\[idx\] = \$scope\.newSensor;/);
  assert.match(core, /normalizarCultivosSiInvernadero\(\$scope\.actualSensor\);   \/\/ REQ-144\n\s*\$scope\.setMachineSettings\(\$scope\.actualSystem\);/);
  assert.match(leer("assets", "js", "components", "sistema", "panel-nevera", "panel-nevera.html"), /<div class="nevera-cultivos" ng-if="vm\.tarjeta\(coldRoomKey, coldRoom\)\.cultivos">/);
});
