"use strict";

/**
 * REQ-150 - Unidades frio: las horas calidas restan (Utah completo), temporada propia por sensor con la del cultivo
 * por defecto, y recalculo de los resumenes anteriores al WS v7 (inflados) con Tmin/Tmax.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const f = require("../../assets/js/logic/frio.js");

const RAIZ = path.join(__dirname, "..", "..");
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), "utf8").replace(/\r\n/g, "\n");

/** Resumen diario del sensor 0: [ms, hr, tmin, tmax, t, etc, uf, vcc]. */
const resumen = (dia, tmin, tmax, uf) => ({ date: dia + " 0000am", dataRaw: JSON.stringify([30, 60, tmin, tmax, (tmin + tmax) / 2, 3, uf, 3.9]) });

test("REQ-150 Utah completo: las horas calidas restan (igual que el WS v7)", () => {
  assert.deepEqual([0, 2, 5, 10, 14, 17, 25].map(f.utah), [0, 0.5, 1, 0.5, 0, -0.5, -1]);
  assert.equal(f.ufEstimadaDelDia(5, 25), -1);            // dia calido: resta
  assert.equal(f.ufEstimadaDelDia(-2, 14), 9);
  assert.equal(f.ufEstimadaDelDia(14, -2), 9);            // en cualquier orden
  assert.equal(f.ufEstimadaDelDia(null, 14), null);
});

test("REQ-150 resumenes anteriores al WS v7 se recalculan con Tmin/Tmax", () => {
  assert.equal(f.CORTE_V7, "20261121");
  assert.equal(f.ufDelResumen(resumen("20261110", -2, 14, 41), 0), 9);       // v6: 41 (inflado) -> 9
  assert.equal(f.ufDelResumen(resumen("20261121", -2, 14, 8.5), 0), 8.5);    // v7: se respeta
  assert.equal(f.ufDelResumen(resumen("20261125", -2, 14, 60), 0), 9);       // imposible (> 24): se recalcula
  // sin temperaturas: el valor guardado solo si es posible
  const sinT = (dia, uf) => ({ date: dia + " 0000am", dataRaw: JSON.stringify([0, 0, "NaN", "NaN", 0, 0, uf, 0]) });
  assert.equal(f.ufDelResumen(sinT("20261110", 12), 0), 12);
  assert.equal(f.ufDelResumen(sinT("20261110", 40), 0), null);
  // el acumulado desde el 1/11 ya usa los valores corregidos (y los dias calidos restan)
  const logs = [resumen("20261101", -2, 14, 41), resumen("20261102", 5, 25, 30), resumen("20261121", 0, 10, 14.5)];
  assert.equal(f.acumulado(logs, [], 0, "20261122", f.temporadaDeCultivo("Nogal", 28)), 9 - 1 + 14.5);
  const porDia = f.acumuladoPorRegistro(logs, 0, f.temporadaDeCultivo("Nogal", 28));
  assert.deepEqual(porDia, { "20261101 0000am": 9, "20261102 0000am": 8, "20261121 0000am": 22.5 });
});

test("REQ-150 temporada propia por sensor; sin ella, la del cultivo", () => {
  assert.deepEqual(f.temporadaPropia({ start: "11-15", end: "02-20" }), { inicio: [11, 15], fin: [2, 20] });
  assert.equal(f.temporadaPropia({ start: "13-01", end: "02-20" }), null);
  assert.equal(f.temporadaPropia({ start: "02-30", end: "03-20" }), null);
  assert.equal(f.temporadaPropia({ start: "11-01", end: "11-01" }), null);
  const nogal = f.temporadaDeSensor({ culture: "Nogal", chillSeason: { start: "11-15", end: "02-20" } }, 28);
  assert.deepEqual([nogal.cultivo, nogal.texto, nogal.propia], ["Nogal pecanero", "15 nov – 20 feb", true]);
  assert.equal(f.temporadaDeSensor({ culture: "Nogal" }, 28).texto, "1 nov – 28 feb");
  assert.equal(f.temporadaDeSensor({ culture: "Tomate" }, 28), null);
  assert.equal(f.temporadaDeSensor({ culture: "Pitaya", chillSeason: { start: "12-01", end: "01-31" } }, 28).cultivo, "Pitaya");
  // con temporada propia el acumulado empieza en su inicio
  const propia = f.temporadaDeSensor({ culture: "Nogal", chillSeason: { start: "11-15", end: "02-20" } }, 28);
  assert.deepEqual(f.rangoDeTemporada("20261122", propia), { inicio: "20261115", fin: "20270220" });
  assert.equal(f.rangoDeTemporada("20261110", propia), null);
  assert.equal(f.aMesDia([3, 5]), "03-05");
});

test("REQ-150 ventana Editar sensor y tabla del historial", () => {
  const html = leer("index.html");
  const core = leer("assets", "js", "core.js");
  assert.match(html, /id="editSensorFrioPropia"\n\s*ng-model="edicionTemporadaFrio\(actualSensor\)\.propia" ng-change="aplicarTemporadaFrio\(actualSensor\)"/);
  assert.match(html, /ng-model="edicionTemporadaFrio\(actualSensor\)\.inicioMes"/);
  assert.match(html, /ng-model="edicionTemporadaFrio\(actualSensor\)\.finDia"/);
  assert.match(html, /title="Del día: \{\{ ufDelDiaDe\(reg, idx\) \}\}"/);
  assert.match(core, /const temporadaDeFrio = sensor => __modulo\("frio"\)\.temporadaDeSensor\(sensor, /);
  assert.match(core, /sensor\.chillSeason = \{ start: frio\.aMesDia\(/);
});
