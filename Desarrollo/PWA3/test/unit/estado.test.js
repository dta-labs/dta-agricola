/**
 * REQ-004 (caracterizacion) + REQ-005 (correccion).
 *
 * Las pruebas marcadas REQ-005 describen el comportamiento DESEADO: antes de la correccion fallan
 * (rojo) y despues pasan (verde). Las de REQ-004 sin marca siguen fijando lo que no cambia.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { instanteDeFechaDispositivo, getTimeDiference, calcStatusTime } =
    require("../../assets/js/logic/estado.js");

// ---------------------------- REQ-004: lo que NO cambia ----------------------------
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

test("REQ-004.3 diferencia entre dos marcas validas", () => {
    assert.deepEqual(getTimeDiference("20260425 0246am", "20260425 0346am"), { day: 0, hour: 1, min: 60 });
    const largo = getTimeDiference("20260424 0246am", "20260425 0846am");
    assert.equal(largo.day, 1);
    assert.equal(largo.hour, 30);
    assert.equal(largo.min, 1800);
});

// ---------------------------- REQ-005: correccion de D-07 ----------------------------
test("REQ-005.1 sin marca del equipo devuelve null, no un numero", () => {
    assert.equal(getTimeDiference(null, "20260425 0246am"), null);
    assert.equal(getTimeDiference("", "20260425 0246am"), null);
    assert.equal(getTimeDiference(undefined, "20260425 0246am"), null);
});

test("REQ-005.2 sin marca de actualizacion compara contra AHORA (reloj inyectado)", () => {
    const ahora = () => new Date(2026, 3, 25, 4, 46).getTime();   // 02:46 + 2 h
    const dif = getTimeDiference("20260425 0246am", null, ahora);
    assert.deepEqual(dif, { day: 0, hour: 2, min: 120 });
});

test("REQ-005.3 siempre devuelve {day,hour,min}, nunca un numero", () => {
    const dif = getTimeDiference("20260425 0246am", "20260425 0246am");
    assert.equal(typeof dif, "object");
    assert.deepEqual(Object.keys(dif).sort(), ["day", "hour", "min"]);
});

// ---------------------------- REQ-005: correccion de D-08 ----------------------------
test("REQ-005.4 '12pm' es 12:00 y '12am' es 00:00", () => {
    const mediodia = new Date(instanteDeFechaDispositivo("20260425 1200pm"));
    assert.equal(mediodia.getDate(), 25, "12pm debe seguir siendo el mismo dia");
    assert.equal(mediodia.getHours(), 12);

    const medianoche = new Date(instanteDeFechaDispositivo("20260425 1200am"));
    assert.equal(medianoche.getDate(), 25);
    assert.equal(medianoche.getHours(), 0);
});

test("REQ-005.5 las 12:30 pm no se corren de dia", () => {
    const d = new Date(instanteDeFechaDispositivo("20260425 1230pm"));
    assert.equal(d.getDate(), 25);
    assert.equal(d.getHours(), 12);
    assert.equal(d.getMinutes(), 30);
    assert.deepEqual(getTimeDiference("20260425 1230pm", "20260425 0130pm"), { day: 0, hour: 1, min: 60 });
});

// ---------------------------- REQ-005: correccion de D-10 ----------------------------
test("REQ-005.6 calcStatusTime USA su parametro update", () => {
    assert.equal(calcStatusTime("20260425 0246am", "20260425 0346am"), "+1h");
    assert.equal(calcStatusTime("20260425 0246am", "20260426 0246am"), "+1d");
    assert.equal(calcStatusTime("20260425 0246am", "20260425 0300am"), "14m");
});

test("REQ-005.7 retrasos por debajo del umbral siguen siendo '-1'", () => {
    assert.equal(calcStatusTime("20260425 0246am", "20260425 0250am"), "-1", "4 min no es relevante");
});

test("REQ-005.8 sin fecha no hay etiqueta", () => {
    assert.equal(calcStatusTime(null, "20260425 0246am"), "-1");
    assert.equal(calcStatusTime(undefined, null), "-1");
});
