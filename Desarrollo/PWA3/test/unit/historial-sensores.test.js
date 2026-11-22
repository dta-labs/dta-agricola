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
