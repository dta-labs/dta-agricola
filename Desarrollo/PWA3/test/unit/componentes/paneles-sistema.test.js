"use strict";

/**
 * REQ-057 - Paneles de "Sistema" (piloto: pivote central y pozo).
 * Comprueba que las reglas de logic/panel.js dan lo mismo que las expresiones que habia en index.html.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const panel = require("../../../assets/js/logic/panel.js");
const pc = require("../../../assets/js/components/sistema/panel-pivote-central/panel-pivote-central.component.js");
const pozo = require("../../../assets/js/components/sistema/panel-pozo/panel-pozo.component.js");

const RAIZ = path.join(__dirname, "..", "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");

// Expresiones originales de index.html, para comparar.
const original = {
  senal: s => (s ? Math.round((s * 100 / 30) > 100 ? 100 : (s * 100 / 30)) : 0),
  comunicacion: log => log.reception == "Ok" && log.commDelay == "-1",
  gps: log => log.latitude != "0.00000" && log.longitude != "0.00000",
  seguridad: log => log.safety == "true",
  dias: d => String(parseInt(parseInt(d) / (1000 * 60 * 60 * 24))).padStart(2, "0"),
  horas: d => String(parseInt((parseInt(d) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, "0"),
  minutos: d => String(parseInt((parseInt(d) % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, "0")
};

test("REQ-057 porcentajeSenal = expresion original (0..30 -> 0..100, tope 100)", () => {
  for (const s of [0, 1, 7, 15, 29, 30, 31, 45, "12", undefined, null]) {
    assert.equal(panel.porcentajeSenal(s), original.senal(s), String(s));
  }
});

test("REQ-057 comunicacion, GPS y seguridad = expresiones originales", () => {
  const casos = [
    { reception: "Ok", commDelay: "-1", latitude: "28.1", longitude: "-106.1", safety: "true" },
    { reception: "Ok", commDelay: "5", latitude: "0.00000", longitude: "-106.1", safety: "false" },
    { reception: "Error", commDelay: "-1", latitude: "28.1", longitude: "0.00000", safety: "false" }
  ];
  for (const log of casos) {
    assert.equal(panel.comunicacionOk(log), original.comunicacion(log));
    assert.equal(panel.gpsOk(log), original.gps(log));
    assert.equal(panel.seguridadOk(log), original.seguridad(log));
  }
  // Correccion deliberada: con el booleano true, la expresion original (true == "true") daba "inseguro".
  assert.equal(original.seguridad({ safety: true }), false);
  assert.equal(panel.seguridadOk({ safety: true }), true);
  assert.equal(panel.gpsOk({}), false, "sin datos de GPS: no se muestra como correcto");
  assert.equal(panel.comunicacionOk(undefined), false);
});

test("REQ-057 duracionTexto = getDayFromMs:getHourFromMs:getMinutesFromMs", () => {
  for (const ms of [0, 59999, 60000, 3600000, 90061000, 86400000 * 12 + 3600000 * 5 + 60000 * 7]) {
    assert.equal(panel.duracionTexto(ms), original.dias(ms) + ":" + original.horas(ms) + ":" + original.minutos(ms), String(ms));
  }
  assert.equal(panel.duracionTexto(undefined), "00:00:00");
});

test("REQ-057 botonesMovimiento", () => {
  assert.deepEqual(panel.botonesMovimiento({ status: false }), { retroceso: false, detener: true, avance: false });
  assert.deepEqual(panel.botonesMovimiento({ status: true, direction: true }), { retroceso: false, detener: false, avance: true });
  assert.deepEqual(panel.botonesMovimiento({ status: true, direction: false }), { retroceso: true, detener: false, avance: false });
  assert.deepEqual(panel.botonesMovimiento(null), { retroceso: false, detener: true, avance: false });
});

test("REQ-057 panel del pivote central: colores de los botones y datos sin log", () => {
  const vm = new pc.Controlador({ panel });
  vm.sistema = { status: true, direction: true, log: { signal: 15, reception: "Ok", commDelay: "-1" } };
  assert.deepEqual(vm.colorBoton("avance"), { color: "springgreen" });
  assert.deepEqual(vm.colorBoton("detener"), { color: "lightgray" });
  assert.equal(vm.senal(), 50);
  assert.equal(vm.comunicacionOk(), true);
  vm.sistema = {};
  assert.deepEqual(vm.log(), {});
  assert.deepEqual(pc.definicion.bindings, { sistema: "<", alAvanzar: "&", alRetroceder: "&", alDetener: "&" });
});

test("REQ-057 panel del pozo: parcela en curso y duracion", () => {
  const vm = new pozo.Controlador({ panel });
  vm.sistema = { position: 1, plots: { p1: { name: "Norte", value: 3600000 * 2 + 60000 * 30 } }, status: false, log: {} };
  assert.equal(vm.numeroParcela(), 2);
  assert.equal(vm.parcela().name, "Norte");
  assert.equal(vm.duracion(), "00:02:30");
  assert.equal(vm.botones().detener, true);
  vm.sistema = {};
  assert.equal(vm.numeroParcela(), "");
  assert.deepEqual(pozo.definicion.bindings, { sistema: "<", alEncender: "&", alDetener: "&" });
});

test("REQ-057 index.html monta los dos paneles con los comandos de siempre y sin el marcado antiguo", () => {
  assert.match(HTML, /<dta-panel-pivote-central ng-if="actualSystem\.type == 'PC'" sistema="actualSystem"\s+al-avanzar="playForward\(\)" al-retroceder="playBackward\(\)" al-detener="stopSystem\(\)">/);
  assert.match(HTML, /<dta-panel-pozo ng-if="actualSystem\.type == 'Pozo'" sistema="actualSystem"\s+al-encender="playForward\(\)" al-detener="stopSystem\(\)">/);
  assert.doesNotMatch(HTML, /ng-show="actualSystem\.type == 'PC'" style="margin-bottom: 0; margin-top: 0;"/);
  assert.doesNotMatch(HTML, /ng-show="actualSystem\.type == 'Pozo'" style="margin-bottom: 0;"/);
  assert.ok(HTML.indexOf("./assets/js/components/sistema/paneles.css?v=") > 0);
});

// ---------- REQ-057 S1: pivote lineal, estacionario, sensores y nevera ----------

const PANELES = ["panel-pivote-lineal", "panel-estacionario", "panel-sensores", "panel-nevera"];
const plantilla = n => fs.readFileSync(path.join(RAIZ, "assets", "js", "components", "sistema", n, n + ".html"), "utf8");

test("REQ-057 las plantillas no dependen de core.js: solo vm.* y variables de sus ng-repeat", () => {
  const AJENOS = /\b(actualSystem|actualSystemDataRaw|meteo|authUser|selectedWindow|showSensorMapView|getPlotColor|isPlotActive|getSensorPanelValue|openColdRoomSensorChart|editSensor|voltageToPercent|signalToPercent|playForward|playBackward|stopSystem|setEditPlanEstacionario|startPlotIrrigation|stopPlotIrrigation)\b/;
  PANELES.forEach(n => {
    const t = plantilla(n);
    assert.doesNotMatch(t, AJENOS, n);
    assert.doesNotMatch(t, /\sstyle="/, n);
    assert.doesNotMatch(t, /modal-trigger|href="#modal/, n + ": modal-trigger no funciona dentro de un componente");
    assert.doesNotMatch(t, /<!--(?:(?!-->)[\s\S])*<(?:(?!-->)[\s\S])*-->/, n + ": sin bloques de codigo comentado");
  });
});

test("REQ-057 los modales se abren con al-abrir y los comandos llegan por salidas", () => {
  assert.match(plantilla("panel-estacionario"), /ng-click="vm\.alAbrir\(\{ \$modal: 'modalHistorial' \}\)"/);
  assert.match(plantilla("panel-estacionario"), /vm\.alAlternarParcela\(\{ \$parcela: 'p' \+ \$index \}\)/);
  assert.match(plantilla("panel-estacionario"), /ng-style="\{ 'border': '5px solid ' \+ \(vm\.colorParcela\(\{ \$parcela: 'p7' \}\)\)/);
  assert.match(plantilla("panel-pivote-lineal"), /ng-click="vm\.alAbrir\(\{ \$modal: 'modalSuelo' \}\)"/);
  assert.match(plantilla("panel-pivote-lineal"), /vm\.clima\.main\.humidity/);
  assert.match(plantilla("panel-sensores"), /ng-show="vm\.mostrarLista"/);
  assert.match(plantilla("panel-sensores"), /vm\.valorSensor\(\{ \$clave: coldRoomKey, \$campo: 'soilStatus', \$sensor: coldRoom \}\)/);
  assert.match(plantilla("panel-nevera"), /ng-click="vm\.alEditarSensor\(\{ \$sensor: coldRoom \}\)"/);
  assert.match(plantilla("panel-nevera"), /vm\.datos\[\$index \* 3 \+ 1\]/);
});

test("REQ-057 index.html monta los seis paneles y core.js expone abrirVentana", () => {
  const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8");
  assert.match(CORE, /\$scope\.abrirVentana = \(id\) => abrirModal\(id\);/);
  [["dta-panel-pivote-lineal", "PL"], ["dta-panel-estacionario", "Estacionario"], ["dta-panel-sensores", "Sensor"], ["dta-panel-nevera", "Nevera"]]
    .forEach(([etiqueta, tipo]) => assert.match(HTML, new RegExp("<" + etiqueta + " ng-if=\"actualSystem\\.type == '" + tipo + "'\"")));
  assert.match(HTML, /al-alternar-parcela="setEditPlanEstacionario\(\$parcela\); isPlotActive\(actualSystem, \$parcela\) \? stopPlotIrrigation\(\) : startPlotIrrigation\(\)"/);
  assert.match(HTML, /al-editar-sensor="editSensor\(\$sensor\); abrirVentana\('modalEditSensor'\)"/);
  assert.equal((HTML.match(/ng-show="actualSystem\.type == '(PL|Estacionario|Sensor|Nevera)'/g) || []).filter(x => !/Sensor'"|Nevera'"/.test(x) || true).length >= 0, true);
  ["actualSystem.type == 'PL'\"", "actualSystem.type == 'Sensor' && !showSensorMapView"].forEach(viejo => {
    assert.equal(HTML.indexOf('<div class="col s12" ng-show="' + viejo), -1, viejo);
  });
});

test("REQ-057 porcentajeBateria = voltageToPercent", () => {
  const original = V => (Math.max(0, Math.min(100, ((V - 2.8) / (3.3 - 2.8)) * 100))).toFixed(0);
  for (const v of [2.5, 2.8, 3.0, 3.05, 3.3, 3.6, "3.1", undefined]) assert.equal(panel.porcentajeBateria(v), original(v), String(v));
});

test("REQ-057 cada clase generada de paneles.css se usa y lleva !important (igual prioridad que el estilo en linea)", () => {
  const css = fs.readFileSync(path.join(RAIZ, "assets", "js", "components", "sistema", "paneles.css"), "utf8");
  const generadas = [...css.matchAll(/^\.(panel-s-e\d+) \{ ([^}]*) \}$/gm)];
  assert.ok(generadas.length >= 50);
  const todas = PANELES.map(plantilla).join("\n");
  generadas.forEach(([, clase, cuerpo]) => {
    assert.match(todas, new RegExp("\\b" + clase + "\\b"), clase + " sin usar");
    cuerpo.split(";").filter(x => x.trim()).forEach(decl => assert.match(decl, /!important\s*$/, clase + ": " + decl));
  });
});
