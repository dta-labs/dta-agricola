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
  assert.match(m, /ng-click="newDevice\.type && \(steep = 1\)"/);
  assert.match(m, /ng-click="newDevice\.type && \(steep = 2\)"/);
  // paso 2: nombre (1a fila) e identificacion (2a)
  const p2 = m.slice(m.indexOf('ng-show="steep == 1"'), m.indexOf('ng-show="steep == 2"'));
  assert.ok(p2.indexOf('id="newDeviceName"') < p2.indexOf('id="newDeviceKey"'));
  // paso 3: compatibilidad, largo y velocidad, mapa con latitud, longitud y zona horaria
  const p3 = m.slice(m.indexOf('ng-show="steep == 2"'));
  const orden = ['id="newDeviceBrand"', 'id="newDeviceLarge"', 'id="newDeviceMaxVelocity"', "<dta-mapa-selector", 'id="newDeviceLat"', 'id="newDeviceLng"', 'id="newDeviceZone"'].map(x => p3.indexOf(x));
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
  assert.match(m, /ng-click="steepSensor = pasoSensorSiguiente\(steepSensor\)"/);
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
