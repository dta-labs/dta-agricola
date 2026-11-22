"use strict";

/**
 * REQ-124..128 - Historial de los sensores: boton Dia, controles solo en PC, colores, agua disponible y U.Frio.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), "utf8").replace(/\r\n/g, "\n");
const HTML = leer("index.html");
const CORE = leer("assets", "js", "core.js");

test("REQ-124 historial: boton Dia tambien en las redes de sensores, con la hora legible en el eje", () => {
  const ini = HTML.indexOf('<div id="modalHistorial"');
  const historial = HTML.slice(ini, HTML.indexOf("</ul>", HTML.indexOf("REQ-124", ini)));
  assert.match(historial, /<button class="btn-small" ng-class="selectedTimeOption == 'DIA' \? 'teal' : 'grey lighten-2'" ng-click="\$event\.stopPropagation\(\); reloadSystemLog\(actualSystem\.key, 'DIA', idx\);"/);
  assert.doesNotMatch(historial, /ng-if="actualSystem\.type == 'Nevera'" ng-class="selectedTimeOption == 'DIA'/);
  assert.equal((CORE.match(/labels\.push\(\$scope\.selectedTimeOption == 'DIA' \? \$scope\.horaDeRegistro\(element\.date\) : date\);/g) || []).length, 4);
  assert.doesNotMatch(CORE, /element\.date\.substr\(9, 14\)\)\);/);
});

test("REQ-125 controles de la grafica solo en la vista de PC (ocultos en celular, tableta y pantallas tactiles)", () => {
  const CSS = leer("assets", "css", "style.css");
  assert.match(CSS, /@media \(max-width: 992px\), \(hover: none\) and \(pointer: coarse\) \{\n    \.grafica-herramientas \{\n        display: none !important;/);
});

const h = require("../../assets/js/logic/historial.js");
const { azul, verde, amarillo, rojo, gris } = h.COLORES;

test("REQ-126 colores: tension (cb) < 10 azul, < 30 verde, < 60 amarillo, 60+ rojo; 0, 240 y sin dato gris", () => {
  const wm = { type: "WM" };
  assert.deepEqual([5, 10, 29.9, 30, 59, 60, 150, 0, 240, "NaN", -99].map(v => h.color(wm, "humedad", v)),
    [azul, verde, verde, amarillo, amarillo, rojo, rojo, gris, gris, gris, gris]);
});

test("REQ-126 colores: humedad (%) por capacidad de campo (umbral No regar) y umbral de riego", () => {
  const s = { type: "SHT4", h: { minValue: "30", maxValue: "70" } };
  assert.deepEqual([75, 70, 50, 30, 29, "NaN"].map(v => h.color(s, "humedad", v)), [azul, azul, verde, verde, rojo, gris]);
  assert.deepEqual(h.limitesDeHumedad({ h: { minValue: "", maxValue: "" } }), { riego: 25, cc: 60 });   // por defecto
  assert.deepEqual(h.limitesDeHumedad({ h: { minValue: "80", maxValue: "20" } }), { riego: 25, cc: 60 }); // incoherentes
});

test("REQ-126 colores: temperatura con los umbrales del sensor o, sin umbrales, 2 y 20 °C", () => {
  assert.deepEqual([1.9, 2, 19.9, 20, 35].map(v => h.color({}, "temperatura", v)), [azul, verde, verde, rojo, rojo]);
  const s = { t: { minValue: "-1", maxValue: "30" } };
  assert.deepEqual([-2, 0, 29, 30].map(v => h.color(s, "temperatura", v)), [azul, verde, verde, rojo]);
});

test("REQ-126 tabla y bandas de la grafica usan los mismos criterios", () => {
  assert.equal((HTML.match(/style="color: \{\{ colorHistorial\(sensor, 'humedad', data\[idx \* 8\]\) \}\};"/g) || []).length, 2);
  assert.match(HTML, /style="color: \{\{ colorHistorial\(sensor, 'temperatura', data\[idx \* 8 \+ 4\]\) \}\};"/);
  assert.match(HTML, /<script src="\.\/assets\/js\/logic\/historial\.js\?v=/);
  assert.match(CORE, /\$scope\.colorHistorial = \(sensor, medida, valor\) => __modulo\("historial"\)\.color\(sensor, medida, valor\);/);
  assert.match(CORE, /drawBand\(ctx, chartArea, yScale, 0, 40, 'rgba\(211, 47, 47, 0\.15\)', 'Seco \(60\+ cb\) - Regar'/);
  assert.match(CORE, /const hum = __modulo\("historial"\)\.limitesDeHumedad/);
  assert.match(CORE, /const tem = __modulo\("historial"\)\.limitesDeTemperatura/);
});
