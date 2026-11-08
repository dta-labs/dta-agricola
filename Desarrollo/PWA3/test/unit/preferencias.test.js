"use strict";

/**
 * REQ-077 - Preferencias de vista persistentes (users/{email}/preferences).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const repositorio = require("../../assets/js/services/repositorio.js");
const sensores = require("../../assets/js/components/sistema/panel-sensores/panel-sensores.component.js");

const RAIZ = path.join(__dirname, "..", "..");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");

function repoFalso() {
  const llamadas = [];
  const adaptador = new Proxy({}, { get: (_, metodo) => (ruta, valor) => { llamadas.push([metodo, ruta, valor]); return Promise.resolve(); } });
  return { repo: (repositorio.crear || repositorio)(adaptador), llamadas };
}

test("REQ-077 guardarPreferencia: update sobre users/{email}/preferences (null borra)", async () => {
  const { repo, llamadas } = repoFalso();
  await repo.guardarPreferencia("ana.lopez@x.com", "vistaSensores", "mosaico");
  await repo.guardarPreferencia("ana.lopez@x.com", "sensores/RED1/S0", "temperatura");
  await repo.guardarPreferencia("ana.lopez@x.com", "sensores/RED1/S0", null);
  assert.deepEqual(llamadas, [
    ["actualizar", "users/ana-lopez@x-com/preferences", { vistaSensores: "mosaico" }],
    ["actualizar", "users/ana-lopez@x-com/preferences", { "sensores/RED1/S0": "temperatura" }],
    ["actualizar", "users/ana-lopez@x-com/preferences", { "sensores/RED1/S0": null }]
  ]);
});

test("REQ-077 core: carga las preferencias al entrar y guarda mapa/mosaico y el intercambio de cada sensor", () => {
  assert.match(CORE, /aplicarPreferencias\(result\[convertDotToDash\(\$scope\.authUser\.email\)\]\.preferences\);/);
  assert.match(CORE, /\$scope\.showSensorMapView = \$scope\.preferencias\.vistaSensores !== "mosaico";/);
  assert.match(CORE, /guardarPreferencia\("vistaSensores", \$scope\.preferencias\.vistaSensores\);/);
  assert.match(CORE, /guardarPreferencia\(`sensores\/\$\{sistema\}\/\$\{clave\}`, temperatura \? "temperatura" : null\);/);
  assert.match(HTML, /intercambios="preferencias\.sensores\[actualSystem\.key\]" al-intercambiar="guardarIntercambioSensor\(\$clave, \$temperatura\)"/);
});

test("REQ-077 componente: arranca con lo guardado y avisa de cada intercambio", () => {
  const vm = new sensores.Controlador({ panel: require("../../assets/js/logic/panel.js") });
  const avisos = [];
  vm.intercambios = { S1: "temperatura", S2: "otra-cosa" };
  vm.alIntercambiar = l => avisos.push(l);
  vm.$onInit();
  assert.deepEqual(vm.intercambiado, { S1: true });
  vm.alternar("S0");
  vm.alternar("S1");
  assert.deepEqual(avisos, [{ $clave: "S0", $temperatura: true }, { $clave: "S1", $temperatura: false }]);
  vm.intercambios = { S3: "temperatura" };
  vm.$onChanges({ intercambios: {} });
  assert.deepEqual(vm.intercambiado, { S3: true }, "otra red: se toman sus preferencias");
  assert.deepEqual(sensores.definicion.bindings.intercambios, "<");
  assert.deepEqual(sensores.definicion.bindings.alIntercambiar, "&");
});
