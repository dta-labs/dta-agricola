"use strict";

/**
 * REQ-068 - Medidores de la ficha del sensor.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const m = require("../../assets/js/logic/medidor.js");

const CORE = fs.readFileSync(path.join(__dirname, "..", "..", "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");

test("REQ-068 humedad del tensiometro: 240 cb = 0 %, 0 cb = 100 %, acotada (antes 245 desbordaba la ficha)", () => {
  assert.equal(m.posicionHumedad(240, true), 0);
  assert.equal(m.posicionHumedad(0, true), 100);
  assert.equal(m.posicionHumedad(120, true), 50);
  assert.equal(m.posicionHumedad(245, true), 0, "por encima de 240 queda en el extremo seco");
  assert.equal(m.posicionHumedad(-5, true), 100);
  const e = m.escalaHumedadSuelo({ type: "WM", h: { minValue: 25, maxValue: 80 } }, "245");
  assert.equal(e.valorTexto, "245 cb");
  assert.deepEqual(e.umbrales, [{ posicion: 89.6, texto: "25" }, { posicion: 66.7, texto: "80" }]);
  assert.equal(e.fueraDeRango, true);
});

test("REQ-068 sensores en %: el valor ya es 0..100", () => {
  const e = m.escalaHumedadSuelo({ type: "SHT4", h: { minValue: 25, maxValue: 80 } }, "12");
  assert.equal(e.posicion, 12);
  assert.equal(e.valorTexto, "12 %");
  assert.deepEqual(e.umbrales.map(u => u.posicion), [25, 80]);
  assert.equal(m.escalaHumedadSuelo({ type: "Ms" }, "NaN").posicion, null);
  assert.equal(m.escalaHumedadSuelo({ type: "Ms" }, "NaN").valorTexto, "--");
});

test("REQ-068 temperatura: -50..+125 °C, en la unidad del sistema y sin mezclar °C/°F", () => {
  assert.equal(m.escalaTemperatura(-50, {}, "C").posicion, 0);
  assert.equal(m.escalaTemperatura(125, {}, "C").posicion, 100);
  assert.equal(m.escalaTemperatura(37.5, {}, "C").posicion, 50);
  assert.equal(m.escalaTemperatura(200, {}, "C").posicion, 100, "acotada");
  const f = m.escalaTemperatura("8", { t: { minValue: 2, maxValue: 25 } }, "F");
  assert.equal(f.valorTexto, "46 °F");
  assert.deepEqual(f.umbrales.map(u => u.texto), ["36", "77"], "umbrales guardados en °C, mostrados en °F");
  assert.equal(m.escalaTemperatura("8", { t: { minValue: 2, maxValue: 25 } }, "C").valorTexto, "8 °C");
  assert.equal(f.fueraDeRango, false);
  assert.equal(m.escalaTemperatura(30, { t: { minValue: 2, maxValue: 25 } }, "C").fueraDeRango, true);
});

test("REQ-068 HTML: barra con degradado, raya y valor por umbral, triangulo de la medicion", () => {
  const html = m.htmlMedidor(m.escalaTemperatura("8", { t: { minValue: 2, maxValue: 25 } }, "C"));
  assert.match(html, /^<div class="medidor medidor-temperatura" role="img" aria-label="Temperatura 8 °C">/);
  assert.equal((html.match(/class="medidor-umbral"/g) || []).length, 2);
  assert.equal((html.match(/class="medidor-umbral-texto"/g) || []).length, 2);
  assert.match(html, /<span class="medidor-marca" style="left:33\.1%"><\/span>/);
  const sinDato = m.htmlMedidor(m.escalaHumedadSuelo({ type: "WM" }, "NaN"));
  assert.doesNotMatch(sinDato, /medidor-marca/, "sin lectura no hay triangulo");
  const css = fs.readFileSync(path.join(__dirname, "..", "..", "assets", "css", "style.css"), "utf8");
  assert.match(css, /\.medidor-humedad \.medidor-barra \{\s*background: linear-gradient\(90deg, #e53935 0%[^}]*#43a047 50%[^}]*#1e88e5 100%\);/);
  assert.match(css, /\.medidor-temperatura \.medidor-barra \{\s*background: linear-gradient\(90deg, #1e88e5 0%[^}]*#e53935 100%\);/);
});

test("REQ-068 la ficha del sensor usa los medidores (sin anchos crudos ni °C/°F mezclados)", () => {
  const ini = CORE.indexOf("const getSensorText = (campo, sensor, idx) => {");
  const cuerpo = CORE.slice(ini, CORE.indexOf("// Cultivo", ini));
  assert.match(cuerpo, /__modulo\("medidor"\)\.escalaHumedadSuelo\(sensor, data\[idx \* 8\]\)/);
  assert.match(cuerpo, /__modulo\("medidor"\)\.escalaTemperatura\(data\[idx \* 8 \+ 4\], sensor, campo\.tempUnit\)/);
  assert.doesNotMatch(cuerpo, /width: ` \+ parseFloat\(data\[idx \* 8\]\)/);
  assert.doesNotMatch(cuerpo, /Temperatura \(°C\/°F\)/);
});

test("REQ-069 barras gruesas y de todo el ancho (debajo del titulo y del valor)", () => {
  const ini = CORE.indexOf("const getSensorText = (campo, sensor, idx) => {");
  const cuerpo = CORE.slice(ini, CORE.indexOf("// Cultivo", ini));
  assert.equal((cuerpo.match(/<div class="col s10 offset-s2">` \+ __modulo\("medidor"\)\.htmlMedidor\(/g) || []).length, 2);
  const css = fs.readFileSync(path.join(__dirname, "..", "..", "assets", "css", "style.css"), "utf8");
  assert.match(css, /\.medidor-barra \{\s*height: 14px;/);
});
