/**
 * REQ-003 - Pruebas de caracterizacion de la secuencia de parcelas.
 * Las expectativas se comprueban por componentes locales y por instante absoluto,
 * asi que no dependen de la zona horaria de la maquina.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { generarSecuenciaParcelas } = require("../../assets/js/logic/secuencias.js");

const inicio = "2026-04-25";
const hora = "02:46 AM";

test("REQ-003.1 encadena el inicio de cada parcela sumando sus minutos", () => {
    const r = generarSecuenciaParcelas(inicio, hora, [30, 45]);
    assert.equal(r.length, 3, "dos tiempos positivos + el cierre");
    assert.equal(r[0], "2026-04-25 02:46");
    assert.equal(r[1], "2026-04-25 03:16", "2:46 + 30 min");
});

test("REQ-003.2 el ultimo elemento es el fin, en HORA LOCAL (D-03, corregido en REQ-007)", () => {
    const r = generarSecuenciaParcelas(inicio, hora, [30, 45]);
    // 2:46 + 30 + 45 = 4:01 local, y ahora se escribe en local (antes iba en UTC).
    assert.equal(r[2], "2026-04-25 04:01");
});

test("REQ-003.3 ignora tiempos cero o negativos", () => {
    const r = generarSecuenciaParcelas(inicio, hora, [0, -5, 30]);
    assert.equal(r.length, 2, "solo un tiempo positivo + el cierre");
    assert.equal(r[0], "2026-04-25 02:46");
});

test("REQ-003.4 con lista vacia devuelve solo el cierre", () => {
    const r = generarSecuenciaParcelas(inicio, hora, []);
    assert.equal(r.length, 1);
    assert.equal(r[0], "2026-04-25 02:46", "el cierre coincide con el inicio, en local");
});

test("REQ-003.5 formato de las salidas", () => {
    const r = generarSecuenciaParcelas(inicio, hora, [30]);
    for (const valor of r) {
        assert.match(valor, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, "YYYY-MM-DD HH:mm");
    }
});
