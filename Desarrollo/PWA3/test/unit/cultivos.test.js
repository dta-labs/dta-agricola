"use strict";

/**
 * REQ-040 - Reglas de las fichas tecnicas (logic/cultivos.js).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const cultivos = require("../../assets/js/logic/cultivos.js");

function nogal() {
  return {
    culture: "Nogal", detail: "Pecanero", price: "0.00",
    plan: [
      { day: "30~40", action: "Segundo riego", detail: "b" },
      { day: "10~15", action: "Primer riego", detail: "a" },
      { day: "", action: "Sin dia", detail: "c" },
      { day: "5", type: "n", action: "Oculta", detail: "x" },
      null
    ]
  };
}

test("REQ-040 F-1 prepararFicha no modifica el cultivo y dos llamadas dan lo mismo", () => {
  const cultivo = nogal();
  const copia = JSON.parse(JSON.stringify(cultivo));
  const primera = cultivos.prepararFicha(cultivo);
  const segunda = cultivos.prepararFicha(cultivo);
  assert.deepEqual(cultivo, copia);
  assert.deepEqual(primera, segunda);
});

test("REQ-040 prepararFicha: dia de inicio, margen, orden y etapas tipo n fuera", () => {
  const ficha = cultivos.prepararFicha(nogal());
  assert.equal(ficha.cultivo, "Nogal");
  assert.equal(ficha.detalle, "Pecanero");
  assert.deepEqual(ficha.etapas.map(e => e.accion), ["Primer riego", "Segundo riego", "Sin dia"]);
  assert.deepEqual(ficha.etapas[0], { dia: 10, mostrarDia: true, rango: "10~15", accion: "Primer riego", detalle: "a" });
  assert.equal(ficha.etapas[2].dia, null);
  assert.equal(ficha.etapas[2].mostrarDia, false);
  assert.equal(ficha.etapas[2].rango, null);
});

test("REQ-040 prepararFicha: dias numericos, negativos, fuera de rango y sin plan", () => {
  const ficha = cultivos.prepararFicha({ culture: "X", plan: [{ day: 7, action: "a" }, { day: "-20~-10", action: "b" }, { day: 99999, action: "c" }] });
  assert.deepEqual(ficha.etapas.map(e => e.dia), [-20, 7, 99999]);
  assert.equal(ficha.etapas[2].mostrarDia, false);
  assert.equal(ficha.etapas[1].rango, "7");
  assert.deepEqual(cultivos.prepararFicha({ culture: "Y" }).etapas, []);
  assert.deepEqual(cultivos.prepararFicha(null), { cultivo: "", detalle: "", etapas: [] });
});

test("REQ-040 diaDeInicio", () => {
  assert.equal(cultivos.diaDeInicio("10~15"), 10);
  assert.equal(cultivos.diaDeInicio(" 3 "), 3);
  assert.equal(cultivos.diaDeInicio(4), 4);
  assert.equal(cultivos.diaDeInicio("abc"), null);
  assert.equal(cultivos.diaDeInicio(""), null);
  assert.equal(cultivos.diaDeInicio(NaN), null);
  assert.equal(cultivos.diaDeInicio(undefined), null);
});

test("REQ-040 esGratuito", () => {
  for (const precio of ["0.00", "0", 0, "0,00"]) assert.equal(cultivos.esGratuito({ price: precio }), true, String(precio));
  for (const precio of ["15.00", 1, "", null, undefined, "gratis"]) assert.equal(cultivos.esGratuito({ price: precio }), false, String(precio));
  assert.equal(cultivos.esGratuito(null), false);
});

test("REQ-040 F-2 cultivosVisibles: objeto o arreglo, sin nulos, sin tipo n, sin nombre fuera", () => {
  const datos = { a: { culture: "Maiz" }, b: null, c: { culture: "Oculto", type: "n" }, d: { detail: "sin nombre" }, e: { culture: "Nogal" } };
  assert.deepEqual(cultivos.cultivosVisibles(datos).map(c => c.culture), ["Maiz", "Nogal"]);
  assert.deepEqual(cultivos.cultivosVisibles([{ culture: "Trigo" }, 5]).map(c => c.culture), ["Trigo"]);
  assert.deepEqual(cultivos.cultivosVisibles(null), []);
  assert.deepEqual(cultivos.cultivosVisibles("x"), []);
});
