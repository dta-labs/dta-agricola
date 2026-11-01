/**
 * REQ-001 - Pruebas de caracterizacion de las formulas puras.
 *
 * Caracterizacion = fijar el comportamiento ACTUAL de core.js antes de moverlo.
 * Si un valor cambia, la prueba falla: es la red de seguridad del refactor.
 *
 *   node --test test/unit
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mapping, constraining, cbToPercent } = require("../../assets/js/logic/formulas.js");

test("REQ-001.1 mapping escala linealmente entre rangos", () => {
    assert.equal(mapping(0, 0, 10, 100, 80), 100);
    assert.equal(mapping(10, 0, 10, 100, 80), 80);
    assert.equal(mapping(5, 0, 10, 100, 80), 90);
    assert.equal(mapping(20, 10, 30, 80, 60), 70);
    assert.equal(mapping(0.5, 0, 1, 0, 255), 127.5);
});

test("REQ-001.2 mapping con rango de entrada vacio devuelve infinito (DEFECTO conservado)", () => {
    // Comportamiento real de core.js: dividir por cero da +-Infinity (y NaN en el punto medio).
    // Se documenta tal cual; se corrige en una reclamacion aparte porque cambia el contrato.
    assert.equal(mapping(5, 10, 10, 0, 100), -Infinity);
    assert.equal(mapping(20, 10, 10, 0, 100), Infinity);
    assert.ok(Number.isNaN(mapping(10, 10, 10, 0, 100)), "0/0 en el punto medio");
});

test("REQ-001.3 constraining limita al rango", () => {
    assert.equal(constraining(150, 0, 100), 100);
    assert.equal(constraining(-3, 0, 100), 0);
    assert.equal(constraining(42, 0, 100), 42);
});

test("REQ-001.4 cbToPercent: limites de cada tramo", () => {
    const casos = [
        [0, 100], [10, 80], [20, 70], [30, 60], [45, 50], [60, 40],
        [80, 35], [100, 30], [125, 25], [150, 20], [195, 10], [239, 0],
    ];
    for (const [cb, esperado] of casos) {
        assert.equal(cbToPercent(cb), esperado, `cb=${cb}`);
    }
});

test("REQ-001.5 cbToPercent: sin medida valida devuelve null", () => {
    assert.equal(cbToPercent(null), null);
    assert.equal(cbToPercent(NaN), null);
    assert.equal(cbToPercent(240), null);
    assert.equal(cbToPercent(300), null);
});

test("REQ-001.6 cbToPercent: acota fuera de rango y acepta cadenas numericas", () => {
    assert.equal(cbToPercent(-5), 100, "negativo se acota a 100 %");
    assert.equal(cbToPercent("50"), 47, "cadena numerica se convierte por coercion");
});
