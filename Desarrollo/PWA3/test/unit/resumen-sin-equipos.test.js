"use strict";

/**
 * REQ-168 - Sin equipos: siempre la bienvenida (no el resumen en cero). Mientras llegan los equipos: "Cargando".
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const t = require("../../assets/js/logic/tablero.js");

const RAIZ = path.join(__dirname, "..", "..");
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), "utf8").replace(/\r\n/g, "\n");
const deps = {
  resumen: require("../../assets/js/logic/resumen.js"), panel: require("../../assets/js/logic/panel.js"),
  humedad: require("../../assets/js/logic/humedad.js"), medidor: require("../../assets/js/logic/medidor.js"),
  geo: require("../../assets/js/logic/geo.js"), frio: require("../../assets/js/logic/frio.js")
};

test("REQ-168 sin equipos: bienvenida; cargando: ni bienvenida ni resumen en cero; con equipos: resumen", () => {
  assert.deepEqual([t.tablero([], deps, { sinEquipos: true }).vacio, t.tablero([], deps, { sinEquipos: true }).cargando], [true, false]);
  assert.deepEqual([t.tablero({}, deps, {}).vacio, t.tablero({}, deps, {}).cargando], [false, true]);
  const uno = t.tablero({ a: { key: "a", name: "Pivote", type: "PC", status: "OFF", log: {} } }, deps, {});
  assert.deepEqual([uno.vacio, uno.cargando], [false, false]);
  const vista = leer("assets", "js", "components", "tablero", "tablero.html");
  assert.match(vista, /<div class="tablero tablero-cargando" ng-if="vm\.datos && vm\.datos\.cargando"/);
});

test("REQ-168 core: usuario sin registro o con la lista vacia = sin equipos; si ninguno llega en 10 s, tambien", () => {
  const core = leer("assets", "js", "core.js");
  assert.match(core, /if \(!userSystems \|\| !Object\.keys\(userSystems\)\.length\) \{ \$scope\.systems = \[\]; \$scope\.sinEquipos = true;/);
  assert.match(core, /\} else \{\n\s+\/\/ REQ-168: usuario sin registro[^\n]*\n\s+\$scope\.systems = \[\];\n\s+\$scope\.sinEquipos = true;/);
  assert.match(core, /const ESPERA_DE_EQUIPOS_MS = 10000;/);
});
