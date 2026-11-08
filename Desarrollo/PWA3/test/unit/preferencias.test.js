"use strict";

/**
 * REQ-078 - La vista es de la red (mapa/mosaico) y el valor principal de cada sensor (Ms/temperatura):
 * se guardan en los ajustes del equipo (systems/{red}/settings), no en las preferencias del usuario (REQ-077).
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

test("REQ-078 actualizarAjustesSistema: update parcial sobre systems/{red}/settings (null borra)", async () => {
  const { repo, llamadas } = repoFalso();
  await repo.actualizarAjustesSistema("RED1", { viewMode: "tiles" });
  await repo.actualizarAjustesSistema("RED1", { "sensors/S0/primaryValue": "temperature" });
  await repo.actualizarAjustesSistema("RED1", { "sensors/S0/primaryValue": null });
  assert.deepEqual(llamadas, [
    ["actualizar", "systems/RED1/settings", { viewMode: "tiles" }],
    ["actualizar", "systems/RED1/settings", { "sensors/S0/primaryValue": "temperature" }],
    ["actualizar", "systems/RED1/settings", { "sensors/S0/primaryValue": null }]
  ]);
  assert.equal(repo.guardarPreferencia, undefined, "ya no se guarda en las preferencias del usuario");
});

test("REQ-078 core: cada red recuerda su vista y cada sensor su valor principal", () => {
  assert.match(CORE, /if \(system\.type == "Sensor"\) \{[\s\S]*?\$scope\.showSensorMapView = system\.viewMode !== "tiles";/);
  assert.match(CORE, /\$scope\.actualSystem\.viewMode = \$scope\.showSensorMapView \? "map" : "tiles";\s*guardarAjustes\(\$scope\.actualSystem\.key, \{ viewMode: \$scope\.actualSystem\.viewMode \}\);/);
  assert.match(CORE, /cambios\[`sensors\/\$\{clave\}\/primaryValue`\] = temperatura \? "temperature" : null;/);
  assert.doesNotMatch(CORE, /guardarPreferencia|aplicarPreferencias|preferencias\.sensores/);
  assert.match(HTML, /al-intercambiar="guardarIntercambioSensor\(\$clave, \$temperatura\)"/);
  assert.doesNotMatch(HTML, /intercambios="preferencias/);
});

test("REQ-078 componente: lee y cambia primaryValue en el propio sensor y avisa para guardarlo", () => {
  const vm = new sensores.Controlador({ panel: require("../../assets/js/logic/panel.js") });
  const avisos = [];
  vm.sistema = { sensors: { S0: {}, S1: { primaryValue: "temperature" } } };
  vm.alIntercambiar = l => avisos.push(l);
  assert.equal(vm.esTemperatura("S0"), false);
  assert.equal(vm.esTemperatura("S1"), true, "lo guardado en el sensor");
  vm.alternar("S0");
  vm.alternar("S1");
  assert.deepEqual(vm.sistema.sensors, { S0: { primaryValue: "temperature" }, S1: {} }, "se refleja al momento");
  assert.deepEqual(avisos, [{ $clave: "S0", $temperatura: true }, { $clave: "S1", $temperatura: false }]);
  vm.alternar("S9");
  assert.equal(avisos.length, 2, "un sensor inexistente no hace nada");
  assert.equal(sensores.definicion.bindings.intercambios, undefined);
});

test("REQ-080 al volver al mapa se redibujan las parcelas (con el mapa oculto Leaflet las recortaba a 0x0)", () => {
  const ini = CORE.indexOf("const volverAMostrarMapa = () => {");
  const cuerpo = CORE.slice(ini, CORE.indexOf("\n    };\n", ini));
  assert.match(cuerpo, /map\.invalidateSize\(\);\s*map\.eachLayer\(capa => \{ if \(capa instanceof L\.Path\) capa\.redraw\(\); \}\);/);
  assert.match(cuerpo, /dibujarAreasDeSensores\(\(\$scope\.systems && \$scope\.systems\[actual\.key\]\) \|\| actual\)/);
  assert.match(CORE, /if \(\$scope\.showSensorMapView\) volverAMostrarMapa\(\);/, "boton mapa/mosaico");
  assert.match(CORE, /if \(estabaOculto && \$scope\.showSensorMapView\) volverAMostrarMapa\(\);/, "al seleccionar una red con vista de mapa");
});

test("REQ-081 al llegar ajustes se conserva el log, y cada lectura nueva repinta parcelas y marcadores", () => {
  assert.match(CORE, /const anterior = \$scope\.systems\[locationKey\];\s*if \(anterior && anterior\.log && !sistema\.log\) sistema\.log = anterior\.log;\s*\$scope\.systems\[locationKey\] = sistema;/);
  assert.match(CORE, /refreshSensorMapContent\(system\);[\s\S]{0,250}if \(system\.type == "Sensor"\) dibujarAreasDeSensores\(system\);/);
});

test("REQ-085 el boton de grafica abre la de la medicion principal del sensor", () => {
  const ini = CORE.indexOf("$scope.openColdRoomSensorChart = (sensor, sensorKey) => {");
  const cuerpo = CORE.slice(ini, CORE.indexOf("$scope.setColdRoomChartType", ini));
  assert.match(cuerpo, /\$scope\.setChartType\(isSensorNetwork\s*\? \(sensor\.primaryValue === "temperature" \? "temperature" : "moisture"\)\s*: "temperature"\);/);
});
