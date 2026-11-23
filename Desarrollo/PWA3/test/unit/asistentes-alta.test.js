"use strict";

/**
 * REQ-162 - Asistentes "Agregar equipo" (Tipo, Identificacion, Configuracion) y "Agregar sensor" (Tipo,
 * Identificacion, Ubicacion, Cultivo y alertas). La barra de pasos navega como las flechas.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const fechas = require("../../assets/js/logic/fechas.js");

const RAIZ = path.join(__dirname, "..", "..");
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), "utf8").replace(/\r\n/g, "\n");
const HTML = leer("index.html");
const CORE = leer("assets", "js", "core.js");
const modal = (id, siguiente) => { const i = HTML.indexOf('<div id="' + id + '"'); return HTML.slice(i, HTML.indexOf(siguiente, i)); };

test("REQ-162 Agregar equipo: 3 pasos navegables y campos en su paso", () => {
  const m = modal("modalNuevoEquipo", "<!-- #endregion: LISTADO -->");
  assert.match(m, /class="modal modal-asistente"/);
  for (const t of ["Tipo", "Identificación", "Configuración"]) assert.ok(m.includes('<em class="paso-texto">' + t + "</em>"), t);
  assert.match(m, /ng-click="irAPasoEquipo\(1\)"/);   // REQ-163: con sus condiciones
  assert.match(m, /ng-click="irAPasoEquipo\(2\)"/);
  // paso 2: nombre (1a fila) e identificacion (2a)
  const p2 = m.slice(m.indexOf('ng-show="steep == 1"'), m.indexOf('ng-show="steep == 2"'));
  assert.ok(p2.indexOf('id="newDeviceName"') < p2.indexOf('id="newDeviceKey"'));
  // paso 3: compatibilidad, largo y velocidad, mapa con latitud, longitud y zona horaria
  const p3 = m.slice(m.indexOf('ng-show="steep == 2"'));
  const orden = ['id="newDeviceBrand"', 'id="newDeviceLarge"', 'id="newDeviceMaxVelocity"', "<dta-mapa-selector", 'id="newDeviceZone"'].map(x => p3.indexOf(x));
  assert.equal(p3.indexOf('id="newDeviceLat"'), -1);   // REQ-163: el selector de mapa ya tiene latitud y longitud
  assert.ok(orden.every(x => x > 0));
  assert.deepEqual(orden.slice().sort((a, b) => a - b), orden);
  assert.doesNotMatch(p3.slice(p3.indexOf('id="newDeviceZone"'), p3.indexOf("</select>", p3.indexOf('id="newDeviceZone"'))), /ng-selected/);
  assert.match(m, /ng-click="agregarEquipoDelAsistente\(\)"/);
  assert.match(CORE, /\$scope\.faltaEnEquipo = \(d\) => \{/);
});

test("REQ-162 Agregar sensor: Tipo, Identificacion, Ubicacion (solo redes) y Cultivo y alertas", () => {
  const m = modal("modalNuevoSensor", '<div id="modalEditSensor"');
  const textos = [...m.matchAll(/<em class="paso-texto">([^<]+)<\/em>/g)].map(x => x[1]);
  assert.deepEqual(textos, ["Tipo", "Identificación", "Ubicación", "Cultivo y alertas"]);
  assert.match(m, /<li ng-if="actualSystem\.type == 'Sensor'"/);
  const pasos = ["steepSensor == 0", "steepSensor == 1\">   <!-- Paso 2", "steepSensor == 2\">   <!-- Paso 3", "steepSensor == 3\">   <!-- Paso 4"].map(x => m.indexOf(x));
  assert.ok(pasos.every(x => x > 0), JSON.stringify(pasos));
  assert.ok(m.indexOf('id="newSensorID"') > pasos[1] && m.indexOf('id="newSensorID"') < pasos[2]);
  assert.ok(m.indexOf('modo="poligono"') > pasos[2] && m.indexOf('modo="poligono"') < pasos[3]);
  assert.ok(m.indexOf('id="newSensorCulture"') > pasos[3]);
  assert.match(m, /ng-click="irAPasoSensor\(pasoSensorSiguiente\(steepSensor\)\)"/);
  assert.match(m, /ng-click="agregarSensorDelAsistente\(\)"/);
  assert.match(m, /newSensor\.type='Tr'[\s\S]{0,700}Temperatura<\/p>/);
  // sin ubicacion (neveras): de Identificacion a Cultivo
  assert.match(CORE, /\$scope\.pasoSensorSiguiente = \(i\) => Math\.min\(3, \(i === 1 && !conUbicacionDeSensor\(\)\) \? 3 : i \+ 1\);/);
  assert.match(CORE, /\$scope\.pasoSensorAnterior = \(i\) => Math\.max\(0, \(i === 3 && !conUbicacionDeSensor\(\)\) \? 1 : i - 1\);/);
});

test("REQ-162 estilos: pasos navegables y ng-hide gana a los botones del movil; zona horaria por defecto", () => {
  const css = leer("assets", "css", "ventana.css");
  assert.match(css, /\.bs \.pasos-asistente li\[role="button"\] \{ cursor: pointer; \}/);
  assert.match(css, /\.bs \.pasos-asistente li\.bloqueado \{/);
  assert.match(css, /\.modal\.modal-asistente \.boton-icono-movil\.ng-hide \{\n        display: none !important;/);
  assert.deepEqual([360, 0, -60, -330, 570].map(fechas.zonaHorariaLocal), ["-6", "+0", "+1", "+5:30", "-9:30"]);
  assert.match(CORE, /"zona": __modulo\("fechas"\)\.zonaHorariaLocal\(\)/);
});

// ---------- REQ-163: no se avanza sin tipo, ni sin nombre e identificacion ----------

function cargarCoreConScope() {
  // Extrae y evalua solo las funciones del asistente (sin todo core.js)
  const ini = CORE.indexOf("    // REQ-162: asistente \"Agregar equipo\"");
  const fin = CORE.indexOf("    $scope.updateNewDevice = async () => {");
  const codigo = CORE.slice(ini, fin);
  const $scope = { actualSystem: { type: "Sensor" } };
  const avisos = [];
  const window = { M: { toast: (o) => avisos.push(o.html) } };
  new Function("$scope", "window", "M", "cerrarModal", "__modulo", codigo)($scope, window, window.M, () => {}, () => ({}));
  return { $scope, avisos };
}

test("REQ-163 Agregar sensor: sin tipo no se navega; sin nombre e identificador no se pasa de Identificacion", () => {
  const { $scope, avisos } = cargarCoreConScope();
  $scope.iniciarNuevoSensor();
  assert.deepEqual($scope.newSensor, { type: "", alerts: {} });
  assert.equal($scope.puedeIrPasoSensor(1), false);
  $scope.irAPasoSensor(1);
  assert.equal($scope.steepSensor, 0);
  assert.deepEqual(avisos, ["Falta: tipo de sensor"]);
  $scope.newSensor.type = "SHT4";
  $scope.irAPasoSensor(1);
  assert.equal($scope.steepSensor, 1);
  $scope.irAPasoSensor(2);
  assert.equal($scope.steepSensor, 1);
  assert.equal(avisos[1], "Falta: nombre, identificador, ubicación");
  Object.assign($scope.newSensor, { alias: "Nogal", id: "0x1" });
  $scope.irAPasoSensor(2);
  assert.equal($scope.steepSensor, 2);
  // neveras: de Identificacion a Cultivo
  $scope.actualSystem.type = "Nevera";
  $scope.steepSensor = 1;
  $scope.irAPasoSensor($scope.pasoSensorSiguiente(1));
  assert.equal($scope.steepSensor, 3);
});

test("REQ-163 Agregar equipo: sin tipo no se navega; sin nombre e identificacion no se llega a Configuracion", () => {
  const { $scope, avisos } = cargarCoreConScope();
  $scope.newDevice = { type: "", zona: "-6" };
  $scope.steep = 0;
  $scope.irAPasoEquipo(1);
  assert.equal($scope.steep, 0);
  $scope.newDevice.type = "PC";
  $scope.irAPasoEquipo(1);
  assert.equal($scope.steep, 1);
  $scope.irAPasoEquipo(2);
  assert.equal($scope.steep, 1);
  assert.equal(avisos.pop(), "Falta: nombre, identificación");
  Object.assign($scope.newDevice, { name: "Pivote Norte", key: "123" });
  $scope.irAPasoEquipo(2);
  assert.equal($scope.steep, 2);
  const m = HTML.slice(HTML.indexOf('<div id="modalNuevoEquipo"'));
  assert.match(m, /ng-click="irAPasoEquipo\(steep \+ 1\)" ng-class="\{ disabled: !puedeIrPasoEquipo\(steep \+ 1\) \}"/);
  assert.match(HTML, /href="#modalNuevoSensor" ng-click="iniciarNuevoSensor\(\)"/);
});
