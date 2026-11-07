"use strict";

/**
 * REQ-052 - logic/humedad.js: misma regla que la tarjeta del sensor, ahora tambien para el mapa.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const h = require("../../assets/js/logic/humedad.js");
const cultivos = require("../../assets/js/logic/cultivos.js");

test("REQ-052 % de humedad con umbrales del sensor (y por defecto 25/60)", () => {
  const sensor = { type: "SHT4", h: { minValue: "20", maxValue: "50" } };
  assert.equal(h.estadoHumedad(sensor, 20).estado, "seco");
  assert.equal(h.estadoHumedad(sensor, 35).estado, "adecuado");
  assert.equal(h.estadoHumedad(sensor, "50").estado, "saturado");
  assert.equal(h.estadoHumedad({ type: "SHT4", h: { minValue: "NaN", maxValue: "NaN" } }, 30).estado, "adecuado");
  assert.equal(h.estadoHumedad({ type: "Ms" }, 25).estado, "seco", "sin h: umbrales 25/60");
  assert.equal(h.estadoHumedad({ type: "Ms" }, 60).estado, "saturado");
});

test("REQ-052 tensiometro WM en centibares (al reves: mas cb = mas seco)", () => {
  assert.equal(h.estadoHumedad({ type: "WM" }, 10).estado, "saturado");
  assert.equal(h.estadoHumedad({ type: "WM" }, 60).estado, "adecuado");
  assert.equal(h.estadoHumedad({ type: "WM" }, 61).estado, "seco");
  assert.equal(h.estadoHumedad({ type: "WM" }, 30).unidad, "cb");
});

test("REQ-052 sin lectura: 'Sin dato' (antes salia 'Seco -99%')", () => {
  for (const v of ["NaN", null, undefined, "", -99]) {
    const e = h.estadoHumedad({ type: "SHT4" }, v);
    assert.equal(e.estado, "sin-dato", String(v));
    assert.equal(e.valor, null);
  }
});

test("REQ-052 colores: los mismos fondos que la tarjeta del sensor", () => {
  assert.equal(h.estadoHumedad({ type: "Ms" }, 10).fondo, "#ff000080");
  assert.equal(h.estadoHumedad({ type: "Ms" }, 40).fondo, "#00ff0080");
  assert.equal(h.estadoHumedad({ type: "Ms" }, 90).fondo, "#0000ff80");
  assert.deepEqual(h.leyenda().map(x => x.texto), ["Seco", "Adecuado", "Saturado", "Sin dato"]);
});

function red() {
  return {
    log: { dataRaw: JSON.stringify([10, 0, 0, 0, 0, 0, 0, 0, 55, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0]) },
    sensors: {
      sensorNumber: 3,
      S0: { id: "a", type: "SHT4", h: { minValue: 20, maxValue: 50 } },
      S1: { id: "b", type: "WM" },
      S2: { id: "c", type: "Psi" }
    }
  };
}

test("REQ-052 estadoEnRed lee 8 valores por sensor de log.dataRaw", () => {
  assert.equal(h.estadoEnRed(red(), 0).estado, "seco");
  assert.equal(h.estadoEnRed(red(), 1).estado, "adecuado");
  assert.equal(h.estadoEnRed(red(), 2).estado, "sin-dato", "un sensor de presion no tiene humedad");
  assert.equal(h.estadoEnRed(red(), 9).estado, "sin-dato");
  assert.equal(h.estadoEnRed({ log: { dataRaw: "{roto" }, sensors: red().sensors }, 0).estado, "sin-dato");
  assert.deepEqual(h.sensoresDeRed(red()).map(x => x.clave), ["S0", "S1", "S2"]);
});

test("REQ-052 estadoDeParcela: humedad del sensor asociado (plot.sensor = red, plot.sensorId = sensor)", () => {
  const sistemas = { RED1: red() };
  assert.equal(h.estadoDeParcela({ sensor: "RED1", sensorId: "b" }, sistemas).estado, "adecuado");
  assert.equal(h.estadoDeParcela({ sensor: "RED1", sensorId: "zz" }, sistemas).estado, "sin-dato");
  assert.equal(h.estadoDeParcela({ sensor: "OTRA", sensorId: "b" }, sistemas).estado, "sin-dato");
  assert.equal(h.estadoDeParcela({}, sistemas).estado, "sin-dato");
});

test("REQ-052 fases fenologicas: lista fija y conserva lo escrito antes", () => {
  assert.ok(cultivos.FASES_FENOLOGICAS.includes("Floración"));
  assert.deepEqual(cultivos.fasesConActual("Floración"), cultivos.FASES_FENOLOGICAS);
  assert.equal(cultivos.fasesConActual(" brotación ").at(-1), "brotación");
  assert.deepEqual(cultivos.fasesConActual(null), cultivos.FASES_FENOLOGICAS);
});
