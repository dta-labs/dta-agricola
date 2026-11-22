"use strict";

/**
 * REQ-151 - Nombres de cultivo mal escritos en la base ("Jalape��o", "Manazana"): la app los corrige en la base
 * la primera vez que los lee (catalogo /cultivos y cultivos de cada equipo) y el resumen los muestra corregidos.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const c = require("../../assets/js/logic/cultivos.js");
const repositorio = require("../../assets/js/services/repositorio.js");

const RAIZ = path.join(__dirname, "..", "..");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");

test("REQ-151 correccion de nombres", () => {
  assert.equal(c.corregirNombre("Jalape��o"), "Jalapeño");
  assert.equal(c.corregirNombre("Chile jalape�o"), "Chile Jalapeño");
  assert.equal(c.corregirNombre("Jalape\u00C3\u00B1o"), "Jalapeño");
  assert.equal(c.corregirNombre("Manazana"), "Manzana");
  assert.equal(c.corregirNombre("Manazanas"), "Manzanas");
  assert.equal(c.corregirNombre("Jalapeño"), "Jalapeño");
  assert.equal(c.corregirNombre("Manzana"), "Manzana");
  assert.equal(c.corregirNombre(undefined), undefined);
});

test("REQ-151 cambios por ruta en el catalogo y en los ajustes de un equipo", () => {
  const catalogo = {
    a: { culture: "Chile", detail: "Jalape��o", price: "15.00" },
    b: { culture: "Manazana", detail: "Golden" },
    c: { culture: "Nogal", detail: "Pecanero" }
  };
  const cambios = c.correccionesDeNombres(catalogo);
  assert.deepEqual(cambios, { "a/detail": "Jalapeño", "b/culture": "Manzana" });
  c.aplicarCorrecciones(catalogo, cambios);
  assert.equal(catalogo.b.culture, "Manzana");
  assert.deepEqual(c.correccionesDeNombres(catalogo), {});                 // una vez corregido, nada mas
  const sensores = { sensorNumber: 2, S0: { culture: "Manazana", detail: "no-se-toca Manazana" }, S1: { cultures: [{ culture: "Jalape��o" }] } };
  assert.deepEqual(c.correccionesDeNombres(sensores, ["culture"]), { "S0/culture": "Manzana", "S1/cultures/0/culture": "Jalapeño" });
});

test("REQ-151 core.js corrige al leer y el repositorio escribe en /cultivos", async () => {
  assert.match(CORE, /corregirNombresDelCatalogo\(\$scope\.listOfCultures\);/);
  assert.match(CORE, /corregirNombresDeCultivos\(sistema, locationKey\);/);
  assert.match(CORE, /__repo\(\)\.actualizarAjustesSistema\(clave, cambios\)/);
  const escrito = [];
  const nada = () => () => {};
  const adaptador = { escuchar: nada, escucharUltimos: nada, leer: async () => null, leerUltimos: async () => null, leerRango: async () => null,
    escucharPorClave: nada, escribir: async () => {}, actualizar: async (ruta, v) => escrito.push([ruta, v]), empujar: async () => {}, borrar: async () => {} };
  await repositorio.crear(adaptador).actualizarCultivos({ "b/culture": "Manzana" });
  assert.deepEqual(escrito, [["cultivos", { "b/culture": "Manzana" }]]);
});

test("REQ-151 el resumen muestra el nombre corregido", () => {
  const tablero = fs.readFileSync(path.join(RAIZ, "assets", "js", "logic", "tablero.js"), "utf8");
  assert.match(tablero, /\.replace\(\/jalape\(\\uFFFD\+\|\\u00C3\\u00B1\|\\\?\+\)o\/gi, "Jalapeño"\)\.replace\(\/\\bmanazana\(s\?\)\\b\/gi, "Manzana\$1"\)/);
});
