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

test("REQ-068/070 humedad del tensiometro: 240 cb = 0 %, 0 cb = 100 %, acotada (antes 245 desbordaba la ficha)", () => {
  assert.equal(m.posicionHumedad(240, true), 0);
  assert.equal(m.posicionHumedad(0, true), 100);
  assert.equal(m.posicionHumedad(245, true), 0, "por encima de 240 queda en el extremo seco");
  assert.equal(m.posicionHumedad(-5, true), 100);
  const e = m.escalaHumedadSuelo({ type: "WM", h: { minValue: 25, maxValue: 80 } }, "245");
  assert.equal(e.valorTexto, "245 cb");
  assert.equal(e.etiqueta, "Fuera de rango");
  assert.deepEqual(e.umbrales.map(x => x.texto), ["25", "80"]);
});

test("REQ-070 escala NO lineal del tensiometro: 6 zonas de igual ancho con los rangos del usuario", () => {
  const ancho = 100 / 6;
  // Bordes de zona en la barra (izquierda = seco).
  [[240, 0], [200, ancho], [100, 2 * ancho], [60, 3 * ancho], [30, 4 * ancho], [10, 5 * ancho], [0, 100]]
    .forEach(([cb, pos]) => assert.ok(Math.abs(m.posicionHumedad(cb, true) - pos) < 0.1, cb + " cb"));
  const zonas = [[0, "Suelo saturado"], [10, "Suelo saturado"], [10.5, "Muy húmedo"], [30, "Muy húmedo"], [45, "Humedad adecuada"],
    [60, "Humedad adecuada"], [80, "Estrés moderado"], [100, "Estrés moderado"], [150, "Suelo muy seco"], [200, "Suelo muy seco"],
    [201, "Fuera de rango"], [300, "Fuera de rango"]];
  zonas.forEach(([cb, nombre]) => assert.equal(m.zonaCb(cb).nombre, nombre, cb + " cb"));
  assert.equal(m.zonaCb("NaN"), null);
  // El caso de la captura: 22 cb.
  const e = m.escalaHumedadSuelo({ type: "WM", h: { minValue: 30, maxValue: 80 } }, "22");
  assert.equal(e.etiqueta, "Muy húmedo");
  assert.equal(e.nivel, "atencion");
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
  assert.match(html, /^<div class="medidor medidor-temperatura" role="img" aria-label="Temperatura adecuada 8 °C">/);
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

test("REQ-069/070 zona y valor en una linea, la barra debajo de todo el ancho, alto compacto", () => {
  const ini = CORE.indexOf("const getSensorText = (campo, sensor, idx) => {");
  const cuerpo = CORE.slice(ini, CORE.indexOf("// Cultivo", ini));
  assert.equal((cuerpo.match(/<div class="col s10 medidor-bloque">/g) || []).length, 2);
  assert.match(cuerpo, /<span class="medidor-etiqueta">\$\{escaparHtml\(medidorSuelo\.etiqueta\)\}<\/span>/);
  assert.match(cuerpo, /<span class="medidor-etiqueta">\$\{escaparHtml\(medidorTemperatura\.etiqueta\)\}<\/span>/);
  assert.doesNotMatch(cuerpo, /<small>\$\{Math\.round\(medidorSuelo\.porcentaje\)\} %<\/small>/, "sin segunda linea: misma altura");
  const css = fs.readFileSync(path.join(__dirname, "..", "..", "assets", "css", "style.css"), "utf8");
  assert.match(css, /\.medidor-barra \{\s*height: 10px;/);
  assert.match(css, /\.medidor-zonas \.medidor-barra \{/);
});

test("REQ-070 temperatura: Riesgo de helada / Temperatura adecuada / Calor extremo", () => {
  const t = { t: { minValue: 2, maxValue: 25 } };
  assert.equal(m.escalaTemperatura(1, t, "C").etiqueta, "Riesgo de helada");
  assert.equal(m.escalaTemperatura(1, t, "C").nivel, "frio");
  assert.equal(m.escalaTemperatura(8, t, "F").etiqueta, "Temperatura adecuada");
  assert.equal(m.escalaTemperatura(30, t, "C").etiqueta, "Calor extremo");
  assert.equal(m.escalaTemperatura("NaN", t, "C").etiqueta, "Temperatura");
});

test("REQ-070 la barra del tensiometro marca las 6 zonas", () => {
  const html = m.htmlMedidor(m.escalaHumedadSuelo({ type: "WM" }, 45));
  assert.match(html, /class="medidor medidor-humedad medidor-zonas"/);
  assert.equal((html.match(/class="medidor-division"/g) || []).length, 5);
  assert.doesNotMatch(m.htmlMedidor(m.escalaHumedadSuelo({ type: "SHT4" }, 45)), /medidor-division/, "sensores en %: lineal, sin zonas");
});
