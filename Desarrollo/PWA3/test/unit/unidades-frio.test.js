"use strict";

/**
 * REQ-123 - Unidades frio: se muestra el acumulado de la temporada (desde el 1 de noviembre), no el valor puntual.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const frio = require("../../assets/js/logic/frio.js");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");

/** Registro con UF = uf en el sensor `sensor` (8 valores por sensor, 10 sensores). */
function reg(date, uf, sensor = 0) {
  const d = Array(80).fill("NaN");
  d[sensor * 8 + 6] = String(uf);
  return { date, dataRaw: JSON.stringify(d) };
}

test("REQ-123 la temporada empieza el 1 de noviembre", () => {
  assert.equal(frio.inicioTemporada("20261121"), "20261101");
  assert.equal(frio.inicioTemporada("20270215"), "20261101");
  assert.equal(frio.inicioTemporada("20261031"), "20251101");
});

test("REQ-123 hora de los registros (hhmm am/pm)", () => {
  assert.equal(frio.horaDe({ date: "20261120 0230pm" }), 14.5);
  assert.equal(frio.horaDe({ date: "20261120 1200am" }), 0);
  assert.equal(frio.horaDe({ date: "20261120 1215pm" }), 12.25);
});

test("REQ-123 acumulado = resumenes diarios de la temporada + lo que va de hoy", () => {
  const logs = {
    a: reg("20261031 0000am", 50),          // temporada anterior: no cuenta
    b: reg("20261101 0000am", 10),
    c: reg("20261102 0000am", 12.5),
    d: reg("20261103 0000am", "NaN")         // sin dato: no suma
  };
  const dayLogs = { x: reg("20261121 0300am", 1), y: reg("20261121 0600am", 0.5) };   // promedio 0.75 x 6 h
  assert.equal(frio.acumulado(logs, dayLogs, 0, "20261121"), 10 + 12.5 + 4.5);
});

test("REQ-123 un dia aun no resumido (solo en dayLogs) cuenta 24 h con su promedio", () => {
  const dayLogs = [reg("20261120 1000pm", 1), reg("20261120 1100pm", 0)];
  assert.equal(frio.acumulado([], dayLogs, 0, "20261121"), 12);
});

test("REQ-123 cada sensor su columna; sin datos -> null", () => {
  const logs = [reg("20261101 0000am", 8, 2)];
  assert.equal(frio.acumulado(logs, [], 2, "20261121"), 8);
  assert.equal(frio.acumulado(logs, [], 0, "20261121"), null);
});

test("REQ-123 el popup Cultivo muestra el acumulado, no el valor puntual", () => {
  assert.doesNotMatch(CORE, /data\[idx \* 8 \+ 6\]/, "ya no debe pintarse el valor puntual de UF");
  assert.match(CORE, /id="ufAcumulado\$\{idx\}"/);
  assert.match(CORE, /Unidades frío acumuladas/);
  assert.match(CORE, /const frio = __modulo\("frio"\);/);
  assert.match(CORE, /frio\.acumulado\(valores\(logs\), valores\(dia\), idx, hoy(, temporada)?\)/);
  assert.ok(HTML.indexOf("./assets/js/logic/frio.js?v=") > 0, "falta <script> de logic/frio.js");
});
