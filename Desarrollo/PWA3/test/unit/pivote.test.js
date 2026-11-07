"use strict";

/**
 * REQ-056 - Tabla de velocidades del pivote.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const pivote = require("../../assets/js/logic/pivote.js");

const RAIZ = path.join(__dirname, "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");

test("REQ-056 marcaDeConfiguracion: mismas equivalencias que antes y sin fallar sin marca", () => {
  assert.deepEqual(pivote.marcaDeConfiguracion("Valley cams"), { clave: "valley", nombre: "Valley" });
  assert.equal(pivote.marcaDeConfiguracion("Rintec Hydrus (Zimmatic)").clave, "growsmart");
  assert.equal(pivote.marcaDeConfiguracion("growsmart").clave, "growsmart");
  assert.equal(pivote.marcaDeConfiguracion(" Lindsay ").clave, "lindsay");
  assert.equal(pivote.marcaDeConfiguracion("OtraMarca").clave, "otramarca");
  for (const v of [undefined, null, "", "   ", 5]) assert.equal(pivote.marcaDeConfiguracion(v), null, String(v));
});

test("REQ-056 filasDeConfiguracion: ordena, convierte a numero y a milimetros", () => {
  const filas = pivote.filasDeConfiguracion({ a: { timer: "50", wather: "0.5", degree: "24" }, b: { timer: 10, wather: 2.1, degree: 120 }, c: null, d: { wather: 1 } });
  assert.deepEqual(filas, [
    { timer: 10, pulgadas: 2.1, milimetros: 53.3, horas: 120 },
    { timer: 50, pulgadas: 0.5, milimetros: 12.7, horas: 24 }
  ]);
  assert.deepEqual(pivote.filasDeConfiguracion([{ timer: 100, wather: "", degree: null }]), [{ timer: 100, pulgadas: null, milimetros: null, horas: null }]);
  assert.deepEqual(pivote.filasDeConfiguracion(null), []);
});

test("REQ-056 ventana con estilo comun, estados y fila actual; ambos botones (?) cargan la tabla", () => {
  const ini = HTML.indexOf('<div id="systemConfigModal"');
  const modal = HTML.slice(ini, HTML.indexOf("</section>", ini));
  assert.match(modal, /<div id="systemConfigModal" class="modal ventana-modal">\s*<div class="bs ventana">/);
  ["cargando", "sin-marca", "vacia", "error", "lista"].forEach(e => assert.match(modal, new RegExp("pivoteTabla\\.estado == '" + e + "'"), e));
  assert.match(modal, /'pivote-fila-actual': fila\.timer === pivoteTabla\.valorActual/);
  assert.match(modal, /ng-click="setTimer\(fila\.timer\)"/);
  // REQ-059: el boton (?) del formulario del plan pide la tabla con la velocidad que se esta editando.
  assert.match(HTML, /al-ver-velocidades="verVelocidadesPivote\(\$velocidad\)"/);
  assert.match(CORE, /\$scope\.showSystemTable\(\$scope\.actualSystem\.brand, velocidad\);\s*abrirModal\("systemConfigModal"\);/);
  assert.doesNotMatch(CORE, /switch \(type\.toLowerCase\(\)\)/, "ya no falla sin marca");
  assert.match(CORE, /\$scope\.pivoteTabla\.estado = "error"/);
});
