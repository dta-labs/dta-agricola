"use strict";

/**
 * REQ-149 - Alertas push (Cloud Functions) de humedad relativa en redes de sensores y de neveras/invernaderos
 * (temperatura, humedad relativa, presion, caudal y corriente), solo con la casilla "avisar" del parametro.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const a = require("../../functions/alertas-sensores.js");

const sensores = {
  sensorNumber: 5,
  S0: { id: "0x1", alias: "Cámara 1", type: "SHT2", t: { minValue: "0", maxValue: "4", notify: true }, h: { minValue: "80", maxValue: "95", notify: true } },
  S1: { id: "0x2", type: "Psi", psi: { minValue: "20", maxValue: "60", notify: true } },
  S2: { id: "0x3", type: "Fl", fl: { minValue: "5", maxValue: "40", notify: false } },
  S3: { id: "0x4", type: "Irms", i: { minValue: "0.5", maxValue: "8", notify: true } },
  S4: { id: "0x5", type: "Contact" },
};
//          S0: hr, t, vcc   S1: psi          S2: fl          S3: A           S4: puerta
const log = { dataRaw: JSON.stringify([70, 6.2, 3.9, 15, null, 3.8, 1, null, 3.7, 9.5, null, 3.6, 1, null, 3.5]) };

test("REQ-149 neveras: alertas por tipo de sensor y solo con 'avisar'", () => {
  const r = a.alertasDeNevera(log, sensores);
  assert.deepEqual(r.map(x => [x.sensorKey, x.metricKey, x.message, x.value, x.threshold]), [
    ["S0", "t", "Temperatura alta", 6.2, 4],
    ["S0", "h", "Humedad baja", 70, 80],
    ["S1", "psi", "Presión baja", 15, 20],
    ["S3", "i", "Corriente alta", 9.5, 8],
  ]);                                                  // S2 (caudal) sin "avisar"; S4 (puerta) sin limites
  assert.equal(r[0].sensorLabel, "Cámara 1");
  assert.equal(r[0].unit, " C");
  // sin "avisar" en ningun parametro: nada
  assert.deepEqual(a.alertasDeNevera(log, { sensorNumber: 1, S0: { id: "x", t: { minValue: "0", maxValue: "4" } } }), []);
  // sin tipo = SHT2; sin lectura (null) no avisa
  assert.equal(a.alertasDeNevera({ dataRaw: "[null,9,3.9]" }, { sensorNumber: 1, S0: { id: "x", t: { minValue: "0", maxValue: "4", notify: "true" } } })[0].message, "Temperatura alta");
  assert.deepEqual(a.alertasDeNevera({ dataRaw: "[null,null,3.9]" }, { sensorNumber: 1, S0: { id: "x", t: { minValue: "0", maxValue: "4", notify: true } } }), []);
  assert.deepEqual(a.alertasDeNevera({ dataRaw: "no-json" }, sensores), []);
});

test("REQ-149 limites en cualquier orden", () => {
  assert.deepEqual(a.cruce(3, { minValue: "10", maxValue: "5" }), { direction: "baja", threshold: 5, thresholdKind: "lower" });
  assert.equal(a.cruce(7, { minValue: "10", maxValue: "5" }), null);
  assert.equal(a.cruce(null, { minValue: "1" }), null);
});

test("REQ-149 redes de sensores: humedad relativa con sensor.hr", () => {
  const lectura = { sensorName: "S1", sensorKey: "S0", sensorLabel: "Bloque A", values: { Hr: 32 }, sensor: { hr: { minValue: "40", maxValue: "90", notify: true } } };
  const r = a.alertaDeHumedadRelativa(lectura);
  assert.equal(r.metricKey, "Hr");
  assert.equal(r.message, "Humedad relativa baja");
  assert.equal(r.thresholdKind, "lower");
  assert.equal(a.alertaDeHumedadRelativa({ ...lectura, sensor: { hr: { minValue: "40", maxValue: "90" } } }), null);
  assert.equal(a.alertaDeHumedadRelativa({ ...lectura, values: { Hr: 60 } }), null);
});

test("REQ-149 al cruzar se avisa; si sigue fuera, solo cuando toca el recordatorio", async () => {
  const actuales = a.alertasDeNevera(log, sensores);
  const anteriores = actuales.filter(x => x.metricKey === "t");      // la temperatura ya estaba alta
  const llamadas = [];
  const enviar = await a.alertasANotificar(actuales, anteriores, async (alerta, esCruce) => {
    llamadas.push([alerta.metricKey, esCruce]);
    return esCruce;                                                   // recordatorio aun no toca
  });
  assert.deepEqual(enviar.map(x => x.metricKey), ["h", "psi", "i"]);
  assert.deepEqual(llamadas, [["t", false], ["h", true], ["psi", true], ["i", true]]);
});

function cargarFunciones(db) {
  const original = Module._load;
  Module._load = function (pedido, ...resto) {
    if (pedido === "firebase-admin") return { initializeApp() {}, database: () => db, messaging: () => ({}) };
    if (pedido.startsWith("firebase-functions")) return { onValueCreated: (o, f) => ({ o, f }), onValueWritten: (o, f) => ({ o, f }) };
    return original.call(this, pedido, ...resto);
  };
  try {
    delete require.cache[require.resolve("../../functions/index.js")];
    return require("../../functions/index.js");
  } finally {
    Module._load = original;
  }
}

test("REQ-149 index.js: funciones nuevas y filtros antes de leer la base", async () => {
  const leidas = [];
  const db = { ref: (ruta) => { leidas.push(ruta); return { once: async () => ({ val: () => ({ type: "PC" }) }) }; } };
  const f = cargarFunciones(db);
  assert.equal(f.sendColdRoomNotifications.o.ref, "/systems/{systemId}/logs/{logId}");
  assert.equal(f.sendRelativeHumidityNotifications.o.ref, "/systems/{systemId}/dayLogs/{logId}");
  const evento = (val) => ({ data: { val: () => val }, params: { systemId: "X", logId: "L" }, time: "2026-11-22T12:00:00Z" });
  // registro sin dataRaw (pivote): ni siquiera se leen los ajustes
  assert.equal(await f.sendColdRoomNotifications.f(evento({ position: "10" })), null);
  assert.deepEqual(leidas, []);
  // otro tipo de equipo: solo se leen los ajustes
  assert.equal(await f.sendColdRoomNotifications.f(evento({ dataRaw: "[1,2,3]" })), null);
  assert.deepEqual(leidas, ["/systems/X/settings"]);
});
