/**
 * REQ-006 - Programacion de parcelas (logica de riego), sin $scope.
 *
 * Caracterizacion del comportamiento actual de createStationaryProgram/runLoop/excecuteProgram.
 * Las expectativas se calculan con instantes absolutos o con cadenas locales, de modo que no
 * dependen de la zona horaria de la maquina.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { programar } = require("../../assets/js/logic/riego.js");

const T7 = [10, 20, 30, 40, 50, 60, 70];          // 7 parcelas con tiempo > 0
const base = {
    nombre: "Plan QA",
    periodo: "0",
    cada: 1,
    fecha_inicio: "2026-04-25",
    hora_inicio: "02:46 AM",
    fecha_fin: "2026-04-25",
    t: T7,
};
const generarId = () => "id-fijo";

test("REQ-006.1 periodo 'veces' genera una entrada por parcela", () => {
    const r = programar({ ...base, cada: 1 }, { generarId });
    assert.equal(r.id, "id-fijo");
    assert.equal(r.entradas.length, 7, "7 parcelas");
    assert.deepEqual(r.entradas.map((e) => e.parcela), [0, 1, 2, 3, 4, 5, 6]);
    assert.equal(r.entradas[0].date, "2026-04-25");
    assert.equal(r.entradas[0].time, "02:46");
});

test("REQ-006.2 value es el tiempo de la parcela en milisegundos", () => {
    const r = programar({ ...base, cada: 1 }, { generarId });
    assert.deepEqual(r.entradas.map((e) => e.value), T7.map((m) => m * 60 * 1000));
    assert.equal(r.entradas[0].t, "", "campo t vacio, como en el original");
    assert.equal(r.entradas[0].nombre, "Plan QA");
    assert.equal(r.entradas[0].id, "id-fijo");
});

test("REQ-006.3 las parcelas se encadenan sumando sus minutos", () => {
    const r = programar({ ...base, cada: 1 }, { generarId });
    // 02:46 -> 02:56 -> 03:16 -> 03:46 -> 04:26 -> 05:16 -> 06:16
    assert.deepEqual(r.entradas.map((e) => e.time),
        ["02:46", "02:56", "03:16", "03:46", "04:26", "05:16", "06:16"]);
});

test("REQ-006.4 periodo 'veces' con cada=2 repite el bloque encadenando en LOCAL (D-03, corregido en REQ-007)", () => {
    const r = programar({ ...base, cada: 2 }, { generarId });
    assert.equal(r.entradas.length, 14, "dos bloques de 7");
    // El segundo bloque arranca cuando termina el primero, en hora local: 07:26.
    assert.equal(r.entradas[7].time, "07:26");
    assert.equal(r.entradas[7].date, "2026-04-25");
});

test("REQ-006.5 periodo 'dias' itera hasta fecha_fin", () => {
    const r = programar({
        ...base, periodo: "1", cada: 1, fecha_inicio: "2026-04-25", fecha_fin: "2026-04-27",
    }, { generarId });
    assert.equal(r.entradas.length, 21, "3 dias x 7 parcelas");
    assert.deepEqual([...new Set(r.entradas.map((e) => e.date))],
        ["2026-04-25", "2026-04-26", "2026-04-27"]);
});

test("REQ-006.6 periodo 'semanas' avanza de 7 en 7 dias", () => {
    const r = programar({
        ...base, periodo: "2", cada: 1, fecha_inicio: "2026-04-25", fecha_fin: "2026-05-09",
    }, { generarId });
    assert.deepEqual([...new Set(r.entradas.map((e) => e.date))],
        ["2026-04-25", "2026-05-02", "2026-05-09"]);
});

test("REQ-006.7 periodo desconocido no genera entradas", () => {
    const r = programar({ ...base, periodo: "9" }, { generarId });
    assert.deepEqual(r.entradas, []);
    assert.equal(r.id, "id-fijo");
});

test("REQ-006.8 tiempos incompletos: programa lo calculable y avisa, sin lanzar (D-13, corregido en REQ-007)", () => {
    const r = programar({ ...base, t: [10, 20] }, { generarId });
    assert.equal(r.entradas.length, 2, "solo las parcelas con tiempo");
    assert.deepEqual(r.entradas.map((e) => e.parcela), [0, 1]);
    assert.ok(r.aviso && r.aviso.indexOf("tiempo") >= 0, "se devuelve un aviso explicativo");
    assert.equal(r.entradas[0].value, 10 * 60 * 1000);
});

test("REQ-007.6 sin lista de tiempos no lanza: programa 0 parcelas y avisa (D-06)", () => {
    const sinT = { ...base };
    delete sinT.t;
    const r = programar(sinT, { generarId });
    assert.deepEqual(r.entradas, []);
    assert.ok(r.aviso && r.aviso.indexOf("faltan tiempos") >= 0);
});
