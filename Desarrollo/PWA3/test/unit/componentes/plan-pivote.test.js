"use strict";

/**
 * REQ-059 - Plan de riego del pivote: reglas (logic/pivote.js) y <dta-plan-pivote>.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const pivote = require("../../../assets/js/logic/pivote.js");
const { Controlador, definicion } = require("../../../assets/js/components/sistema/plan-pivote/plan-pivote.component.js");

const RAIZ = path.join(__dirname, "..", "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");

test("REQ-059 el error de antes: comparar textos guardaba la velocidad maxima", () => {
  assert.equal("50" <= "100", false, "por eso un plan al 50% se guardaba al 100%");
  assert.deepEqual(pivote.erroresDelPlan({ inicio: 0, fin: 90, velocidad: "50" }, "100"), {});
  assert.equal(pivote.planParaGuardar({ inicio: 0, fin: 90, velocidad: "50" }).value, "50");
  assert.match(CORE, /Number\(value\) <= Number\(\$scope\.actualSystem\.maxVelocity\)/);
});

test("REQ-059 erroresDelPlan: angulos 0..360, distintos, velocidad dentro del maximo del equipo", () => {
  assert.deepEqual(Object.keys(pivote.erroresDelPlan({ inicio: -1, fin: 400, velocidad: -5 }, 100)).sort(), ["fin", "inicio", "velocidad"]);
  assert.equal(pivote.erroresDelPlan({ inicio: 90, fin: 90, velocidad: 10 }, 100).fin, "Debe ser distinto del ángulo inicial.");
  assert.equal(pivote.erroresDelPlan({ inicio: 0, fin: 90, velocidad: 85 }, "80").velocidad, "El máximo de este equipo es 80%.");
  assert.deepEqual(pivote.erroresDelPlan({ inicio: 300, fin: 30, velocidad: 0 }, undefined), {}, "un sector puede cruzar 0°");
  assert.equal(pivote.erroresDelPlan({ inicio: "", fin: 10, velocidad: 1 }, 100).inicio, "Entre 0 y 360 grados.");
});

test("REQ-059 ida y vuelta: lo guardado (texto o numero) <-> formulario; todo se guarda como texto", () => {
  const guardado = { starAngle: 90, endAngle: "200", value: 40, endGun: "true", culture: "Nogal", sensor: "Red 1", soil: "6" };
  const form = pivote.planDesdeGuardado(guardado);
  assert.deepEqual(form, { inicio: 90, fin: 200, velocidad: 40, pistola: true, cultivo: "Nogal", sensor: "Red 1", suelo: "6" });
  assert.deepEqual(pivote.planParaGuardar(form), { starAngle: "90", endAngle: "200", value: "40", endGun: "true", culture: "Nogal", sensor: "Red 1", soil: "6" });
  assert.equal(pivote.planParaGuardar({ inicio: 0, fin: 1, velocidad: 1 }).soil, undefined, "sin suelo no se agrega el campo");
  assert.equal(pivote.planDesdeGuardado({ endGun: false }).pistola, false);
});

test("REQ-059 planNuevo empieza donde termina el ultimo plan; claveNueva", () => {
  const planes = { p0: { endAngle: "90" }, p1: { endAngle: "200" } };
  assert.equal(pivote.planNuevo(planes).inicio, 200);
  assert.equal(pivote.planNuevo(null).inicio, 0);
  assert.equal(pivote.planNuevo("").fin, 360);
  assert.equal(pivote.claveNueva(planes), "p2");
  assert.equal(pivote.claveNueva(""), "p0");
  assert.equal(pivote.SUELOS.length, 11);
});

function montar(edicion, maxVelocity = "100") {
  const eventos = { guardados: [], cerrados: 0, velocidades: [] };
  const modal = { id: "modalPlanPivote" };
  const vm = new Controlador([{ querySelector: sel => (sel === "#modalPlanPivote" ? modal : null) }], { pivote }, {
    cerrarModal: m => { assert.equal(m, modal); eventos.cerrados += 1; }
  });
  vm.sistema = { maxVelocity };
  vm.edicion = edicion;
  vm.alGuardar = l => eventos.guardados.push(l);
  vm.alVerVelocidades = l => eventos.velocidades.push(l.$velocidad);
  vm.$onInit();
  return { vm, eventos };
}

test("REQ-059 componente: con errores no guarda ni cierra; valido entrega el plan en formato guardado", () => {
  const edicion = { indice: null, plan: pivote.planNuevo(null) };
  const { vm, eventos } = montar(edicion);
  assert.equal(vm.esNuevo(), true);
  edicion.plan.fin = 0;
  assert.equal(vm.guardar(), false);
  assert.ok(vm.errores.fin);
  assert.equal(eventos.cerrados, 0);
  edicion.plan.fin = 180;
  edicion.plan.velocidad = 55;
  vm.alternarPistola();
  assert.equal(vm.guardar(), true);
  assert.equal(eventos.cerrados, 1);
  assert.deepEqual(eventos.guardados[0], { $plan: { starAngle: "0", endAngle: "180", value: "55", endGun: "true", culture: "", sensor: "" }, $indice: null });
});

test("REQ-059 componente: editar conserva el indice; la tabla de velocidades recibe el valor actual", () => {
  const edicion = { indice: "p1", plan: pivote.planDesdeGuardado({ starAngle: "90", endAngle: "200", value: "40" }) };
  const { vm, eventos } = montar(edicion, "60");
  assert.equal(vm.esNuevo(), false);
  assert.equal(vm.maximo(), 60);
  vm.verVelocidades();
  assert.deepEqual(eventos.velocidades, [40]);
  edicion.plan.velocidad = 70;
  assert.equal(vm.guardar(), false, "por encima del maximo del equipo");
  edicion.plan.velocidad = 50;
  vm.guardar();
  assert.equal(eventos.guardados[0].$indice, "p1");
});

test("REQ-059 componente: al cambiar la edicion se limpian los errores y se toma el nuevo formulario", () => {
  const { vm } = montar({ indice: null, plan: { inicio: 5, fin: 5, velocidad: 1 } });
  vm.guardar();
  assert.ok(vm.errores.fin);
  const otra = { indice: "p0", plan: { inicio: 0, fin: 90, velocidad: 1 } };
  vm.edicion = otra;
  vm.$onChanges({ edicion: {} });
  assert.deepEqual(vm.errores, {});
  assert.equal(vm.plan, otra.plan);
  assert.deepEqual(definicion.bindings, { sistema: "<", edicion: "<", cultivos: "<", redesSensores: "<", alGuardar: "&", alVerVelocidades: "&" });
});

test("REQ-059 integracion: un solo formulario, sin modales duplicados ni el modal muerto", () => {
  ["modalRiego\"", "modalEditRiego\"", "modalConfirmRiegoMovimiento", "continuePlanMovimiento", "setEditPlan(", "resetNewPlan("]
    .forEach(m => assert.equal(HTML.indexOf(m), -1, m));
  ["resetNewPlan", "setEditPlan =", "editSelectedPlan", "getElementById('planAnguloIni')", "getElementById(\"planValue\")"]
    .forEach(m => assert.equal(CORE.indexOf(m), -1, m));
  assert.match(HTML, /<dta-plan-pivote sistema="actualSystem" edicion="planPivote"/);
  assert.match(HTML, /ng-click="abrirPlanPivote\(\$index\)"/);
  assert.match(HTML, /ng-click="abrirPlanPivote\(null\)"/);
  assert.match(HTML, /<div id="modalResetRiego" class="modal ventana-modal">/);
  assert.match(CORE, /\$scope\.planPivote\.plan\.velocidad = Number\(value\)/);
});

// ---------- REQ-060: sectores sin solapes ----------

test("REQ-060 el caso del usuario: 0-150 y 120-180 se solapan entre 120 y 150", () => {
  const planes = { p0: { starAngle: "0", endAngle: "150" }, p1: { starAngle: "120", endAngle: "180" }, p2: { starAngle: "180", endAngle: "360" } };
  assert.deepEqual(pivote.solapamientos(planes).map(s => [s.a, s.b, s.desde, s.hasta]), [["p0", "p1", 120, 150]]);
  assert.match(pivote.erroresDelPlan({ inicio: 120, fin: 180, velocidad: 1 }, 100, planes, "p1").sector, /sector 1 \(0° a 150°\) entre 120° y 150°/);
  assert.deepEqual(pivote.erroresDelPlan({ inicio: 150, fin: 180, velocidad: 1 }, 100, planes, "p1"), {}, "corregido: se toca en 150, no se solapa");
});

test("REQ-060 bordes compartidos, sectores que cruzan 0° y el plan que se edita", () => {
  const planes = { p0: { starAngle: "0", endAngle: "90" }, p1: { starAngle: "90", endAngle: "270" } };
  assert.deepEqual(pivote.solapamientos(planes), [], "tocarse en 90° no es solaparse");
  assert.deepEqual(pivote.erroresDelPlan({ inicio: 270, fin: 360, velocidad: 1 }, 100, planes, null), {});
  assert.ok(pivote.erroresDelPlan({ inicio: 350, fin: 10, velocidad: 1 }, 100, planes, null).sector, "cruza 0° y pisa el sector 1");
  assert.deepEqual(pivote.erroresDelPlan({ inicio: 300, fin: 30, velocidad: 1 }, 100, { p0: { starAngle: "30", endAngle: "300" } }, null), {});
  assert.deepEqual(pivote.erroresDelPlan({ inicio: 0, fin: 100, velocidad: 1 }, 100, planes, "p0").sector,
    "Se solapa con el sector 2 (90° a 270°) entre 90° y 100°.");
  assert.deepEqual(pivote.erroresDelPlan({ inicio: 0, fin: 90, velocidad: 1 }, 100, planes, "p0"), {}, "no se compara consigo mismo");
});

test("REQ-060 el componente valida contra los demas planes y la lista avisa de solapes guardados", () => {
  const edicion = { indice: null, plan: { inicio: 100, fin: 200, velocidad: 10 } };
  const { vm, eventos } = montar(edicion);
  vm.sistema.plans = { p0: { starAngle: "0", endAngle: "150" } };
  assert.equal(vm.guardar(), false);
  assert.match(vm.errores.sector, /sector 1/);
  assert.equal(eventos.guardados.length, 0);
  assert.match(HTML, /<div class="aviso-solape" ng-repeat="solape in solapamientosPivote\(\)"/);
  assert.match(CORE, /__modulo\("pivote"\)\.solapamientos\(planes\)/);
});

test("REQ-060 solapamientosPivote devuelve la misma lista mientras los planes no cambien (sin $rootScope:infdig)", () => {
  const ini = CORE.indexOf("let solapesEnCache = ");
  const fin = CORE.indexOf("\n    };", CORE.indexOf("$scope.solapamientosPivote = () => {", ini)) + 7;
  const codigo = CORE.slice(ini, fin);
  const $scope = { actualSystem: { plans: { p0: { starAngle: "0", endAngle: "150" }, p1: { starAngle: "120", endAngle: "180" } } } };
  new Function("$scope", "__modulo", codigo)($scope, () => pivote);
  const primera = $scope.solapamientosPivote();
  assert.equal(primera.length, 1);
  assert.equal($scope.solapamientosPivote(), primera, "misma referencia en el siguiente digest");
  $scope.actualSystem.plans.p1.starAngle = "150";
  const corregida = $scope.solapamientosPivote();
  assert.notEqual(corregida, primera);
  assert.equal(corregida.length, 0);
  assert.equal($scope.solapamientosPivote(), corregida);
});

test("REQ-062 0 % es valido (zona de paro) y la interfaz lo explica", () => {
  assert.deepEqual(pivote.erroresDelPlan({ inicio: 120, fin: 150, velocidad: 0 }, 100), {});
  assert.equal(pivote.planParaGuardar({ inicio: 120, fin: 150, velocidad: 0 }).value, "0");
  const plantilla = fs.readFileSync(path.join(RAIZ, "assets", "js", "components", "sistema", "plan-pivote", "plan-pivote.html"), "utf8");
  assert.match(plantilla, /ng-if="vm\.plan\.velocidad === 0 \|\| vm\.plan\.velocidad === '0'"[\s\S]*Zona de paro/);
  assert.match(HTML, /<span class="zona-paro" ng-if="plan\.value == 0"> · paro<\/span>/);
});
