"use strict";

/**
 * REQ-051 - logic/geo.js: coordenadas, poligonos (formatos guardados) y superficie.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const geo = require("../../assets/js/logic/geo.js");

function cuadrado(lat, lng, metros) {
  const dLat = metros / 111320;
  const dLng = metros / (111320 * Math.cos(lat * Math.PI / 180));
  return [[lat, lng], [lat + dLat, lng], [lat + dLat, lng + dLng], [lat, lng + dLng]];
}

test("REQ-051 esCoordenadaValida y punto (redondeo a 6 decimales, texto con coma)", () => {
  assert.equal(geo.esCoordenadaValida(28.6, -106.1), true);
  assert.equal(geo.esCoordenadaValida("28.6", "-106.1"), true);
  for (const [a, o] of [[91, 0], [0, 181], ["", 1], [null, 1], ["x", 2], [undefined, undefined]]) {
    assert.equal(geo.esCoordenadaValida(a, o), false, `${a},${o}`);
  }
  assert.deepEqual(geo.punto("28,63212345", "-106.06912349"), { lat: 28.632123, lng: -106.069123 });
  assert.equal(geo.punto(200, 0), null);
});

test("REQ-051 normalizarPoligono: arreglo de pares (numero o texto), {lat,lng}, texto antiguo y objeto de RTDB", () => {
  const esperado = [[28.1, -106.2], [28.2, -106.3], [28.3, -106.1]];
  assert.deepEqual(geo.normalizarPoligono([[28.1, -106.2], [28.2, -106.3], [28.3, -106.1]]), esperado);
  assert.deepEqual(geo.normalizarPoligono([["28.1", "-106.2"], ["28.2", "-106.3"], ["28.3", "-106.1"]]), esperado, "verifyPlots guarda texto");
  assert.deepEqual(geo.normalizarPoligono([{ lat: 28.1, lng: -106.2 }, { lat: 28.2, lng: -106.3 }, { lat: 28.3, lng: -106.1 }]), esperado);
  assert.deepEqual(geo.normalizarPoligono("28.1, -106.2, 28.2,-106.3,28.3 ,-106.1"), esperado, "formato del antiguo textarea");
  assert.deepEqual(geo.normalizarPoligono({ 0: [28.1, -106.2], 2: [28.3, -106.1], 1: [28.2, -106.3] }), esperado, "objeto con indices");
  assert.deepEqual(geo.normalizarPoligono(""), []);
  assert.deepEqual(geo.normalizarPoligono(null), []);
  assert.deepEqual(geo.normalizarPoligono([[1, 2], ["x", 3], [95, 0]]), [[1, 2]], "descarta invalidos");
});

test("REQ-051 esPoligonoValido: 3 vertices distintos", () => {
  assert.equal(geo.esPoligonoValido(cuadrado(28.6, -106.08, 100)), true);
  assert.equal(geo.esPoligonoValido([[1, 1], [2, 2]]), false);
  assert.equal(geo.esPoligonoValido([[1, 1], [1, 1], [2, 2]]), false);
});

test("REQ-051 areaHectareas y textoArea", () => {
  assert.equal(geo.areaHectareas(cuadrado(28.6, -106.08, 100)), 1);
  assert.equal(geo.areaHectareas(cuadrado(28.6, -106.08, 500)), 25);
  assert.equal(geo.areaHectareas([[1, 1], [2, 2]]), 0);
  assert.match(geo.textoArea(cuadrado(28.6, -106.08, 500)), /^25 ha$/);
  assert.match(geo.textoArea(cuadrado(28.6, -106.08, 30)), /m²$/);
  assert.equal(geo.textoArea([]), "");
});

test("REQ-051 centro", () => {
  assert.deepEqual(geo.centro([[0, 0], [2, 0], [2, 2], [0, 2]]), { lat: 1, lng: 1 });
  assert.equal(geo.centro([]), null);
});

// ---------- REQ-117: encuadre del mapa en el equipo ----------

test("REQ-117 limitesDeEquipo: pivote (circulo), red (sensores y parcelas, sin atipicos ni 0,0) y sin ubicacion", () => {
  const pc = geo.limitesDeEquipo({ type: "PC", latitude: "29.1", longitude: "-110.9", length: "400" });
  assert.ok(Math.abs((pc.norte - pc.sur) * 111320 - 800) < 1);
  assert.ok(pc.oeste < -110.9 && pc.este > -110.9);
  const red = geo.limitesDeEquipo({ type: "Sensor", latitude: "19.4", longitude: "-99.1", sensors: {
    S0: { latitude: "29.1", longitude: "-110.9" },
    S1: { latitude: "29.101", longitude: "-110.902", poligon: "29.1,-110.9,29.102,-110.9,29.102,-110.903" },
    S2: { latitude: "0", longitude: "0" },            // sin ubicar
    S3: { latitude: "19.4", longitude: "-99.1" },     // a cientos de km: se descarta
    S4: { latitude: "29.103", longitude: "-110.901" } } });
  assert.deepEqual(red, { sur: 29.1, norte: 29.103, oeste: -110.903, este: -110.9 });
  const est = geo.limitesDeEquipo({ type: "Estacionario", latitude: "1", longitude: "1", plots: { p0: { poligon: cuadrado(20, -100, 100) } } });
  assert.equal(est.sur, 20);
  assert.deepEqual(geo.limitesDeEquipo({ type: "Pozo", latitude: "20.5", longitude: "-101.2" }), { sur: 20.5, norte: 20.5, oeste: -101.2, este: -101.2 });
  assert.equal(geo.limitesDeEquipo({ type: "Pozo", latitude: "0", longitude: "0" }), null);
  assert.equal(geo.limitesDeEquipo(null), null);
});

test("REQ-117 core: el mapa se encuadra al entrar al equipo y al volver a la vista de mapa, ya visible", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const CORE = fs.readFileSync(path.join(__dirname, "..", "..", "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");
  assert.match(CORE, /if \(!contenedor\.offsetWidth \|\| !contenedor\.offsetHeight\) \{ encuadrePendiente = system\.key; return; \}/);
  assert.match(CORE, /map\.fitBounds\(\[\[caja\.sur, caja\.oeste\], \[caja\.norte, caja\.este\]\], \{ padding: \[40, 40\], maxZoom: 17 \}\)/);
  assert.match(CORE, /if \(ultimoEncuadre !== system\.key\) \{\n\s+map\.setView\(\[system\.latitude, system\.longitude\], 16\);\n\s+pedirEncuadre\(system\);/);
  assert.match(CORE, /pedirEncuadre\(\$scope\.actualSystem\);   \/\/ REQ-117: al volver a la vista de mapa/);
  assert.match(CORE, /encuadrarSiPendiente\(\);   \/\/ REQ-117: el mapa acaba de hacerse visible/);
  assert.match(CORE, /ultimoEncuadre = null;   \/\/ REQ-117/);
});
