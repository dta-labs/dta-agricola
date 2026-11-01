/**
 * REQ-004.4 - Identificadores unicos.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { generarIdUnico } = require("../../assets/js/logic/ids.js");

test("REQ-004.7 generarIdUnico devuelve una cadena base36 no vacia", () => {
    const id = generarIdUnico();
    assert.equal(typeof id, "string");
    assert.ok(id.length >= 5, "longitud minima");
    assert.match(id, /^[0-9a-z]+$/, "solo base36");
});

test("REQ-004.8 mil identificadores seguidos no se repiten", () => {
    const vistos = new Set();
    for (let i = 0; i < 1000; i += 1) vistos.add(generarIdUnico());
    assert.equal(vistos.size, 1000);
});
