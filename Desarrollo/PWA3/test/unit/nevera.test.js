"use strict";

/**
 * REQ-133 - Tarjetas de la nevera: temperatura primero, luego humedad, y estado del sensor (Helado, Adecuado, Caliente).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const n = require("../../assets/js/logic/nevera.js");

const RAIZ = path.join(__dirname, "..", "..");
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), "utf8").replace(/\r\n/g, "\n");

test("REQ-133 estado de la temperatura con los umbrales del sensor (o 0 y 3 °C)", () => {
  const s = { alias: "Cámara 1", t: { minValue: "0", maxValue: "4" } };
  const est = (t, sensor = s) => n.tarjeta(sensor, ["90", t, "3.1"], 0, "C").estado.texto;
  assert.deepEqual(["-0.5", "0", "2.4", "4", "4.1", "NaN"].map(t => est(t)), ["Helado", "Adecuado", "Adecuado", "Adecuado", "Caliente", "Sin lectura"]);
  assert.deepEqual(["-1", "2", "3.5"].map(t => est(t, { id: "X" })), ["Helado", "Adecuado", "Caliente"]);   // por defecto 0..3
  assert.equal(n.tarjeta({ id: "X" }, [], 0).rangoTexto, "Rango 0 a 3 °C (por defecto)");
  assert.equal(n.tarjeta(s, [], 0).rangoTexto, "Rango 0 a 4 °C");
});

test("REQ-133 datos por la clave del sensor (3 valores: hr, t, vcc), humedad con sus umbrales y °F", () => {
  const datos = ["90", "2.44", "3.1", "70", "-1.2", "2.9"];
  assert.equal(n.indiceDe("S1"), 1);
  assert.equal(n.indiceDe("sensorNumber"), null);
  const t = n.tarjeta({ id: "B", h: { minValue: "85", maxValue: "95" } }, datos, n.indiceDe("S1"), "C");
  assert.deepEqual([t.nombre, t.temperaturaTexto, t.humedadTexto, t.humedadEstado.texto, t.voltaje], ["B", "-1.2", "70", "Seca", 2.9]);
  assert.equal(n.tarjeta({ id: "A" }, datos, 0, "C").humedadEstado, null);   // sin umbrales de humedad: sin etiqueta
  const f = n.tarjeta({ id: "A" }, datos, 0, "F");
  assert.deepEqual([f.temperaturaTexto, f.unidad, f.rangoTexto], ["36.4", "°F", "Rango 32 a 37.4 °F (por defecto)"]);
});

test("REQ-133 la tarjeta pone la temperatura primero (grande) y luego la humedad, con el estado", () => {
  const html = leer("assets", "js", "components", "sistema", "panel-nevera", "panel-nevera.html");
  const posT = html.indexOf('class="nevera-temperatura"'), posH = html.indexOf('class="nevera-humedad"');
  assert.ok(posT > 0 && posH > posT);
  assert.match(html, /ng-class="'nevera-' \+ vm\.tarjeta\(coldRoomKey, coldRoom\)\.estado\.nivel"/);
  assert.match(html, /<span class="nevera-estado">/);
  const css = leer("assets", "js", "components", "sistema", "paneles.css");
  assert.match(css, /\.nevera-temperatura-valor \{\n    font-size: 3\.4rem;/);
  assert.match(leer("assets", "js", "components", "sistema", "panel-nevera", "panel-nevera.component.js"), /vm\.tarjeta = function \(clave, sensor\)/);
  assert.match(leer("index.html"), /<script src="\.\/assets\/js\/logic\/nevera\.js\?v=/);
});
