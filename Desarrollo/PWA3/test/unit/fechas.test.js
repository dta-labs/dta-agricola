/**
 * REQ-002 - Pruebas de caracterizacion de fechas y horas.
 * Se comprueban componentes locales (getFullYear/getHours...), asi que no dependen de la zona horaria.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseFechaHora2, parseFechaHora, menorIgual } = require("../../assets/js/logic/fechas.js");

test("REQ-002.1 parseFechaHora2 lee 'Apr 25, 2026'", () => {
    assert.deepEqual(parseFechaHora2("Apr 25, 2026"), { year: 2026, month: 4, day: 25 });
    assert.deepEqual(parseFechaHora2("Dec 1, 2026"), { year: 2026, month: 12, day: 1 });
    assert.deepEqual(parseFechaHora2("Jan 31, 2027"), { year: 2027, month: 1, day: 31 });
});

test("REQ-002.2 parseFechaHora2 con mes desconocido lanza RangeError (D-04, corregido en REQ-007)", () => {
    // Antes devolvia month=0, es decir diciembre del ano anterior: corrompia la fecha en silencio.
    assert.throws(() => parseFechaHora2("Foo 1, 2026"), RangeError);
    assert.throws(() => parseFechaHora("Foo 1, 2026", "02:46 AM"), RangeError);
});

test("REQ-002.3 parseFechaHora con fecha ISO y AM/PM", () => {
    const madrugada = parseFechaHora("2026-04-25", "02:46 AM");
    assert.equal(madrugada.getFullYear(), 2026);
    assert.equal(madrugada.getMonth(), 3);
    assert.equal(madrugada.getDate(), 25);
    assert.equal(madrugada.getHours(), 2);
    assert.equal(madrugada.getMinutes(), 46);

    assert.equal(parseFechaHora("2026-04-25", "02:46 PM").getHours(), 14);
    assert.equal(parseFechaHora("2026-04-25", "12:00 AM").getHours(), 0);
    assert.equal(parseFechaHora("2026-04-25", "12:30 PM").getHours(), 12);
});

test("REQ-002.4 parseFechaHora con fecha 'Apr 25, 2026'", () => {
    const d = parseFechaHora("Apr 25, 2026", "11:05 PM");
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 3);
    assert.equal(d.getDate(), 25);
    assert.equal(d.getHours(), 23);
    assert.equal(d.getMinutes(), 5);
});

test("REQ-002.5 parseFechaHora entiende AM/PM sin importar mayusculas (D-02, corregido en REQ-007)", () => {
    assert.equal(parseFechaHora("2026-04-25", "02:46 pm").getHours(), 14, "pm minuscula suma 12");
    assert.equal(parseFechaHora("2026-04-25", "02:46 PM").getHours(), 14);
    assert.equal(parseFechaHora("2026-04-25", "12:00 am").getHours(), 0);
    assert.equal(parseFechaHora("2026-04-25", "12:30 pm").getHours(), 12);
    // formato 24 h sin sufijo: no se toca
    assert.equal(parseFechaHora("2026-04-25", "18:05").getHours(), 18);
    // menorIgual sigue funcionando con su "0:0am"
    assert.equal(menorIgual("2026-04-25", "2026-04-25"), true);
});

test("REQ-002.6 menorIgual compara por dia", () => {
    assert.equal(menorIgual("2026-04-25", "2026-04-26"), true);
    assert.equal(menorIgual("2026-04-26", "2026-04-25"), false);
    assert.equal(menorIgual("2026-04-25", "2026-04-25"), true, "igual es menor o igual");
});
