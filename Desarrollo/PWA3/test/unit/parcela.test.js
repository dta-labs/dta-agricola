"use strict";

/**
 * REQ-061 E1 - Parcela del estacionario: configuracion del riego a demanda y guardado sin perder datos.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const parcela = require("../../assets/js/logic/parcela.js");

const RAIZ = path.join(__dirname, "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");

test("REQ-061 un 0 escrito se respeta (antes 0 °C de paro se guardaba como 20 °C)", () => {
  const c = parcela.normalizarConfiguracion({ stopByTemp: 0, reductionPercent: 0, stopByRainDay: 0, incrementPercent: 0, stopByWind: 0 });
  assert.equal(c.stopByTemp, 0);
  assert.equal(c.reductionPercent, 0);
  assert.equal(c.stopByRainDay, 0);
  assert.equal(c.incrementPercent, 0);
  assert.equal(c.stopByWind, 0);
});

test("REQ-061 mismos valores por defecto que validateIrrigationconfig y mismos limites", () => {
  const d = parcela.normalizarConfiguracion(undefined);
  assert.deepEqual(
    [d.reductionPercent, d.reductionTemp, d.incrementPercent, d.stopByTemp, d.stopByRainProbability, d.stopByWind, d.stopByRainDay, d.stopByRainWeek],
    [-30, 25, 50, 20, 80, 100, 3, 30]);
  parcela.INTERRUPTORES.forEach(k => assert.equal(d[k], false, k));
  const l = parcela.normalizarConfiguracion({ reductionPercent: -150, reductionTemp: 90, incrementPercent: 120, stopByTemp: -20, stopByRainProbability: 101, stopByWind: -5, stopByRainDay: -1 });
  assert.deepEqual([l.reductionPercent, l.reductionTemp, l.incrementPercent, l.stopByTemp, l.stopByRainProbability, l.stopByWind, l.stopByRainDay],
    [-100, 70, 100, -10, 100, 0, 0]);
  assert.equal(parcela.normalizarConfiguracion({ stopByTemp: "5" }).stopByTemp, 5, "texto numerico");
  assert.equal(parcela.normalizarConfiguracion({ stopByTemp: "abc" }).stopByTemp, 20);
  const original = { stopByTemp: 3 };
  parcela.normalizarConfiguracion(original);
  assert.deepEqual(original, { stopByTemp: 3 }, "no modifica la entrada");
});

test("REQ-061 duraciones: ms <-> dias/horas/minutos", () => {
  assert.deepEqual(parcela.duracionDesdeMs(90061000), { dias: 1, horas: 1, minutos: 1 });
  assert.equal(parcela.msDesdeDuracion({ horas: "2", minutos: 30 }), 9000000);
  assert.equal(parcela.msDesdeDuracion({ dias: "", horas: null, minutos: "x" }), 0);
  assert.deepEqual(parcela.duracionDesdeMs(undefined), { dias: 0, horas: 0, minutos: 0 });
});

test("REQ-061 guardar la parcela ya no toca los riegos programados (antes dejaba en 0 el primero)", () => {
  const ini = CORE.indexOf("$scope.dataEditionPlanEstacionario = () => {");
  const cuerpo = CORE.slice(ini, CORE.indexOf("\n    }\n", ini));
  assert.doesNotMatch(cuerpo, /schedule/);
  assert.doesNotMatch(cuerpo, /editDay|editHour|editMinutes|editScheduleIndex|scheduleDate/);
  assert.match(CORE, /\$scope\.guardarFechaRiego = \(\) => \{/);
  assert.match(HTML, /ng-click="guardarFechaRiego\(\)"/);
  assert.equal((HTML.match(/ng-click="dataEditionPlanEstacionario\(\)"/g) || []).length, 0);
});

test("REQ-061 valores por defecto al abrir la parcela (no con ng-init al cargar la pagina)", () => {
  assert.equal((HTML.match(/ng-init="actualSystem\.plots\[editedPlan\]\.irrigationConfig\[/g) || []).length, 0);
  assert.match(CORE, /asEpPlot\.irrigationConfig = __modulo\("parcela"\)\.normalizarConfiguracion\(asEpPlot\.irrigationConfig\);/);
  assert.match(CORE, /plot\.irrigationConfig = __modulo\("parcela"\)\.normalizarConfiguracion\(plot\.irrigationConfig\);/);
});

test("REQ-061 'Editar fecha de riego' muestra los dias (antes getDayFromMs sin dato daba NaN)", () => {
  assert.match(CORE, /document\.getElementById\("editDay"\)\.value = \$scope\.getDayFromMs\(data\);/);
});

test("REQ-061 se elimina 'Confirmar riego del estacionario' (sin uso)", () => {
  assert.equal(HTML.indexOf("modalConfirmRiegoEstacionario"), -1);
});
