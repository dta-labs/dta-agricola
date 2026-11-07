"use strict";

/**
 * REQ-066 - Umbrales de temperatura en la unidad del sistema y guardados en °C.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const unidades = require("../../assets/js/logic/unidades.js");
const { crearDirectiva } = require("../../assets/js/ui/campos-unidad.directive.js");

const RAIZ = path.join(__dirname, "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");

test("REQ-066 conversiones (sin unidad = °F, como el resto de la app)", () => {
  assert.equal(unidades.temperaturaParaMostrar(0, "F"), 32);
  assert.equal(unidades.temperaturaParaMostrar(-2, "C"), -2);
  assert.equal(unidades.temperaturaParaMostrar(35, undefined), 95);
  assert.equal(unidades.temperaturaParaGuardar(32, "F"), 0);
  assert.equal(unidades.temperaturaParaGuardar("28,4", "F"), -2);
  assert.equal(unidades.temperaturaParaGuardar("", "F"), "");
  assert.equal(unidades.temperaturaParaMostrar(null, "C"), "");
  assert.equal(unidades.simbolo("C"), "°C");
  assert.equal(unidades.simbolo(undefined), "°F");
  for (const c of [-10, -2, 0, 4.5, 25, 38]) {
    assert.equal(unidades.temperaturaParaGuardar(unidades.temperaturaParaMostrar(c, "F"), "F"), c, "ida y vuelta " + c);
  }
});

test("REQ-066 la directiva muestra en °F y guarda en °C", () => {
  const modelo = { sensor: { t: { minValue: 0 } }, sistema: { tempUnit: "F" } };
  const $parse = expr => {
    const ruta = expr === "sensor.t.minValue" ? ["sensor", "t", "minValue"] : ["sistema", "tempUnit"];
    const getter = () => ruta.reduce((o, k) => o && o[k], modelo);
    getter.assign = (scope, v) => { modelo.sensor.t.minValue = v; };
    return getter;
  };
  let vigilante = null;
  const manejadores = {};
  const campo = { value: "" };
  const elemento = [campo];
  elemento.on = (ev, fn) => { manejadores[ev] = fn; };
  elemento.off = () => {};
  global.document = { activeElement: null };
  const scope = { $watchGroup: (g, fn) => { vigilante = () => fn(g.map(x => x())); return () => {}; }, $evalAsync: fn => fn(), $on() {} };
  const [, fabrica] = crearDirectiva(unidades);
  fabrica($parse).link(scope, elemento, { dtaTemperatura: "sensor.t.minValue", dtaUnidad: "sistema.tempUnit" });
  vigilante();
  assert.equal(campo.value, "32");
  campo.value = "95";
  manejadores.input();
  assert.equal(modelo.sensor.t.minValue, 35);
  modelo.sistema.tempUnit = "C";
  vigilante();
  assert.equal(campo.value, "35");
  delete global.document;
});

test("REQ-066 los cuatro umbrales de temperatura usan la directiva y la unidad del sistema", () => {
  for (const [prefijo, modelo] of [["newSensor", "newSensor"], ["editSensor", "actualSensor"]]) {
    for (const [lado, campo] of [["Min", "minValue"], ["Max", "maxValue"]]) {
      assert.match(HTML, new RegExp('id="' + prefijo + 'T' + lado + 'Value"[^>]*dta-temperatura="' + modelo + "\\.t\\." + campo + '" dta-unidad="actualSystem\\.tempUnit"'));
    }
  }
  assert.doesNotMatch(HTML, /ng-model="(newSensor|actualSensor)\.t\.(minValue|maxValue)"/);
  assert.equal((HTML.match(/\{\{ actualSystem\.tempUnit == 'C' \? '°C' : '°F' \}\}/g) || []).length, 4);
});
