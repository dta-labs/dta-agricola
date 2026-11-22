"use strict";

/**
 * REQ-145 - Limites configurables de todo lo que mide un sensor, en Agregar y Editar sensor.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");
const nevera = require("../../assets/js/logic/nevera.js");
const historial = require("../../assets/js/logic/historial.js");

const LIMITES = [["Hr", "hr", "SHT4"], ["Psi", "psi", "Psi"], ["Fl", "fl", "Fl"], ["I", "i", "Irms"]];

test("REQ-145 cada parametro tiene aviso y limites minimo y maximo en Agregar y Editar sensor", () => {
  for (const [prefijo, modelo] of [["newSensor", "newSensor"], ["editSensor", "actualSensor"]]) {
    for (const [K, k, tipo] of LIMITES) {
      assert.ok(HTML.includes(`<input id="${prefijo}${K}Notify" type="checkbox" ng-model="${modelo}.${k}.notify" />`), prefijo + K);
      assert.match(HTML, new RegExp(`<input id="${prefijo}${K}MinValue" type="number" [^>]*ng-model="${modelo}\\.${k}\\.minValue">`));
      assert.match(HTML, new RegExp(`<input id="${prefijo}${K}MaxValue" type="number" [^>]*ng-model="${modelo}\\.${k}\\.maxValue">`));
      assert.ok(HTML.includes(`${modelo}.type == '${tipo}'`), tipo);
    }
    // caudal: ya no estan cruzados el minimo y el maximo
    assert.doesNotMatch(HTML, new RegExp(`id="${prefijo}FlMaxValue"[^>]*ng-model="${modelo}\\.fl\\.minValue"`));
    // humedad relativa del SHT2 (nevera/invernadero) con sus propias etiquetas
    assert.ok(HTML.includes(`${modelo}.type == 'SHT2' ? 'Humedad relativa' : 'Humedad del suelo'`));
  }
  // temperatura tambien para el Ms en Editar sensor
  assert.ok(HTML.includes(`<div ng-show="actualSensor.type == 'Tr' || actualSensor.type == 'SHT2' || actualSensor.type == 'SHT4' || actualSensor.type == 'WM' || actualSensor.type == 'Ms'"> <!-- Humbral de temperatura -->`));
});

test("REQ-145 los limites se usan: corriente en la tarjeta y humedad relativa en el historial", () => {
  const s = { type: "Irms", i: { minValue: "1", maxValue: "10" } };
  assert.deepEqual(["0.5", "5", "12"].map(v => nevera.tarjeta(s, [v, "NaN", "3"], 0).estado.texto), ["Corriente baja", "Normal", "Corriente alta"]);
  assert.equal(nevera.tarjeta({ type: "Irms" }, ["5", "NaN", "3"], 0).estado.texto, "Encendido");   // sin limites, como antes
  const { amarillo, verde, azul } = historial.COLORES;
  assert.deepEqual([30, 60, 90].map(v => historial.color({ hr: { minValue: "40", maxValue: "80" } }, "hr", v)), [amarillo, verde, azul]);
  assert.equal(historial.color({}, "hr", 50), "#263238");
  assert.match(HTML, /<td style="color: \{\{ colorHistorial\(sensor, 'hr', data\[idx \* 8 \+ 1\]\) \}\};">/);
});
