"use strict";

/**
 * REQ-072 - Parcelas: estimacion, punto de medicion, lectura vieja (+24 h) y varios sensores por parcela.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const geo = require("../../assets/js/logic/geo.js");
const estado = require("../../assets/js/logic/estado.js");

const RAIZ = path.join(__dirname, "..", "..");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");
const P = [[28.60, -106.10], [28.61, -106.10], [28.61, -106.09], [28.60, -106.09]];

test("REQ-072 punto en poligono", () => {
  assert.equal(geo.puntoEnPoligono([28.605, -106.095], P), true);
  assert.equal(geo.puntoEnPoligono([28.62, -106.095], P), false);
  assert.equal(geo.puntoEnPoligono(null, P), false);
  assert.equal(geo.puntoEnPoligono([28.605, -106.095], []), false);
});

test("REQ-072 dos sensores en una parcela: cada uno sombrea la mitad mas cercana", () => {
  const izq = geo.recortarPorCercania(P, [28.605, -106.098], [[28.605, -106.092]]);
  const der = geo.recortarPorCercania(P, [28.605, -106.092], [[28.605, -106.098]]);
  const total = geo.areaHectareas(P);
  assert.ok(Math.abs(geo.areaHectareas(izq) - total / 2) < 0.5);
  assert.ok(Math.abs(geo.areaHectareas(der) - total / 2) < 0.5);
  assert.ok(izq.every(v => v[1] <= -106.095 + 1e-6), "la izquierda queda al oeste de la mediatriz");
  assert.deepEqual(geo.recortarPorCercania(P, [28.605, -106.095], []), geo.normalizarPoligono(P), "un solo sensor: la parcela entera");
  const tres = [[28.602, -106.098], [28.608, -106.098], [28.605, -106.092]];
  const suma = tres.reduce((s, p, i) => s + geo.areaHectareas(geo.recortarPorCercania(P, p, tres.filter((_, j) => j !== i))), 0);
  assert.ok(Math.abs(suma - total) < 1, "tres sensores: las zonas suman la parcela");
});

test("REQ-072 lectura vieja: MAS de 24 h desde log.date (hora local del equipo)", () => {
  const ahora = new Date(2026, 10, 7, 21, 0, 0).getTime();
  assert.deepEqual(estado.antiguedadDeLectura("20261107 0800pm", ahora), { vieja: false, horas: 1 });
  assert.deepEqual(estado.antiguedadDeLectura("20261106 0900pm", ahora), { vieja: false, horas: 24 }, "exactamente 24 h: aun no");
  assert.deepEqual(estado.antiguedadDeLectura("20261106 0859pm", ahora), { vieja: true, horas: 24 }, "24 h y 1 min: vieja");
  assert.equal(estado.antiguedadDeLectura("20261104 0900pm", ahora).horas, 72);
  assert.deepEqual(estado.antiguedadDeLectura(undefined, ahora), { vieja: false, horas: null }, "sin fecha no se marca");
  assert.equal(estado.textoAntiguedad(26), "hace 26 h");
  assert.equal(estado.textoAntiguedad(72), "hace 3 d");
});

test("REQ-072 mapa: menos opacidad, punto del sensor, rayas grises sobre el color y leyenda", () => {
  assert.match(CORE, /fillOpacity: 0\.35/);
  assert.match(CORE, /poligons\[capa \+ "-punto"\] = L\.circleMarker\(\[punto\.lat, punto\.lng\], estiloPunto\);/);
  assert.match(CORE, /fillColor: estado\.color, fillOpacity: 1, interactive: false \};/, "el punto tiene el color de la lectura");
  assert.match(CORE, /fillColor: "url\(#rayas-lectura-vieja\)", fillOpacity: 1, interactive: false/, "rayas encima, sin tapar el color");
  assert.match(CORE, /rayasDeLecturaVieja\(capa \+ "-rayas", area, vieja\);/);
  assert.match(CORE, /rayasDeLecturaVieja\(campo\.key \+ idx \+ "-rayas", newPoligon, vieja\);/, "tambien las parcelas del estacionario");
  assert.match(CORE, /area = geo\.recortarPorCercania\(area, \[punto\.lat, punto\.lng\], otros\);/);
  assert.match(CORE, /estimada con el sensor/);
  assert.match(CORE, /Lectura de más de 24 h/);
});
