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
