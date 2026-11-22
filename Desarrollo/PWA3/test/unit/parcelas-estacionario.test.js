"use strict";

/**
 * REQ-139 - Plan de riego \ Parcelas del estacionario: tarjetas con numero y color del estado, nombre, cultivo,
 * superficie, duracion del riego y humedad del sensor asociado.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const pa = require("../../assets/js/logic/parcela.js");

const RAIZ = path.join(__dirname, "..", "..");
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), "utf8").replace(/\r\n/g, "\n");
const deps = { panel: require("../../assets/js/logic/panel.js"), humedad: require("../../assets/js/logic/humedad.js"), geo: require("../../assets/js/logic/geo.js") };
const P = [[28.6, -106], [28.601, -106], [28.601, -106.001], [28.6, -106.001]];

test("REQ-139 datos de la tarjeta: nombre, cultivo, superficie, duracion, estado y humedad del sensor", () => {
  const red = { key: "r", type: "Sensor", sensors: { sensorNumber: 1, S0: { id: "A1", type: "SHT4", h: { minValue: "25", maxValue: "60" } } },
    log: { dataRaw: JSON.stringify(["42", "0", "0", "0", "20", "0", "0", "3"]) } };
  const s = { plots: { p0: { name: "Norte", culture: "Nogal", value: 5400000, forcedStart: 1, poligon: P, sensor: "r", sensorId: "A1" }, p1: {}, p7: {} }, log: {} };
  const t = pa.tarjeta(s, "p0", deps, { r: red });
  assert.deepEqual([t.numero, t.nombre, t.cultivo, t.hectareas, t.duracion, t.estado.texto, t.estado.tono], ["1", "Norte", "Nogal", 1.09, "1 h 30 min", "Esperando", "atencion"]);
  assert.deepEqual([t.humedad.texto, t.humedad.valor], ["Adecuado", "42 %"]);
  const vacia = pa.tarjeta(s, "p1", deps, {});
  assert.deepEqual([vacia.nombre, vacia.cultivo, vacia.hectareas, vacia.duracion, vacia.humedad, vacia.estado.texto], ["Sección 2", "", null, "", null, "Detenida"]);
  const motor = pa.tarjeta(s, "p7", deps, {});
  assert.deepEqual([motor.numero, motor.nombre, motor.esMotor, motor.estado.texto], ["M", "Motor", true, "Apagado"]);
  assert.deepEqual([90000, 86400000 + 7200000, 0].map(pa.textoDuracion), ["1 min", "1 d 2 h", ""]);
});

test("REQ-139 vista: tarjetas en cuadricula con el mismo comportamiento (editar riego / encender el motor)", () => {
  const html = leer("index.html");
  assert.match(html, /<div class="parcelas-tarjetas"> <!-- Áreas -->/);
  assert.match(html, /<div class="parcela-tarjeta modal-trigger" role="button" tabindex="0"\n\s*ng-repeat="plot in actualSystem\.plots" ng-if="\$index < 7"\n\s*href="#modalEditRiegoEstacionario"/);
  assert.match(html, /ng-click="setEditPlanEstacionario\('p7'\); isPlotActive\(actualSystem, 'p7'\) \? stopPlotIrrigation\(\) : startPlotIrrigation\(\)"/);
  assert.doesNotMatch(html, /assets\/images\/image-icon\.png/);
  assert.match(leer("assets", "js", "core.js"), /\$scope\.tarjetaParcela = \(clave\) => \{/);
  assert.match(leer("assets", "css", "style.css"), /\.parcelas-tarjetas \{\n    display: grid;\n    grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
});

test("REQ-140 Programacion: guardar el programa sin iniciarlo", () => {
  const html = leer("index.html");
  const core = leer("assets", "js", "core.js");
  assert.match(html, /<button type="button" class="btn btn-outline-success" ng-click="guardarProgramaDesdeFormulario\(\)">\n\s*<i class="material-icons align-middle me-1" aria-hidden="true">save<\/i>Guardar/);
  assert.ok(html.indexOf("guardarProgramaDesdeFormulario()") < html.indexOf(">play_arrow</i>Iniciar programa"));
  const ini = core.indexOf("$scope.guardarProgramaDesdeFormulario = () => {");
  const cuerpo = core.slice(ini, core.indexOf("};", ini));
  assert.match(cuerpo, /erroresDelPrograma\(p, __modulo\("fechas"\)\)/);
  assert.match(cuerpo, /if \(!p\.id\) p\.id = generarIdUnico\(\);\n\s*\$scope\.saveIrrigationPlan\(p\);/);
  assert.doesNotMatch(cuerpo, /startStationaryProgram|stopStationaryProgram|createStationaryProgram/);   // no toca las parcelas
});
