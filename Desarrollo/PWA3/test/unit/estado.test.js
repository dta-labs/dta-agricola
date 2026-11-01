/**
 * REQ-004 - Caracterizacion del estado/tiempos del equipo.
 * Fija el comportamiento ACTUAL (incluidos los defectos D-07, D-08, D-10, D-11).
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { instanteDeFechaDispositivo, getTimeDiference, calcStatusTime } =
    require("../../assets/js/logic/estado.js");

test("REQ-004.1 interpreta la marca del dispositivo 'YYYYMMDD HHMMam|pm'", () => {
    const d = new Date(instanteDeFechaDispositivo("20260425 0246am"));
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 3);
    assert.equal(d.getDate(), 25);
    assert.equal(d.getHours(), 2);
    assert.equal(d.getMinutes(), 46);
    assert.equal(new Date(instanteDeFechaDispositivo("20260425 1145pm")).getHours(), 23);
    assert.equal(new Date(instanteDeFechaDispositivo("20260425 1245am")).getHours(), 0);
});

test("REQ-004.2 '12pm' se interpreta como hora 24 (DEFECTO D-08 conservado)", () => {
    const d = new Date(instanteDeFechaDispositivo("20260425 1200pm"));
    // La hora 24 de JS es el dia siguiente a las 00:00
    assert.equal(d.getDate(), 26);
    assert.equal(d.getHours(), 0);
});

test("REQ-004.3 diferencia entre dos marcas validas", () => {
    const dif = getTimeDiference("20260425 0246am", "20260425 0346am");
    assert.deepEqual(dif, { day: 0, hour: 1, min: 60 });

    const largo = getTimeDiference("20260424 0246am", "20260425 0846am");
    assert.equal(largo.day, 1);
    assert.equal(largo.hour, 30);
    assert.equal(largo.min, 1800);
});

test("REQ-004.4 sin marca de actualizacion devuelve el NUMERO 0 (DEFECTO D-07 conservado)", () => {
    assert.equal(getTimeDiference("20260425 0246am", null), 0);
    assert.equal(getTimeDiference("20260425 0246am"), 0);
    assert.equal(getTimeDiference(null, "20260425 0246am"), 0);
});

test("REQ-004.5 D-08 contamina la diferencia cuando hay '12pm'", () => {
    // 12:00pm (leido como 24:00 del dia 25 = 00:00 del 26) contra 01:00pm del 25
    const dif = getTimeDiference("20260425 1200pm", "20260425 0100pm");
    assert.equal(dif.hour, -11, "la hora negativa delata el defecto");
});

test("REQ-004.6 calcStatusTime ignora su parametro y siempre devuelve '-1' (DEFECTOS D-07/D-10)", () => {
    assert.equal(calcStatusTime("20260425 0246am", "20260426 0246am"), "-1");
    assert.equal(calcStatusTime("20260425 0246am", null), "-1");
    assert.equal(calcStatusTime(null, null), "-1");
});
