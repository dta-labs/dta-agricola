/**
 * REQ-013 - Reglas puras del dominio de equipos (sin DOM, sin red).
 * Caracterizan las decisiones que hoy estan embebidas en core.js.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const equipos = require("../../assets/js/logic/equipos.js");

test("REQ-013.1 carpetaDeLogs: Sensor usa dayLogs, el resto logs", () => {
    assert.equal(equipos.carpetaDeLogs("Sensor"), "dayLogs");
    assert.equal(equipos.carpetaDeLogs("Nevera"), "logs");
    assert.equal(equipos.carpetaDeLogs("PC"), "logs");
    assert.equal(equipos.carpetaDeLogs(undefined), "logs");
});

test("REQ-013.2 registrosIniciales: 7 para Sensor, 300 para Nevera, el limite para el resto", () => {
    assert.equal(equipos.registrosIniciales("Sensor", 30), 7);
    assert.equal(equipos.registrosIniciales("Nevera", 30), 300);
    assert.equal(equipos.registrosIniciales("PC", 30), 30);
    assert.equal(equipos.registrosIniciales(undefined, 42), 42);
});

test("REQ-013.3 normalizarSistema anade la clave y tolera datos ausentes", () => {
    assert.deepEqual(equipos.normalizarSistema({ name: "Bomba 1" }, "k1"), { name: "Bomba 1", key: "k1" });
    assert.equal(equipos.normalizarSistema(null, "k1"), null);
    assert.equal(equipos.normalizarSistema(undefined, "k1"), null);
});

test("REQ-013.4 etiquetaDeRetraso con umbral de 10 minutos", () => {
    const ahora = () => new Date(2026, 3, 25, 4, 46).getTime();   // 02:46 + 2 h
    const log = { update: "20260425 0246am", safety: "true", voltage: "true" };
    assert.equal(equipos.etiquetaDeRetraso(log, ahora), "+2h");

    const unDia = () => new Date(2026, 3, 26, 2, 46).getTime();
    assert.equal(equipos.etiquetaDeRetraso(log, unDia), "+1d");

    const cuatroMin = () => new Date(2026, 3, 25, 2, 50).getTime();
    assert.equal(equipos.etiquetaDeRetraso(log, cuatroMin), "-1", "por debajo del umbral");
});

test("REQ-013.5 etiquetaDeRetraso exige safety y voltage en 'true'", () => {
    const ahora = () => new Date(2026, 3, 25, 4, 46).getTime();
    assert.equal(equipos.etiquetaDeRetraso({ update: "20260425 0246am", safety: "false", voltage: "true" }, ahora), "-1");
    assert.equal(equipos.etiquetaDeRetraso({ update: "20260425 0246am", safety: "true", voltage: "false" }, ahora), "-1");
    assert.equal(equipos.etiquetaDeRetraso(null, ahora), "-1");
    assert.equal(equipos.etiquetaDeRetraso({ safety: "true", voltage: "true" }, ahora), "-1", "sin marca de update");
});

test("REQ-013.6 alarmasDeSensores detecta temperatura bajo el minimo", () => {
    const sistema = {
        type: "Sensor", name: "Estacion QA",
        sensors: { sensorNumber: 1, S0: { alias: "Suelo", t: { notify: true, minValue: 5 } } },
    };
    const datos = [0, 0, 4, 0, 0, 0, 0, 0];
    const alarmas = equipos.alarmasDeSensores(sistema, datos);
    assert.equal(alarmas.length, 1);
    assert.equal(alarmas[0].sensor, "S0");
    assert.equal(alarmas[0].alias, "Suelo");
    assert.equal(alarmas[0].tempC, 4);
    assert.equal(alarmas[0].tempF, 39.2);
});

test("REQ-013.7 alarmasDeSensores respeta notify, el umbral y los NaN", () => {
    const base = { type: "Sensor", name: "X", sensors: { sensorNumber: 1, S0: { alias: "S", t: { notify: true, minValue: 5 } } } };
    assert.deepEqual(equipos.alarmasDeSensores({ ...base, sensors: { sensorNumber: 1, S0: { t: { notify: false, minValue: 5 } } } }, [0, 0, 4]), []);
    assert.deepEqual(equipos.alarmasDeSensores(base, [0, 0, 6]), [], "6 C no baja del minimo");
    assert.deepEqual(equipos.alarmasDeSensores(base, [0, 0, "x"]), [], "NaN se descarta");
    assert.deepEqual(equipos.alarmasDeSensores({ type: "Nevera", sensors: { sensorNumber: 1 } }, [0, 0, 4]), []);
    assert.deepEqual(equipos.alarmasDeSensores(null, [0, 0, 4]), []);
});

test("REQ-013.8 mensajeDeAlarma conserva el formato de la app", () => {
    const mensaje = equipos.mensajeDeAlarma({ alias: "Suelo", tempC: 4, tempF: 39.2 }, "Estacion QA");
    assert.match(mensaje, /^Alerta 4°C\/39\.2°F en Estacion QA - Suelo/);
});

test("REQ-013.19 carpetaDeHistorico depende de la opcion temporal y del tipo", () => {
    assert.equal(equipos.carpetaDeHistorico("Sensor", "DIA"), "dayLogs");
    assert.equal(equipos.carpetaDeHistorico("Sensor", "SEMANA"), "logs");
    assert.equal(equipos.carpetaDeHistorico("Nevera", "DIA"), "logs");
    assert.equal(equipos.carpetaDeHistorico(undefined, "DIA"), "dayLogs");
    assert.equal(equipos.carpetaDeHistorico("Sensor", undefined), "logs");
});
